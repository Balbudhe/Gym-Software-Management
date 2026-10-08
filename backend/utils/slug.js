const slugify = (value = '') =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

const uniqueSlug = async (base, existsFn) => {
  let slug = slugify(base) || 'gym';
  let candidate = slug;
  let i = 2;
  while (await existsFn(candidate)) {
    candidate = `${slug}-${i}`;
    i += 1;
  }
  return candidate;
};

module.exports = { slugify, uniqueSlug };
