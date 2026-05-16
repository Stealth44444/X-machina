const CUTOFF_MS = 90 * 24 * 60 * 60 * 1000;
function cutoff() { return Date.now() - CUTOFF_MS; }

function msToDate(ms) { return new Date(ms).toISOString().slice(0, 10); }

// ── Google News RSS ──────────────────────────────────────────────────────
async function fetchGoogleNews() {
  const url = 'https://news.google.com/rss/search?q=gymshark&hl=en-US&gl=US&ceid=US:en';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' } });
  if (!res.ok) return [];
  const xml = await res.text();
  const cut = cutoff();
  const items = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = m[1];
    const title = (
      block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] ||
      block.match(/<title>([\s\S]*?)<\/title>/)?.[1] || ''
    ).replace(/\s*-\s*[^-]{1,40}$/, '').trim();
    const ms = new Date(block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || 0).getTime();
    const link = block.match(/<link>(https?:\/\/[^<\s]+)/)?.[1] ||
                 block.match(/<guid[^>]*>(https?:\/\/[^<\s]+)/)?.[1] || '';
    if (!title || ms < cut) continue;
    items.push({ title, date: msToDate(ms), source: 'news', url: link, ms });
    if (items.length >= 24) break;
  }
  return items;
}

// ── Gymshark official blog (Next.js __NEXT_DATA__ parse) ─────────────────
const BLOG_PAGES = [
  { url: 'https://www.gymshark.com/blog',                              category: null },
  { url: 'https://www.gymshark.com/blog/category/gymshark',           category: 'gymshark' },
  { url: 'https://www.gymshark.com/blog/category/product-and-style',  category: 'product-and-style' },
  { url: 'https://www.gymshark.com/blog/category/fitness',            category: 'fitness' },
  { url: 'https://www.gymshark.com/blog/category/health',             category: 'health' },
];

async function fetchBlogPage({ url: pageUrl, category }) {
  const res = await fetch(pageUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!res.ok) return [];
  const html = await res.text();

  // Build slug → actual href map from rendered <a> tags (most reliable source for correct URLs)
  const slugToHref = {};
  for (const m of html.matchAll(/href="(\/blog\/[^"?#]+)"/g)) {
    const path = m[1];
    if (/^\/blog\/(category|tag|author)(\/|$)/.test(path)) continue; // skip listing pages
    const slug = path.split('/').filter(Boolean).pop();
    if (slug && !slugToHref[slug]) slugToHref[slug] = path;
  }

  // Parse __NEXT_DATA__ for title + date
  const ndm = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!ndm) return [];

  const cut = cutoff();
  const articles = [];
  const seen = new Set();

  try {
    const data = JSON.parse(ndm[1]);
    function walk(obj, depth) {
      if (depth > 14 || !obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) { obj.forEach(v => walk(v, depth + 1)); return; }
      const slug = obj.slug || obj.handle || '';
      const rawDate = obj.publishDate || obj.publishedDate || obj.publishedAt || obj.date || '';
      if (rawDate && obj.title && slug) {
        const ms = new Date(rawDate).getTime();
        // Use actual href from HTML; fall back to /blog/{slug}
        const href = slugToHref[slug] || `/blog/${slug}`;
        const url = `https://www.gymshark.com${href}`;
        if (!isNaN(ms) && ms >= cut && !seen.has(url)) {
          seen.add(url);
          articles.push({ title: obj.title, date: msToDate(ms), source: 'blog', url, ms });
        }
      }
      Object.values(obj).forEach(v => walk(v, depth + 1));
    }
    walk(data, 0);
  } catch {}

  return articles;
}

async function fetchBlog() {
  const results = await Promise.allSettled(BLOG_PAGES.map(fetchBlogPage));
  const seen = new Set();
  const articles = [];
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    for (const a of r.value) {
      if (!seen.has(a.url)) { seen.add(a.url); articles.push(a); }
    }
  }
  return articles.sort((a, b) => b.ms - a.ms).slice(0, 20);
}

// ── YouTube Data API v3 ───────────────────────────────────────────────────
async function getUploadsPlaylistId(apiKey) {
  // 1) Try YouTube Data API with multiple handle/username formats
  for (const param of ['forHandle=Gymshark', 'forHandle=gymshark', 'forUsername=Gymshark']) {
    try {
      const r = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?${param}&part=contentDetails&key=${apiKey}`
      );
      if (!r.ok) continue;
      const d = await r.json();
      const id = d.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (id) return id;
    } catch {}
  }

  // 2) Fallback: scrape youtube.com/@Gymshark for channelId, derive uploads playlist (UC→UU)
  try {
    const r = await fetch('https://www.youtube.com/@Gymshark', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
    });
    if (r.ok) {
      const html = await r.text();
      const m = html.match(/"channelId":"(UC[\w-]{22})"/);
      if (m) return m[1].replace(/^UC/, 'UU');
    }
  } catch {}

  return null;
}

async function fetchYoutube(apiKey) {
  const uploadsId = await getUploadsPlaylistId(apiKey);
  if (!uploadsId) return [];

  const r = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?playlistId=${uploadsId}&maxResults=12&part=snippet&key=${apiKey}`
  );
  if (!r.ok) return [];
  const d = await r.json();
  const cut = cutoff();
  return (d.items || []).flatMap(item => {
    const title = item.snippet?.title || '';
    const ms = new Date(item.snippet?.publishedAt || 0).getTime();
    const videoId = item.snippet?.resourceId?.videoId || '';
    if (!title || ms < cut) return [];
    return [{ title, date: msToDate(ms), source: 'youtube', url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : '', ms }];
  });
}

// ── Handler ───────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const ytKey = process.env.YOUTUBE_API_KEY;

    const [gnews, blog, youtube] = await Promise.allSettled([
      fetchGoogleNews(),
      fetchBlog(),
      ytKey ? fetchYoutube(ytKey) : Promise.resolve([]),
    ]);

    const sourceResults = {
      news:    gnews.status === 'fulfilled'   ? gnews.value   : [],
      blog:    blog.status === 'fulfilled'    ? blog.value    : [],
      youtube: youtube.status === 'fulfilled' ? youtube.value : [],
    };
    const sourceStatus = Object.fromEntries(
      Object.entries(sourceResults).map(([k, v]) => [k, { ok: v.length > 0, count: v.length }])
    );

    const seen = new Set();
    let items = Object.values(sourceResults).flat()
      .sort((a, b) => b.ms - a.ms)
      .filter(item => {
        const key = item.title.toLowerCase().slice(0, 40);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(({ ms, ...rest }) => rest);

    res.status(200).json({ items, sources: sourceStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
