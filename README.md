
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

## 🧱 Paso 3: Ejecutar con Docker Compose

```bash
docker-compose up -d
```

Esto:

- Descargará las imágenes desde Docker Hub (`jaironico/fastapi-backend` y `jaironico/react-frontend`)
- Levantará los servicios en contenedores

---

## 🌐 Aplicaciones disponibles

- 🖥️ Frontend (React): http://localhost:5173  
- ⚙️ Backend (FastAPI): http://localhost:8000/docs

---

## 🛑 Paso 4: Parar los servicios

```bash
docker-compose down
```

Esto detiene y elimina los contenedores levantados.

---

## 🔍 Paso 5 (opcional): Ver logs

```bash
docker-compose logs -f
```

Esto muestra los logs en tiempo real de los contenedores.

---

## 🔧 Paso 6 (opcional): Reconstruir las imágenes

Si has hecho cambios en el código fuente:

```bash
docker-compose up --build
```

---

## 🧼 Limpieza (opcional)

Para eliminar volúmenes, imágenes y todo:

```bash
docker system prune -a
```

⚠️ Esto elimina todo lo que no esté en uso. Úsalo con cuidado.

---

## 🧑‍💻 Autor

**Jaironico**  
[Docker Hub](https://hub.docker.com/u/jaironico)
