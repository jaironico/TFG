@echo off
REM === Script para iniciar el entorno con Docker Compose ===

echo Iniciando contenedores con Docker Compose...
docker-compose up -d

echo.
echo Frontend disponible en: http://localhost:5173
echo Backend disponible en: http://localhost:8000/docs
echo.

pause
