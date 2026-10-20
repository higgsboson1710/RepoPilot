from typing import Any, List, Optional, Type
from pydantic import BaseModel
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import Runnable
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
from app.config import settings


def get_candidate_llms(
    temperature: float = 0.1,
    user_groq_key: Optional[str] = None,
    user_google_key: Optional[str] = None,
) -> List[BaseChatModel]:
    groq_key = user_groq_key or settings.GROQ_API_KEY
    google_key = user_google_key or settings.GOOGLE_API_KEY

    models: List[BaseChatModel] = []

    # Groq candidates prioritized first for high throughput (6000 req/min)
    if groq_key:
        for groq_model_id in (
            "openai/gpt-oss-120b",
            "qwen/qwen3.8-27b",
            "openai/gpt-oss-20b",
        ):
            models.append(
                ChatGroq(
                    model=groq_model_id,
                    api_key=groq_key,
                    temperature=temperature,
                    max_retries=1,
                    request_timeout=25.0,
                )
            )

    # Gemini candidate: set max_retries=0 and timeout=10.0 to fail-fast on 429 quota rather than hanging 600s
    if google_key:
        models.append(
            ChatGoogleGenerativeAI(
                model="gemini-3.8-flash",
                google_api_key=google_key,
                temperature=temperature,
                max_retries=0,
                timeout=10.0,
            )
        )

    if not models:
        raise ValueError(
            "No LLM API keys configured! Add GROQ_API_KEY or GOOGLE_API_KEY to backend/.env"
        )

    return models


def get_resilient_llm(
    temperature: float = 0.1,
    user_groq_key: Optional[str] = None,
    user_google_key: Optional[str] = None,
) -> Runnable:
    models = get_candidate_llms(temperature, user_groq_key, user_google_key)
    if len(models) == 1:
        return models[0]
    return models[0].with_fallbacks(models[1:])


def get_resilient_structured_chain(
    system_prompt: str,
    human_template: str,
    schema: Type[BaseModel],
    temperature: float = 0.1,
    user_groq_key: Optional[str] = None,
    user_google_key: Optional[str] = None,
) -> Runnable:
    parser = PydanticOutputParser(pydantic_object=schema)
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                system_prompt
                + "\n\nCRITICAL: Return ONLY a valid JSON object matching this exact schema:\n{format_instructions}",
            ),
            ("human", human_template),
        ]
    ).partial(format_instructions=parser.get_format_instructions())

    resilient_llm = get_resilient_llm(
        temperature=temperature,
        user_groq_key=user_groq_key,
        user_google_key=user_google_key,
    )
    return prompt | resilient_llm | parser


def get_resilient_llm_with_tools(
    tools: List[Any],
    temperature: float = 0.1,
    user_groq_key: Optional[str] = None,
    user_google_key: Optional[str] = None,
) -> Runnable:
    models = get_candidate_llms(temperature, user_groq_key, user_google_key)
    bound_models = [m.bind_tools(tools) for m in models]
    if len(bound_models) == 1:
        return bound_models[0]
    return bound_models[0].with_fallbacks(bound_models[1:])
