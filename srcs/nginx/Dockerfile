FROM nginx:alpine

RUN apk update && apk add --no-cache openssl

COPY ./tools/script.sh /script.sh

RUN chmod +x /script.sh

EXPOSE 80 443

ENTRYPOINT ["sh", "/script.sh"]

CMD ["nginx", "-g", "daemon off;"]