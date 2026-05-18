// ── Channels ─────────────────────────────────────────────────────────────────

async function dbGetChannels() {
  const { data, error } = await supabaseClient
    .from('channels').select('*').order('created_at');
  if (error) throw error;
  return data;
}

async function dbUpsertChannel(channel) {
  const { data, error } = await supabaseClient
    .from('channels').upsert(channel).select().single();
  if (error) throw error;
  return data;
}

async function dbDeleteChannel(id) {
  const { error } = await supabaseClient
    .from('channels').delete().eq('id', id);
  if (error) throw error;
}

// ── Presets ──────────────────────────────────────────────────────────────────

async function dbGetPresets(channelId) {
  const { data, error } = await supabaseClient
    .from('presets').select('*')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function dbUpsertPreset(preset) {
  const payload = { ...preset, updated_at: new Date().toISOString() };
  const { data, error } = await supabaseClient
    .from('presets').upsert(payload).select().single();
  if (error) throw error;
  return data;
}

async function dbDeletePreset(id) {
  const { error } = await supabaseClient
    .from('presets').delete().eq('id', id);
  if (error) throw error;
}

// ── Posts ─────────────────────────────────────────────────────────────────────

async function dbGetPosts(channelId) {
  const q = supabaseClient
    .from('posts')
    .select('*, presets(name)')
    .order('created_at', { ascending: false });
  if (channelId) q.eq('channel_id', channelId);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

async function dbGetAllPosts() {
  return dbGetPosts(null);
}

async function dbUpsertPost(post) {
  const { data, error } = await supabaseClient
    .from('posts').upsert(post).select().single();
  if (error) throw error;
  return data;
}

async function dbUpdatePostStatus(id, status, scheduledAt) {
  const update = { status };
  if (scheduledAt !== undefined) update.scheduled_at = scheduledAt;
  if (status === 'published') update.published_at = new Date().toISOString();
  const { error } = await supabaseClient
    .from('posts').update(update).eq('id', id);
  if (error) throw error;
}
