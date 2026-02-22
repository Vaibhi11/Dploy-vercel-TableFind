"""
╔══════════════════════════════════════════════════════════════╗
║         INTERNET AGENT CHAIN — STRUCTURED OUTPUT            ║
║         LLM-powered web research agent template             ║
╚══════════════════════════════════════════════════════════════╝

CHAIN FLOW:
  User Query
      │
      ▼
  [1] PLANNER       → decides what to search / which tools to use
      │
      ▼
  [2] TOOL EXECUTOR → runs searches / fetches URLs
      │
      ▼
  [3] EXTRACTOR     → pulls structured data from raw results
      │
      ▼
  [4] SYNTHESIZER   → combines findings into final structured answer
      │
      ▼
  Structured Output (Pydantic model)

SETUP:
  pip install groq httpx pydantic beautifulsoup4 python-dotenv
"""

import os
import json
import httpx
from typing import Optional, Any
from pydantic import BaseModel, Field
from groq import Groq

# ── Load env ──────────────────────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ── Config ────────────────────────────────────────────────────────────────────
GROQ_API_KEY   = os.getenv("GROQ_API_KEY", "YOUR_GROQ_API_KEY_HERE")
GROQ_MODEL     = "llama3-70b-8192"          # swap to "mixtral-8x7b-32768" etc.
SERPER_API_KEY = os.getenv("SERPER_API_KEY", "")   # https://serper.dev  (free tier)
MAX_STEPS      = 5                          # max research iterations


# ══════════════════════════════════════════════════════════════════════════════
# STRUCTURED OUTPUT SCHEMAS  (define your desired output shape here)
# ══════════════════════════════════════════════════════════════════════════════

class SearchQuery(BaseModel):
    """A single search the agent wants to run."""
    query: str = Field(..., description="The search query string")
    reason: str = Field(..., description="Why this search is needed")


class AgentPlan(BaseModel):
    """Step 1 — Planner output."""
    goal: str                        = Field(..., description="Restatement of the research goal")
    search_queries: list[SearchQuery]= Field(..., description="List of searches to run")
    needs_url_fetch: bool            = Field(False, description="Whether to fetch a specific URL")
    target_url: Optional[str]        = Field(None,  description="URL to fetch if needed")


class ExtractedFact(BaseModel):
    """A single fact extracted from a source."""
    fact: str   = Field(..., description="The extracted piece of information")
    source: str = Field(..., description="URL or source name")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score 0-1")


class AgentAnswer(BaseModel):
    """Final structured answer returned to the caller."""
    query: str                        = Field(..., description="Original user query")
    summary: str                      = Field(..., description="Concise answer paragraph")
    key_facts: list[ExtractedFact]    = Field(..., description="Bullet facts with sources")
    sources: list[str]                = Field(..., description="All URLs consulted")
    confidence: float                 = Field(..., ge=0.0, le=1.0)
    follow_up_questions: list[str]    = Field(default_factory=list)


# ══════════════════════════════════════════════════════════════════════════════
# LLM HELPER  — structured JSON output via Groq
# ══════════════════════════════════════════════════════════════════════════════

client = Groq(api_key=GROQ_API_KEY)

def llm_structured(
    system_prompt: str,
    user_prompt: str,
    output_schema: type[BaseModel],
    temperature: float = 0.2,
) -> BaseModel:
    """
    Call the LLM and parse the response into a Pydantic model.
    The model is instructed to return ONLY valid JSON matching the schema.
    """
    schema_json = json.dumps(output_schema.model_json_schema(), indent=2)

    full_system = f"""{system_prompt}

You MUST respond with ONLY a valid JSON object — no markdown, no explanation, no backticks.
The JSON must exactly match this schema:
{schema_json}"""

    response = client.chat.completions.create(
        model=GROQ_MODEL,
        temperature=temperature,
        max_tokens=2048,
        messages=[
            {"role": "system",  "content": full_system},
            {"role": "user",    "content": user_prompt},
        ],
    )

    raw = response.choices[0].message.content.strip()

    # Strip accidental markdown fences
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    return output_schema.model_validate_json(raw)


def llm_text(system_prompt: str, user_prompt: str, temperature: float = 0.3) -> str:
    """Plain text LLM call (no schema enforcement)."""
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        temperature=temperature,
        max_tokens=1024,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ],
    )
    return response.choices[0].message.content.strip()


# ══════════════════════════════════════════════════════════════════════════════
# INTERNET TOOLS
# ══════════════════════════════════════════════════════════════════════════════

def search_web(query: str, num_results: int = 5) -> list[dict]:
    """
    Search the web via Serper.dev API.
    Falls back to a mock result if no API key is set.
    Get a free key at https://serper.dev
    """
    if not SERPER_API_KEY:
        print(f"  [SEARCH] No SERPER_API_KEY — returning mock result for: {query}")
        return [{"title": "Mock Result", "snippet": f"Mock search result for '{query}'", "link": "https://example.com"}]

    try:
        resp = httpx.post(
            "https://google.serper.dev/search",
            headers={"X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json"},
            json={"q": query, "num": num_results},
            timeout=10.0,
        )
        data = resp.json()
        results = []
        for r in data.get("organic", []):
            results.append({
                "title":   r.get("title", ""),
                "snippet": r.get("snippet", ""),
                "link":    r.get("link", ""),
            })
        return results
    except Exception as e:
        print(f"  [SEARCH ERROR] {e}")
        return []


def fetch_url(url: str, max_chars: int = 4000) -> str:
    """
    Fetch a URL and return its text content (stripped of HTML tags).
    """
    try:
        resp = httpx.get(url, timeout=10.0, follow_redirects=True,
                         headers={"User-Agent": "Mozilla/5.0 (research-agent/1.0)"})
        # Try BeautifulSoup if available, else naive strip
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(resp.text, "html.parser")
            for tag in soup(["script", "style", "nav", "footer"]):
                tag.decompose()
            text = soup.get_text(separator=" ", strip=True)
        except ImportError:
            import re
            text = re.sub(r"<[^>]+>", " ", resp.text)

        return text[:max_chars]
    except Exception as e:
        return f"[ERROR fetching {url}: {e}]"


# ══════════════════════════════════════════════════════════════════════════════
# CHAIN STEPS
# ══════════════════════════════════════════════════════════════════════════════

def step_plan(query: str) -> AgentPlan:
    """
    STEP 1 — PLANNER
    Decide what searches to run and whether to fetch a URL.
    """
    print(f"\n[STEP 1] Planning for: {query}")

    plan = llm_structured(
        system_prompt=(
            "You are a research planning agent. "
            "Given a user query, decide what web searches to run to answer it thoroughly."
        ),
        user_prompt=f"User query: {query}",
        output_schema=AgentPlan,
    )

    print(f"  Goal: {plan.goal}")
    print(f"  Searches planned: {len(plan.search_queries)}")
    return plan


def step_execute(plan: AgentPlan) -> dict[str, Any]:
    """
    STEP 2 — TOOL EXECUTOR
    Run the planned searches and optional URL fetch.
    Returns raw results keyed by search query.
    """
    print("\n[STEP 2] Executing searches...")
    raw_results: dict[str, Any] = {}

    for sq in plan.search_queries:
        print(f"  Searching: {sq.query}")
        results = search_web(sq.query)
        raw_results[sq.query] = results

    if plan.needs_url_fetch and plan.target_url:
        print(f"  Fetching URL: {plan.target_url}")
        raw_results["__url_fetch__"] = fetch_url(plan.target_url)

    return raw_results


def step_extract(query: str, raw_results: dict[str, Any]) -> list[ExtractedFact]:
    """
    STEP 3 — EXTRACTOR
    Pull structured facts out of the raw search results.
    """
    print("\n[STEP 3] Extracting facts...")

    # Flatten results into a readable block
    context_lines = []
    all_sources = []
    for search_q, results in raw_results.items():
        if search_q == "__url_fetch__":
            context_lines.append(f"[WEBPAGE CONTENT]\n{results}\n")
            continue
        for r in results:
            context_lines.append(f"Source: {r['link']}\nTitle: {r['title']}\n{r['snippet']}\n")
            all_sources.append(r["link"])

    context = "\n---\n".join(context_lines)

    class FactList(BaseModel):
        facts: list[ExtractedFact]

    fact_list = llm_structured(
        system_prompt=(
            "You are a fact extraction agent. "
            "Extract the most relevant, verifiable facts from the provided search results. "
            "Always include the source URL for each fact."
        ),
        user_prompt=f"Original question: {query}\n\nSearch results:\n{context}",
        output_schema=FactList,
    )

    print(f"  Extracted {len(fact_list.facts)} facts")
    return fact_list.facts


def step_synthesize(query: str, facts: list[ExtractedFact], raw_results: dict) -> AgentAnswer:
    """
    STEP 4 — SYNTHESIZER
    Combine facts into a final structured answer.
    """
    print("\n[STEP 4] Synthesizing final answer...")

    facts_text = json.dumps([f.model_dump() for f in facts], indent=2)
    sources = list({f.source for f in facts})

    answer = llm_structured(
        system_prompt=(
            "You are a research synthesis agent. "
            "Given extracted facts, produce a clear, accurate, well-sourced answer. "
            "Include follow-up questions the user might want to explore."
        ),
        user_prompt=(
            f"Original question: {query}\n\n"
            f"Extracted facts:\n{facts_text}\n\n"
            f"Known sources: {sources}"
        ),
        output_schema=AgentAnswer,
    )

    return answer


# ══════════════════════════════════════════════════════════════════════════════
# MAIN AGENT — wires all steps together
# ══════════════════════════════════════════════════════════════════════════════

def run_agent(query: str) -> AgentAnswer:
    """
    Run the full Internet Agent chain.

    Args:
        query: Natural language question to research

    Returns:
        AgentAnswer — structured, sourced response
    """
    print("=" * 60)
    print(f"INTERNET AGENT  »  {query}")
    print("=" * 60)

    plan        = step_plan(query)
    raw_results = step_execute(plan)
    facts       = step_extract(query, raw_results)
    answer      = step_synthesize(query, facts, raw_results)

    return answer


# ══════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # ── Change this query to anything you want to research ────────────────────
    query = "What are the latest AI models released in 2025?"

    result = run_agent(query)

    print("\n" + "=" * 60)
    print("FINAL ANSWER")
    print("=" * 60)
    print(f"\nQuery   : {result.query}")
    print(f"Summary : {result.summary}")
    print(f"Confidence: {result.confidence:.0%}")

    print("\nKey Facts:")
    for i, fact in enumerate(result.key_facts, 1):
        print(f"  {i}. {fact.fact}")
        print(f"     Source: {fact.source} (confidence: {fact.confidence:.0%})")

    print("\nSources consulted:")
    for s in result.sources:
        print(f"  • {s}")

    if result.follow_up_questions:
        print("\nFollow-up questions:")
        for q in result.follow_up_questions:
            print(f"  ? {q}")

    # Also dump raw JSON
    print("\nRaw JSON output:")
    print(result.model_dump_json(indent=2))