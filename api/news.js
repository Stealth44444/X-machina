const CUTOFF_MS    = 90  * 24 * 60 * 60 * 1000;
const YT_CUTOFF_MS = 365 * 24 * 60 * 60 * 1000;
function cutoff(ms = CUTOFF_MS) { return Date.now() - ms; }

function msToDate(ms) { return new Date(ms).toISOString().slice(0, 10); }

// ── Google News RSS ──────────────────────────────────────────────────────
async function fetchGoogleNews(query) {
  const q = encodeURIComponent(query);
  const url = `https://news.google.com/rss/search?q=${q}&hl=en&gl=US&ceid=US:en`;
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
  return (d.items || []).flatMap(item => {
    const title = item.snippet?.title || '';
    const ms = new Date(item.snippet?.publishedAt || 0).getTime();
    const videoId = item.snippet?.resourceId?.videoId || '';
    if (!title || !ms) return [];
    return [{ title, date: msToDate(ms), source: 'youtube', url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : '', ms }];
  });
}

// ── Bing News RSS ────────────────────────────────────────────────────────
async function fetchBingNews(query) {
  const url = `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
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
    const ms   = new Date(block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || 0).getTime();
    const link = block.match(/<link>(https?:\/\/[^<\s]+)/)?.[1] || '';
    if (!title || ms < cut) continue;
    items.push({ title, date: msToDate(ms), source: 'bing', url: link, ms });
    if (items.length >= 20) break;
  }
  return items;
}

// ── Generic RSS / Atom parser ─────────────────────────────────────────────
async function fetchRssItems(url, label) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const cut = cutoff();
    const items = [];

    // Try RSS 2.0 <item> blocks first
    const rssMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
    // Fall back to Atom <entry> blocks
    const atomMatches = rssMatches.length === 0
      ? [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
      : [];
    const blocks = rssMatches.length > 0
      ? rssMatches.map(m => ({ block: m[1], format: 'rss' }))
      : atomMatches.map(m => ({ block: m[1], format: 'atom' }));

    for (const { block, format } of blocks) {
      let title = '';
      let ms = 0;
      let link = '';

      if (format === 'rss') {
        title = (
          block.match(/<title[^>]*>\s*<!\[CDATA\[([\s\S]*?)\]\]>/)?.[1] ||
          block.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1]?.replace(/<[^>]+>/g, '').trim() || ''
        ).replace(/\s*[-|]\s*[^-|]{1,50}$/, '').trim();
        ms = new Date(block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || 0).getTime();
        link = block.match(/<link>\s*(https?:\/\/[^<\s]+)/)?.[1] ||
               block.match(/<link[^>]+href="(https?:\/\/[^"]+)"/)?.[1] ||
               block.match(/<guid[^>]*>\s*(https?:\/\/[^<\s]+)/)?.[1] || '';
      } else {
        title = (
          block.match(/<title[^>]*>\s*<!\[CDATA\[([\s\S]*?)\]\]>/)?.[1] ||
          block.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1]?.replace(/<[^>]+>/g, '').trim() || ''
        ).replace(/\s*[-|]\s*[^-|]{1,50}$/, '').trim();
        const dateStr = block.match(/<updated>(.*?)<\/updated>/)?.[1] ||
                        block.match(/<published>(.*?)<\/published>/)?.[1] || '';
        ms = new Date(dateStr).getTime();
        link = block.match(/<link[^>]+href="(https?:\/\/[^"]+)"/)?.[1] ||
               block.match(/<link>\s*(https?:\/\/[^<\s]+)/)?.[1] || '';
      }

      if (!title || !ms || ms < cut) continue;
      items.push({ title, date: msToDate(ms), source: label, url: link, ms });
      if (items.length >= 20) break;
    }
    return items;
  } catch {
    return [];
  }
}

// ── Supabase channel rss_feeds lookup ────────────────────────────────────
async function fetchChannelFeeds(channelId) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey || !channelId) return [];
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/channels?id=eq.${encodeURIComponent(channelId)}&select=rss_feeds`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows[0]?.rss_feeds) ? rows[0].rss_feeds : [];
  } catch {
    return [];
  }
}

// ── NewsAPI.org ───────────────────────────────────────────────────────────
async function fetchNewsApi(apiKey, keywords) {
  const q = encodeURIComponent(keywords.map(k => `"${k}"`).join(' OR '));
  const url = `https://newsapi.org/v2/everything?q=${q}&sortBy=publishedAt&pageSize=30&apiKey=${apiKey}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) return [];
  const data = await res.json();
  if (data.status !== 'ok') return [];
  const cut = cutoff();
  return (data.articles || []).flatMap(a => {
    const ms = new Date(a.publishedAt || 0).getTime();
    if (!a.title || a.title === '[Removed]' || ms < cut) return [];
    return [{ title: a.title.replace(/\s*-\s*[^-]{1,40}$/, '').trim(), date: msToDate(ms), source: 'newsapi', url: a.url || '', ms }];
  });
}

// ── Handler ───────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const ytKey      = process.env.YOUTUBE_API_KEY;
    const newsApiKey = process.env.NEWSAPI_KEY;
    const channelId  = req.query.channel_id || null;

    const rawKeywords = (req.query.keywords || '')
      .split(',').map(k => k.trim()).filter(Boolean);
    const kwLower = rawKeywords.map(k => k.toLowerCase());

    // ── Curated mode: channel has rss_feeds ──────────────────────────────
    const feeds = channelId ? await fetchChannelFeeds(channelId) : [];

    if (feeds.length > 0) {
      const isDcinside = feed => feed.url.includes('gall.dcinside.com');

      const results = await Promise.allSettled(
        feeds.map(feed => fetchRssItems(feed.url, feed.label))
      );

      const sourceResults = {};
      feeds.forEach((feed, i) => {
        const items = results[i].status === 'fulfilled' ? results[i].value : [];
        // DC Inside: only keep items with at least one keyword match
        sourceResults[feed.label] = isDcinside(feed) && kwLower.length > 0
          ? items.filter(item => kwLower.some(kw => item.title.toLowerCase().includes(kw)))
          : items;
      });

      const sourceStatus = Object.fromEntries(
        Object.entries(sourceResults).map(([k, v]) => [k, { ok: v.length > 0, count: v.length }])
      );

      const seen = new Set();
      const deduped = Object.values(sourceResults).flat()
        .sort((a, b) => b.ms - a.ms)
        .filter(item => {
          const key = item.title.toLowerCase().slice(0, 40);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

      const scored = kwLower.length > 0
        ? deduped.map(item => {
            const t = item.title.toLowerCase();
            const score = kwLower.reduce((acc, kw) => acc + (t.includes(kw) ? 1 : 0), 0);
            return { ...item, _score: score };
          }).sort((a, b) => b._score !== a._score ? b._score - a._score : b.ms - a.ms)
        : deduped.map(item => ({ ...item, _score: 0 }));

      const items = scored.map(({ ms, _score, ...rest }) => rest);
      return res.status(200).json({ items, sources: sourceStatus });
    }

    // ── Fallback mode: no rss_feeds, use Google/Bing/NewsAPI ─────────────
    const primaryQuery = rawKeywords.length > 0 ? rawKeywords.join(' OR ') : 'news';
    const isGymshark = rawKeywords.some(k => /gymshark|gymspire/i.test(k));

    const [gnews, bing, newsapi, blog, youtube] = await Promise.allSettled([
      fetchGoogleNews(primaryQuery),
      fetchBingNews(primaryQuery),
      newsApiKey ? fetchNewsApi(newsApiKey, rawKeywords) : Promise.resolve([]),
      isGymshark ? fetchBlog() : Promise.resolve([]),
      isGymshark && ytKey ? fetchYoutube(ytKey) : Promise.resolve([]),
    ]);

    const gnewsItems = gnews.status === 'fulfilled' ? gnews.value : [];
    const bingItems  = (bing.status === 'fulfilled' ? bing.value : []).map(i => ({ ...i, source: 'news' }));
    const sourceResults = {
      news:    [...gnewsItems, ...bingItems],
      newsapi: newsapi.status === 'fulfilled' ? newsapi.value : [],
      blog:    blog.status   === 'fulfilled'  ? blog.value    : [],
      youtube: youtube.status === 'fulfilled' ? youtube.value : [],
    };
    const sourceStatus = Object.fromEntries(
      Object.entries(sourceResults).map(([k, v]) => [k, { ok: v.length > 0, count: v.length }])
    );

    const seen = new Set();
    const deduped = Object.values(sourceResults).flat()
      .sort((a, b) => b.ms - a.ms)
      .filter(item => {
        const key = item.title.toLowerCase().slice(0, 40);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    const scored = deduped.map(item => {
      const t = item.title.toLowerCase();
      const score = kwLower.reduce((acc, kw) => acc + (t.includes(kw) ? 1 : 0), 0);
      return { ...item, _score: score };
    }).sort((a, b) => b._score !== a._score ? b._score - a._score : b.ms - a.ms);

    const relevant = scored.filter(i => i._score > 0);
    const items = (relevant.length >= 5 ? relevant : scored).map(({ ms, _score, ...rest }) => rest);
    res.status(200).json({ items, sources: sourceStatus });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
