/**
 * Insert a database name into a MongoDB URI, preserving query string (Atlas-safe).
 * mongodb://host/?ssl=true + gym_a → mongodb://host/gym_a?ssl=true
 */
const withDatabase = (uri, databaseName) => {
  if (!uri) throw new Error('MongoDB URI is required');
  const [withoutQuery, query = ''] = String(uri).split('?');
  const base = withoutQuery.replace(/\/$/, '');
  const next = `${base}/${databaseName}`;
  return query ? `${next}?${query}` : next;
};

const stripDatabase = (uri) => {
  if (!uri) return uri;
  const [withoutQuery, query = ''] = String(uri).split('?');
  // Remove trailing path segment if it looks like a db name (not empty after last /)
  const match = withoutQuery.match(/^(mongodb(?:\+srv)?:\/\/[^/]+)(?:\/[^?]*)?$/i);
  const base = match ? `${match[1]}/` : `${withoutQuery.replace(/\/$/, '')}/`;
  return query ? `${base}?${query}` : base.replace(/\/$/, '') || base;
};

module.exports = { withDatabase, stripDatabase };
