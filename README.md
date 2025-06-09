
# 🐳 Guía de Ejecución con Docker

Este proyecto incluye un backend con FastAPI y un frontend con React (Vite), listos para ejecutarse completamente en Docker.

---

## 📦 Paso 1: Instalar Docker

Asegúrate de tener Docker instalado en tu máquina. Puedes descargar Docker Desktop desde:

👉 https://www.docker.com/products/docker-desktop/

---

## 📁 Paso 2: Clonar el repositorio

```bash
git clone https://github.com/jaironico/TFG.git
cd TFG
```
---

## ▶️ Paso 3: Ejecutar usando el script `.bat` (Windows)

Puedes iniciar el entorno fácilmente ejecutando el archivo:

```bash
start_project.bat
```

Esto ejecutará `docker-compose up -d` y te mostrará las URLs de acceso.

---

## 🌐 Aplicaciones disponibles

- 🖥️ Frontend (React): http://localhost:5173  
- ⚙️ Backend (FastAPI): http://localhost:8000/docs

---

## 🛑 Detener los servicios

```bash
docker-compose down
```

---

## 🔍 Ver logs (opcional)

```bash
docker-compose logs -f
```

---

## 🔧 Reconstruir imágenes (opcional)

```bash
docker-compose up --build
```

---

## 🧼 Limpieza total (opcional)

```bash
docker system prune -a
```

⚠️ Esto elimina todo lo que no esté en uso. Úsalo con cuidado.

---

# Para devs
    docker build -t jaironico/fastapi-backend ./backend
    docker push jaironico/fastapi-backend
    docker build -t jaironico/react-frontend ./access-front
    docker push jaironico/react-frontend
    docker build -t jaironico/bbdd ./backend/BBDD
    docker push jaironico/bbdd

## Url producción
http://35.180.29.216:5173

## 🧑‍💻 Autor

**Jaironico**  
[Docker Hub](https://hub.docker.com/u/jaironico)
