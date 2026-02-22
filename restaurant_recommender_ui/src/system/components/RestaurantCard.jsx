export default function RestaurantCard({ restaurant, isTopPick, index }) {
  const { name, rating, review_count, price, categories, address, phone, yelp_url, image_url, distance_meters } = restaurant;

  const stars = (r) => {
    const full = Math.floor(r);
    const half = r % 1 >= 0.5 ? 1 : 0;
    return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - half);
  };

  const distanceLabel = distance_meters
    ? distance_meters < 1000
      ? `${Math.round(distance_meters)}m away`
      : `${(distance_meters / 1000).toFixed(1)}km away`
    : null;

  return (
    <div
      className={`card${isTopPick ? " top-pick" : ""}`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {isTopPick && <div className="top-pick-ribbon">⭑ Top Pick</div>}

      {image_url ? (
        <img src={image_url} alt={name} className="card-image" loading="lazy" />
      ) : (
        <div className="card-image-placeholder">🍽</div>
      )}

      <div className="card-body">
        <div className="card-top">
          <div>
            <div className="card-name">{name}</div>
            {price && <div className="card-price">{price}</div>}
          </div>
          <div className="card-rating">
            <span className="stars">{stars(rating)}</span>
            <span className="rating-num">{rating} ({review_count})</span>
          </div>
        </div>

        <div className="card-categories">
          {categories.slice(0, 3).map((c) => (
            <span key={c} className="category-tag">{c}</span>
          ))}
          {distanceLabel && <span className="category-tag">{distanceLabel}</span>}
        </div>

        <div className="card-address">
          <span className="card-address-icon">◎</span>
          <span>{address}</span>
        </div>

        <div className="card-footer">
          <span className="card-phone">{phone || "—"}</span>
          {yelp_url && (
            <a href={yelp_url} target="_blank" rel="noreferrer" className="yelp-link">
              View on Yelp ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
