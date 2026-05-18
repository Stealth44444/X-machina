import { publishOne } from './publish.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET  = process.env.CRON_SECRET;

const sbHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

async function getDuePosts() {
  const now = new Date().toISOString();
  const url = `${SUPABASE_URL}/rest/v1/posts?status=eq.scheduled&scheduled_at=lte.${now}&select=id`;
  const res = await fetch(url, { headers: sbHeaders });
  if (!res.ok) throw new Error(`Supabase fetch due posts: ${await res.text()}`);
  return res.json();
}

export default async function handler(req, res) {
  // Vercel cron requests carry the Authorization header with CRON_SECRET
  if (CRON_SECRET && req.headers.authorization !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const posts = await getDuePosts();
    const results = [];

    for (const { id } of posts) {
      try {
        const igPostId = await publishOne(id);
        results.push({ id, ok: true, instagram_post_id: igPostId });
      } catch (err) {
        results.push({ id, ok: false, error: err.message });
      }
    }

    res.status(200).json({ processed: results.length, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
