import { supabase } from '@/integrations/supabase/client';

/**
 * uploadArt — upload a base64 data-URI image to the public `app-art` Storage
 * bucket and return its public URL.
 *
 * Storing a URL (not the multi-MB base64) in app_assets keeps get_app_assets
 * tiny, so the lobby stays fast even with dozens of game arts — and it avoids
 * the RPC payload limit that a 2-4MB base64 image hits when passed straight to
 * save_app_asset. Already-hosted http(s) inputs pass straight through.
 *
 * `key` is the asset key (e.g. `game.1808`); it becomes a stable file path so
 * re-generating a game overwrites its file. A cache-busting `?v=` is appended.
 */
export async function uploadArt(dataUri: string, key: string): Promise<string> {
  if (/^https?:\/\//i.test(dataUri)) return dataUri;
  const m = /^data:(image\/[a-z.+-]+);base64,(.*)$/i.exec(dataUri);
  if (!m) throw new Error('Unsupported image data');
  const mime = m[1];
  const ext = mime.split('/')[1].replace('jpeg', 'jpg').replace('svg+xml', 'svg');
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const safe = (key || 'lib').replace(/[^a-z0-9._-]/gi, '_');
  const path = `${safe}.${ext}`;
  const { error } = await supabase.storage.from('app-art').upload(path, bytes, { contentType: mime, upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data } = supabase.storage.from('app-art').getPublicUrl(path);
  if (!data?.publicUrl) throw new Error('Could not resolve public URL');
  return `${data.publicUrl}?v=${Date.now()}`;
}
