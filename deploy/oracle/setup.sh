#!/usr/bin/env bash
set -euo pipefail

echo "=========================================================="
echo " Starting Lumina Audio Studio OCI Deployment Setup"
echo "=========================================================="

PUBLIC_IP=$(curl -s -4 ifconfig.me || curl -s -4 icanhazip.com || echo "localhost")
SERVER_URL="http://${PUBLIC_IP}"

echo "[1/7] Updating system and installing prerequisites..."
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
    curl \
    git \
    jq \
    python3 \
    python3-venv \
    python3-pip \
    nginx \
    iptables-persistent

echo "[2/7] Installing Docker & Docker Compose..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm -f get-docker.sh
fi
sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu || true

echo "[3/7] Configuring Oracle Linux firewall for HTTP/HTTPS..."
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT || true
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT || true
sudo netfilter-persistent save || true

echo "[4/7] Generating Supabase cryptographic secrets and keys..."
cd /home/ubuntu/oudio-books-AI/deploy/oracle
python3 generate_keys.py "${SERVER_URL}"
cp .env /home/ubuntu/oudio-books-AI/.env

echo "[5/7] Starting Supabase ARM64 Docker Stack..."
docker compose down || true
docker compose up -d

echo "Waiting for Postgres and Kong to become healthy..."
sleep 15

echo "[6/7] Configuring Nginx reverse proxy..."
sudo cp nginx.conf /etc/nginx/sites-available/oudio
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/oudio /etc/nginx/sites-enabled/oudio
sudo nginx -t
sudo systemctl restart nginx

echo "[7/7] Setting up FastAPI virtual environment and systemd service..."
cd /home/ubuntu/oudio-books-AI
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt

sudo cp deploy/oracle/oudio-api.service /etc/systemd/system/oudio-api.service
sudo systemctl daemon-reload
sudo systemctl enable --now oudio-api
sudo systemctl restart oudio-api

echo "=========================================================="
echo " Deployment Complete!"
echo " Public IP: ${PUBLIC_IP}"
echo " Supabase URL: ${SERVER_URL}"
echo " FastAPI Health: ${SERVER_URL}/api/health"
echo "=========================================================="
