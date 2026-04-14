# Production Quick Reference

## Daily Operations

### Check Everything is OK

```bash
# SSH to production
ssh -i ~/.ssh/your-key.pem ubuntu@PROD_SERVER

# View all services
pm2 status

# View combined logs
pm2 logs

# Monitor in real-time
pm2 monit
```

### Service Health

```bash
# Check all three services
curl http://localhost:11434/api/tags          # Ollama
curl http://localhost:8000/health             # AI Service
curl http://localhost:5000/api/interview/v2/ai-status  # Backend

# All should respond OK
```

---

## Common Tasks

### Restart Individual Service

```bash
pm2 restart mockmate-backend    # Just the Node server
pm2 restart mockmate-ai         # Just the AI service
pm2 restart ollama              # Just Ollama
```

### Stop a Service (for maintenance)

```bash
pm2 stop mockmate-backend       # Won't auto-restart
pm2 start mockmate-backend      # Start again
```

### View Service Logs

```bash
pm2 logs mockmate-backend --lines 50    # Last 50 lines
pm2 logs mockmate-ai                    # All logs
pm2 logs ollama -f                      # Stream (Ctrl+C to exit)
```

### Full System Restart

```bash
pm2 stop all        # Stop services
pm2 start all       # Start again
# OR
pm2 restart all     # Restart all
```

### Emergency Stop Everything

```bash
pm2 delete all
# Services won't auto-restart, but you can recover:
pm2 resurrect       # Restore from last saved state
```

---

## Monitoring

### Resource Usage

```bash
# View memory/CPU for each service
ps aux | grep -E 'node|python|ollama'

# Or use PM2's monitor
pm2 monit
```

### Disk Space

```bash
# Check available space
df -h

# Check what's using space
du -sh /opt/mockmate/*

# Clean up logs if needed
pm2 flush        # Clear all PM2 logs
```

### Database Size (if PostgreSQL)

```bash
# Connect to DB and check size
psql -U postgres -d mockmate -c "SELECT version();"

# Check table sizes
psql -U postgres -d mockmate -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables ORDER BY pg_total_relation_size DESC;"
```

---

## Troubleshooting

### Service Won't Restart

```bash
# Check if port is still in use
sudo lsof -i :5000
sudo lsof -i :8000
sudo lsof -i :11434

# Kill the process (if stuck)
sudo kill -9 <PID>

# Then restart
pm2 restart mockmate-backend
```

### Ollama Slow/Timeout

```bash
# Check if model is loaded
ollama list

# Restart Ollama
pm2 restart ollama

# Or manually check
ollama ps

# If stuck, kill and restart
pkill ollama
pm2 restart ollama
```

### AI Service Errors

```bash
# Check for Python errors
pm2 logs mockmate-ai --lines 100

# Test if Ollama is reachable from AI service
# SSH and run: curl http://localhost:11434/api/tags

# Restart the service
pm2 restart mockmate-ai
```

### Backend Not Responding

```bash
# Check if Node process exists
ps aux | grep 'node.*index.js'

# Check logs for errors
pm2 logs mockmate-backend --lines 50

# Verify ports are listening
netstat -tulpn | grep -E ':5000|:8000|:11434'

# Restart
pm2 restart mockmate-backend
```

### Out of Memory

```bash
# Check current memory
pm2 status
# or
free -h

# Increase memory limit in ecosystem.config.js
# max_memory_restart: '2G'  -> change to '4G'

# Restart
pm2 restart all
```

---

## Performance

### Current Setup Handles

- **~100 concurrent users** (single instance)
- **Phi-3 evaluation**: ~1-3 seconds per answer
- **Question generation**: ~2-5 seconds
- **Interview creation**: instant (from JSON)

### Scale Up

To handle more users:

```javascript
// In ecosystem.config.js
{
  name: 'mockmate-backend',
  instances: 4,           // Run 4 copies
  exec_mode: 'cluster',   // Load balance between them
  max_memory_restart: '500M'
}
```

Then restart:
```bash
pm2 restart mockmate-backend
```

### Optimize Code

- Add caching for question sets
- Use Redis for session storage
- Implement question response caching (same question = cached evaluation)
- Use CDN for resume PDFs

---

## Deployment Updates

### Pull Latest Code

```bash
cd /opt/mockmate
git pull origin main

# Install any new dependencies
cd server && npm install --production && cd ..
cd ai_service
source venv/bin/activate
pip install -r requirements.txt
cd ..

# Restart
pm2 restart all
```

### Zero-Downtime Deployment (Advanced)

If using multiple backend instances:

```bash
pm2 reload mockmate-backend --update-env

# Or manually rolling restart:
pm2 stop mockmate-backend --stop-exit-codes 0
pm2 start ecosystem.config.js --only mockmate-backend
```

---

## Monitoring Alerts

### Set Up Email on Failure

```bash
# Install PM2 notification module
npm install -g pm2-auto-pull pm2-slack

# Configure
pm2 install pm2-slack

# When service crashes, get notification
```

### Simple Health Check Script

Create `health-check.sh`:

```bash
#!/bin/bash

WEBHOOK="https://hooks.slack.com/YOUR_SLACK_WEBHOOK"

check_service() {
    local url=$1
    local name=$2
    
    if ! curl -s "$url" > /dev/null; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"⚠️ $name is DOWN\"}" \
            $WEBHOOK
    fi
}

check_service "http://localhost:11434/api/tags" "Ollama"
check_service "http://localhost:8000/health" "AI Service"
check_service "http://localhost:5000/api/interview/v2/ai-status" "Backend"
```

Run every 5 minutes:
```bash
# Add to crontab
crontab -e

# Add:
*/5 * * * * /opt/mockmate/health-check.sh
```

---

## Database Maintenance

### Backup Interview Data

```bash
# Daily backup
pg_dump mockmate > /opt/backups/mockmate_$(date +%Y%m%d).sql

# Add to crontab for automatic daily backup
# 0 2 * * * pg_dump mockmate > /opt/backups/mockmate_$(date +\%Y\%m\%d).sql
```

### Monitor Database Performance

```bash
# Connect to database
psql mockmate

# Check slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;

# Check index usage
SELECT schemaname, tabname, indexname FROM pg_indexes WHERE schemaname NOT IN ('pg_catalog', 'information_schema');
```

---

## Cost Optimization Tips

1. **Use spot instances** during off-peak hours
2. **Autoscale up/down** based on traffic patterns
3. **Monitor unused resources** - use `free`, `top`, `du`
4. **Cache aggressively** - questions, evaluations, user sessions
5. **Use CDN** for static files (images, patterns)
6. **Archive old data** - move completed interviews to cold storage

---

## Emergency Procedures

### Complete System Failure

```bash
# 1. Check what's broken
pm2 status

# 2. Restart all
pm2 restart all

# 3. If still broken, check logs
pm2 logs

# 4. Last resort - full restart
pm2 kill
pm2 start ecosystem.config.js
pm2 save
```

### Disk Full

```bash
# Find large files
du -sh /opt/mockmate/* | sort -rh | head -10

# Clear logs
pm2 flush

# Archive old data
tar -czf /backups/old_data.tar.gz /opt/mockmate/old_interviews/

# Clean up
rm -rf /opt/mockmate/old_interviews/
```

### Database Corruption

```bash
# 1. Backup current (if not already corrupted)
pg_dump mockmate > /backups/corrupted.sql

# 2. Restore from last good backup
psql mockmate < /backups/mockmate_20240115.sql

# 3. Restart services
pm2 restart mockmate-backend
```

### Loss of Phi-3 Model

```bash
# Ollama has automatic fallback, but to reinstall:
ollama pull phi3

# Restart AI service
pm2 restart mockmate-ai
```

---

## Command Quick Reference

| Task | Command |
|------|---------|
| View all services | `pm2 status` |
| Restart service | `pm2 restart <name>` |
| Stop service | `pm2 stop <name>` |
| View logs | `pm2 logs <name>` |
| Monitor resources | `pm2 monit` |
| Save state | `pm2 save` |
| Restore state | `pm2 resurrect` |
| Kill all | `pm2 kill` |
| Start from config | `pm2 start ecosystem.config.js` |
| Check Ollama | `ollama list` |
| Check disk | `df -h` |
| Check memory | `free -h` |
| Top processes | `top` |
| Live logs | `pm2 logs mockmate-backend -f` |

---

## Important Ports

- **5000** - Node.js backend (main access point)
- **8000** - Python AI service (internal only)
- **11434** - Ollama (internal only)
- **80** - NGINX (if reverse proxy)
- **443** - NGINX SSL (if HTTPS)

**Never expose 8000 or 11434 to public internet!** Only 5000 should be accessible, and preferably through NGINX proxy.

---

## Log Locations

```bash
# PM2 logs
/root/.pm2/logs/

# Application logs
/opt/mockmate/logs/

# System logs
/var/log/syslog

# Firewall
/var/log/ufw.log
```

View:
```bash
pm2 logs              # Live output
tail -f <file>        # Follow specific file
less <file>           # Browse file
grep <pattern> <file> # Search
```

---

**Keep this handy for daily operations! Print or bookmark.**
