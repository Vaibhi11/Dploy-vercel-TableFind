import { useState, useEffect } from "react";

const GROQ_MODEL = "llama3-70b-8192";

const PROMPT_SUGGESTIONS = [
  { icon: "📍", text: "Find restaurants near me", location: "New York, NY", cuisine: "" },
  { icon: "🍕", text: "Best pizza in Chicago", location: "Chicago, IL", cuisine: "pizza" },
  { icon: "🍣", text: "Sushi spots in San Francisco", location: "San Francisco, CA", cuisine: "sushi" },
  { icon: "🌮", text: "Tacos in Los Angeles", location: "Los Angeles, CA", cuisine: "tacos" },
  { icon: "🍔", text: "Burgers in Austin", location: "Austin, TX", cuisine: "burgers" },
  { icon: "🥗", text: "Vegan-friendly spots in Seattle", location: "Seattle, WA", cuisine: "vegan" },
];

const BUDGET_OPTIONS = [
  { value: "low", label: "$ Budget", emoji: "💰" },
  { value: "medium", label: "$$ Mid-range", emoji: "💳" },
  { value: "high", label: "$$$ Splurge", emoji: "✨" },
];

const OCCASION_OPTIONS = [
  { value: "casual", label: "Casual", emoji: "😊" },
  { value: "date night", label: "Date Night", emoji: "💑" },
  { value: "business", label: "Business", emoji: "💼" },
  { value: "family", label: "Family", emoji: "👨‍👩‍👧" },
];

export default function App() {
  const [location, setLocation] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [budget, setBudget] = useState("medium");
  const [occasion, setOccasion] = useState("casual");
  const [dietary, setDietary] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("form");
  const [dots, setDots] = useState("");

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => setDots(d => d.length >= 3 ? "" : d + "."), 400);
    return () => clearInterval(interval);
  }, [loading]);

  const applySuggestion = (s) => {
    setLocation(s.location);
    setCuisine(s.cuisine);
    setError("");
    setResult(null);
  };

  const handleSubmit = async () => {
    if (!location.trim()) { setError("Please enter a location first 📍"); return; }
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const BACKEND = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:8080"
        : "https://dploy-vercel-tablefind-production.up.railway.app";
      const res = await fetch(`${BACKEND}/api/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location,
          cuisine: cuisine || null,
          budget,
          occasion,
          dietary_restrictions: dietary || null,
          limit: 5,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Something went wrong");
      }
      const data = await res.json();
      setResult(data);
      setActiveTab("results");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const formatMarkdown = (text) => {
    return text
      .replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, s => `<ul class="md-ul">${s}</ul>`)
      .replace(/TOP_PICK:.*$/gm, '')
      .replace(/\n\n/g, '</p><p class="md-p">')
      .replace(/^(?!<[hul])(.+)$/gm, '<p class="md-p">$1</p>');
  };

  return (
    <div style={styles.root}>
      {/* Background blobs */}
      <div style={styles.blob1} />
      <div style={styles.blob2} />
      <div style={styles.blob3} />

      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.logoRow}>
            <span style={styles.logoEmoji}>🍽️</span>
            <div>
              <h1 style={styles.title}>TasteFind</h1>
              <p style={styles.subtitle}>AI-powered restaurant discovery</p>
            </div>
          </div>
          <div style={styles.modelBadge}>
            <span style={styles.modelDot} />
            <span style={styles.modelIcon}>⚡</span>
            <span style={styles.modelText}>
              <span style={styles.modelLabel}>Powered by</span>
              <span style={styles.modelName}>Llama 3 70B</span>
            </span>
            <span style={styles.modelSep}>·</span>
            <span style={styles.groqLabel}>Groq</span>
          </div>
        </header>

        {/* Tabs */}
        <div style={styles.tabs}>
          {["form", "results"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                ...styles.tab,
                ...(activeTab === tab ? styles.tabActive : {}),
              }}
              disabled={tab === "results" && !result}
            >
              {tab === "form" ? "🔍 Search" : "🌟 Results"}
            </button>
          ))}
        </div>

        {/* Form Panel */}
        {activeTab === "form" && (
          <div style={styles.card}>
            {/* Friendly heading */}
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Where are you hungry? 😋</h2>
              <p style={styles.cardHint}>Tell me what you're craving and I'll find the perfect spot!</p>
            </div>

            {/* Suggestion chips */}
            <div style={styles.chipsLabel}>✨ Try one of these</div>
            <div style={styles.chips}>
              {PROMPT_SUGGESTIONS.map((s, i) => (
                <button key={i} style={styles.chip} onClick={() => applySuggestion(s)}>
                  <span>{s.icon}</span> {s.text}
                </button>
              ))}
            </div>

            {/* Fields */}
            <div style={styles.fields}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>📍 Location <span style={styles.required}>*</span></label>
                <input
                  style={styles.input}
                  placeholder="e.g. Brooklyn, NY or 10001..."
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>🍴 What are you craving?</label>
                <input
                  style={styles.input}
                  placeholder="e.g. sushi, tacos, pizza, ramen..."
                  value={cuisine}
                  onChange={e => setCuisine(e.target.value)}
                />
              </div>

              <div style={styles.fieldRow}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>💰 Budget</label>
                  <div style={styles.optionRow}>
                    {BUDGET_OPTIONS.map(b => (
                      <button
                        key={b.value}
                        style={{ ...styles.optionBtn, ...(budget === b.value ? styles.optionBtnActive : {}) }}
                        onClick={() => setBudget(b.value)}
                      >
                        {b.emoji} {b.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>🎉 What's the occasion?</label>
                <div style={styles.optionRow}>
                  {OCCASION_OPTIONS.map(o => (
                    <button
                      key={o.value}
                      style={{ ...styles.optionBtn, ...(occasion === o.value ? styles.optionBtnActive : {}) }}
                      onClick={() => setOccasion(o.value)}
                    >
                      {o.emoji} {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>🥦 Dietary needs? <span style={styles.optional}>(optional)</span></label>
                <input
                  style={styles.input}
                  placeholder="e.g. vegetarian, gluten-free, halal..."
                  value={dietary}
                  onChange={e => setDietary(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div style={styles.errorBox}>
                ⚠️ {error}
              </div>
            )}

            <button
              style={{ ...styles.submitBtn, ...(loading ? styles.submitBtnLoading : {}) }}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <span>🤖 Llama is sniffing out the best spots{dots}</span>
              ) : (
                <span>🚀 Find My Perfect Restaurant</span>
              )}
            </button>

            {loading && (
              <div style={styles.loadingHint}>
                Searching Google Maps + asking Llama 3 on Groq for its top picks...
              </div>
            )}
          </div>
        )}

        {/* Results Panel */}
        {activeTab === "results" && result && (
          <div>
            {/* Top Pick Banner */}
            {result.top_pick && (
              <div style={styles.topPickBanner}>
                <div style={styles.topPickLabel}>🏆 Llama's Top Pick</div>
                <div style={styles.topPickName}>{result.top_pick}</div>
              </div>
            )}

            {/* AI Recommendation */}
            <div style={styles.card}>
              <div style={styles.aiHeader}>
                <span style={styles.aiIcon}>🦙</span>
                <div>
                  <div style={styles.aiTitle}>Llama 3 70B Recommends</div>
                  <div style={styles.aiSub}>via Groq · {result.restaurants.length} restaurants evaluated</div>
                </div>
              </div>
              <div
                style={styles.aiText}
                dangerouslySetInnerHTML={{ __html: formatMarkdown(result.ai_recommendation) }}
              />
            </div>

            {/* Restaurant Cards */}
            <div style={styles.restaurantGrid}>
              {result.restaurants.map((r, i) => (
                <div
                  key={r.id}
                  style={{
                    ...styles.restaurantCard,
                    ...(r.name === result.top_pick ? styles.restaurantCardTop : {}),
                  }}
                >
                  {r.image_url && (
                    <div style={styles.restaurantImgWrap}>
                      <img src={r.image_url} alt={r.name} style={styles.restaurantImg} />
                      {r.name === result.top_pick && (
                        <div style={styles.topBadge}>🏆 Top Pick</div>
                      )}
                    </div>
                  )}
                  <div style={styles.restaurantBody}>
                    <div style={styles.restaurantTop}>
                      <h3 style={styles.restaurantName}>{r.name}</h3>
                      <div style={styles.restaurantMeta}>
                        <span style={styles.rating}>⭐ {r.rating}</span>
                        {r.price && <span style={styles.price}>{r.price}</span>}
                      </div>
                    </div>
                    <div style={styles.categories}>{r.categories.join(" · ")}</div>
                    <div style={styles.address}>📍 {r.address}</div>
                    {r.phone && <div style={styles.phone}>📞 {r.phone}</div>}
                    <div style={styles.reviewCount}>{r.review_count.toLocaleString()} reviews</div>
                    <a href={r.maps_url} target="_blank" rel="noreferrer" style={styles.mapsLink}>
                      View on Google Maps →
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <button style={styles.backBtn} onClick={() => setActiveTab("form")}>
              ← Search Again
            </button>
          </div>
        )}

        {/* Footer */}
        <footer style={styles.footer}>
          <span>Built with</span>
          <span style={styles.footerBadge}>🦙 Llama 3 70B</span>
          <span>+</span>
          <span style={styles.footerBadge}>⚡ Groq</span>
          <span>+</span>
          <span style={styles.footerBadge}>🗺️ Google Maps</span>
        </footer>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0d0f1a; font-family: 'DM Sans', sans-serif; }
        .md-h2 { font-family: 'Syne', sans-serif; font-size: 1.1rem; font-weight: 700; color: #f97316; margin: 1rem 0 0.4rem; }
        .md-h3 { font-family: 'Syne', sans-serif; font-size: 1rem; font-weight: 600; color: #fb923c; margin: 0.8rem 0 0.3rem; }
        .md-p { color: #cbd5e1; line-height: 1.7; margin-bottom: 0.5rem; font-size: 0.92rem; }
        .md-ul { padding-left: 1.2rem; margin: 0.4rem 0; }
        .md-ul li { color: #cbd5e1; line-height: 1.7; font-size: 0.92rem; margin-bottom: 0.2rem; }
        strong { color: #f1f5f9; font-weight: 600; }
        input::placeholder { color: #475569; }
        input:focus { outline: none; border-color: #f97316 !important; box-shadow: 0 0 0 3px rgba(249,115,22,0.15); }
        button:hover { opacity: 0.9; transform: translateY(-1px); }
        button { transition: all 0.15s ease; cursor: pointer; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #1e2030; } ::-webkit-scrollbar-thumb { background: #f97316; border-radius: 3px; }
      `}</style>
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "#0d0f1a",
    position: "relative",
    overflow: "hidden",
    paddingBottom: "3rem",
  },
  blob1: {
    position: "fixed", top: "-20%", right: "-10%", width: 600, height: 600,
    borderRadius: "50%", background: "radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  blob2: {
    position: "fixed", bottom: "-10%", left: "-15%", width: 500, height: 500,
    borderRadius: "50%", background: "radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  blob3: {
    position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 800, height: 400,
    borderRadius: "50%", background: "radial-gradient(ellipse, rgba(249,115,22,0.04) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  container: {
    maxWidth: 780,
    margin: "0 auto",
    padding: "2rem 1.5rem",
    position: "relative",
    zIndex: 1,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2rem",
    flexWrap: "wrap",
    gap: "1rem",
  },
  logoRow: { display: "flex", alignItems: "center", gap: "0.75rem" },
  logoEmoji: { fontSize: "2.5rem" },
  title: {
    fontFamily: "'Syne', sans-serif",
    fontSize: "2rem",
    fontWeight: 800,
    color: "#f97316",
    letterSpacing: "-0.03em",
    lineHeight: 1,
  },
  subtitle: { color: "#64748b", fontSize: "0.8rem", marginTop: "0.15rem" },
  modelBadge: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    background: "rgba(249,115,22,0.08)",
    border: "1px solid rgba(249,115,22,0.25)",
    borderRadius: 999,
    padding: "0.4rem 0.9rem",
    fontSize: "0.78rem",
  },
  modelDot: {
    width: 7, height: 7, borderRadius: "50%",
    background: "#4ade80",
    boxShadow: "0 0 6px #4ade80",
    display: "inline-block",
  },
  modelIcon: { fontSize: "0.85rem" },
  modelText: { display: "flex", flexDirection: "column", lineHeight: 1.2 },
  modelLabel: { color: "#64748b", fontSize: "0.65rem" },
  modelName: { color: "#f97316", fontWeight: 600, fontFamily: "'Syne', sans-serif", fontSize: "0.82rem" },
  modelSep: { color: "#334155" },
  groqLabel: { color: "#a78bfa", fontWeight: 600, fontSize: "0.78rem" },
  tabs: {
    display: "flex",
    gap: "0.5rem",
    marginBottom: "1.5rem",
    background: "rgba(255,255,255,0.03)",
    padding: "0.3rem",
    borderRadius: 12,
    width: "fit-content",
  },
  tab: {
    background: "transparent",
    border: "none",
    color: "#64748b",
    padding: "0.45rem 1.2rem",
    borderRadius: 9,
    fontFamily: "'Syne', sans-serif",
    fontWeight: 600,
    fontSize: "0.85rem",
    cursor: "pointer",
  },
  tabActive: {
    background: "#f97316",
    color: "#fff",
  },
  card: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: "2rem",
    marginBottom: "1.5rem",
    backdropFilter: "blur(10px)",
  },
  cardHeader: { marginBottom: "1.5rem" },
  cardTitle: {
    fontFamily: "'Syne', sans-serif",
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "#f1f5f9",
    marginBottom: "0.3rem",
  },
  cardHint: { color: "#64748b", fontSize: "0.88rem" },
  chipsLabel: { color: "#64748b", fontSize: "0.75rem", marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.05em" },
  chips: { display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.8rem" },
  chip: {
    background: "rgba(249,115,22,0.07)",
    border: "1px solid rgba(249,115,22,0.2)",
    borderRadius: 999,
    padding: "0.4rem 0.85rem",
    color: "#fb923c",
    fontSize: "0.8rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "0.3rem",
  },
  fields: { display: "flex", flexDirection: "column", gap: "1.2rem", marginBottom: "1.5rem" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "0.4rem" },
  fieldRow: { display: "flex", gap: "1rem" },
  label: { color: "#94a3b8", fontSize: "0.83rem", fontWeight: 500 },
  required: { color: "#f97316" },
  optional: { color: "#475569", fontWeight: 400 },
  input: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: "0.7rem 1rem",
    color: "#f1f5f9",
    fontSize: "0.92rem",
    width: "100%",
    transition: "all 0.2s",
  },
  optionRow: { display: "flex", flexWrap: "wrap", gap: "0.5rem" },
  optionBtn: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 9,
    padding: "0.45rem 0.85rem",
    color: "#94a3b8",
    fontSize: "0.82rem",
    cursor: "pointer",
  },
  optionBtnActive: {
    background: "rgba(249,115,22,0.15)",
    border: "1px solid rgba(249,115,22,0.5)",
    color: "#f97316",
  },
  errorBox: {
    background: "rgba(239,68,68,0.1)",
    border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: 10,
    padding: "0.75rem 1rem",
    color: "#fca5a5",
    fontSize: "0.88rem",
    marginBottom: "1rem",
  },
  submitBtn: {
    width: "100%",
    background: "linear-gradient(135deg, #f97316, #ea580c)",
    border: "none",
    borderRadius: 12,
    padding: "0.9rem",
    color: "#fff",
    fontFamily: "'Syne', sans-serif",
    fontWeight: 700,
    fontSize: "1rem",
    cursor: "pointer",
    letterSpacing: "0.01em",
    boxShadow: "0 4px 24px rgba(249,115,22,0.3)",
  },
  submitBtnLoading: {
    background: "linear-gradient(135deg, #92400e, #78350f)",
    boxShadow: "none",
  },
  loadingHint: {
    textAlign: "center",
    color: "#64748b",
    fontSize: "0.78rem",
    marginTop: "0.75rem",
  },
  topPickBanner: {
    background: "linear-gradient(135deg, rgba(249,115,22,0.15), rgba(234,88,12,0.08))",
    border: "1px solid rgba(249,115,22,0.35)",
    borderRadius: 16,
    padding: "1.2rem 1.5rem",
    marginBottom: "1.2rem",
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  topPickLabel: { color: "#f97316", fontWeight: 700, fontFamily: "'Syne', sans-serif", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" },
  topPickName: { color: "#f1f5f9", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1.3rem" },
  aiHeader: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "1.2rem",
    paddingBottom: "1rem",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
  },
  aiIcon: { fontSize: "2rem" },
  aiTitle: { color: "#f1f5f9", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1rem" },
  aiSub: { color: "#64748b", fontSize: "0.78rem", marginTop: "0.15rem" },
  aiText: { lineHeight: 1.7 },
  restaurantGrid: { display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" },
  restaurantCard: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    overflow: "hidden",
    display: "flex",
    flexDirection: "row",
  },
  restaurantCardTop: {
    border: "1px solid rgba(249,115,22,0.35)",
    background: "rgba(249,115,22,0.05)",
  },
  restaurantImgWrap: { position: "relative", flexShrink: 0 },
  restaurantImg: { width: 130, height: "100%", objectFit: "cover", display: "block" },
  topBadge: {
    position: "absolute", top: 8, left: 8,
    background: "#f97316",
    color: "#fff",
    fontSize: "0.65rem",
    fontWeight: 700,
    padding: "0.2rem 0.5rem",
    borderRadius: 999,
    fontFamily: "'Syne', sans-serif",
  },
  restaurantBody: { padding: "1rem 1.2rem", flex: 1 },
  restaurantTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.3rem" },
  restaurantName: { color: "#f1f5f9", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1rem" },
  restaurantMeta: { display: "flex", gap: "0.5rem", alignItems: "center" },
  rating: { color: "#fbbf24", fontSize: "0.82rem", fontWeight: 600 },
  price: { color: "#4ade80", fontSize: "0.82rem", fontWeight: 600 },
  categories: { color: "#64748b", fontSize: "0.78rem", marginBottom: "0.4rem" },
  address: { color: "#94a3b8", fontSize: "0.8rem", marginBottom: "0.2rem" },
  phone: { color: "#94a3b8", fontSize: "0.8rem", marginBottom: "0.2rem" },
  reviewCount: { color: "#475569", fontSize: "0.75rem", marginBottom: "0.6rem" },
  mapsLink: {
    color: "#f97316",
    fontSize: "0.8rem",
    textDecoration: "none",
    fontWeight: 600,
  },
  backBtn: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: "0.6rem 1.2rem",
    color: "#94a3b8",
    fontSize: "0.88rem",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  footer: {
    textAlign: "center",
    color: "#334155",
    fontSize: "0.78rem",
    marginTop: "2rem",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "0.5rem",
    flexWrap: "wrap",
  },
  footerBadge: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 999,
    padding: "0.2rem 0.6rem",
    color: "#64748b",
  },
};