# Imagen base con Node 22.14
FROM node:22.14-alpine

# Directorio de trabajo
WORKDIR /app

# Copia solo package.json para instalar dependencias primero (mejor cache)
COPY package.json ./

# Instala dependencias
RUN npm install

# Copia el resto del código
COPY . .

# Expone el puerto que usa Vite (por defecto 5173)
EXPOSE 5173

# Comando para iniciar el servidor de desarrollo
CMD ["npm", "run", "dev"]