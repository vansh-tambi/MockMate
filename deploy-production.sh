#!/bin/bash
# deploy-production.sh
# Deploy MockMate to production server

set -e

# Configuration
SERVER_IP=${1:-"your-server-ip"}
SSH_KEY=${2:-"~/.ssh/id_rsa"}
DEPLOY_PATH="/opt/mockmate"
REPO_URL="https://github.com/vansh-tambi/MockMate.git"

echo "================================"
echo "MockMate Production Deployment"
echo "================================"
echo ""
echo "Server: $SERVER_IP"
echo "Deploy Path: $DEPLOY_PATH"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: SSH to server and setup
echo -e "${YELLOW}Step 1: Connecting to server and preparing...${NC}"

ssh -i "$SSH_KEY" ubuntu@"$SERVER_IP" << 'REMOTE_SCRIPT'
set -e

echo "Installing system dependencies..."
sudo apt-get update -qq
sudo apt-get install -y -qq curl git wget build-essential

# Install Node.js
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y -qq nodejs

# Install Python
echo "Installing Python..."
sudo apt-get install -y -qq python3.9 python3-pip python3-venv

# Install Ollama
echo "Installing Ollama..."
curl -fsSL https://ollama.ai/install.sh | sh

# Create deploy directory
sudo mkdir -p /opt/mockmate
sudo chown ubuntu:ubuntu /opt/mockmate

# Create logs directory
mkdir -p /opt/mockmate/logs

echo "Server prepared successfully"

REMOTE_SCRIPT

echo -e "${GREEN}✅ Server prepared${NC}"

# Step 2: Clone/update repo
echo -e "\n${YELLOW}Step 2: Cloning/updating repository...${NC}"

ssh -i "$SSH_KEY" ubuntu@"$SERVER_IP" << REMOTE_SCRIPT2
cd /opt/mockmate

if [ -d ".git" ]; then
    git pull origin main
else
    git clone $REPO_URL .
fi

echo "Repository ready"

REMOTE_SCRIPT2

echo -e "${GREEN}✅ Repository ready${NC}"

# Step 3: Install dependencies
echo -e "\n${YELLOW}Step 3: Installing dependencies...${NC}"

ssh -i "$SSH_KEY" ubuntu@"$SERVER_IP" << REMOTE_SCRIPT3
cd /opt/mockmate

# Node dependencies
cd server
npm install --production
cd ..

# Python dependencies
cd ai_service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt -q
cd ..

echo "Dependencies installed"

REMOTE_SCRIPT3

echo -e "${GREEN}✅ Dependencies installed${NC}"

# Step 4: Download Phi-3 model
echo -e "\n${YELLOW}Step 4: Downloading Phi-3 model (3.8GB - may take several minutes)...${NC}"

ssh -i "$SSH_KEY" ubuntu@"$SERVER_IP" << REMOTE_SCRIPT4

ollama pull phi3

echo "Phi-3 model ready"

REMOTE_SCRIPT4

echo -e "${GREEN}✅ Phi-3 model downloaded${NC}"

# Step 5: Install PM2
echo -e "\n${YELLOW}Step 5: Installing PM2 for service management...${NC}"

ssh -i "$SSH_KEY" ubuntu@"$SERVER_IP" << REMOTE_SCRIPT5

sudo npm install -g pm2 pm2-logrotate

# Setup logrotate
pm2 install pm2-logrotate

# Startup script
pm2 start /opt/mockmate/ecosystem.config.js

# Save PM2 startup
pm2 save
sudo pm2 startup systemd -u ubuntu --hp /home/ubuntu

echo "PM2 configured"

REMOTE_SCRIPT5

echo -e "${GREEN}✅ PM2 installed and configured${NC}"

# Step 6: Verify deployment
echo -e "\n${YELLOW}Step 6: Verifying deployment...${NC}"

ssh -i "$SSH_KEY" ubuntu@"$SERVER_IP" << REMOTE_SCRIPT6

echo "Waiting for services to start (30 seconds)..."
sleep 30

echo "Checking Ollama..."
curl -s http://localhost:11434/api/tags > /dev/null && echo "✓ Ollama running" || echo "✗ Ollama not responding"

echo "Checking AI Service..."
curl -s http://localhost:8000/health > /dev/null && echo "✓ AI Service running" || echo "✗ AI Service not responding"

echo "Checking Backend..."
curl -s http://localhost:5000/api/interview/v2/ai-status > /dev/null && echo "✓ Backend running" || echo "✗ Backend not responding"

echo ""
echo "PM2 Status:"
pm2 status

REMOTE_SCRIPT6

echo -e "${GREEN}✅ Deployment verified${NC}"

# Final summary
echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}Deployment Successful!${NC}"
echo -e "${GREEN}================================${NC}"

echo -e "\n${YELLOW}Access your application:${NC}"
echo "  http://$SERVER_IP:5000"

echo -e "\n${YELLOW}SSH to server:${NC}"
echo "  ssh -i $SSH_KEY ubuntu@$SERVER_IP"

echo -e "\n${YELLOW}View logs:${NC}"
echo "  pm2 logs"
echo "  pm2 logs mockmate-backend"
echo "  pm2 logs mockmate-ai"
echo "  pm2 logs ollama"

echo -e "\n${YELLOW}Manage services:${NC}"
echo "  pm2 stop mockmate-backend"
echo "  pm2 restart mockmate-ai"
echo "  pm2 delete ollama"

echo -e "\n${YELLOW}Helpful commands:${NC}"
echo "  pm2 monit          # Monitor services"
echo "  pm2 save            # Save state"
echo "  pm2 resurrect       # Restore from saved state"

echo -e "\n${GREEN}Deployment complete! 🎉${NC}\n"
