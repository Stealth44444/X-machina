async function runMigrationIfNeeded() {
  const migrationKey = 'brand_tool_migrated_v2';
  if (localStorage.getItem(migrationKey)) return;

  const oldPresets = localStorage.getItem('brand_tool_presets_gymspire')
    || localStorage.getItem('gymspire_presets');
  if (!oldPresets) {
    localStorage.setItem(migrationKey, '1');
    return;
  }

  let presets;
  try { presets = JSON.parse(oldPresets); } catch { presets = []; }
  if (!presets.length) {
    localStorage.setItem(migrationKey, '1');
    return;
  }

  const GYMSPIRE_ID = '00000000-0000-0000-0000-000000000001';
  let imported = 0;
  for (const p of presets) {
    try {
      await dbUpsertPreset({
        channel_id: GYMSPIRE_ID,
        name: p.name || '가져온 작업',
        slides_json: p.slides || [],
      });
      imported++;
    } catch (e) {
      console.warn('migration preset skip:', e.message);
    }
  }
  console.log(`Migration: ${imported}/${presets.length} presets imported`);
  localStorage.setItem(migrationKey, '1');
  localStorage.removeItem('brand_tool_presets_gymspire');
  localStorage.removeItem('gymspire_presets');
}
