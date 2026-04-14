# Production Deployment Guide

## Overview

This guide covers deploying MockMate to a production server with automated Ollama Phi-3 integration, fallback mechanisms, and PM2 process management.

## Prerequisites

### On Your Local Machine
- SSH key for server access
- Git installed
- Deployment script executable: `chmod +x deploy-production.sh`

### On Production Server
- Ubuntu 20.04 LTS or higher
- At least 8GB RAM (16GB recommended for Phi-3)
- At least 20GB free disk space (model is 3.8GB)
- Port 5000 (backend), 8000 (AI service), 11434 (Ollama) available

## Quick Start

### 1. Prepare Your Server

If you have an empty Ubuntu server, the deployment script handles everything:

```bash
./deploy-production.sh YOUR_SERVER_IP ~/.ssh/your-key.pem
```

**What this does:**
- ✅ Installs Node.js 18, Python 3.9, Ollama
- ✅ Clones the repository
- ✅ Installs all dependencies
- ✅ Downloads Phi-3 model (3.8GB - takes 5-10 minutes)
- ✅ Sets up PM2 process management
- ✅ Configures auto-startup
- ✅ Verifies all services running

### 2. Verify Deployment

Check that all three services are running:

```bash
# SSH to server
ssh -i ~/.ssh/your-key.pem ubuntu@YOUR_SERVER_IP

# View service status
pm2 status

# Should show:
# ┌─────────────────────┬────┬─────────┬──────┬──────┐
# │ id │ name              │ mode │ status │ ...
# ├─────────────────────┼────┼─────────┼──────┼──────┤
# │ 0  │ ollama            │ fork │ online │
# │ 1  │ mockmate-ai       │ fork │ online │
# │ 2  │ mockmate-backend  │ fork │ online │
# └────────────────────┴────┴─────────┴──────┴──────┘
```

### 3. Test the System

```bash
# Check Ollama
curl http://localhost:11434/api/tags

# Check AI Service
curl http://localhost:8000/health

# Check Backend
curl http://localhost:5000/api/interview/v2/ai-status
```

Expected response for AI-status:
```json
{
  "healthy": true,
  "status": "running",
  "mode": "✅ AI-Powered"
}
```

---

## Manual Deployment (If Script Fails)

### Step 1: Connect to Server

```bash
ssh -i ~/.ssh/your-key.pem ubuntu@YOUR_SERVER_IP
```

### Step 2: Install System Dependencies

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install required packages
sudo apt-get install -y curl git wget build-essential

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python
sudo apt-get install -y python3.9 python3-pip python3-venv

# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh
```

### Step 3: Clone Repository

```bash
# Create deploy directory
sudo mkdir -p /opt/mockmate
sudo chown ubuntu:ubuntu /opt/mockmate

# Clone repo
cd /opt/mockmate
git clone https://github.com/vansh-tambi/MockMate.git .
```

### Step 4: Install Dependencies

```bash
# Node.js dependencies
cd /opt/mockmate/server
npm install --production

# Python environment
cd /opt/mockmate/ai_service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Step 5: Download Phi-3 Model

```bash
# Start Ollama daemon (if not running)
ollama serve &

# Pull Phi-3 model (3.8GB - takes 5-10 minutes)
ollama pull phi3
```

### Step 6: Setup PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Install PM2 logrotate plugin
pm2 install pm2-logrotate

# Start services
cd /opt/mockmate
pm2 start ecosystem.config.js

# Configure auto-startup
pm2 save
sudo pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Verify services started
pm2 status
```

### Step 7: Configure Firewall

```bash
# Allow SSH
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh

# Allow your backend port
sudo ufw allow 5000/tcp

# If using NGINX proxy (recommended), allow 80/443
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

---

## Advanced Configuration

### Using NGINX as Reverse Proxy

Create `/etc/nginx/sites-available/mockmate`:

```nginx
upstream mockmate_backend {
    server localhost:5000;
}

server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://mockmate_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/mockmate /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Enable HTTPS with Let's Encrypt

```bash
# Install certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
```

### Scale to Multiple Instances

Update `ecosystem.config.js`:

```javascript
{
  name: 'mockmate-backend',
  script: 'server/index.js',
  instances: 2,          // Add this
  exec_mode: 'cluster',  // Add this
  // ... rest of config
}
```

Restart:

```bash
pm2 restart ecosystem.config.js
```

---

## Monitoring & Maintenance

### Check Service Status

```bash
# Real-time monitoring
pm2 monit

# View all services
pm2 status

# View specific service logs
pm2 logs mockmate-backend
pm2 logs mockmate-ai
pm2 logs ollama

# View last 100 lines
pm2 logs mockmate-backend --lines 100
```

### Restart Services

```bash
# Restart all
pm2 restart all

# Restart specific service
pm2 restart mockmate-ai

# Stop all
pm2 stop all

# Start all
pm2 start all
```

### Monitor Resource Usage

```bash
# View memory/CPU
ps aux | grep node
ps aux | grep python
ps aux | grep ollama

# Or use htop (install if needed: sudo apt-get install htop)
htop
```

### Check Disk Space

```bash
# View disk usage
df -h

# Free up space (if needed)
sudo apt-get autoclean
sudo apt-get autoremove
```

### View System Logs

```bash
# Application logs
pm2 logs

# System logs
sudo journalctl -u pm2-ubuntu.service -f

# Firewall logs
sudo tail -f /var/log/ufw.log
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check if port is in use
sudo netstat -tulpn | grep -E ':5000|:8000|:11434'

# Kill process using port
sudo kill -9 <PID>

# Or change ports in ecosystem.config.js and restart
```

### Ollama Not Responding

```bash
# Check if Ollama is running
ps aux | grep ollama

# Restart Ollama
pm2 restart ollama

# Check logs
pm2 logs ollama

# Manually start (for debugging)
ollama serve
```

### AI Service Errors

```bash
# Check Python errors
pm2 logs mockmate-ai

# Verify model is downloaded
ollama list

# Reconnect to model
ollama pull phi3
```

### Backend Connection Issues

```bash
# Test AI service connection
curl http://localhost:8000/health

# Test Ollama connection
curl http://localhost:11434/api/tags

# Restart backend to reconnect
pm2 restart mockmate-backend
```

### Out of Memory

```bash
# Check current usage
pm2 status

# Increase memory limits in ecosystem.config.js:
# max_memory_restart: '8G'  // Increase from 4G

# Or reduce instances
# instances: 1  // Reduce from 2+

# Restart
pm2 restart all
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew manually
sudo certbot renew

# Auto-renewal status
sudo systemctl status certbot.timer
```

---

## Environment Variables

Set in `server/.env`:

```bash
NODE_ENV=production
PORT=5000
AI_SERVICE_URL=http://localhost:8000
DATABASE_URL=postgresql://user:password@localhost:5432/mockmate
```

Set in `ai_service/.env`:

```bash
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=phi3
PORT=8000
```

---

## Backup & Recovery

### Backup Interview Data

```bash
# Export database (if PostgreSQL)
pg_dump mockmate > mockmate_backup.sql

# Copy from server
scp -i ~/.ssh/your-key.pem ubuntu@YOUR_SERVER_IP:/opt/mockmate/mockmate_backup.sql ./

# Restore on different server
psql mockmate < mockmate_backup.sql
```

### Restore from Backup

```bash
# Copy backup to server
scp -i ~/.ssh/your-key.pem ./mockmate_backup.sql ubuntu@YOUR_SERVER_IP:/opt/mockmate/

# SSH to server and restore
ssh -i ~/.ssh/your-key.pem ubuntu@YOUR_SERVER_IP
cd /opt/mockmate
psql mockmate < mockmate_backup.sql
```

---

## Performance Tuning

### Increase Ollama Model Threads

Edit ecosystem.config.js:

```javascript
{
  name: 'ollama',
  env: {
    OLLAMA_NUM_THREAD: '8',    // CPU threads to use
    OLLAMA_NUM_GPU: '1'         // GPU usage if available
  }
}
```

### Optimize Node.js

```javascript
// In ecosystem.config.js
{
  name: 'mockmate-backend',
  node_args: '--max-old-space-size=2048'  // 2GB heap limit
}
```

### Cache Responses

Update AI Service response handling to include caching headers.

---

## Cost Optimization

### Monitor Resource Usage

```bash
# Check what's consuming most resources
pm2 monit

# Typical usage:
# - Ollama: 2-3GB RAM (running)
# - AI Service: 500MB-1GB RAM
# - Backend: 200-300MB RAM
```

### Reduce Costs

1. **Use spot instances** on AWS/GCP for flexible workloads
2. **Autoscale** - reduce instances during off-hours
3. **CDN** for static assets (resume PDFs, etc.)
4. **Database** - use managed services (AWS RDS) instead of dedicated instance

---

## Deployment Checklist

- [ ] Server created and accessible via SSH
- [ ] Deployment script executed successfully
- [ ] All three services showing "online" in pm2 status
- [ ] `/v2/ai-status` endpoint returns healthy
- [ ] Test interview completes with AI evaluation
- [ ] Logs are being written to `/opt/mockmate/logs/`
- [ ] Firewall allows inbound on required ports
- [ ] NGINX configured (if using reverse proxy)
- [ ] SSL certificate installed (if HTTPS needed)
- [ ] Database backed up
- [ ] Auto-startup configured (`pm2 save`)
- [ ] Monitoring alerts set up (optional)

---

## Support

For issues during deployment:

1. Check logs: `pm2 logs`
2. Verify ports: `sudo netstat -tulpn`
3. Test services individually
4. See Troubleshooting section above
5. Check GitHub issues: https://github.com/vansh-tambi/MockMate/issues

---

**Version:** Production Deployment v2.0  
**Last Updated:** 2024  
**Status:** Ready for production
