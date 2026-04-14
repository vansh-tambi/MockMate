/**
 * ecosystem.config.js
 * PM2 Configuration for MockMate
 * 
 * Start all services:
 *   pm2 start ecosystem.config.js
 * 
 * Monitor:
 *   pm2 monit
 * 
 * Logs:
 *   pm2 logs
 */

module.exports = {
  apps: [
    // Ollama - Local LLM Runtime (Port 11434)
    {
      name: 'ollama',
      script: 'ollama',
      args: 'serve',
      interpreter: 'none',
      cwd: process.env.HOME || '/root',
      env: {
        OLLAMA_HOST: '0.0.0.0:11434'
      },
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '4G',
      error_file: './logs/ollama.error.log',
      out_file: './logs/ollama.out.log',
      log_file: './logs/ollama.combined.log',
      time: true
    },

    // Python AI Service (Port 8000)
    {
      name: 'mockmate-ai',
      script: 'ai_service/app.py',
      interpreter: 'python3',
      cwd: __dirname,
      args: 'uvicorn app:app --host 0.0.0.0 --port 8000',
      env: {
        PYTHONUNBUFFERED: 1,
        OLLAMA_BASE_URL: 'http://localhost:11434',
        NODE_ENV: 'production'
      },
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/ai-service.error.log',
      out_file: './logs/ai-service.out.log',
      log_file: './logs/ai-service.combined.log',
      time: true,
      // Wait for ollama before starting
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000
    },

    // Node.js Backend Server (Port 5000)
    {
      name: 'mockmate-backend',
      script: 'server/index.js',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        AI_SERVICE_URL: 'http://localhost:8000',
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || ''
      },
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: './logs/backend.error.log',
      out_file: './logs/backend.out.log',
      log_file: './logs/backend.combined.log',
      time: true,
      // Wait for AI service before starting
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000
    }
  ],

  deploy: {
    production: {
      user: 'ubuntu',
      host: 'your-server-ip',
      key: '/path/to/ssh/key',
      ref: 'origin/main',
      repo: 'https://github.com/vansh-tambi/MockMate.git',
      path: '/opt/mockmate',
      'post-deploy': 'npm install && npm start && pm2 start ecosystem.config.js'
    }
  }
};
