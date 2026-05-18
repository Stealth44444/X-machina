const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const IG_BASE      = 'https://graph.facebook.com/v19.0';

// ── Supabase REST helpers ─────────────────────────────────────────────────
const sbHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

async function sbGet(table, query) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  const res = await fetch(url, { headers: sbHeaders });
  if (!res.ok) throw new Error(`Supabase GET ${table}: ${await res.text()}`);
  return res.json();
}

async function sbPatch(table, query, body) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: sbHeaders,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase PATCH ${table}: ${await res.text()}`);
}

// ── Instagram Graph API helpers ───────────────────────────────────────────
async function igPost(path, params) {
  const url = new URL(`${IG_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { method: 'POST' });
  const data = await res.json();
  if (data.error) throw new Error(`IG API ${path}: ${data.error.message}`);
  return data;
}

async function createCarouselItem(igUserId, imageUrl, token) {
  const data = await igPost(`/${igUserId}/media`, {
    image_url: imageUrl,
    is_carousel_item: 'true',
    access_token: token,
  });
  return data.id;
}

async function createCarouselContainer(igUserId, childIds, caption, token) {
  const data = await igPost(`/${igUserId}/media`, {
    media_type: 'CAROUSEL',
    children: childIds.join(','),
    caption: caption || '',
    access_token: token,
  });
  return data.id;
}

async function createSingleContainer(igUserId, imageUrl, caption, token) {
  const data = await igPost(`/${igUserId}/media`, {
    image_url: imageUrl,
    caption: caption || '',
    access_token: token,
  });
  return data.id;
}

async function publishContainer(igUserId, creationId, token) {
  const data = await igPost(`/${igUserId}/media_publish`, {
    creation_id: creationId,
    access_token: token,
  });
  return data.id;
}

// ── Core publish logic (exported for cron reuse) ──────────────────────────
export async function publishOne(postId) {
  const [posts] = await sbGet('posts', `id=eq.${postId}&select=*`);
  if (!posts) throw new Error('Post not found');
  const post = posts;

  const [channel] = await sbGet('channels', `id=eq.${post.channel_id}&select=*`);
  if (!channel) throw new Error('Channel not found');

  const { ig_user_id, ig_access_token } = channel;
  if (!ig_user_id || !ig_access_token) {
    throw new Error('채널에 Instagram 자격 증명이 없습니다. 채널 설정을 확인하세요.');
  }

  // Collect image URLs: prefer pre-rendered slide_images, fall back to bgImages
  let imageUrls = Array.isArray(post.slide_images) && post.slide_images.length > 0
    ? post.slide_images
    : [];

  if (imageUrls.length === 0 && post.preset_id) {
    const [preset] = await sbGet('presets', `id=eq.${post.preset_id}&select=slides_json`);
    if (preset && Array.isArray(preset.slides_json)) {
      imageUrls = preset.slides_json
        .map(s => s.bgImage)
        .filter(url => url && url.startsWith('http'));
    }
  }

  if (imageUrls.length === 0) {
    throw new Error('발행 가능한 이미지가 없습니다. 포스트를 예약하면 자동으로 렌더링됩니다.');
  }

  const caption = post.caption || '';
  let igPostId;

  if (imageUrls.length === 1) {
    const containerId = await createSingleContainer(ig_user_id, imageUrls[0], caption, ig_access_token);
    igPostId = await publishContainer(ig_user_id, containerId, ig_access_token);
  } else {
    // Carousel: max 10 items per IG limits
    const capped = imageUrls.slice(0, 10);
    const childIds = await Promise.all(
      capped.map(url => createCarouselItem(ig_user_id, url, ig_access_token))
    );
    const carouselId = await createCarouselContainer(ig_user_id, childIds, caption, ig_access_token);
    igPostId = await publishContainer(ig_user_id, carouselId, ig_access_token);
  }

  await sbPatch('posts', `id=eq.${postId}`, {
    status: 'published',
    published_at: new Date().toISOString(),
    instagram_post_id: igPostId,
  });

  return igPostId;
}

// ── Handler ───────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { post_id } = req.body || {};
  if (!post_id) return res.status(400).json({ error: 'post_id required' });

  try {
    const igPostId = await publishOne(post_id);
    res.status(200).json({ ok: true, instagram_post_id: igPostId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
