"""
RAG Retrieval Module

Handles:
- Semantic search over question bank
- Filtering by metadata (role, level, skill)
- Ranking and scoring

Usage:
    from rag.retrieve import QuestionRetriever
    
    retriever = QuestionRetriever()
    results = retriever.retrieve(
        resume_text="Software engineer with React experience",
        job_description="Senior Frontend Developer",
        top_k=10
    )
"""

import numpy as np
import json
from typing import List, Dict, Optional
from sentence_transformers import SentenceTransformer
import faiss

class QuestionRetriever:
    def __init__(self, index_path: str = 'data/embeddings'):
        """Initialize retriever with pre-built index"""
        self.model = SentenceTransformer("all-MiniLM-L6-v2")
        
        # Load index and questions
        self.index = faiss.read_index(f"{index_path}.index")
        with open(f"{index_path}_questions.json", 'r') as f:
            self.questions = json.load(f)
        
        print(f"✅ Loaded {len(self.questions)} questions")
    
    def encode_query(self, text: str) -> np.ndarray:
        """Encode query text to embedding"""
        return self.model.encode(text, convert_to_numpy=True).astype('float32')
    
    def retrieve(
        self,
        resume_text: str,
        job_description: str,
        role: Optional[str] = None,
        level: Optional[str] = None,
        skill: Optional[str] = None,
        top_k: int = 10
    ) -> List[Dict]:
        """
        Retrieve relevant questions based on resume and JD.
        
        Args:
            resume_text: User's resume content
            job_description: Target job/role description
            role: Filter by role (frontend, backend, etc.)
            level: Filter by level (intern, fresher, etc.)
            skill: Filter by skill (react, python, etc.)
            top_k: Number of questions to retrieve
        
        Returns:
            List of question dicts with scores
        """
        
        # Create query embedding from resume + JD
        query_text = f"{job_description} {resume_text[:500]}"
        query_embedding = self.encode_query(query_text).reshape(1, -1)
        
        # Semantic search
        distances, indices = self.index.search(query_embedding, min(top_k * 3, len(self.questions)))
        
        # Filter and rank
        results = []
        for dist, idx in zip(distances[0], indices[0]):
            question = self.questions[idx].copy()
            question['score'] = float(1 / (1 + dist))  # Convert distance to similarity score
            
            # Apply metadata filters
            if role and question.get('role') != role and question.get('role') != 'any':
                continue
            if level and question.get('level') != level and question.get('level') != 'any':
                continue
            if skill and question.get('skill') != skill:
                continue
            
            results.append(question)
            
            if len(results) >= top_k:
                break
        
        # Ensure we have enough questions (fallback to unfiltered if needed)
        if len(results) < top_k:
            print(f"⚠️  Only found {len(results)} matching questions, adding more...")
            for dist, idx in zip(distances[0], indices[0]):
                if len(results) >= top_k:
                    break
                question = self.questions[idx].copy()
                question['score'] = float(1 / (1 + dist))
                if question not in results:
                    results.append(question)
        
        return results[:top_k]
    
    def get_by_id(self, question_id: str) -> Optional[Dict]:
        """Get question by ID"""
        for q in self.questions:
            if q.get('id') == question_id:
                return q
        return None

def extract_metadata(resume_text: str, job_description: str) -> Dict:
    """
    Extract role, level, skills from resume/JD.
    
    TODO: Use NER or keyword matching.
    For now, simple keyword search.
    """
    text = (resume_text + " " + job_description).lower()
    
    metadata = {
        'role': None,
        'level': None,
        'skills': []
    }
    
    # Role detection
    if any(word in text for word in ['frontend', 'react', 'vue', 'angular']):
        metadata['role'] = 'frontend'
    elif any(word in text for word in ['backend', 'nodejs', 'python', 'api']):
        metadata['role'] = 'backend'
    elif 'data' in text or 'analytics' in text:
        metadata['role'] = 'data'
    
    # Level detection
    if any(word in text for word in ['intern', 'internship']):
        metadata['level'] = 'intern'
    elif any(word in text for word in ['fresher', 'graduate', 'entry']):
        metadata['level'] = 'fresher'
    elif any(word in text for word in ['junior', '1-2 years']):
        metadata['level'] = 'junior'
    elif any(word in text for word in ['senior', 'lead', '5+ years']):
        metadata['level'] = 'senior'
    
    # Skill detection (simple)
    skills = ['react', 'python', 'sql', 'nodejs', 'javascript', 'java']
    for skill in skills:
        if skill in text:
            metadata['skills'].append(skill)
    
    return metadata

if __name__ == "__main__":
    # Test retrieval
    print("=" * 60)
    print("Testing Question Retrieval")
    print("=" * 60)
    
    retriever = QuestionRetriever()
    
    # Test query
    results = retriever.retrieve(
        resume_text="Software engineer with 2 years React experience",
        job_description="Frontend Developer role focusing on React",
        top_k=5
    )
    
    print(f"\n📋 Retrieved {len(results)} questions:")
    for i, q in enumerate(results, 1):
        print(f"\n{i}. [{q['id']}] (score: {q['score']:.3f})")
        print(f"   {q['question']}")
        print(f"   Role: {q.get('role')}, Level: {q.get('level')}, Skill: {q.get('skill')}")
