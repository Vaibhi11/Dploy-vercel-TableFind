import { useState } from "react";

// Lightweight markdown-to-HTML converter (no external dependency needed)
function renderMarkdown(text) {
  return text
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<[hul])(.+)$/gm, (m) => (m.trim() ? m : ""))
    .replace(/TOP_PICK:.*/g, ""); // hide raw top pick line
}

export default function AIRecommendation({ text, topPick }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="ai-panel">
      <div className="ai-header">
        <div className="ai-label">
          <span className="ai-dot" />
          Claude AI Analysis
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {topPick && (
            <span className="top-pick-badge">Top Pick: {topPick}</span>
          )}
          <button
            onClick={() => setExpanded((e) => !e)}
            style={{
              background: "none",
              border: "1px solid rgba(245,240,232,0.2)",
              color: "rgba(245,240,232,0.6)",
              borderRadius: "4px",
              padding: "4px 10px",
              cursor: "pointer",
              fontSize: "11px",
              fontFamily: "inherit",
              letterSpacing: "0.08em",
            }}
          >
            {expanded ? "Collapse ↑" : "Expand ↓"}
          </button>
        </div>
      </div>

      {expanded && (
        <div
          className="ai-content"
          dangerouslySetInnerHTML={{ __html: `<p>${renderMarkdown(text)}</p>` }}
        />
      )}
    </div>
  );
}
