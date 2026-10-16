from typing import Optional
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
from app.config import settings


def get_resilient_llm(
    temperature: float = 0.1,
    user_groq_key: Optional[str] = None,
    user_google_key: Optional[str] = None,
) -> BaseChatModel:
    """
    Returns a resilient LangChain LLM with automatic .with_fallbacks() routing:
      1. Primary: Groq (llama-3.3-70b-versatile) -> 300+ tok/sec, best for tool calling & code
      2. Fallback 1: Google Gemini (gemini-2.5-flash) -> Huge context window if Groq hits rate limit
      3. Fallback 2: Groq (llama-3.1-8b-instant) -> Separate high-RPM rate-limit bucket on Groq
    """
    groq_key = user_groq_key or settings.GROQ_API_KEY
    google_key = user_google_key or settings.GOOGLE_API_KEY

    models = []

    if groq_key:
        primary_groq = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=groq_key,
            temperature=temperature,
            max_retries=1,
        )
        models.append(primary_groq)

    if google_key:
        gemini_fallback = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=google_key,
            temperature=temperature,
            max_retries=1,
        )
        models.append(gemini_fallback)

    if groq_key:
        fast_groq_fallback = ChatGroq(
            model="llama-3.1-8b-instant",
            api_key=groq_key,
            temperature=temperature,
            max_retries=1,
        )
        models.append(fast_groq_fallback)

    if not models:
        raise ValueError(
            "No LLM API keys configured! Add GROQ_API_KEY or GOOGLE_API_KEY to backend/.env"
        )

    if len(models) == 1:
        return models[0]

    return models[0].with_fallbacks(models[1:])
