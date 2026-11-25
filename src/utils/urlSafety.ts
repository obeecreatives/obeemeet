export interface TextSegment {
  type: 'text' | 'link';
  value: string;
  href?: string;
}

const URL_MATCH_REGEX = /(https?:\/\/[^\s<>"'`]+)/gi;
const ROOM_CODE_FIND_REGEX = /\b(MEET-[A-Z0-9]{4,8})\b/i;

export function isSafeHttpUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function normalizeHttpUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  if (!isSafeHttpUrl(candidate)) return null;
  return new URL(candidate).toString();
}

export function parseTextWithLinks(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_MATCH_REGEX)) {
    const matchIndex = match.index ?? 0;
    const rawUrl = match[0];

    if (matchIndex > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, matchIndex) });
    }

    // Trim trailing punctuation commonly attached to URLs in prose
    const cleaned = rawUrl.replace(/[.,!?;:)\]]+$/, '');
    const trailing = rawUrl.slice(cleaned.length);

    if (isSafeHttpUrl(cleaned)) {
      segments.push({ type: 'link', value: cleaned, href: cleaned });
    } else {
      segments.push({ type: 'text', value: cleaned });
    }

    if (trailing) {
      segments.push({ type: 'text', value: trailing });
    }

    lastIndex = matchIndex + rawUrl.length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: 'text', value: text }];
}

export function extractRoomCodeFromInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Check if user pasted a full invite URL with ?room=MEET-XXXX
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const parsed = new URL(trimmed);
      const param = parsed.searchParams.get('room');
      if (param) {
        const match = param.toUpperCase().match(ROOM_CODE_FIND_REGEX);
        if (match) return match[1].toUpperCase();
      }
    }
  } catch {
    // Fall through to plain regex extraction
  }

  const direct = trimmed.toUpperCase().match(ROOM_CODE_FIND_REGEX);
  if (direct) return direct[1].toUpperCase();

  // If user typed just the 4-char suffix (e.g. "7K2P"), prefix with MEET-
  const shortSuffix = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (shortSuffix.length >= 4 && shortSuffix.length <= 8 && !shortSuffix.startsWith('MEET')) {
    return `MEET-${shortSuffix}`;
  }

  return null;
}

export function buildInviteLink(roomCode: string): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('room', roomCode);
  return url.toString();
}
