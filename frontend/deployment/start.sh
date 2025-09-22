#!/bin/sh

# Use PORT environment variable if set, otherwise default to 80
PORT=${PORT:-80}

# Update nginx configuration with the correct port
sed -i "s/listen 80;/listen $PORT;/" /etc/nginx/conf.d/default.conf

# Start nginx
exec nginx -g "daemon off;"