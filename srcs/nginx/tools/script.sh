#!/bin/bash

# Set correct paths
SSL_CERT="/etc/ssl/certs/cyberpong_selfsigned_cert.crt"
SSL_KEY="/etc/ssl/private/cyberpong_selfsigned_private.key"

# Only generate if either file is missing
if [ ! -f "$SSL_KEY" ] || [ ! -f "$SSL_CERT" ]; then
    echo "Generating new SSL certificates..."
    openssl req -x509 -nodes -days 365 \
    -newkey rsa:2048 \
    -keyout "$SSL_KEY" \
    -out "$SSL_CERT" \
    -subj "/C=AE/L=Abu Dhabi/O=42AD/CN=localhost"
else
    echo "SSL certificates already exist, using existing ones..."
fi

# Execute the passed command (nginx -g daemon off;)
exec "$@"