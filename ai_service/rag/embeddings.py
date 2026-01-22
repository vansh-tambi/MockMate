"""
RAG Embeddings Module

Handles:
- Creating embeddings for questions
- Building FAISS/ChromaDB index
- Storing and loading embeddings

Usage:
    from rag.embeddings import create_embeddings, build_index
    
    questions = load_questions('data/questions.json')
    embeddings = create_embeddings(questions)
    index = build_index(embeddings)
"""

from sentence_transformers import SentenceTransformer
import numpy as np
import json
from typing import List, Dict
import faiss

# Model for embeddings
MODEL_NAME = "all-MiniLM-L6-v2"  # 384 dimensions, fast, good quality
model = None

def get_model():
    """Lazy load the embedding model"""
    global model
    if model is None:
        print(f"Loading embedding model: {MODEL_NAME}")
        model = SentenceTransformer(MODEL_NAME)
    return model

def create_question_embedding(question: Dict) -> np.ndarray:
    """
    Create embedding for a single question.
    Combines question text + ideal_points for richer representation.
    """
    m = get_model()
    
    # Combine text for embedding
    text = question['question']
    if question.get('ideal_points'):
        text += ' ' + ' '.join(question['ideal_points'])
    
    embedding = m.encode(text, convert_to_numpy=True)
    return embedding

def create_embeddings(questions: List[Dict]) -> np.ndarray:
    """Create embeddings for all questions"""
    print(f"Creating embeddings for {len(questions)} questions...")
    
    embeddings = []
    for q in questions:
        emb = create_question_embedding(q)
        embeddings.append(emb)
    
    embeddings = np.array(embeddings).astype('float32')
    print(f"Created embeddings: shape {embeddings.shape}")
    return embeddings

def build_faiss_index(embeddings: np.ndarray):
    """Build FAISS index for fast similarity search"""
    dimension = embeddings.shape[1]
    
    # Use IndexFlatL2 for exact search (good for small datasets)
    # For larger datasets, use IndexIVFFlat or IndexHNSW
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings)
    
    print(f"Built FAISS index: {index.ntotal} vectors, {dimension} dimensions")
    return index

def save_index(index, questions: List[Dict], path_prefix: str = 'data/embeddings'):
    """Save FAISS index and question metadata"""
    faiss.write_index(index, f"{path_prefix}.index")
    
    with open(f"{path_prefix}_questions.json", 'w') as f:
        json.dump(questions, f, indent=2)
    
    print(f"Saved index and metadata to {path_prefix}.*")

def load_index(path_prefix: str = 'data/embeddings'):
    """Load FAISS index and question metadata"""
    index = faiss.read_index(f"{path_prefix}.index")
    
    with open(f"{path_prefix}_questions.json", 'r') as f:
        questions = json.load(f)
    
    print(f"Loaded index: {index.ntotal} vectors")
    return index, questions

if __name__ == "__main__":
    # Build index from questions.json
    print("=" * 60)
    print("Building embeddings index...")
    print("=" * 60)
    
    with open('data/questions.json', 'r') as f:
        questions = json.load(f)
    
    embeddings = create_embeddings(questions)
    index = build_faiss_index(embeddings)
    save_index(index, questions)
    
    print("\n✅ Embeddings built successfully!")
    print("Run: python rag/retrieve.py to test retrieval")
