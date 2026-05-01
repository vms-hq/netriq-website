FROM nginx:1.27-alpine

# Custom nginx config for SPA-style 404 + sensible caching headers
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY . /usr/share/nginx/html
RUN rm -f /usr/share/nginx/html/Dockerfile \
          /usr/share/nginx/html/docker-compose.yml \
          /usr/share/nginx/html/Caddyfile \
          /usr/share/nginx/html/nginx.conf \
          /usr/share/nginx/html/serve \
          /usr/share/nginx/html/README.md \
          /usr/share/nginx/html/.gitignore

EXPOSE 80
