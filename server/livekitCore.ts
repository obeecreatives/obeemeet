import crypto from 'node:crypto';
import { AccessToken, RoomServiceClient, TrackType } from 'livekit-server-sdk';

export interface CompanionLink {
  url: string;
  label: string;
  updatedAt: number;
}

export interface RoomMetadataInternal {
  roomCode: string;
  title?: string;
  createdAt: number;
  isLocked: boolean;
  hostPinHash?: string;
  spotlightIdentity: string | null;
  companionLink: CompanionLink | null;
}

export interface PublicRoomMetadata {
  roomCode: string;
  title?: string;
  createdAt: number;
  isLocked: boolean;
  spotlightIdentity: string | null;
  companionLink: CompanionLink | null;
}

export interface ApiResult<T = unknown> {
  status: number;
  body: T;
}

const ROOM_CODE_REGEX = /^MEET-[A-Z0-9]{4,8}$/;
const PIN_REGEX = /^\d{4,6}$/;
const ROOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Ephemeral fallback signing key for local/preview mode when env secrets are unset.
const EPHEMERAL_SIGNING_SECRET = crypto.randomBytes(32).toString('hex');

// In-memory store used in Preview Mode (when LiveKit env vars are not configured).
const previewRooms = new Map<string, RoomMetadataInternal>();

function getEnvConfig() {
  const url = (process.env.LIVEKIT_URL || '').trim();
  const apiKey = (process.env.LIVEKIT_API_KEY || '').trim();
  const apiSecret = (process.env.LIVEKIT_API_SECRET || '').trim();
  const configured = Boolean(
    url &&
      apiKey &&
      apiSecret &&
      !url.includes('your-project') &&
      !apiKey.includes('YOUR_LIVEKIT') &&
      !apiSecret.includes('YOUR_LIVEKIT')
  );
  return { url, apiKey, apiSecret, configured };
}

function getSigningSecret(): string {
  const envSecret = (process.env.HOST_SESSION_SECRET || '').trim();
  if (envSecret.length >= 16) return envSecret;
  const lkSecret = (process.env.LIVEKIT_API_SECRET || '').trim();
  if (lkSecret.length >= 16 && !lkSecret.includes('YOUR_LIVEKIT')) {
    return crypto.createHash('sha256').update(`obeemeet-host:${lkSecret}`).digest('hex');
  }
  return EPHEMERAL_SIGNING_SECRET;
}

function toHttpUrl(livekitUrl: string): string {
  if (livekitUrl.startsWith('wss://')) return `https://${livekitUrl.slice(6)}`;
  if (livekitUrl.startsWith('ws://')) return `http://${livekitUrl.slice(5)}`;
  return livekitUrl;
}

function getRoomService(): RoomServiceClient | null {
  const cfg = getEnvConfig();
  if (!cfg.configured) return null;
  return new RoomServiceClient(toHttpUrl(cfg.url), cfg.apiKey, cfg.apiSecret);
}

export function generateRoomCode(): string {
  const bytes = crypto.randomBytes(4);
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += ROOM_CHARS[bytes[i] % ROOM_CHARS.length];
  }
  return `MEET-${suffix}`;
}

export function generateHostPin(): string {
  const num = crypto.randomInt(100000, 999999);
  return String(num);
}

function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(pin, salt, 32).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPin(pin: string, storedHash?: string): boolean {
  if (!storedHash || !PIN_REGEX.test(pin)) return false;
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  const derived = crypto.scryptSync(pin, salt, 32);
  const expected = Buffer.from(expectedHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

interface HostTokenPayload {
  roomCode: string;
  role: 'host';
  iat: number;
  exp: number;
}

export function signHostToken(roomCode: string): string {
  const payload: HostTokenPayload = {
    roomCode,
    role: 'host',
    iat: Date.now(),
    exp: Date.now() + 12 * 60 * 60 * 1000, // 12 hours for long training sessions
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyHostToken(authHeader: string | undefined, expectedRoomCode: string): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7).trim();
  const dotIdx = token.indexOf('.');
  if (dotIdx <= 0) return false;

  const encoded = token.slice(0, dotIdx);
  const providedSig = token.slice(dotIdx + 1);
  const expectedSig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encoded)
    .digest('base64url');

  const a = Buffer.from(providedSig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as HostTokenPayload;
    return (
      parsed.role === 'host' &&
      parsed.roomCode === expectedRoomCode &&
      typeof parsed.exp === 'number' &&
      parsed.exp > Date.now()
    );
  } catch {
    return false;
  }
}

export function stripSensitiveMetadata(meta: RoomMetadataInternal): PublicRoomMetadata {
  return {
    roomCode: meta.roomCode,
    title: meta.title,
    createdAt: meta.createdAt,
    isLocked: Boolean(meta.isLocked),
    spotlightIdentity: meta.spotlightIdentity ?? null,
    companionLink: meta.companionLink ?? null,
  };
}

function parseSafeCompanionUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 2048) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function sanitizeRoomCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.trim().toUpperCase();
  if (!ROOM_CODE_REGEX.test(cleaned)) return null;
  return cleaned;
}

function sanitizeDisplayName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  if (cleaned.length < 1 || cleaned.length > 50) return null;
  return cleaned;
}

async function fetchRoomMetadata(roomCode: string): Promise<RoomMetadataInternal | null> {
  const roomService = getRoomService();
  if (!roomService) {
    return previewRooms.get(roomCode) ?? null;
  }
  try {
    const rooms = await roomService.listRooms([roomCode]);
    const room = rooms.find((r) => r.name === roomCode);
    if (!room) return null;
    if (room.metadata) {
      const parsed = JSON.parse(room.metadata) as Partial<RoomMetadataInternal>;
      return {
        roomCode,
        title: parsed.title,
        createdAt: typeof parsed.createdAt === 'number' ? parsed.createdAt : Date.now(),
        isLocked: Boolean(parsed.isLocked),
        hostPinHash: parsed.hostPinHash,
        spotlightIdentity: parsed.spotlightIdentity ?? null,
        companionLink: parsed.companionLink ?? null,
      };
    }
    return {
      roomCode,
      createdAt: Date.now(),
      isLocked: false,
      spotlightIdentity: null,
      companionLink: null,
    };
  } catch {
    return null;
  }
}

async function persistRoomMetadata(meta: RoomMetadataInternal): Promise<void> {
  const roomService = getRoomService();
  if (!roomService) {
    previewRooms.set(meta.roomCode, meta);
    return;
  }
  const serialized = JSON.stringify(meta);
  try {
    await roomService.updateRoomMetadata(meta.roomCode, serialized);
  } catch {
    await roomService.createRoom({
      name: meta.roomCode,
      emptyTimeout: 60 * 30, // Keep room metadata alive 30 minutes if Host temporarily drops
      maxParticipants: 100,
      metadata: serialized,
    });
  }
}

export function handleHealth(): ApiResult {
  const cfg = getEnvConfig();
  let host: string | null = null;
  if (cfg.configured) {
    try {
      host = new URL(toHttpUrl(cfg.url)).host;
    } catch {
      host = null;
    }
  }
  return {
    status: 200,
    body: {
      ok: true,
      livekitConfigured: cfg.configured,
      livekitHost: host,
    },
  };
}

export async function handleCreateRoom(body: Record<string, unknown>): Promise<ApiResult> {
  const requestedCode = typeof body.roomCode === 'string' ? sanitizeRoomCode(body.roomCode) : null;
  const roomCode = requestedCode || generateRoomCode();
  const rawTitle = typeof body.title === 'string' ? body.title.trim().slice(0, 80) : '';
  const rawPin = typeof body.customPin === 'string' ? body.customPin.trim() : '';
  const hostPin = PIN_REGEX.test(rawPin) ? rawPin : generateHostPin();

  const meta: RoomMetadataInternal = {
    roomCode,
    title: rawTitle || undefined,
    createdAt: Date.now(),
    isLocked: false,
    hostPinHash: hashPin(hostPin),
    spotlightIdentity: null,
    companionLink: null,
  };

  try {
    await persistRoomMetadata(meta);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal membuat ruang pada server LiveKit.';
    return { status: 502, body: { error: message } };
  }

  const hostToken = signHostToken(roomCode);
  const cfg = getEnvConfig();

  return {
    status: 200,
    body: {
      mode: cfg.configured ? 'livekit' : 'preview',
      roomCode,
      hostPin,
      hostToken,
      metadata: stripSensitiveMetadata(meta),
    },
  };
}

export async function handleJoinToken(
  body: Record<string, unknown>,
  authHeader: string | undefined
): Promise<ApiResult> {
  const roomCode = sanitizeRoomCode(body.roomCode);
  if (!roomCode) {
    return { status: 400, body: { error: 'Format kode ruang tidak valid. Gunakan format MEET-XXXX.' } };
  }

  const participantName = sanitizeDisplayName(body.participantName);
  if (!participantName) {
    return { status: 400, body: { error: 'Nama peserta wajib diisi (1–50 karakter).' } };
  }

  const hostPin = typeof body.hostPin === 'string' ? body.hostPin.trim() : '';
  const requestedAsHost = Boolean(body.asHost || hostPin);

  let meta = await fetchRoomMetadata(roomCode);
  let isVerifiedHost = verifyHostToken(authHeader, roomCode);
  let issuedHostToken: string | undefined;

  if (!isVerifiedHost && hostPin) {
    if (meta && verifyPin(hostPin, meta.hostPinHash)) {
      isVerifiedHost = true;
      issuedHostToken = signHostToken(roomCode);
    } else {
      return { status: 403, body: { error: 'PIN Host tidak cocok dengan ruang kelas ini.' } };
    }
  } else if (requestedAsHost && !isVerifiedHost) {
    return {
      status: 403,
      body: { error: 'Sesi Host tidak terverifikasi. Masukkan PIN Host 6 digit untuk masuk sebagai Pemateri.' },
    };
  }

  if (meta?.isLocked && !isVerifiedHost) {
    return {
      status: 403,
      body: { error: 'Ruang kelas saat ini sedang dikunci oleh Pemateri.' },
    };
  }

  if (!meta) {
    meta = {
      roomCode,
      createdAt: Date.now(),
      isLocked: false,
      spotlightIdentity: null,
      companionLink: null,
    };
    if (!getEnvConfig().configured) {
      previewRooms.set(roomCode, meta);
    }
  }

  const role: 'host' | 'participant' = isVerifiedHost ? 'host' : 'participant';
  const identity = `${role}-${crypto.randomBytes(5).toString('hex')}`;
  const joinedAt = Date.now();
  const cfg = getEnvConfig();

  if (!cfg.configured) {
    return {
      status: 200,
      body: {
        mode: 'preview',
        roomCode,
        identity,
        participantName,
        role,
        hostToken: issuedHostToken,
        metadata: stripSensitiveMetadata(meta),
      },
    };
  }

  try {
    const at = new AccessToken(cfg.apiKey, cfg.apiSecret, {
      identity,
      name: participantName,
      ttl: '8h', // Supports nonstop 2–4+ hour training sessions
      metadata: JSON.stringify({ role, joinedAt }),
    });

    at.addGrant({
      roomJoin: true,
      room: roomCode,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true,
    });

    const token = await at.toJwt();

    return {
      status: 200,
      body: {
        mode: 'livekit',
        livekitUrl: cfg.url,
        token,
        roomCode,
        identity,
        participantName,
        role,
        hostToken: issuedHostToken,
        metadata: stripSensitiveMetadata(meta),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal menerbitkan token LiveKit.';
    return { status: 500, body: { error: message } };
  }
}

export async function handleRoomAction(
  body: Record<string, unknown>,
  authHeader: string | undefined
): Promise<ApiResult> {
  const roomCode = sanitizeRoomCode(body.roomCode);
  if (!roomCode) {
    return { status: 400, body: { error: 'Kode ruang tidak valid.' } };
  }

  if (!verifyHostToken(authHeader, roomCode)) {
    return { status: 403, body: { error: 'Aksi ini khusus untuk Pemateri (Host) terverifikasi.' } };
  }

  const action = typeof body.action === 'string' ? body.action : '';
  const roomService = getRoomService();
  let meta = await fetchRoomMetadata(roomCode);

  if (!meta) {
    meta = {
      roomCode,
      createdAt: Date.now(),
      isLocked: false,
      spotlightIdentity: null,
      companionLink: null,
    };
  }

  switch (action) {
    case 'toggleLock': {
      meta.isLocked = Boolean(body.locked);
      await persistRoomMetadata(meta);
      return { status: 200, body: { ok: true, metadata: stripSensitiveMetadata(meta) } };
    }

    case 'setSpotlight': {
      const targetId =
        typeof body.identity === 'string' && body.identity.trim().length > 0
          ? body.identity.trim().slice(0, 80)
          : null;
      meta.spotlightIdentity = targetId;
      await persistRoomMetadata(meta);
      return { status: 200, body: { ok: true, metadata: stripSensitiveMetadata(meta) } };
    }

    case 'setCompanionLink': {
      const rawUrl = typeof body.url === 'string' ? body.url.trim() : '';
      if (!rawUrl) {
        meta.companionLink = null;
        await persistRoomMetadata(meta);
        return { status: 200, body: { ok: true, metadata: stripSensitiveMetadata(meta) } };
      }

      const safeUrl = parseSafeCompanionUrl(rawUrl);
      if (!safeUrl) {
        return {
          status: 400,
          body: { error: 'Tautan papan tulis harus diawali http:// atau https:// yang valid.' },
        };
      }

      const rawLabel = typeof body.label === 'string' ? body.label.trim().slice(0, 80) : '';
      meta.companionLink = {
        url: safeUrl,
        label: rawLabel || 'Papan Tulis Live',
        updatedAt: Date.now(),
      };
      await persistRoomMetadata(meta);
      return { status: 200, body: { ok: true, metadata: stripSensitiveMetadata(meta) } };
    }

    case 'muteParticipant': {
      const targetIdentity = typeof body.identity === 'string' ? body.identity.trim() : '';
      if (!targetIdentity) {
        return { status: 400, body: { error: 'ID peserta wajib disertakan.' } };
      }
      if (roomService) {
        try {
          const participants = await roomService.listParticipants(roomCode);
          const target = participants.find((p) => p.identity === targetIdentity);
          if (target) {
            for (const track of target.tracks) {
              if (track.type === TrackType.AUDIO && !track.muted) {
                await roomService.mutePublishedTrack(roomCode, targetIdentity, track.sid, true);
              }
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Gagal membisukan peserta.';
          return { status: 500, body: { error: msg } };
        }
      }
      return { status: 200, body: { ok: true, mutedIdentity: targetIdentity } };
    }

    case 'muteAll': {
      const excludeIdentity = typeof body.excludeIdentity === 'string' ? body.excludeIdentity.trim() : '';
      if (roomService) {
        try {
          const participants = await roomService.listParticipants(roomCode);
          for (const participant of participants) {
            if (participant.identity === excludeIdentity) continue;
            for (const track of participant.tracks) {
              if (track.type === TrackType.AUDIO && !track.muted) {
                await roomService.mutePublishedTrack(roomCode, participant.identity, track.sid, true);
              }
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Gagal membisukan seluruh peserta.';
          return { status: 500, body: { error: msg } };
        }
      }
      return { status: 200, body: { ok: true } };
    }

    case 'endSession': {
      if (roomService) {
        try {
          await roomService.deleteRoom(roomCode);
        } catch {
          // Room may already be closed
        }
      } else {
        previewRooms.delete(roomCode);
      }
      return { status: 200, body: { ok: true, ended: true } };
    }

    default:
      return { status: 400, body: { error: 'Aksi ruang tidak dikenali.' } };
  }
}
