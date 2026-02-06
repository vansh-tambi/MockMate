#!/usr/bin/env python3
"""
Test script to verify Gemini API backup functionality
Run this to test if the fallback mechanism works
"""

import os
import sys
import httpx
import json

# Configuration
OLLAMA_BASE_URL = "http://localhost:11434"
AI_SERVICE_URL = "http://localhost:8000"
TIMEOUT = 10.0

def test_health_check():
    """Test the health endpoint to see available backends"""
    print("\n🔍 Testing health check endpoint...")
    try:
        response = httpx.get(f"{AI_SERVICE_URL}/health", timeout=TIMEOUT)
        health = response.json()
        
        print(f"Status: {health.get('status')}")
        print(f"Ollama: {health.get('ollama')}")
        print(f"Gemini Backup: {health.get('gemini_backup')}")
        print(f"RAG Enabled: {health.get('rag_enabled')}")
        
        return health
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return None

def test_evaluation_with_ollama():
    """Test evaluation when Ollama is available"""
    print("\n🧪 Testing evaluation with Ollama...")
    
    payload = {
        "question": "Explain what a closure is in JavaScript",
        "user_answer": "A closure is when a function has access to variables from its outer scope",
        "ideal_points": [
            "Function remembers variables from outer scope",
            "Created when function is defined",
            "Can access outer scope variables even after outer function returns"
        ]
    }
    
    try:
        response = httpx.post(
            f"{AI_SERVICE_URL}/evaluate",
            json=payload,
            timeout=30.0
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Evaluation successful!")
            print(f"Score: {result.get('score')}/10")
            print(f"Strengths: {result.get('strengths')}")
            print(f"Improvements: {result.get('improvements')}")
            return True
        else:
            print(f"❌ Evaluation failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error during evaluation: {e}")
        return False

def check_ollama_status():
    """Check if Ollama is running"""
    print("\n🔎 Checking Ollama status...")
    try:
        response = httpx.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5.0)
        if response.status_code == 200:
            models = response.json().get("models", [])
            print(f"✅ Ollama is running")
            print(f"Available models: {[m['name'] for m in models]}")
            return True
        else:
            print(f"⚠️ Ollama returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"⚠️ Ollama is NOT running: {e}")
        return False

def check_gemini_configuration():
    """Check if Gemini API is configured"""
    print("\n🔎 Checking Gemini API configuration...")
    
    gemini_key = os.getenv("GEMINI_API_KEY")
    
    if gemini_key:
        print(f"✅ GEMINI_API_KEY is set")
        print(f"Key length: {len(gemini_key)} characters")
        return True
    else:
        print(f"⚠️ GEMINI_API_KEY is NOT set")
        print(f"To enable Gemini backup, run:")
        print(f"   Windows: $env:GEMINI_API_KEY='your-api-key'")
        print(f"   Linux/Mac: export GEMINI_API_KEY='your-api-key'")
        return False

def main():
    """Run all tests"""
    print("=" * 60)
    print("🤖 MockMate AI Service - Gemini Backup Test Suite")
    print("=" * 60)
    
    # Check configurations
    print("\n📋 Configuration Check:")
    gemini_configured = check_gemini_configuration()
    ollama_running = check_ollama_status()
    
    # Test health endpoint
    print("\n📡 Health endpoint test:")
    health = test_health_check()
    
    # Test evaluation
    print("\n🧪 Evaluation test:")
    if ollama_running:
        eval_success = test_evaluation_with_ollama()
    else:
        print("⏭️  Skipping evaluation test (Ollama not running)")
        eval_success = None
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 SUMMARY")
    print("=" * 60)
    
    if health:
        print(f"\n✅ AI Service is running")
        print(f"   Ollama: {health.get('ollama')}")
        print(f"   Gemini Backup: {health.get('gemini_backup')}")
        
        if health.get('ollama') == 'connected':
            print(f"\n✅ Ollama is the primary backend")
        elif health.get('gemini_backup') == 'available':
            print(f"\n⚠️  Ollama is down, but Gemini backup is available")
            print(f"   Requests will automatically fallback to Gemini")
        else:
            print(f"\n❌ Neither Ollama nor Gemini is available")
            print(f"   Configure GEMINI_API_KEY to enable backup")
    else:
        print(f"\n❌ Cannot connect to AI Service at {AI_SERVICE_URL}")
        print(f"   Make sure to start the service first:")
        print(f"   $ uvicorn app:app --reload --port 8000")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()
