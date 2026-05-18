async function uploadBgImage(dataUrl, channelId) {
  const compressed = await compressImage(dataUrl);
  const blob = await (await fetch(compressed)).blob();
  const path = `${channelId}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  const { error } = await supabaseClient.storage
    .from('post-images')
    .upload(path, blob, { contentType: 'image/jpeg' });
  if (error) throw error;
  const { data: { publicUrl } } = supabaseClient.storage
    .from('post-images').getPublicUrl(path);
  return publicUrl;
}

async function deleteStorageImage(url) {
  if (!url || url.startsWith('data:')) return;
  const bucket = 'post-images';
  const path = url.split(`/${bucket}/`)[1];
  if (!path) return;
  await supabaseClient.storage.from(bucket).remove([path]);
}
