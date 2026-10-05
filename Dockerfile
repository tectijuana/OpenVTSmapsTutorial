# Sitio estático servido con nginx. Imagen multiarquitectura (Intel/AMD y Apple Silicon/ARM).
FROM nginx:stable-alpine
COPY index.html /usr/share/nginx/html/index.html
COPY src /usr/share/nginx/html/src
EXPOSE 80
