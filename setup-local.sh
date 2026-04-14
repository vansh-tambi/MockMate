#!/bin/bash
# setup-local.sh
# Local development setup for MockMate with Phi-3 AI

set -e

echo "================================"
echo "MockMate Local Setup"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Install Ollama
echo -e "${YELLOW}Step 1: Installing Ollama...${NC}"
if ! command -v ollama &> /dev/null; then
    echo "Installing Ollama..."
    curl -fsSL https://ollama.ai/install.sh | sh
    echo -e "${GREEN}✅ Ollama installed${NC}"
else
    echo -e "${GREEN}✅ Ollama already installed${NC}"
fi

# Step 2: Pull Phi-3 model
echo -e "\n${YELLOW}Step 2: Pulling Phi-3 model (3.8GB - may take a few minutes)...${NC}"
ollama pull phi3
echo -e "${GREEN}✅ Phi-3 model ready${NC}"

# Step 3: Setup AI Service
echo -e "\n${YELLOW}Step 3: Setting up Python AI Service...${NC}"
cd ai_service

if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
    echo -e "${GREEN}✅ Virtual environment created${NC}"
fi

echo "Activating virtual environment..."
source venv/bin/activate 2>/dev/null || . venv/Scripts/activate

echo "Installing Python dependencies..."
pip install -q -r requirements.txt
echo -e "${GREEN}✅ Python dependencies installed${NC}"

cd ..

# Step 4: Setup Node.js Server
echo -e "\n${YELLOW}Step 4: Setting up Node.js Server...${NC}"
cd server

if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install --silent
    echo -e "${GREEN}✅ Node dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Node dependencies already installed${NC}"
fi

cd ..

# Step 5: Create .env file
echo -e "\n${YELLOW}Step 5: Checking .env configuration...${NC}"
if [ ! -f "server/.env" ]; then
    echo "Creating .env file..."
    cat > server/.env << EOF
PORT=5000
NODE_ENV=development
AI_SERVICE_URL=http://localhost:8000
GEMINI_API_KEY=your_gemini_key_here

# Add your API keys above
EOF
    echo -e "${YELLOW}⚠️  Please update server/.env with your API keys${NC}"
else
    echo -e "${GREEN}✅ .env file exists${NC}"
fi

if [ ! -f "ai_service/.env" ]; then
    echo "Creating AI service .env..."
    cat > ai_service/.env << EOF
OLLAMA_BASE_URL=http://localhost:11434
GEMINI_API_KEY=your_gemini_key_here
PORT=8000
EOF
fi

# Summary
echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}================================${NC}"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo -e "\n${GREEN}Terminal 1 - Start Ollama:${NC}"
echo "  ollama serve"

echo -e "\n${GREEN}Terminal 2 - Start AI Service:${NC}"
echo "  cd ai_service"
echo "  source venv/bin/activate"
echo "  python -m uvicorn app:app --host 0.0.0.0 --port 8000"

echo -e "\n${GREEN}Terminal 3 - Start Server:${NC}"
echo "  cd server"
echo "  npm start"

echo -e "\n${GREEN}Test:${NC}"
echo "  http://localhost:5000/api/interview/v2/ai-status"

echo -e "\n${YELLOW}Report any issues!${NC}\n"
