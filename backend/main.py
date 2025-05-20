from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import magic
import pytesseract
from io import BytesIO
from PIL import Image
import google.generativeai as genai
import logging
from functools import lru_cache
import os
from typing import Dict, Optional, Tuple
from pydantic import BaseModel
from datetime import datetime, timedelta
import hashlib

# Configuración inicial
app = FastAPI(
    title="TFG Document Processor",
    description="API para procesamiento de documentos con OCR, corrección y descripción de imágenes mediante Gemini"
)

# Configuración de logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Modelos para solicitudes
class TextRequest(BaseModel):
    text: str
    force_correction: Optional[bool] = False

class ImageDescriptionRequest(BaseModel):
    image_hash: str

# Configuración de Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-1.5-flash"
GEMINI_VISION_MODEL = "gemini-pro-vision"

# Estado global para manejo de cuotas
class APIStatus:
    def __init__(self):
        self.last_error = None
        self.error_count = 0
        self.last_success = datetime.now()
        
    def report_error(self, error):
        self.last_error = error
        self.error_count += 1
        
    def report_success(self):
        self.last_success = datetime.now()
        self.error_count = 0
        
    def is_likely_quota_exceeded(self):
        return (self.error_count > 3 and 
                "quota" in str(self.last_error).lower() or
                "API_KEY_INVALID" in str(self.last_error))

api_status = APIStatus()

try:
    if not GEMINI_API_KEY:
        raise ValueError("No se encontró GEMINI_API_KEY en variables de entorno")
    
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel(GEMINI_MODEL)
    gemini_vision_model = genai.GenerativeModel(GEMINI_VISION_MODEL)
    logger.info(f"Conexión con Gemini establecida (Modelos: {GEMINI_MODEL}, {GEMINI_VISION_MODEL})")
except Exception as e:
    logger.warning(f"Error configurando Gemini: {str(e)}")
    gemini_model = None
    gemini_vision_model = None
    api_status.report_error(e)

# Configuración CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Caché mejorado con tiempo de expiración
class TimedCache:
    def __init__(self, maxsize=100, ttl=timedelta(hours=1)):
        self.cache = {}
        self.maxsize = maxsize
        self.ttl = ttl
        
    def get(self, key):
        if key not in self.cache:
            return None
            
        value, timestamp = self.cache[key]
        if datetime.now() - timestamp > self.ttl:
            del self.cache[key]
            return None
            
        return value
        
    def set(self, key, value):
        if len(self.cache) >= self.maxsize:
            oldest_key = next(iter(self.cache))
            del self.cache[oldest_key]
            
        self.cache[key] = (value, datetime.now())

# Cachés para diferentes propósitos
correction_cache = TimedCache(maxsize=200, ttl=timedelta(hours=6))
description_cache = TimedCache(maxsize=100, ttl=timedelta(hours=24))

def get_cache_key(text: str) -> str:
    return hashlib.md5(text.encode()).hexdigest()

def apply_basic_corrections(text: str) -> str:
    """Correcciones básicas sin depender de Gemini"""
    corrections = {
        "  ": " ",
        "\n\n\n": "\n\n",
        # Añade más reglas según necesites
    }
    for wrong, right in corrections.items():
        text = text.replace(wrong, right)
    return text

async def describe_image(image_bytes: bytes) -> Tuple[str, bool]:
    """Describe una imagen usando Gemini con caché"""
    image_hash = hashlib.md5(image_bytes).hexdigest()
    cached = description_cache.get(image_hash)
    if cached:
        return cached, True
        
    if not gemini_vision_model or api_status.is_likely_quota_exceeded():
        return "Descripción no disponible (límite de API alcanzado)", False
        
    try:
        image = Image.open(BytesIO(image_bytes))
        response = gemini_vision_model.generate_content([
            "Describe esta imagen en detalle, incluyendo texto relevante y contexto. "
            "Sé preciso y conciso.",
            image
        ])
        description = response.text if response.text else "No se pudo generar descripción"
        description_cache.set(image_hash, description)
        api_status.report_success()
        return description, True
    except Exception as e:
        logger.error(f"Error describiendo imagen: {str(e)}")
        api_status.report_error(e)
        return f"Error generando descripción: {str(e)}", False

async def correct_with_gemini(text: str) -> Tuple[str, bool]:
    """Corrige texto usando Gemini con caché y manejo de errores"""
    cache_key = get_cache_key(text)
    cached = correction_cache.get(cache_key)
    if cached:
        return cached, True
        
    if not gemini_model or api_status.is_likely_quota_exceeded():
        return apply_basic_corrections(text), False
        
    try:
        prompt = (
            "Corrige ortografía y gramática manteniendo:\n"
            "- Estructura original\n- Términos técnicos\n"
            "Devuelve SOLO el texto corregido:\n\n"
            f"{text[:15000]}"  # Límite por seguridad
        )
        response = gemini_model.generate_content(prompt)
        corrected = response.text if response.text else text
        correction_cache.set(cache_key, corrected)
        api_status.report_success()
        return corrected, True
    except Exception as e:
        logger.error(f"Error en Gemini: {str(e)}")
        api_status.report_error(e)
        return apply_basic_corrections(text), False

async def process_image(file: UploadFile) -> Dict[str, str]:
    """Procesa imagen con OCR y descripción"""
    try:
        image_data = await file.read()
        image = Image.open(BytesIO(image_data))
        
        # OCR
        custom_config = r'--oem 3 --psm 6 -l spa+eng'
        text = pytesseract.image_to_string(image, config=custom_config).strip()
        
        if not text:
            raise ValueError("OCR no detectó texto")
            
        logger.info(f"OCR completado. Longitud: {len(text)} caracteres")
        
        # Corrección
        corrected_text, used_gemini = await correct_with_gemini(text)
        
        # Descripción
        description, _ = await describe_image(image_data)
        
        return {
            "original_text": text,
            "corrected_text": corrected_text,
            "description": description,
            "correction_source": "gemini" if used_gemini else "basic",
            "warnings": [] if used_gemini else ["Límite de Gemini alcanzado. Usando correcciones básicas."]
        }
    except Exception as e:
        logger.error(f"Error procesando imagen: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload")
async def upload_file(file: UploadFile):
    """Endpoint principal para subida de archivos"""
    try:
        # Verificar tipo de archivo
        file_header = await file.read(1024)
        await file.seek(0)
        
        mime_type = magic.from_buffer(file_header, mime=True)
        logger.info(f"Tipo MIME detectado: {mime_type}")

        if not mime_type.startswith("image/"):
            raise HTTPException(
                status_code=400,
                detail="Solo se admiten imágenes (PNG/JPG/JPEG)"
            )

        result = await process_image(file)
        
        # Mensaje sobre estado de la API
        if api_status.is_likely_quota_exceeded():
            result["warnings"].append(
                "Límite de cuota de Gemini alcanzado. "
                "Algunas funciones pueden estar limitadas."
            )
        
        return {
            "status": "success",
            "type": "image",
            **result
        }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error inesperado: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error interno del servidor"
        )

@app.post("/verify-text")
async def verify_text(request: TextRequest):
    """Verifica y corrige texto existente"""
    try:
        if not request.text.strip():
            raise HTTPException(
                status_code=400,
                detail="El texto no puede estar vacío"
            )

        corrected_text, used_gemini = await correct_with_gemini(request.text)
        
        response = {
            "status": "success",
            "original_text": request.text,
            "corrected_text": corrected_text,
            "correction_source": "gemini" if used_gemini else "basic"
        }
        
        if not used_gemini:
            response["warning"] = "Límite de Gemini alcanzado. Usando correcciones básicas."
        
        if api_status.is_likely_quota_exceeded():
            response["warning"] = (
                "Límite de cuota de Gemini alcanzado. "
                "Calidad de corrección puede estar afectada."
            )
        
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en verificación: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error al verificar el texto"
        )

@app.post("/describe-image")
async def describe_image_endpoint(file: UploadFile):
    """Endpoint solo para descripción de imágenes"""
    try:
        image_data = await file.read()
        description, used_gemini = await describe_image(image_data)
        
        response = {
            "status": "success",
            "description": description,
            "source": "gemini" if used_gemini else "fallback"
        }
        
        if not used_gemini:
            response["warning"] = "Límite de Gemini alcanzado. Descripción limitada."
        
        return response
        
    except Exception as e:
        logger.error(f"Error describiendo imagen: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error generando descripción"
        )

@app.get("/api-status")
async def get_api_status():
    """Endpoint para verificar estado de la API"""
    return {
        "gemini_available": gemini_model is not None,
        "last_error": str(api_status.last_error) if api_status.last_error else None,
        "error_count": api_status.error_count,
        "likely_quota_exceeded": api_status.is_likely_quota_exceeded(),
        "cache_stats": {
            "correction_cache_size": len(correction_cache.cache),
            "description_cache_size": len(description_cache.cache)
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)