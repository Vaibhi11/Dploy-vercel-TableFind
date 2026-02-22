"""
Restaurant Recommendation API
- FastAPI backend
- Serper.dev API for restaurant search data
- Llama LLM via Groq for AI-powered recommendations
- Serves built React frontend as static files
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
from pathlib import Path
import httpx
from groq import Groq
import os
import json
import re

# ── Config ────────────────────────────────────────────────────────────────────
SERPER_API_KEY = "fb6c613ab029439a9b2e045bb8ddb7fb801df294"
GROQ_API_KEY   = "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"
SERPER_URL     = "https://google.serper.dev"
GROQ_MODEL     = "llama-3.3-70b-versatile"

# ── Startup diagnostics ───────────────────────────────────────────────────────
print("=" * 60)
print("TasteFind API starting up")
print(f"  SERPER_API_KEY : {'✅ set (' + SERPER_API_KEY[:8] + '...)' if SERPER_API_KEY else '❌ NOT SET'}")
print(f"  GROQ_API_KEY   : {'✅ set (' + GROQ_API_KEY[:8] + '...)' if GROQ_API_KEY else '❌ NOT SET'}")
print("=" * 60)

STATIC_DIR = Path(__file__).parent / "frontend" / "dist"
# Also look for index.html right next to main.py (for simple single-file setup)
LOCAL_INDEX = Path(__file__).parent / "index.html"

app = FastAPI(
    title="Restaurant Recommender API",
    description="AI-powered restaurant recommendations using Serper + Llama (Groq)",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

# ── Global error handler — always return JSON with real error message ─────────
from fastapi.responses import JSONResponse
from fastapi.requests import Request

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    tb = traceback.format_exc()
    print(f"[ERROR] {exc}\n{tb}")
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__}
    )

# ── Pydantic Models ───────────────────────────────────────────────────────────
class RecommendationRequest(BaseModel):
    location: str
    cuisine: Optional[str] = None
    budget: Optional[str] = "medium"
    occasion: Optional[str] = "casual"
    dietary_restrictions: Optional[str] = None
    radius_meters: Optional[int] = 5000
    limit: Optional[int] = 5
    lat: Optional[float] = None
    lng: Optional[float] = None

class Restaurant(BaseModel):
    id: str
    name: str
    rating: float
    review_count: int
    price: Optional[str] = None
    categories: list[str]
    address: str
    phone: Optional[str] = None
    maps_url: str
    image_url: Optional[str] = None
    distance_meters: Optional[float] = None

class RecommendationResponse(BaseModel):
    restaurants: list[Restaurant]
    ai_recommendation: str
    top_pick: Optional[str] = None

class ReviewsResponse(BaseModel):
    reviews: list[dict]
    ai_summary: str

# ── Helpers ───────────────────────────────────────────────────────────────────
def get_groq_client() -> Groq:
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured.")
    return Groq(api_key=GROQ_API_KEY)

BUDGET_PRICE = {"low": "$", "medium": "$$", "high": "$$$"}

# ── Serper Search ─────────────────────────────────────────────────────────────
async def search_restaurants_serper(
    location: str,
    cuisine: Optional[str],
    budget: Optional[str],
    limit: int,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
) -> list[dict]:
    parts = []
    if cuisine:
        parts.append(cuisine)
    parts.append("restaurants")
    location_str = location if not (lat and lng) else f"{lat:.4f},{lng:.4f}"
    query = " ".join(parts) + f" in {location_str}"

    print(f"[Serper] Searching: {query}")

    headers = {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json",
    }

    # Try /places first
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{SERPER_URL}/places",
            headers=headers,
            json={"q": query, "num": min(limit * 3, 20)},
        )

    print(f"[Serper /places] Status: {resp.status_code}")

    if resp.status_code == 200:
        places = resp.json().get("places", [])
        print(f"[Serper /places] Found {len(places)} places")
        if places:
            return places

    # Fallback: /search organic results
    print("[Serper] Falling back to /search...")
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp2 = await client.post(
            f"{SERPER_URL}/search",
            headers=headers,
            json={"q": query, "num": min(limit * 3, 20)},
        )

    print(f"[Serper /search] Status: {resp2.status_code}")

    if resp2.status_code != 200:
        raise HTTPException(status_code=503, detail=f"Serper API error: {resp2.text}")

    data = resp2.json()

    # Combine organic + local pack results
    results = []
    for r in data.get("localResults", []):
        r["_type"] = "local"
        results.append(r)
    for r in data.get("organic", []):
        r["_type"] = "organic"
        results.append(r)

    print(f"[Serper /search] Found {len(results)} results")
    return results[:limit * 3]


def parse_serper_results(places: list[dict], limit: int) -> list[Restaurant]:
    restaurants = []
    seen = set()

    for i, p in enumerate(places):
        try:
            rtype = p.get("_type", "place")

            if rtype == "organic":
                name = p.get("title", f"Restaurant {i+1}")
                address = p.get("snippet", "")
                rating = 0.0
                review_count = 0
                phone = None
                category = "Restaurant"
                link = p.get("link", "")
                maps_url = f"https://www.google.com/maps/search/{name.replace(' ', '+')}"
            elif rtype == "local":
                name = p.get("title", f"Restaurant {i+1}")
                address = p.get("address", "")
                rating = float(p.get("rating", 0) or 0)
                review_count = int(p.get("ratingCount", 0) or 0)
                phone = p.get("phoneNumber")
                category = p.get("category", "Restaurant")
                maps_url = f"https://www.google.com/maps/search/{name.replace(' ', '+')}+{address.replace(' ', '+')}"
            else:
                # /places result
                name = p.get("title", f"Restaurant {i+1}")
                address = p.get("address", "")
                rating = float(p.get("rating", 0) or 0)
                review_count = int(p.get("ratingCount", 0) or 0)
                phone = p.get("phoneNumber")
                category = p.get("category", "Restaurant")
                cid = p.get("cid", "")
                maps_url = (f"https://www.google.com/maps?cid={cid}" if cid
                            else f"https://www.google.com/maps/search/{name.replace(' ', '+')}")

            # Deduplicate by name
            name_key = name.lower().strip()
            if name_key in seen or not name_key:
                continue
            seen.add(name_key)

            rid = re.sub(r'\W+', '', name.lower())[:24] + str(i)

            restaurants.append(Restaurant(
                id=rid,
                name=name,
                rating=min(float(rating), 5.0),
                review_count=int(review_count),
                price=BUDGET_PRICE.get("medium"),
                categories=[category],
                address=address,
                phone=phone,
                maps_url=maps_url,
                image_url=None,
                distance_meters=None,
            ))

            if len(restaurants) >= limit:
                break

        except Exception as e:
            print(f"[Parse] Skipping result {i}: {e}")
            continue

    return restaurants


def ask_llama(restaurants: list[Restaurant], request: RecommendationRequest):
    summary = json.dumps(
        [r.model_dump(exclude={"maps_url", "image_url"}) for r in restaurants], indent=2
    )
    prompt = f"""You are a warm, knowledgeable restaurant recommendation assistant.

User preferences:
- Location: {request.location}
- Cuisine: {request.cuisine or 'No preference'}
- Budget: {request.budget}
- Occasion: {request.occasion}
- Dietary restrictions: {request.dietary_restrictions or 'None'}

Here are {len(restaurants)} restaurants to evaluate:
{summary}

Instructions:
1. Recommend the top {request.limit} restaurants that best match the preferences.
2. For each, give a 1-2 sentence explanation of why it fits.
3. Declare a single TOP PICK with a brief reason.
4. Format the response in clear Markdown with headers.
5. On the very last line, write exactly: TOP_PICK: <exact restaurant name>
"""
    client = get_groq_client()
    completion = client.chat.completions.create(
        model=GROQ_MODEL,
        max_tokens=1200,
        messages=[{"role": "user", "content": prompt}],
    )
    full_text = completion.choices[0].message.content
    top_pick = None
    for line in reversed(full_text.splitlines()):
        s = line.strip()
        if s.startswith("TOP_PICK:"):
            top_pick = s.replace("TOP_PICK:", "").strip()
            break
    return full_text, top_pick


# ── API Routes ────────────────────────────────────────────────────────────────
@app.get("/api/health", tags=["Health"])
def health():
    return {
        "status": "ok",
        "serper_configured": bool(SERPER_API_KEY),
        "groq_configured": bool(GROQ_API_KEY),
        "model": GROQ_MODEL,
    }


@app.post("/api/recommend", response_model=RecommendationResponse, tags=["Recommendations"])
async def recommend_restaurants(req: RecommendationRequest):
    import traceback
    try:
        places = await search_restaurants_serper(
            location=req.location,
            cuisine=req.cuisine,
            budget=req.budget,
            limit=req.limit,
            lat=req.lat,
            lng=req.lng,
        )
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

    if not places:
        raise HTTPException(status_code=404,
            detail="No restaurants found. Try a different location or cuisine.")

    try:
        all_restaurants = parse_serper_results(places, req.limit * 2)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Parse failed: {str(e)}")

    if not all_restaurants:
        raise HTTPException(status_code=404,
            detail="Could not parse restaurant results. Try a different search.")

    try:
        ai_text, top_pick = ask_llama(all_restaurants, req)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI step failed: {str(e)}")

    return RecommendationResponse(
        restaurants=all_restaurants[:req.limit],
        ai_recommendation=ai_text,
        top_pick=top_pick,
    )


@app.get("/api/search", tags=["Search"])
async def search_restaurants(
    location: str = Query(...),
    cuisine: Optional[str] = Query(None),
    budget: Optional[str] = Query("medium"),
    limit: int = Query(5, ge=1, le=20),
):
    places = await search_restaurants_serper(
        location=location, cuisine=cuisine, budget=budget, limit=limit
    )
    restaurants = parse_serper_results(places, limit)
    return {"results": [r.model_dump() for r in restaurants]}


@app.get("/api/reviews/{restaurant_id}", response_model=ReviewsResponse, tags=["Reviews"])
async def get_restaurant_reviews(restaurant_id: str, location: str = Query("")):
    query = f"{restaurant_id.replace('_', ' ')} {location} restaurant reviews"
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{SERPER_URL}/search",
            headers={"X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json"},
            json={"q": query, "num": 5},
        )
    snippets = []
    if resp.status_code == 200:
        for r in resp.json().get("organic", [])[:5]:
            snippets.append({
                "user": {"name": r.get("displayLink", "Reviewer")},
                "rating": 4,
                "text": r.get("snippet", ""),
                "time_created": None,
            })

    if not snippets:
        return ReviewsResponse(reviews=[], ai_summary="No reviews found.")

    review_text = "\n".join([f"- {r['text']}" for r in snippets])
    completion = get_groq_client().chat.completions.create(
        model=GROQ_MODEL,
        max_tokens=350,
        messages=[{"role": "user", "content":
            f"Summarize these restaurant reviews in 2-3 sentences:\n{review_text}"}],
    )
    return ReviewsResponse(reviews=snippets, ai_summary=completion.choices[0].message.content)


# ── Serve React SPA ───────────────────────────────────────────────────────────
@app.get("/{full_path:path}", include_in_schema=False)
async def serve_react(full_path: str):
    # Check built React app first
    index = STATIC_DIR / "index.html"
    if index.exists():
        return FileResponse(index)
    # Fall back to index.html sitting next to main.py
    if LOCAL_INDEX.exists():
        return FileResponse(LOCAL_INDEX)
    return {"message": "Place index.html in the same folder as main.py, or run npm run build."}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)