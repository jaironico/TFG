# Dockerfile para PostgreSQL con inicialización automática
FROM postgres:15-alpine

# Variables de entorno para configurar PostgreSQL
ENV POSTGRES_DB=myapp
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=password

# Crear directorio para scripts de inicialización
RUN mkdir -p /docker-entrypoint-initdb.d

# Copiar script de inicialización
COPY init.sql /docker-entrypoint-initdb.d/

# Exponer puerto estándar de PostgreSQL
EXPOSE 5432

# El comando por defecto ya está definido en la imagen base