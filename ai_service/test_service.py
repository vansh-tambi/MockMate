"""
Test script for AI Service

Usage:
    python test_service.py
"""

import httpx
import json
import sys

BASE_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint"""
    print("🔍 Testing /health endpoint...")
    try:
        response = httpx.get(f"{BASE_URL}/health", timeout=10.0)
        print(f"✅ Status: {response.status_code}")
        data = response.json()
        print(f"   Service: {data.get('status')}")
        print(f"   Ollama: {data.get('ollama')}")
        print(f"   Model: {data.get('active_model')}")
        print(f"   Available: {', '.join(data.get('available_models', []))}\n")
        return True
    except Exception as e:
        print(f"❌ Health check failed: {e}\n")
        return False

def test_evaluate():
    """Test evaluate endpoint"""
    print("🔍 Testing /evaluate endpoint...")
    
    payload = {
        "question": "What is React and why is it popular?",
        "user_answer": "React is a JavaScript library for building user interfaces. It's popular because it uses a component-based architecture, has a virtual DOM for performance, and has a large ecosystem.",
        "ideal_points": [
            "Component-based architecture",
            "Virtual DOM for performance",
            "Declarative syntax",
            "Large ecosystem and community"
        ]
    }
    
    try:
        response = httpx.post(
            f"{BASE_URL}/evaluate",
            json=payload,
            timeout=60.0
        )
        
        print(f"✅ Status: {response.status_code}")
        data = response.json()
        
        print(f"\n📊 Evaluation Results:")
        print(f"   Score: {data.get('score')}/10")
        
        print(f"\n💪 Strengths:")
        for s in data.get('strengths', []):
            print(f"   - {s}")
        
        print(f"\n📈 Improvements:")
        for i in data.get('improvements', []):
            print(f"   - {i}")
        
        print(f"\n📝 Full Feedback:")
        print(f"   {data.get('feedback')[:200]}...\n")
        
        return True
        
    except httpx.TimeoutException:
        print(f"❌ Request timed out (>60s)\n")
        return False
    except Exception as e:
        print(f"❌ Evaluation failed: {e}\n")
        return False

def main():
    print("=" * 60)
    print("🤖 MockMate AI Service Test Suite")
    print("=" * 60 + "\n")
    
    # Test health
    if not test_health():
        print("⚠️  Make sure the service is running:")
        print("   cd ai_service")
        print("   uvicorn app:app --reload --port 8000\n")
        sys.exit(1)
    
    # Test evaluate
    if not test_evaluate():
        print("⚠️  Evaluation test failed\n")
        sys.exit(1)
    
    print("=" * 60)
    print("✅ All tests passed!")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    main()
