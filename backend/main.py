# main.py

import os
import logging
import hashlib
from datetime import datetime, timedelta
from io import BytesIO
from typing import Dict, Optional, Tuple, List

from fastapi import FastAPI, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import magic
import pytesseract
import google.generativeai as genai
from dotenv import load_dotenv
from pydantic import BaseModel

# Importaciones para usuarios / ajustes (YA SIN SQLAlchemy)
from database import get_db
import schemas
from auth import router as auth_router, get_current_user

# --------------------------------------------------
# Cargar configuración desde .env
# --------------------------------------------------
load_dotenv()

# --------------------------------------------------
# Configuración inicial de FastAPI y logging
# --------------------------------------------------
app = FastAPI(
    title="TFG Document Processor con Usuarios",
    description="API para procesamiento de documentos con OCR, corrección y descripción de imágenes mediante Gemini, + autenticación y ajustes por usuario"
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --------------------------------------------------
# Modelos para solicitudes OCR / texto
# --------------------------------------------------
class TextRequest(BaseModel):
    text: str
    force_correction: Optional[bool] = False

class ImageDescriptionRequest(BaseModel):
    image_hash: str

# --------------------------------------------------
# Configuración de Gemini (texto + visión multimodal)
# --------------------------------------------------
GEMINI_API_KEY       = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL         = "gemini-1.5-flash"
GEMINI_VISION_MODEL  = "gemini-1.5-flash"

class APIStatus:
    def __init__(self):
        self.last_error   = None
        self.error_count  = 0
        self.last_success = datetime.now()

    def report_error(self, error):
        self.last_error  = error
        self.error_count += 1

    def report_success(self):
        self.last_success = datetime.now()
        self.error_count  = 0

    def is_likely_quota_exceeded(self):
        if self.error_count <= 3:
            return False
        msg = str(self.last_error).lower() if self.last_error else ""
        return "quota" in msg or "api_key_invalid" in msg

api_status = APIStatus()

try:
    if not GEMINI_API_KEY:
        raise ValueError("No se encontró GEMINI_API_KEY en variables de entorno")
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model        = genai.GenerativeModel(GEMINI_MODEL)
    gemini_vision_model = genai.GenerativeModel(GEMINI_VISION_MODEL)
    logger.info(f"Conexión con Gemini establecida (Modelos: {GEMINI_MODEL})")
except Exception as e:
    logger.warning(f"Error configurando Gemini: {e}")
    gemini_model = None
    gemini_vision_model = None
    api_status.report_error(e)

# --------------------------------------------------
# CORS
# --------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------
# Caché con TTL
# --------------------------------------------------
class TimedCache:
    def __init__(self, maxsize=100, ttl=timedelta(hours=1)):
        self.cache   = {}
        self.maxsize = maxsize
        self.ttl     = ttl

    def get(self, key):
        if key not in self.cache:
            return None
        value, ts = self.cache[key]
        if datetime.now() - ts > self.ttl:
            del self.cache[key]
            return None
        return value

    def set(self, key, value):
        if len(self.cache) >= self.maxsize:
            oldest = next(iter(self.cache))
            del self.cache[oldest]
        self.cache[key] = (value, datetime.now())

correction_cache  = TimedCache(maxsize=200, ttl=timedelta(hours=6))
description_cache = TimedCache(maxsize=100, ttl=timedelta(hours=24))

def get_cache_key(text: str) -> str:
    return hashlib.md5(text.encode()).hexdigest()

def apply_basic_corrections(text: str) -> str:
    corrections = {
        "  ": " ",
        "\n\n\n": "\n\n",
    }
    for wrong, right in corrections.items():
        text = text.replace(wrong, right)
    return text

# --------------------------------------------------
# Corrección y descripción
# --------------------------------------------------
async def correct_with_gemini(text: str) -> Tuple[str, bool]:
    key = get_cache_key(text)
    cached = correction_cache.get(key)
    if cached:
        return cached, True

    if not gemini_model or api_status.is_likely_quota_exceeded():
        return apply_basic_corrections(text), False

    try:
        prompt = (
            "Primero, decide si este texto es legible. "
            "Si no es legible (ruido o caracteres sin sentido), "
            "responde EXACTAMENTE \"True\" (sin comillas). "
            "En caso contrario, corrige ortografía y gramática "
            "manteniendo la estructura, términos técnicos e idioma. "
            "Devuelve SOLO el texto corregido o la palabra True.\n\n"
            f"{text[:15000]}"
        )
        resp = gemini_model.generate_content(prompt)
        result = resp.text.strip() if resp.text else ""

        if result.lower() == "true":
            correction_cache.set(key, "True")
            api_status.report_success()
            return "True", True

        corrected = result
        correction_cache.set(key, corrected)
        api_status.report_success()
        return corrected, True

    except Exception as e:
        logger.error(f"Error en Gemini (texto): {e}")
        api_status.report_error(e)
        return apply_basic_corrections(text), False

async def describe_image(image_bytes: bytes) -> Tuple[str, bool]:
    image_hash = hashlib.md5(image_bytes).hexdigest()
    cached = description_cache.get(image_hash)
    if cached:
        return cached, True

    if not gemini_vision_model or api_status.is_likely_quota_exceeded():
        return "Descripción no disponible (límite de API alcanzado)", False

    try:
        img = Image.open(BytesIO(image_bytes))
        prompt = "SOLO responde con la descripción de esta imagen en detalle, incluyendo texto relevante y contexto. Sé preciso y conciso."
        resp = gemini_vision_model.generate_content([prompt, img])
        desc = resp.text or "No se pudo generar descripción"
        description_cache.set(image_hash, desc)
        api_status.report_success()
        return desc, True

    except Exception as e:
        logger.error(f"Error describiendo imagen (vision): {e}")
        api_status.report_error(e)
        return "Error generando descripción", False

# --------------------------------------------------
# OCR + procesamiento
# --------------------------------------------------
async def process_image(file: UploadFile) -> Dict[str, str]:
    data = await file.read()
    img  = Image.open(BytesIO(data))

    custom_cfg = r'--oem 3 --psm 6 -l spa+eng'
    text = pytesseract.image_to_string(img, config=custom_cfg).strip()
    if not text:
        raise ValueError("OCR no detectó texto")

    logger.info(f"OCR completado: {len(text)} caracteres")

    corrected, used_g = await correct_with_gemini(text)

    if corrected == "True":
        desc, vision_used = await describe_image(data)
        return {
            "original_text":     "",
            "corrected_text":    "",
            "description":       desc,
            "correction_source": "none (sin texto)",
            "vision_source":     "gemini-1.5-flash" if vision_used else "fallback",
            "warnings":          [] if vision_used else ["Descripción limitada (sin Gemini Vision)"]
        }

    desc, vision_used = await describe_image(data)
    return {
        "original_text":     text,
        "corrected_text":    corrected,
        "description":       desc,
        "correction_source": "gemini" if used_g else "basic",
        "vision_source":     "gemini-1.5-flash" if vision_used else "fallback",
        "warnings":          [] if used_g else ["Usando correcciones básicas (sin Gemini)"]
    }

# --------------------------------------------------
# Endpoints públicos
# --------------------------------------------------
@app.post("/upload")
async def upload_file(file: UploadFile):
    header = await file.read(1024)
    await file.seek(0)
    mime = magic.from_buffer(header, mime=True)
    if not mime.startswith("image/"):
        raise HTTPException(400, "Solo se admiten imágenes (PNG/JPG/JPEG)")

    res = await process_image(file)
    if api_status.is_likely_quota_exceeded():
        res["warnings"].append("Límite de cuota de Gemini alcanzado")
    return {"status": "success", "type": "image", **res}

@app.post("/verify-text")
async def verify_text(req: TextRequest):
    if not req.text.strip():
        raise HTTPException(400, "El texto no puede estar vacío")
    corrected, used = await correct_with_gemini(req.text)
    resp = {
        "status":         "success",
        "original_text":  req.text,
        "corrected_text": corrected,
        "correction_source": "gemini" if used else "basic"
    }
    if not used:
        resp["warning"] = "Usando correcciones básicas (sin Gemini)"
    return resp

@app.post("/describe-image")
async def describe_image_endpoint(file: UploadFile):
    data = await file.read()
    description, used = await describe_image(data)
    resp = {
        "status":      "success",
        "description": description,
        "source":      "gemini" if used else "fallback"
    }
    if not used:
        resp["warning"] = "Descripción limitada (sin Gemini)"
    return resp

@app.get("/api-status")
async def get_api_status():
    return {
        "gemini_available":      gemini_model is not None,
        "last_error":            str(api_status.last_error) if api_status.last_error else None,
        "error_count":           api_status.error_count,
        "likely_quota_exceeded": api_status.is_likely_quota_exceeded(),
        "cache_stats": {
            "correction_cache_size":  len(correction_cache.cache),
            "description_cache_size": len(description_cache.cache)
        }
    }

# --------------------------------------------------
# Autenticación y ajustes
# --------------------------------------------------
app.include_router(auth_router)

@app.get("/me", response_model=schemas.UserOut)
def get_me(current_user: dict = Depends(get_current_user)):
    # current_user es dict devuelto por psycopg2, compatible con schemas
    return {
        "id": current_user["id"],
        "username": current_user["username"],
        "is_admin": current_user["is_admin"]
    }

@app.get("/me/settings", response_model=schemas.UserSettingsOut)
def read_my_settings(current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    with db.cursor() as cur:
        cur.execute("SELECT * FROM user_settings WHERE user_id = %s", (current_user["id"],))
        settings = cur.fetchone()
        if not settings:
            raise HTTPException(status_code=404, detail="No se encontraron ajustes para este usuario")
        return settings

@app.put("/me/settings", response_model=schemas.UserSettingsOut)
def update_my_settings(
    settings_in: schemas.UserSettingsUpdate,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    with db.cursor() as cur:
        cur.execute("SELECT * FROM user_settings WHERE user_id = %s", (current_user["id"],))
        settings = cur.fetchone()
        if not settings:
            cur.execute("""
                INSERT INTO user_settings 
                    (user_id, font_size, font_family, text_color, background_color, rate, pitch, volume)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                current_user["id"], settings_in.font_size, settings_in.font_family,
                settings_in.text_color, settings_in.background_color,
                settings_in.rate, settings_in.pitch, settings_in.volume
            ))
            db.commit()
            return cur.fetchone()
        cur.execute("""
            UPDATE user_settings SET
                font_size=%s, font_family=%s, text_color=%s, background_color=%s,
                rate=%s, pitch=%s, volume=%s
            WHERE user_id=%s
            RETURNING *
        """, (
            settings_in.font_size, settings_in.font_family, settings_in.text_color, settings_in.background_color,
            settings_in.rate, settings_in.pitch, settings_in.volume,
            current_user["id"]
        ))
        db.commit()
        return cur.fetchone()

@app.get("/admin/users", response_model=List[schemas.UserOut])
def get_all_users(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    if current_user["is_admin"] != 1:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    with db.cursor() as cur:
        cur.execute("SELECT id, username, is_admin FROM users")
        return cur.fetchall()

@app.delete("/admin/users/{user_id}")
def delete_user(
    user_id: int,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    if current_user["is_admin"] != 1:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    with db.cursor() as cur:
        cur.execute("DELETE FROM user_settings WHERE user_id = %s", (user_id,))
        cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
        db.commit()
    return {"message": "Usuario eliminado"}

# --------------------------------------------------
# Health check endpoint
# --------------------------------------------------
@app.get("/health")
def health_check(db = Depends(get_db)):
    try:
        with db.cursor() as cur:
            cur.execute("SELECT 1")
        return {
            "status": "healthy",
            "database": "connected",
            "gemini_available": gemini_model is not None
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database connection failed: {str(e)}")

# --------------------------------------------------
# Endpoint raíz
# --------------------------------------------------
@app.get("/")
def read_root():
    return {"message": "¡API corriendo correctamente con PostgreSQL!"}

# --------------------------------------------------
# Arranque
# --------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
