# Usa la imagen oficial de Python 3.13
FROM python:3.11-slim

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia el contenido del proyecto al contenedor
COPY . /app

# Instala dependencias del sistema necesarias
RUN apt-get update && \
    apt-get install -y libmagic1 tesseract-ocr && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Instala dependencias de Python
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Expone el puerto por defecto para FastAPI con uvicorn
EXPOSE 8000

# Comando de inicio
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]