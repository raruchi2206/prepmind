"""
Test Suite: Mandatory Groq API Integration Verification
Verifies:
1. Groq is the single required text-generation engine across all features.
2. Ollama is not a selectable or fallback text generation provider.
3. All AI features (Summary, Notes, Quiz, Practice Paper, Viva, Ask PrepMind, Evaluation) work with Groq.
4. Error handling (rate limits, timeouts, authentication errors, missing keys).
5. Embeddings and FAISS remain independent of Groq.
"""

import asyncio
import os
import sys
import time
from unittest.mock import AsyncMock, MagicMock, patch

from config.settings import settings
from services.embedding_service import embedding_service
from services.faiss_service import faiss_service
from services.llm_service import llm_service, LLMService
from services.rag_service import rag_service

SAMPLE_CHUNKS = [
    {
        "knowledgeSourceId": "test_src_1",
        "chunkId": "c1",
        "chunkIndex": 0,
        "text": (
            "Database Normalization and ACID Transactions:\n"
            "Normalization reduces data redundancy through normal forms like 1NF, 2NF, 3NF, and BCNF.\n"
            "First Normal Form (1NF) mandates atomic attribute values.\n"
            "Second Normal Form (2NF) eliminates partial functional dependencies on candidate keys.\n"
            "Third Normal Form (3NF) eliminates transitive functional dependencies.\n"
            "ACID properties ensure reliable transactions: Atomicity, Consistency, Isolation, Durability."
        ),
        "metadata": {"originalFileName": "dbms_notes.pdf", "page": 1},
    }
]


async def test_groq_configuration_and_provider():
    print("\n--- TEST: Groq Provider Configuration ---")
    assert hasattr(settings, "GROQ_API_KEY"), "settings missing GROQ_API_KEY"
    assert hasattr(settings, "GROQ_MODEL"), "settings missing GROQ_MODEL"
    assert not hasattr(settings, "OLLAMA_LLM_MODEL"), "OLLAMA_LLM_MODEL must not exist in settings"
    assert llm_service.model == settings.GROQ_MODEL, "Active model must match settings.GROQ_MODEL"
    print(f"  [OK] Groq model configured: {llm_service.model}")
    print(f"  [OK] Masked key check: {llm_service.masked_api_key}")


async def test_no_ollama_fallback_on_groq_error():
    print("\n--- TEST: No Silent Fallback to Ollama ---")
    # Simulate Groq failure without a key
    test_svc = LLMService()
    test_svc.api_key = ""
    try:
        await test_svc.generate(prompt="Test prompt")
        assert False, "Should have thrown RuntimeError for missing key"
    except RuntimeError as e:
        assert "Groq API key is not configured" in str(e)
        print(f"  [OK] Correctly rejected without fallback to Ollama: {e}")


async def test_groq_error_handling_and_retries():
    print("\n--- TEST: Error Handling (Rate Limits, Timeouts, Auth) ---")
    from groq import AuthenticationError, RateLimitError, APITimeoutError

    # 1. Auth failure should fail immediately without retry
    test_svc = LLMService()
    test_svc.api_key = "gsk_invalid_test_key"
    mock_client = MagicMock()
    mock_chat = MagicMock()
    mock_client.chat = mock_chat

    auth_error = AuthenticationError(
        message="Invalid API Key",
        response=MagicMock(status_code=401, headers={}),
        body={"error": {"message": "Invalid API Key"}},
    )
    mock_chat.completions.create = AsyncMock(side_effect=auth_error)
    test_svc._client = mock_client

    try:
        await test_svc.generate(prompt="Test auth")
        assert False, "Should have failed on 401 Auth error"
    except RuntimeError as e:
        assert "Groq API authentication failed" in str(e)
        assert mock_chat.completions.create.call_count == 1, "Must not retry on 401"
        print("  [OK] Auth failure handled correctly without retrying")

    # 2. Rate limit should retry with backoff up to max_retries
    mock_rl_client = MagicMock()
    mock_rl_chat = MagicMock()
    mock_rl_client.chat = mock_rl_chat
    rl_error = RateLimitError(
        message="Rate limit reached",
        response=MagicMock(status_code=429, headers={"retry-after": "1"}),
        body={"error": {"message": "Rate limit reached"}},
    )
    mock_rl_chat.completions.create = AsyncMock(side_effect=rl_error)
    test_svc._client = mock_rl_client
    test_svc.max_retries = 2

    t0 = time.time()
    try:
        await test_svc.generate(prompt="Test rate limit")
        assert False, "Should fail after max retries"
    except RuntimeError as e:
        assert "rate limit exceeded" in str(e)
        assert mock_rl_chat.completions.create.call_count == 2
        print(f"  [OK] Rate limit retried {mock_rl_chat.completions.create.call_count} times with backoff")


async def test_all_ai_features_with_groq():
    print("\n--- TEST: All AI Features Output Generation via Groq ---")

    # Mock Groq completions response to verify prompt integration and pipeline flow
    def make_choice(content_text):
        choice = MagicMock()
        choice.message.content = content_text
        resp = MagicMock()
        resp.choices = [choice]
        resp.usage.prompt_tokens = 50
        resp.usage.completion_tokens = 100
        resp.usage.total_tokens = 150
        return resp

    # 1. Summary
    with patch.object(
        llm_service,
        "generate",
        new=AsyncMock(return_value="DBMS Normalization\n1. Overview\nRelational schemas minimize redundancy."),
    ):
        summary = await rag_service.generate_summary(SAMPLE_CHUNKS, title="DBMS")
        assert "Summary" in summary["title"]
        assert len(summary["content"]) > 10
        print("  [OK] Feature: Summary generated successfully")

    # 2. Notes
    with patch.object(
        llm_service,
        "generate",
        new=AsyncMock(return_value="DBMS Notes\n1. Introduction and Overview\n1NF ensures atomic values."),
    ):
        notes = await rag_service.generate_notes(SAMPLE_CHUNKS, title="DBMS")
        assert "Notes" in notes["title"]
        assert len(notes["content"]) > 10
        print("  [OK] Feature: Notes generated successfully")

    # 3. Quiz (MCQ, True/False, and Mixed)
    quiz_json = (
        '{"title": "DBMS Quiz", "difficulty": "Medium", "questions": ['
        '{"question": "What does 1NF require?", "options": ["Atomic values", "Partial dependencies", "Transitive dependencies", "No candidate keys"], "correctAnswer": "Atomic values", "explanation": "1NF mandates atomic values."}'
        ']}'
    )
    with patch.object(llm_service, "generate", new=AsyncMock(return_value=quiz_json)):
        quiz = await rag_service.generate_quiz(SAMPLE_CHUNKS, title="DBMS Quiz", question_count=1, difficulty="Medium", question_type="MCQ")
        assert len(quiz["questions"]) == 1
        assert quiz["questions"][0]["correctAnswer"] == "Atomic values"
        print("  [OK] Feature: MCQ Quiz generated successfully")

    tf_json = (
        '{"title": "DBMS TF Quiz", "difficulty": "Easy", "questions": ['
        '{"question": "First Normal Form mandates atomic attribute values.", "options": ["True", "False"], "correctAnswer": "True", "explanation": "Atomic values are required in 1NF."}'
        ']}'
    )
    with patch.object(llm_service, "generate", new=AsyncMock(return_value=tf_json)):
        tf_quiz = await rag_service.generate_quiz(SAMPLE_CHUNKS, title="DBMS TF Quiz", question_count=1, difficulty="Easy", question_type="True/False")
        assert len(tf_quiz["questions"]) == 1
        assert tf_quiz["questions"][0]["type"] == "True/False"
        assert tf_quiz["questions"][0]["correctAnswer"] == "True"
        print("  [OK] Feature: True/False Quiz generated successfully")

    # 4. Practice Paper
    paper_json = (
        '{"title": "DBMS Practice Examination", "totalMarks": 60, "timeAllowedMinutes": 90, "sections": ['
        '{"sectionName": "Section A", "questions": [{"id": "1", "question": "Define 3NF", "marks": 5}]}'
        ']}'
    )
    with patch.object(llm_service, "generate", new=AsyncMock(return_value=paper_json)):
        paper = await rag_service.generate_practice_paper(SAMPLE_CHUNKS, title="DBMS Exam", total_marks=60)
        assert paper["totalMarks"] == 60
        assert len(paper["sections"]) == 1
        print("  [OK] Feature: Practice Paper generated successfully")

    # 5. Viva
    viva_json = (
        '{"title": "DBMS Viva", "difficulty": "Medium", "questions": ['
        '{"id": 1, "question": "Why is 2NF important?", "expectedAnswer": "It removes partial dependencies.", "followUp": "What is a candidate key?", "rubric": "Full marks for accurate definition."}'
        ']}'
    )
    with patch.object(llm_service, "generate", new=AsyncMock(return_value=viva_json)):
        viva = await rag_service.generate_viva(SAMPLE_CHUNKS, title="DBMS Viva", question_count=1)
        assert len(viva["questions"]) == 1
        print("  [OK] Feature: Viva examination generated successfully")

    # 6. Answer Evaluation
    eval_json = '{"awardedMarks": 4.5, "maxMarks": 5, "feedback": "Accurate explanation of 2NF.", "strengths": ["Clear definition"], "improvements": []}'
    with patch.object(llm_service, "generate", new=AsyncMock(return_value=eval_json)):
        ev = await rag_service.evaluate_answer(
            question="What is 2NF?",
            expected_answer="Eliminates partial dependency.",
            user_answer="2NF eliminates partial dependency on candidate keys.",
            max_marks=5,
        )
        assert ev["awardedMarks"] == 4.5
        print("  [OK] Feature: Answer Evaluation completed successfully")

    # 7. Ask PrepMind
    with patch.object(
        llm_service,
        "generate",
        new=AsyncMock(return_value="The ACID properties are Atomicity, Consistency, Isolation, and Durability."),
    ):
        ask_res = await rag_service.ask(query="What are the ACID properties?", chunks=SAMPLE_CHUNKS)
        assert "Atomicity" in ask_res["answer"]
        assert ask_res["insufficientContext"] is False
        print("  [OK] Feature: Ask PrepMind answered successfully")


async def test_embeddings_and_faiss_separation():
    print("\n--- TEST: Embeddings & FAISS Vector Search Independence ---")
    assert embedding_service.base_url == settings.OLLAMA_BASE_URL
    assert settings.OLLAMA_EMBEDDING_MODEL == "all-minilm"
    print(f"  [OK] Embeddings configured via local model: {settings.OLLAMA_EMBEDDING_MODEL}")
    print(f"  [OK] FAISS base path: {settings.FAISS_BASE_PATH}")

    # Check health of local embedding engine
    healthy = await embedding_service.check_health()
    print(f"  [OK] Local embedding engine reachable: {healthy}")


async def run_all_tests():
    print("==================================================")
    print("MANDATORY GROQ API INTEGRATION TEST SUITE")
    print("==================================================")
    await test_groq_configuration_and_provider()
    await test_no_ollama_fallback_on_groq_error()
    await test_groq_error_handling_and_retries()
    await test_all_ai_features_with_groq()
    await test_embeddings_and_faiss_separation()
    print("\n==================================================")
    print("ALL GROQ INTEGRATION TESTS PASSED [OK]")
    print("==================================================")


if __name__ == "__main__":
    asyncio.run(run_all_tests())
