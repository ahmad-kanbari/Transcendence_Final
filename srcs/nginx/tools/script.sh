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

# Create the appropriate Nginx config based on NODE_ENV
if [ "$NODE_ENV" = "production" ]; then
    echo "Running in production mode - Nginx will serve static files"
    cat > /etc/nginx/conf.d/server_block.conf <<EOL
server {
    listen 443 ssl;
    server_name localhost;

    ssl_certificate $SSL_CERT;
    ssl_certificate_key $SSL_KEY;

    # Frontend static files in production
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # API requests to backend
    location /api/ {
        proxy_pass http://backend:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Socket.io for real-time communication
    location /socket.io {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }


    # Upload files location
    location /uploads/ {
        alias /app/public/uploads/;
    }
}
EOL
else
    echo "Running in development mode - Nginx will proxy to frontend dev server"
    cat > /etc/nginx/conf.d/server_block.conf <<EOL
server {
    listen 443 ssl;
    server_name localhost;

    ssl_certificate $SSL_CERT;
    ssl_certificate_key $SSL_KEY;

    # In development, proxy to the frontend dev server
    location / {
        proxy_pass http://frontend:3003;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_http_version 1.1;
    }

    # API requests to backend
    location /api/ {
        proxy_pass http://backend:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Socket.io for real-time communication
    location /socket.io {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }


    # Upload files location
    location /uploads/ {
        alias /app/public/uploads/;
    }
}
EOL
fi

# Execute the passed command (e.g., nginx -g 'daemon off;')
exec "$@"
