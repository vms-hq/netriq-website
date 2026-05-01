FROM nginx:1.27-alpine

COPY . /usr/share/nginx/html
RUN rm -f /usr/share/nginx/html/Dockerfile \
          /usr/share/nginx/html/serve \
          /usr/share/nginx/html/README.md \
          /usr/share/nginx/html/.gitignore \
          /usr/share/nginx/html/docker-compose.yml

EXPOSE 80
