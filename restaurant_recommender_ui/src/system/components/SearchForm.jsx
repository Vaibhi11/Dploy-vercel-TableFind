import { useState } from "react";

export default function SearchForm({ onSearch, loading }) {
  const [form, setForm] = useState({
    location: "",
    cuisine: "",
    budget: "medium",
    occasion: "casual",
    dietary_restrictions: "",
    radius_meters: 5000,
    limit: 5,
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.location.trim()) return;
    onSearch({
      ...form,
      radius_meters: Number(form.radius_meters),
      limit: Number(form.limit),
      cuisine: form.cuisine || undefined,
      dietary_restrictions: form.dietary_restrictions || undefined,
    });
  };

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group full">
          <label>Location *</label>
          <input
            type="text"
            placeholder="New York, NY — or any city, zip code, address"
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Cuisine</label>
          <input
            type="text"
            placeholder="Italian, Sushi, BBQ…"
            value={form.cuisine}
            onChange={(e) => set("cuisine", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Dietary Restrictions</label>
          <input
            type="text"
            placeholder="Vegan, Gluten-free…"
            value={form.dietary_restrictions}
            onChange={(e) => set("dietary_restrictions", e.target.value)}
          />
        </div>
      </div>

      <div className="form-row trio">
        <div className="form-group">
          <label>Budget</label>
          <select value={form.budget} onChange={(e) => set("budget", e.target.value)}>
            <option value="low">$ Low</option>
            <option value="medium">$$ Medium</option>
            <option value="high">$$$ High</option>
          </select>
        </div>
        <div className="form-group">
          <label>Occasion</label>
          <select value={form.occasion} onChange={(e) => set("occasion", e.target.value)}>
            <option value="casual">Casual</option>
            <option value="date">Date Night</option>
            <option value="business">Business</option>
            <option value="family">Family</option>
          </select>
        </div>
        <div className="form-group">
          <label>Results</label>
          <select value={form.limit} onChange={(e) => set("limit", e.target.value)}>
            <option value={3}>3</option>
            <option value={5}>5</option>
            <option value={10}>10</option>
          </select>
        </div>
      </div>

      <button className="submit-btn" type="submit" disabled={loading}>
        {loading ? "Finding restaurants…" : "Find Restaurants"}
        {!loading && <span className="btn-arrow">→</span>}
      </button>
    </form>
  );
}
