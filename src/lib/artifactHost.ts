/**
 * When this build is published as a claude.ai Artifact, the page runs inside a
 * viewer that blocks ordinary downloads. The viewer instead exposes a
 * `downloads` capability that prompts the user before saving. Everywhere else
 * (Expo Go, a plain browser) none of this exists and the caller falls back.
 */

type SaveRequest = { filename: string; data: string | Blob | ArrayBuffer };
type Downloads = { save: (r: SaveRequest) => Promise<{ status: 'saved' }> };
type ClaudeHost = { use: (name: string) => Promise<unknown> };

function host(): ClaudeHost | null {
  if (typeof window === 'undefined') return null;
  const claude = (window as unknown as { claude?: ClaudeHost }).claude;
  return typeof claude?.use === 'function' ? claude : null;
}

export class DeclinedError extends Error {}

/**
 * Saves through the artifact viewer. Returns false when there is no viewer,
 * so the caller can use a normal download instead.
 */
export async function saveViaHost(filename: string, contents: string): Promise<boolean> {
  const claude = host();
  if (!claude) return false;

  const downloads = (await claude.use('downloads')) as Downloads | null;
  if (!downloads) return false;

  try {
    await downloads.save({ filename, data: contents });
    return true;
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === 'declined') throw new DeclinedError('Save cancelled.');
    if (code === 'too_large') throw new Error('The backup is too large to save here (16 MB limit).');
    if (code === 'rate_limited') throw new Error('A save prompt is already open. Try again in a moment.');
    // Anything else means the viewer cannot save; let the caller fall back.
    return false;
  }
}
