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
from typing import Dict, Optional
from pydantic import BaseModel

# Configuración inicial
app = FastAPI(
    title="TFG Document Processor",
    description="API para procesamiento de documentos con OCR y corrección mediante Gemini"
)

# Configuración de logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Modelo para solicitudes de texto
class TextRequest(BaseModel):
    text: str
    force_correction: Optional[bool] = False

# Configuración de Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyBf_ZaglR8ciO7uI8lo_phQI5QxZ_8KSzs")  # Usa variables de entorno en producción
GEMINI_MODEL = "gemini-1.5-flash"  # Modelo más económico

try:
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel(GEMINI_MODEL)
    logger.info(f"Conexión con Gemini establecida (Modelo: {GEMINI_MODEL})")
except Exception as e:
    logger.warning(f"Error configurando Gemini: {str(e)}")
    gemini_model = None

# Configuración CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Caché para correcciones
@lru_cache(maxsize=100)
def cached_gemini_correction(text: str) -> str:
    """Corrección con Gemini usando caché para evitar llamadas redundantes"""
    if not gemini_model or not text.strip():
        return text
        
    try:
        prompt = (
            "Corrige ortografía y gramática manteniendo:\n"
            "- Estructura original\n- Términos técnicos\n"
            "Devuelve SOLO el texto corregido:\n\n"
            f"{text[:15000]}"  # Limita el tamaño por seguridad
        )
        response = gemini_model.generate_content(prompt)
        return response.text if response.text else text
    except Exception as e:
        logger.warning(f"Error en Gemini (caché): {str(e)}")
        return text

def apply_basic_corrections(text: str) -> str:
    """Correcciones básicas sin depender de Gemini"""
    # Implementa reglas simples de corrección aquí
    corrections = {
        "  ": " ",  # Espacios dobles
        "\n\n\n": "\n\n",  # Saltos de línea excesivos
        # Añade más reglas según necesites
    }
    
    for wrong, right in corrections.items():
        text = text.replace(wrong, right)
        
    return text

async def process_image(file: UploadFile) -> Dict[str, str]:
    """Extrae texto de imágenes usando Tesseract OCR con manejo mejorado"""
    try:
        image_data = await file.read()
        image = Image.open(BytesIO(image_data))
        
        # Configuración optimizada para Tesseract
        custom_config = r'--oem 3 --psm 6 -l spa+eng'
        text = pytesseract.image_to_string(image, config=custom_config)
        
        if not text.strip():
            raise ValueError("OCR no detectó texto")
            
        logger.info(f"OCR completado. Longitud del texto: {len(text)} caracteres")
        return {
            "original_text": text,
            "corrected_text": apply_basic_corrections(text)  # Corrección básica inicial
        }
    except Exception as e:
        logger.error(f"Error en OCR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error procesando imagen: {str(e)}")

@app.post("/upload")
async def upload_file(file: UploadFile) -> Dict[str, str]:
    """Endpoint principal para procesar archivos"""
    try:
        # Verificar tipo de archivo
        file_header = await file.read(1024)
        await file.seek(0)
        
        mime_type = magic.from_buffer(file_header, mime=True)
        logger.info(f"Tipo MIME detectado: {mime_type}")

        if not mime_type.startswith(("image/", "application/pdf")):
            raise HTTPException(
                status_code=400,
                detail="Formato no soportado. Sube una imagen (PNG/JPG) o PDF"
            )

        # Procesamiento según tipo
        if mime_type.startswith("image/"):
            ocr_result = await process_image(file)
            
            # Solo usa Gemini si el texto es suficientemente largo
            if len(ocr_result["original_text"]) > 50:
                try:
                    corrected = cached_gemini_correction(ocr_result["original_text"])
                    ocr_result["corrected_text"] = corrected
                except Exception as e:
                    logger.warning(f"Error en Gemini: {str(e)}")
                    # Mantiene las correcciones básicas si falla Gemini

            return {
                "status": "success",
                "type": "image",
                **ocr_result,
                "correction_source": "gemini" if "gemini" in locals() else "basic"
            }
            
        elif mime_type == "application/pdf":
            raise HTTPException(
                status_code=501,
                detail="Procesamiento de PDF no implementado aún"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error inesperado: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error interno del servidor"
        )

@app.post("/verify-text")
async def verify_text(request: TextRequest) -> Dict[str, str]:
    """Endpoint para verificación de texto existente"""
    try:
        if not request.text.strip():
            raise HTTPException(
                status_code=400,
                detail="El texto no puede estar vacío"
            )

        # Corrección básica primero
        basic_corrected = apply_basic_corrections(request.text)
        
        # Solo usa Gemini si se fuerza o el texto es largo
        if request.force_correction and len(basic_corrected) > 10:
            try:
                gemini_corrected = cached_gemini_correction(basic_corrected)
                return {
                    "status": "success",
                    "original_text": request.text,
                    "corrected_text": gemini_corrected,
                    "correction_source": "gemini"
                }
            except Exception as e:
                logger.warning(f"Error en Gemini: {str(e)}")
                # Fallback a corrección básica
                return {
                    "status": "success",
                    "original_text": request.text,
                    "corrected_text": basic_corrected,
                    "correction_source": "basic",
                    "warning": "Límite de Gemini alcanzado. Usando correcciones básicas."
                }
        
        return {
            "status": "success",
            "original_text": request.text,
            "corrected_text": basic_corrected,
            "correction_source": "basic"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en verificación: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error al verificar el texto"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
