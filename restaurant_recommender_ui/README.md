# 🍽️ TableFind — React Frontend

Beautiful UI for the Restaurant Recommender FastAPI backend.

## Stack
- **React 18** (Vite)
- **Custom CSS** — no component library, fully hand-crafted design
- **Google Fonts** — Cormorant Garamond + DM Mono

## Project Structure
```
src/
  App.jsx                    ← Root component & API calls
  main.jsx                   ← React entry point
  styles/
    global.css               ← Full design system
  components/
    SearchForm.jsx            ← Search inputs
    RestaurantCard.jsx        ← Individual restaurant card
    AIRecommendation.jsx      ← Claude AI panel with markdown
    Loader.jsx                ← Animated loading state
```

## Setup & Run

```bash
npm install
npm run dev
# → http://localhost:3000
```

> Make sure the FastAPI backend is running on port 8000.
> Vite proxies `/recommend`, `/search`, etc. to `localhost:8000` automatically.

## Features
- 🔍 Full search form (location, cuisine, budget, occasion, dietary restrictions)
- 🤖 Claude AI recommendation panel with expandable markdown
- ⭑ Top Pick highlighted with gold border
- 🖼️ Yelp restaurant photos with fallback
- ⭐ Star ratings, price level, distance, categories
- 🔗 Direct link to Yelp listing
- 📱 Fully responsive
- ✨ Grain texture, animated loader, staggered card reveals
