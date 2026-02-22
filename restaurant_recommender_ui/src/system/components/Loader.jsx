const MESSAGES = [
  "Scanning Yelp listings…",
  "Consulting Claude AI…",
  "Curating your options…",
  "Almost there…",
];

import { useState, useEffect } from "react";

export default function Loader() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % MESSAGES.length), 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="loader">
      <div className="loader-ring" />
      <div className="loader-text">{MESSAGES[idx]}</div>
    </div>
  );
}
