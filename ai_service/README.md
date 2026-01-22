# 🤖 MockMate AI Service

> Internal AI Engine - Intelligence Layer Microservice

This is the isolated AI/ML service for MockMate. It handles all LLM inference, evaluation, and future RAG operations.

---

## 🎯 Purpose

**What this service does:**
- Evaluates candidate answers using local LLM (Phi-3)
- Provides structured feedback (strengths, improvements, score)
- Future: RAG-based question retrieval, embeddings, fine-tuning

**What this service does NOT do:**
- Auth, sessions, DB access
- Resume parsing, file uploads
- UI rendering, routing
- Business logic

This is a **pure intelligence layer**. Single responsibility: convert structured input → intelligent output.

---

## 🏗️ Architecture

```
client/ (React)
    ↓
server/ (Node/Express) ← orchestration, business logic
    ↓
ai_service/ (Python/FastAPI) ← THIS FOLDER
    ↓
Ollama (Phi-3, local)
```

**Why separate?**
- Node event loop isn't blocked by model inference
- Can scale independently
- Memory isolation
- Swap models without touching Node code
- Standard microservice pattern

---

## 🚀 Quick Start

### Prerequisites

1. **Python 3.10+**
   ```bash
   python --version
   ```

2. **Ollama installed and running**
   ```bash
   ollama --version
   ollama pull phi3
   ollama serve
   ```

### Installation

1. **Navigate to ai_service**
   ```bash
   cd ai_service
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   ```

3. **Activate venv**
   - Windows:
     ```bash
     .\venv\Scripts\activate
     ```
   - Mac/Linux:
     ```bash
     source venv/bin/activate
     ```

4. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

### Run the Service

```bash
uvicorn app:app --reload --port 8000
```

Service runs on `http://localhost:8000`

---

## 📡 API Endpoints

### Health Check

**GET** `/health`

Check if service and Ollama are connected.

**Response:**
```json
{
  "status": "healthy",
  "ollama": "connected",
  "available_models": ["phi3", "mistral", ...],
  "active_model": "phi3"
}
```

### Evaluate Answer

**POST** `/evaluate`

Evaluate candidate's interview answer.

**Request:**
```json
{
  "question": "Explain React hooks",
  "user_answer": "Hooks are functions that let you use state...",
  "ideal_points": [
    "useState for state management",
    "useEffect for side effects",
    "Custom hooks for reusability"
  ]
}
```

**Response:**
```json
{
  "strengths": [
    "Clear explanation of useState",
    "Good use of examples",
    "Mentioned side effects correctly"
  ],
  "improvements": [
    "Could elaborate on custom hooks",
    "Add lifecycle comparison"
  ],
  "score": 7,
  "feedback": "Strengths:\n- Clear explanation...\n\nImprovements:\n- Could elaborate...\n\nScore: 7"
}
```

**Timeout:** 60 seconds  
**Score range:** 0–10 (clamped)

---

## 🛠️ Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | FastAPI | Async API, auto docs |
| Validation | Pydantic | Request/response models |
| HTTP Client | httpx | Async Ollama communication |
| LLM Runtime | Ollama | Local model inference |
| Model | Phi-3 | Lightweight, accurate eval |

---

## 🧠 Model Configuration

**Current:** Phi-3 (3.8B params)
- Fast inference (~2-5s per eval)
- Good reasoning for evaluation
- Runs on CPU (dev) or GPU (prod)

**Temperature:** 0.3 (low for consistency)  
**Top-p:** 0.9  
**Timeout:** 60s

**Alternative models:**
- `mistral` - Better instruction following
- `llama3` - More general knowledge
- `codellama` - For code-heavy roles

Switch model:
```python
MODEL_NAME = "mistral"  # in app.py
```

---

## 🔧 Configuration

Create `.env` file (optional):
```env
OLLAMA_BASE_URL=http://localhost:11434
MODEL_NAME=phi3
TIMEOUT=60.0
PORT=8000
```

---

## 🧪 Testing

### Manual Testing

1. **Health check**
   ```bash
   curl http://localhost:8000/health
   ```

2. **Evaluate endpoint**
   ```bash
   curl -X POST http://localhost:8000/evaluate \
     -H "Content-Type: application/json" \
     -d '{
       "question": "What is React?",
       "user_answer": "React is a JavaScript library for building UIs",
       "ideal_points": ["Component-based", "Virtual DOM", "Declarative"]
     }'
   ```

3. **Interactive docs**
   Open `http://localhost:8000/docs`

### Future: Automated Tests

```bash
pytest tests/
```

---

## 📊 Performance

**Current benchmarks (Phi-3 on CPU):**
- Cold start: ~8s (model load)
- Warm inference: ~2-5s per evaluation
- Memory: ~4GB (model loaded)

**With GPU:**
- Inference: ~500ms-1s
- Throughput: 10-20 req/sec

---

## 🚨 Error Handling

| Error | Code | Reason |
|-------|------|--------|
| Empty answer | 400 | Validation failed |
| Ollama down | 503 | Service unavailable |
| Timeout | 504 | >60s inference |
| Parse error | 500 | LLM output malformed |

All responses include descriptive error messages.

---

## 🔒 Security Notes

**Current (dev):**
- No auth (assumes internal network)
- CORS: localhost only

**Production TODO:**
- Add API key auth
- Rate limiting per client
- Request size limits
- Logging/monitoring
- HTTPS only
- Environment-based CORS

---

## 🛣️ Roadmap

### Phase 1: Evaluation ✅ (current)
- [x] Basic evaluation endpoint
- [x] Ollama integration
- [x] Structured output parsing
- [x] Error handling

### Phase 2: Retrieval (next)
- [ ] Question embeddings endpoint
- [ ] Vector search (FAISS/Chroma)
- [ ] Metadata filtering
- [ ] Question ranking

### Phase 3: Generation
- [ ] Question rephrasing
- [ ] Guidance generation
- [ ] Follow-up suggestions

### Phase 4: Advanced
- [ ] Multi-model support
- [ ] Fine-tuned eval model
- [ ] Batch processing
- [ ] Caching layer

---

## 🐛 Troubleshooting

**"Ollama not available"**
- Check: `ollama serve` is running
- Verify: `curl http://localhost:11434/api/tags`

**"Model not found"**
- Pull model: `ollama pull phi3`

**"Timeout"**
- Increase `TIMEOUT` in app.py
- Check Ollama logs: `ollama logs`

**"Parse error"**
- LLM output was malformed
- Falls back to defaults (check logs)

---

## 📝 Development Guidelines

### Adding New Endpoints

1. Define Pydantic models
2. Add route with type hints
3. Handle errors explicitly
4. Return structured responses
5. Update this README

### Code Style

- Use type hints everywhere
- Async for all I/O
- Pydantic for validation
- Descriptive error messages
- Comments for complex logic

---

## 📚 Related Documentation

- [Main Project README](../README.md)
- [Server Documentation](../server/README.md)
- [Ollama Docs](https://ollama.ai/docs)
- [FastAPI Docs](https://fastapi.tiangolo.com)

---

## 👤 Maintenance

This service is part of MockMate.

**Owner:** Vansh Tambi  
**Repository:** [vansh-tambi/MockMate](https://github.com/vansh-tambi/MockMate)

---

**Made with 🤖 for MockMate**
