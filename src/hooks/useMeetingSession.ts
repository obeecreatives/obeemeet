import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LocalParticipant,
  Participant,
  RemoteParticipant,
  Room,
  RoomEvent,
  Track,
  VideoPresets,
} from 'livekit-client';
import type { MediaDeviceOption } from './useLocalMedia';
import type {
  ActiveSessionConfig,
  AttendanceRecord,
  ChatMessage,
  DeviceSettingsState,
  ParticipantRole,
  ParticipantState,
  ReactionEmoji,
  ReactionEvent,
  RoomMetadata,
  ScreenSharePreset,
} from '../types/meeting';

const SIMULATED_PARTICIPANTS_SEED = [
  {
    identity: 'sim-nadia',
    name: 'Nadia Kusuma',
    role: 'participant' as ParticipantRole,
    isMicOn: true,
    isCameraOn: true,
    isSpeaking: false,
    handRaisedOffsetMs: null as number | null,
    joinedOffsetMs: 1000 * 60 * 14,
    avatarImage: '/src/assets/images/sim_participant_nadia_1795585701011.jpg',
    avatarCropClass: 'scale-[1.24] object-[50%_26%]',
  },
  {
    identity: 'sim-budi',
    name: 'Budi Santoso',
    role: 'participant' as ParticipantRole,
    isMicOn: false,
    isCameraOn: true,
    isSpeaking: false,
    handRaisedOffsetMs: 1000 * 95,
    joinedOffsetMs: 1000 * 60 * 12,
    avatarImage: '/src/assets/images/sim_participant_budi_1795585701996.jpg',
    avatarCropClass: 'object-cover object-center',
  },
  {
    identity: 'sim-sinta',
    name: 'Sinta Rahmawati',
    role: 'participant' as ParticipantRole,
    isMicOn: false,
    isCameraOn: true,
    isSpeaking: false,
    handRaisedOffsetMs: 1000 * 35,
    joinedOffsetMs: 1000 * 60 * 9,
    avatarImage: '/src/assets/images/sim_participant_sinta_1795585703685.jpg',
    avatarCropClass: 'scale-[1.28] object-[50%_40%]',
  },
  {
    identity: 'sim-dimas',
    name: 'Dimas Pratama',
    role: 'participant' as ParticipantRole,
    isMicOn: false,
    isCameraOn: true,
    isSpeaking: false,
    handRaisedOffsetMs: null as number | null,
    joinedOffsetMs: 1000 * 60 * 6,
    avatarImage: '/src/assets/images/sim_participant_dimas_1795585706013.jpg',
    avatarCropClass: 'object-cover object-center',
  },
];

type DataEventPayload =
  | { type: 'chat'; message: ChatMessage }
  | { type: 'hand'; identity: string; raisedAt: number | null }
  | { type: 'reaction'; reaction: Omit<ReactionEvent, 'offsetX'> }
  | { type: 'session_ended' };

function createSimulatedWhiteboardStream(): MediaStream | null {
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 900;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Clean dark-slate teaching slide / whiteboard visual for crisp Presentation Layout testing
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle dot grid
  ctx.fillStyle = 'rgba(148, 163, 184, 0.16)';
  for (let x = 48; x < canvas.width; x += 40) {
    for (let y = 48; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Top header strip
  ctx.fillStyle = '#14B8A6';
  ctx.fillRect(80, 72, 120, 6);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 22px "DM Sans", sans-serif';
  ctx.fillText('OBEEMEET · SIMULASI PAPAN TULIS / MATERI AJAR', 80, 118);

  ctx.fillStyle = '#F8FAFC';
  ctx.font = '700 48px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Arsitektur Pelatihan Online Interaktif', 80, 186);

  ctx.fillStyle = '#CBD5E1';
  ctx.font = '400 26px "DM Sans", sans-serif';
  ctx.fillText(
    'Mode Teks Tajam (contentHint: detail) menjaga garis diagram & tulisan tetap terbaca jelas.',
    80,
    236
  );

  // Diagram boxes
  const boxes = [
    { x: 80, y: 310, w: 420, h: 210, title: '01. Konsep Inti', body: 'Paparan materi 2–4 jam\ntanpa batas waktu sesi.' },
    { x: 590, y: 310, w: 420, h: 210, title: '02. Papan Tulis Live', body: 'Tautan Read-Only tersemat\ndi atas layar semua peserta.' },
    { x: 1100, y: 310, w: 420, h: 210, title: '03. Tanya & Absensi', body: 'Antrean angkat tangan urut\n& ekspor rekap CSV otomatis.' },
  ];

  boxes.forEach((b) => {
    ctx.fillStyle = '#131C2E';
    ctx.strokeStyle = 'rgba(20, 184, 166, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#2DD4BF';
    ctx.font = '600 26px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(b.title, b.x + 28, b.y + 56);

    ctx.fillStyle = '#E2E8F0';
    ctx.font = '400 23px "DM Sans", sans-serif';
    b.body.split('\n').forEach((line, i) => {
      ctx.fillText(line, b.x + 28, b.y + 112 + i * 36);
    });
  });

  // Connecting arrows
  ctx.strokeStyle = '#14B8A6';
  ctx.lineWidth = 3;
  [500, 1010].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x + 12, 415);
    ctx.lineTo(x + 76, 415);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 64, 405);
    ctx.lineTo(x + 78, 415);
    ctx.lineTo(x + 64, 425);
    ctx.stroke();
  });

  // Formula / code-like crisp small text sample to demonstrate legibility
  ctx.fillStyle = '#1E293B';
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(80, 580, 1440, 210, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#94A3B8';
  ctx.font = '600 20px "JetBrains Mono", monospace';
  ctx.fillText('CONTOH KETAJAMAN TEKS KECIL & CATATAN PAPAN TULIS', 112, 628);

  ctx.fillStyle = '#F1F5F9';
  ctx.font = '500 24px "JetBrains Mono", monospace';
  ctx.fillText('1. Rasio Fokus Presentasi : 75% – 80% area utama', 112, 680);
  ctx.fillText('2. Preset Kualitas Share  : 1080p · contentHint="detail" · 15 fps stabil', 112, 722);
  ctx.fillText('3. Catatan Peserta        : Gunakan tombol "Buka Papan Tulis Live" di bilah atas', 112, 764);

  if (typeof canvas.captureStream === 'function') {
    return canvas.captureStream(10);
  }
  return null;
}

function parseParticipantRole(p: Participant): { role: ParticipantRole; joinedAt: number } {
  try {
    if (p.metadata) {
      const parsed = JSON.parse(p.metadata) as { role?: ParticipantRole; joinedAt?: number };
      return {
        role: parsed.role === 'host' ? 'host' : 'participant',
        joinedAt: typeof parsed.joinedAt === 'number' ? parsed.joinedAt : Date.now(),
      };
    }
  } catch {
    // Ignore malformed metadata
  }
  return { role: 'participant', joinedAt: Date.now() };
}

export interface UseMeetingSessionReturn {
  participants: ParticipantState[];
  roomMetadata: RoomMetadata;
  chatMessages: ChatMessage[];
  reactions: ReactionEvent[];
  attendance: AttendanceRecord[];
  connectionState: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
  sessionEndedByHost: boolean;
  errorMessage: string | null;
  toastMessage: string | null;
  clearToast: () => void;
  isLocalMicOn: boolean;
  isLocalCameraOn: boolean;
  isLocalScreenSharing: boolean;
  isLocalHandRaised: boolean;
  screenSharePreset: ScreenSharePreset;
  toggleMic: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  startScreenShare: (preset: ScreenSharePreset, useSimulatedCanvas?: boolean) => Promise<void>;
  stopScreenShare: () => Promise<void>;
  toggleRaiseHand: () => Promise<void>;
  lowerParticipantHand: (identity: string) => Promise<void>;
  sendChatMessage: (text: string) => Promise<void>;
  sendReaction: (emoji: ReactionEmoji) => Promise<void>;
  muteParticipant: (identity: string) => Promise<void>;
  muteAllParticipants: () => Promise<void>;
  toggleLockRoom: () => Promise<void>;
  setSpotlight: (identity: string | null) => Promise<void>;
  setCompanionLink: (url: string | null, label?: string) => Promise<boolean>;
  endSessionForAll: () => Promise<void>;
  leaveSession: () => Promise<void>;
  deviceSettings: DeviceSettingsState;
  audioInputDevices: MediaDeviceOption[];
  audioOutputDevices: MediaDeviceOption[];
  videoInputDevices: MediaDeviceOption[];
  localMicStream: MediaStream | null;
  updateDeviceSettings: (partial: Partial<DeviceSettingsState>) => Promise<void>;
  refreshDevices: () => Promise<void>;
  triggerPreviewRaiseHand?: () => void;
}

export function useMeetingSession(session: ActiveSessionConfig): UseMeetingSessionReturn {
  const [roomMetadata, setRoomMetadata] = useState<RoomMetadata>(session.metadata);
  const [connectionState, setConnectionState] = useState<
    'connecting' | 'connected' | 'reconnecting' | 'disconnected'
  >('connecting');
  const [sessionEndedByHost, setSessionEndedByHost] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isLocalMicOn, setIsLocalMicOn] = useState(session.initialMicOn);
  const [isLocalCameraOn, setIsLocalCameraOn] = useState(session.initialCameraOn);
  const [isLocalScreenSharing, setIsLocalScreenSharing] = useState(false);
  const [screenSharePreset, setScreenSharePreset] = useState<ScreenSharePreset>('whiteboard');
  const [deviceSettings, setDeviceSettings] = useState<DeviceSettingsState>({
    audioInputId: session.selectedAudioDeviceId || '',
    audioOutputId: session.selectedAudioOutputId || '',
    videoInputId: session.selectedVideoDeviceId || '',
    audioMode: session.audioMode || 'standard',
    videoQuality: session.videoQuality || '720p',
    mirrorCamera: session.mirrorCamera ?? true,
  });
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceOption[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceOption[]>([]);
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceOption[]>([]);
  const [handRaisedMap, setHandRaisedMap] = useState<Record<string, number>>(() => {
    if (session.mode !== 'preview') return {};
    const now = Date.now();
    const initial: Record<string, number> = {};
    SIMULATED_PARTICIPANTS_SEED.forEach((p) => {
      if (p.handRaisedOffsetMs !== null) {
        initial[p.identity] = now - p.handRaisedOffsetMs;
      }
    });
    return initial;
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    if (session.mode !== 'preview') return [];
    const now = Date.now();
    return [
      {
        id: 'seed-msg-1',
        senderIdentity: 'sim-nadia',
        senderName: 'Nadia Kusuma',
        senderRole: 'participant',
        text: 'Selamat datang semuanya! Suara pemateri terdengar sangat jelas di sini.',
        timestamp: now - 1000 * 60 * 4,
      },
      {
        id: 'seed-msg-2',
        senderIdentity: 'sim-budi',
        senderName: 'Budi Santoso',
        senderRole: 'participant',
        text: 'Referensi catatan modul hari ini bisa dibuka juga di https://obeecreatives.com ya teman-teman.',
        timestamp: now - 1000 * 60 * 2,
      },
    ];
  });

  const [reactions, setReactions] = useState<ReactionEvent[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord>>(() => {
    const now = Date.now();
    const initial: Record<string, AttendanceRecord> = {
      [session.identity]: {
        identity: session.identity,
        name: session.participantName,
        role: session.role,
        firstJoinedAt: now,
        lastJoinedAt: now,
        lastLeftAt: null,
        accumulatedSeconds: 0,
        isOnline: true,
      },
    };
    if (session.mode === 'preview') {
      SIMULATED_PARTICIPANTS_SEED.forEach((p) => {
        const joinedAt = now - p.joinedOffsetMs;
        initial[p.identity] = {
          identity: p.identity,
          name: p.name,
          role: p.role,
          firstJoinedAt: joinedAt,
          lastJoinedAt: joinedAt,
          lastLeftAt: null,
          accumulatedSeconds: 0,
          isOnline: true,
        };
      });
    }
    return initial;
  });

  // LiveKit state refs & revision trigger
  const roomRef = useRef<Room | null>(null);
  const [lkRevision, setLkRevision] = useState(0);
  const [activeSpeakers, setActiveSpeakers] = useState<Set<string>>(new Set());

  // Preview mode local streams & simulated participants state
  const localPreviewStreamRef = useRef<MediaStream | null>(null);
  const [localPreviewStream, setLocalPreviewStream] = useState<MediaStream | null>(null);
  const localScreenStreamRef = useRef<MediaStream | null>(null);
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
  const [simParticipants, setSimParticipants] = useState(() =>
    SIMULATED_PARTICIPANTS_SEED.map((p) => ({
      ...p,
      joinedAt: Date.now() - p.joinedOffsetMs,
    }))
  );

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  const clearToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audios = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d, idx) => ({ deviceId: d.deviceId, label: d.label || `Mikrofon ${idx + 1}` }));
      const outputs = devices
        .filter((d) => d.kind === 'audiooutput')
        .map((d, idx) => ({ deviceId: d.deviceId, label: d.label || `Speaker / Output ${idx + 1}` }));
      const videos = devices
        .filter((d) => d.kind === 'videoinput')
        .map((d, idx) => ({ deviceId: d.deviceId, label: d.label || `Kamera ${idx + 1}` }));

      setAudioInputDevices(audios);
      setAudioOutputDevices(outputs);
      setVideoInputDevices(videos);

      setDeviceSettings((prev) => ({
        ...prev,
        audioInputId:
          prev.audioInputId && audios.some((d) => d.deviceId === prev.audioInputId)
            ? prev.audioInputId
            : audios[0]?.deviceId || prev.audioInputId,
        audioOutputId:
          prev.audioOutputId && outputs.some((d) => d.deviceId === prev.audioOutputId)
            ? prev.audioOutputId
            : outputs[0]?.deviceId || prev.audioOutputId,
        videoInputId:
          prev.videoInputId && videos.some((d) => d.deviceId === prev.videoInputId)
            ? prev.videoInputId
            : videos[0]?.deviceId || prev.videoInputId,
      }));
    } catch {
      // Ignore device enumeration errors
    }
  }, []);

  useEffect(() => {
    void refreshDevices();
    if (!navigator.mediaDevices?.addEventListener) return;
    const onDeviceChange = () => {
      void refreshDevices();
    };
    navigator.mediaDevices.addEventListener('devicechange', onDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', onDeviceChange);
    };
  }, [refreshDevices]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const upsertAttendanceJoin = useCallback((identity: string, name: string, role: ParticipantRole) => {
    const now = Date.now();
    setAttendanceMap((prev) => {
      const existing = prev[identity];
      if (existing) {
        if (existing.isOnline) return prev;
        return {
          ...prev,
          [identity]: {
            ...existing,
            name,
            role,
            lastJoinedAt: now,
            isOnline: true,
          },
        };
      }
      return {
        ...prev,
        [identity]: {
          identity,
          name,
          role,
          firstJoinedAt: now,
          lastJoinedAt: now,
          lastLeftAt: null,
          accumulatedSeconds: 0,
          isOnline: true,
        },
      };
    });
  }, []);

  const markAttendanceLeave = useCallback((identity: string) => {
    const now = Date.now();
    setAttendanceMap((prev) => {
      const existing = prev[identity];
      if (!existing || !existing.isOnline) return prev;
      const elapsed = Math.max(0, Math.floor((now - existing.lastJoinedAt) / 1000));
      return {
        ...prev,
        [identity]: {
          ...existing,
          lastLeftAt: now,
          accumulatedSeconds: existing.accumulatedSeconds + elapsed,
          isOnline: false,
        },
      };
    });
  }, []);

  const appendReaction = useCallback((reaction: Omit<ReactionEvent, 'offsetX'>) => {
    const offsetX = 12 + Math.floor(Math.random() * 76);
    setReactions((prev) => {
      if (prev.some((r) => r.id === reaction.id)) return prev;
      return [...prev.slice(-14), { ...reaction, offsetX }];
    });
    window.setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
    }, 3000);
  }, []);

  const appendChatMessage = useCallback((message: ChatMessage) => {
    setChatMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev;
      return [...prev, message];
    });
  }, []);

  const publishLiveKitData = useCallback(async (payload: DataEventPayload) => {
    const room = roomRef.current;
    if (!room || room.state !== 'connected') return;
    try {
      const encoded = new TextEncoder().encode(JSON.stringify(payload));
      await room.localParticipant.publishData(encoded, { reliable: true });
    } catch {
      // Ignore transient data publish error
    }
  }, []);

  const callHostActionApi = useCallback(
    async (action: string, extra: Record<string, unknown> = {}) => {
      if (session.role !== 'host' || !session.hostToken) {
        showToast('Aksi ini hanya tersedia untuk Pemateri (Host).');
        return null;
      }
      try {
        const res = await fetch('/api/room/action', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.hostToken}`,
          },
          body: JSON.stringify({
            roomCode: session.roomCode,
            action,
            ...extra,
          }),
        });
        const data = (await res.json()) as { ok?: boolean; metadata?: RoomMetadata; error?: string };
        if (!res.ok) {
          showToast(data.error || 'Gagal menjalankan kontrol ruang.');
          return null;
        }
        if (data.metadata) {
          setRoomMetadata(data.metadata);
        }
        return data;
      } catch {
        showToast('Koneksi ke server gagal saat menjalankan aksi Host.');
        return null;
      }
    },
    [session.hostToken, session.role, session.roomCode, showToast]
  );

  // =========================================================================
  // LIVEKIT CONNECTION LIFECYCLE
  // =========================================================================
  useEffect(() => {
    if (session.mode !== 'livekit' || !session.livekitUrl || !session.token) {
      return;
    }

    let cancelled = false;
    const isInitialStudio = (session.audioMode || 'standard') === 'studio';
    const initialRes =
      (session.videoQuality || '720p') === '1080p' ? VideoPresets.h1080.resolution : VideoPresets.h720.resolution;

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: {
        deviceId: session.selectedAudioDeviceId || undefined,
        echoCancellation: !isInitialStudio,
        noiseSuppression: !isInitialStudio,
        autoGainControl: !isInitialStudio,
      },
      videoCaptureDefaults: {
        deviceId: session.selectedVideoDeviceId || undefined,
        resolution: initialRes,
      },
      publishDefaults: {
        screenShareEncoding: {
          maxBitrate: 3_000_000,
          maxFramerate: 15,
        },
      },
    });
    roomRef.current = room;

    const bump = () => setLkRevision((v) => v + 1);

    const applyRoomMetadata = (raw?: string) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as Partial<RoomMetadata>;
        setRoomMetadata((prev) => ({
          roomCode: parsed.roomCode || prev.roomCode,
          title: parsed.title ?? prev.title,
          createdAt: typeof parsed.createdAt === 'number' ? parsed.createdAt : prev.createdAt,
          isLocked: typeof parsed.isLocked === 'boolean' ? parsed.isLocked : prev.isLocked,
          spotlightIdentity:
            parsed.spotlightIdentity !== undefined ? parsed.spotlightIdentity : prev.spotlightIdentity,
          companionLink: parsed.companionLink !== undefined ? parsed.companionLink : prev.companionLink,
        }));
      } catch {
        // Ignore invalid JSON
      }
    };

    room
      .on(RoomEvent.Connected, () => {
        if (cancelled) return;
        setConnectionState('connected');
        applyRoomMetadata(room.metadata);
        room.remoteParticipants.forEach((rp) => {
          const info = parseParticipantRole(rp);
          upsertAttendanceJoin(rp.identity, rp.name || rp.identity, info.role);
        });
        bump();
      })
      .on(RoomEvent.Reconnecting, () => setConnectionState('reconnecting'))
      .on(RoomEvent.Reconnected, () => {
        setConnectionState('connected');
        applyRoomMetadata(room.metadata);
        bump();
      })
      .on(RoomEvent.Disconnected, () => {
        setConnectionState('disconnected');
        bump();
      })
      .on(RoomEvent.RoomMetadataChanged, (meta) => {
        applyRoomMetadata(meta);
      })
      .on(RoomEvent.ParticipantConnected, (rp: RemoteParticipant) => {
        const info = parseParticipantRole(rp);
        upsertAttendanceJoin(rp.identity, rp.name || rp.identity, info.role);
        bump();
      })
      .on(RoomEvent.ParticipantDisconnected, (rp: RemoteParticipant) => {
        markAttendanceLeave(rp.identity);
        setHandRaisedMap((prev) => {
          if (!(rp.identity in prev)) return prev;
          const next = { ...prev };
          delete next[rp.identity];
          return next;
        });
        bump();
      })
      .on(RoomEvent.TrackSubscribed, bump)
      .on(RoomEvent.TrackUnsubscribed, bump)
      .on(RoomEvent.TrackMuted, (_pub, participant) => {
        if (participant.isLocal && _pub.source === Track.Source.Microphone) {
          setIsLocalMicOn(false);
          showToast('Mikrofon Anda dibisukan oleh Pemateri.');
        }
        bump();
      })
      .on(RoomEvent.TrackUnmuted, bump)
      .on(RoomEvent.LocalTrackPublished, bump)
      .on(RoomEvent.LocalTrackUnpublished, (pub) => {
        if (pub.source === Track.Source.ScreenShare) {
          setIsLocalScreenSharing(false);
        }
        bump();
      })
      .on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        setActiveSpeakers(new Set(speakers.map((s) => s.identity)));
      })
      .on(RoomEvent.DataReceived, (payload, participant) => {
        try {
          const parsed = JSON.parse(new TextDecoder().decode(payload)) as DataEventPayload;
          if (parsed.type === 'chat') {
            appendChatMessage(parsed.message);
          } else if (parsed.type === 'hand') {
            const senderRole = participant ? parseParticipantRole(participant).role : 'participant';
            const isSelfAction = !participant || participant.identity === parsed.identity;
            if (isSelfAction || (senderRole === 'host' && parsed.raisedAt === null)) {
              setHandRaisedMap((prev) => {
                const next = { ...prev };
                if (parsed.raisedAt === null) {
                  delete next[parsed.identity];
                } else {
                  next[parsed.identity] = parsed.raisedAt;
                }
                return next;
              });
            }
          } else if (parsed.type === 'reaction') {
            appendReaction(parsed.reaction);
          } else if (parsed.type === 'session_ended') {
            const senderRole = participant ? parseParticipantRole(participant).role : 'participant';
            if (senderRole === 'host') {
              setSessionEndedByHost(true);
            }
          }
        } catch {
          // Ignore malformed data channel packet
        }
      });

    (async () => {
      try {
        await room.connect(session.livekitUrl!, session.token!);
        if (cancelled) {
          await room.disconnect();
          return;
        }
        if (session.selectedAudioDeviceId) {
          await room.switchActiveDevice('audioinput', session.selectedAudioDeviceId).catch(() => {});
        }
        if (session.selectedAudioOutputId) {
          await room.switchActiveDevice('audiooutput', session.selectedAudioOutputId).catch(() => {});
        }
        if (session.selectedVideoDeviceId) {
          await room.switchActiveDevice('videoinput', session.selectedVideoDeviceId).catch(() => {});
        }
        try {
          await room.localParticipant.setMicrophoneEnabled(session.initialMicOn, {
            deviceId: session.selectedAudioDeviceId || undefined,
            echoCancellation: !isInitialStudio,
            noiseSuppression: !isInitialStudio,
            autoGainControl: !isInitialStudio,
          });
        } catch {
          setIsLocalMicOn(false);
        }
        try {
          await room.localParticipant.setCameraEnabled(session.initialCameraOn, {
            deviceId: session.selectedVideoDeviceId || undefined,
            resolution: initialRes,
          });
        } catch {
          setIsLocalCameraOn(false);
        }
        void refreshDevices();
        bump();
      } catch (err) {
        if (!cancelled) {
          setConnectionState('disconnected');
          setErrorMessage(
            err instanceof Error
              ? `Gagal terhubung ke server LiveKit: ${err.message}`
              : 'Gagal terhubung ke server LiveKit.'
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      room.disconnect().catch(() => {});
      roomRef.current = null;
    };
  }, [
    appendChatMessage,
    appendReaction,
    markAttendanceLeave,
    session.initialCameraOn,
    session.initialMicOn,
    session.livekitUrl,
    session.mode,
    session.selectedAudioDeviceId,
    session.selectedVideoDeviceId,
    session.token,
    showToast,
    upsertAttendanceJoin,
  ]);

  // =========================================================================
  // PREVIEW SIMULATION MODE LIFECYCLE (REAL LOCAL CAM + INTERACTIVE DEMO CLASS)
  // =========================================================================
  useEffect(() => {
    if (session.mode !== 'preview') return;
    setConnectionState('connected');

    let cancelled = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) return;
      if (!session.initialCameraOn && !session.initialMicOn) return;
      try {
        const isStudio = (session.audioMode || 'standard') === 'studio';
        const is1080 = (session.videoQuality || '720p') === '1080p';
        const media = await navigator.mediaDevices.getUserMedia({
          audio: {
            ...(session.selectedAudioDeviceId ? { deviceId: { exact: session.selectedAudioDeviceId } } : {}),
            echoCancellation: !isStudio,
            noiseSuppression: !isStudio,
            autoGainControl: !isStudio,
          },
          video: {
            ...(session.selectedVideoDeviceId ? { deviceId: { exact: session.selectedVideoDeviceId } } : {}),
            width: { ideal: is1080 ? 1920 : 1280 },
            height: { ideal: is1080 ? 1080 : 720 },
          },
        });
        if (cancelled) {
          media.getTracks().forEach((t) => t.stop());
          return;
        }
        media.getAudioTracks().forEach((t) => {
          t.enabled = session.initialMicOn;
        });
        media.getVideoTracks().forEach((t) => {
          t.enabled = session.initialCameraOn;
        });
        localPreviewStreamRef.current = media;
        setLocalPreviewStream(media);
        void refreshDevices();
      } catch {
        setIsCameraOnFallback();
      }
    })();

    function setIsCameraOnFallback() {
      setIsLocalCameraOn(false);
    }

    return () => {
      cancelled = true;
      if (localPreviewStreamRef.current) {
        localPreviewStreamRef.current.getTracks().forEach((t) => t.stop());
        localPreviewStreamRef.current = null;
      }
      if (localScreenStreamRef.current) {
        localScreenStreamRef.current.getTracks().forEach((t) => t.stop());
        localScreenStreamRef.current = null;
      }
    };
  }, [
    session.initialCameraOn,
    session.initialMicOn,
    session.mode,
    session.selectedAudioDeviceId,
    session.selectedVideoDeviceId,
  ]);

  // Subtle active speaker alternation for unmuted simulated participants in Preview Mode
  useEffect(() => {
    if (session.mode !== 'preview') return;
    const timer = window.setInterval(() => {
      setSimParticipants((prev) =>
        prev.map((p) => ({
          ...p,
          isSpeaking: p.isMicOn && Math.random() > 0.45,
        }))
      );
    }, 2800);
    return () => window.clearInterval(timer);
  }, [session.mode]);

  // =========================================================================
  // UNIFIED PARTICIPANT LIST
  // =========================================================================
  const participants = useMemo<ParticipantState[]>(() => {
    if (session.mode === 'preview') {
      const localParticipant: ParticipantState = {
        identity: session.identity,
        name: session.participantName,
        role: session.role,
        isLocal: true,
        isMicOn: isLocalMicOn,
        isCameraOn: isLocalCameraOn && Boolean(localPreviewStream?.getVideoTracks().length),
        isScreenSharing: isLocalScreenSharing,
        isSpeaking: isLocalMicOn,
        handRaisedAt: handRaisedMap[session.identity] ?? null,
        joinedAt: attendanceMap[session.identity]?.firstJoinedAt ?? Date.now(),
        localStream: localPreviewStream,
        localScreenStream: localScreenStream,
      };

      const simulated: ParticipantState[] = simParticipants.map((p) => ({
        identity: p.identity,
        name: p.name,
        role: p.role,
        isLocal: false,
        isSimulated: true,
        isMicOn: p.isMicOn,
        isCameraOn: p.isCameraOn,
        isScreenSharing: false,
        isSpeaking: p.isSpeaking,
        handRaisedAt: handRaisedMap[p.identity] ?? null,
        joinedAt: p.joinedAt,
        avatarImage: p.avatarImage,
        avatarCropClass: p.avatarCropClass,
      }));

      return [localParticipant, ...simulated];
    }

    // LiveKit Mode
    const room = roomRef.current;
    if (!room) return [];

    const mapParticipant = (p: LocalParticipant | RemoteParticipant, isLocal: boolean): ParticipantState => {
      const camPub = p.getTrackPublication(Track.Source.Camera);
      const micPub = p.getTrackPublication(Track.Source.Microphone);
      const screenPub = p.getTrackPublication(Track.Source.ScreenShare);
      const info = isLocal ? { role: session.role, joinedAt: Date.now() } : parseParticipantRole(p);

      return {
        identity: p.identity,
        name: p.name || (isLocal ? session.participantName : p.identity),
        role: info.role,
        isLocal,
        isMicOn: isLocal ? isLocalMicOn : Boolean(micPub && !micPub.isMuted),
        isCameraOn: isLocal ? isLocalCameraOn : Boolean(camPub && !camPub.isMuted && camPub.track),
        isScreenSharing: Boolean(screenPub && !screenPub.isMuted && screenPub.track),
        isSpeaking: activeSpeakers.has(p.identity),
        handRaisedAt: handRaisedMap[p.identity] ?? null,
        joinedAt: attendanceMap[p.identity]?.firstJoinedAt ?? info.joinedAt,
        cameraTrack: camPub?.track ?? null,
        screenTrack: screenPub?.track ?? null,
        audioTrack: isLocal ? null : micPub?.track ?? null,
      };
    };

    const list: ParticipantState[] = [mapParticipant(room.localParticipant, true)];
    room.remoteParticipants.forEach((rp) => {
      list.push(mapParticipant(rp, false));
    });
    return list;
  }, [
    activeSpeakers,
    attendanceMap,
    handRaisedMap,
    isLocalCameraOn,
    isLocalMicOn,
    isLocalScreenSharing,
    lkRevision,
    localPreviewStream,
    localScreenStream,
    session.identity,
    session.mode,
    session.participantName,
    session.role,
    simParticipants,
  ]);

  const attendance = useMemo<AttendanceRecord[]>(
    () => Object.values(attendanceMap).sort((a, b) => a.firstJoinedAt - b.firstJoinedAt),
    [attendanceMap]
  );

  // =========================================================================
  // USER & HOST ACTIONS
  // =========================================================================
  const toggleMic = useCallback(async () => {
    const next = !isLocalMicOn;
    if (session.mode === 'livekit' && roomRef.current) {
      try {
        await roomRef.current.localParticipant.setMicrophoneEnabled(next);
        setIsLocalMicOn(next);
        setLkRevision((v) => v + 1);
      } catch {
        showToast('Tidak dapat mengakses mikrofon. Periksa izin browser Anda.');
      }
      return;
    }

    if (localPreviewStreamRef.current) {
      localPreviewStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = next;
      });
    }
    setIsLocalMicOn(next);
  }, [isLocalMicOn, session.mode, showToast]);

  const toggleCamera = useCallback(async () => {
    const next = !isLocalCameraOn;
    if (session.mode === 'livekit' && roomRef.current) {
      try {
        await roomRef.current.localParticipant.setCameraEnabled(next);
        setIsLocalCameraOn(next);
        setLkRevision((v) => v + 1);
      } catch {
        showToast('Tidak dapat mengakses kamera. Periksa izin browser Anda.');
      }
      return;
    }

    if (next && !localPreviewStreamRef.current?.getVideoTracks().length && navigator.mediaDevices?.getUserMedia) {
      try {
        const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: isLocalMicOn });
        localPreviewStreamRef.current = media;
        setLocalPreviewStream(media);
      } catch {
        showToast('Kamera tidak tersedia di perangkat ini.');
        return;
      }
    } else if (localPreviewStreamRef.current) {
      localPreviewStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = next;
      });
    }
    setIsLocalCameraOn(next);
  }, [isLocalCameraOn, isLocalMicOn, session.mode, showToast]);

  const stopScreenShare = useCallback(async () => {
    if (session.mode === 'livekit' && roomRef.current) {
      await roomRef.current.localParticipant.setScreenShareEnabled(false).catch(() => {});
      setIsLocalScreenSharing(false);
      setLkRevision((v) => v + 1);
      return;
    }

    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach((t) => t.stop());
      localScreenStreamRef.current = null;
    }
    setLocalScreenStream(null);
    setIsLocalScreenSharing(false);
  }, [session.mode]);

  const startScreenShare = useCallback(
    async (preset: ScreenSharePreset, useSimulatedCanvas = false) => {
      setScreenSharePreset(preset);
      const isDetail = preset === 'whiteboard';

      if (session.mode === 'livekit' && roomRef.current) {
        try {
          await roomRef.current.localParticipant.setScreenShareEnabled(
            true,
            {
              audio: true,
              contentHint: isDetail ? 'detail' : 'motion',
              resolution: {
                width: 1920,
                height: 1080,
                frameRate: isDetail ? 15 : 30,
              },
            },
            {
              screenShareEncoding: {
                maxBitrate: isDetail ? 3_000_000 : 3_500_000,
                maxFramerate: isDetail ? 15 : 30,
              },
            }
          );
          setIsLocalScreenSharing(true);
          setLkRevision((v) => v + 1);
          showToast(
            isDetail
              ? 'Berbagi layar aktif · Mode Teks & Papan Tulis Tajam (1080p)'
              : 'Berbagi layar aktif · Mode Video / Gerakan Halus'
          );
        } catch {
          showToast('Berbagi layar dibatalkan atau izin tidak diberikan.');
        }
        return;
      }

      // Preview Mode: real browser getDisplayMedia or optional simulated whiteboard slide
      await stopScreenShare();
      let stream: MediaStream | null = null;
      if (!useSimulatedCanvas && navigator.mediaDevices?.getDisplayMedia) {
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              frameRate: { ideal: isDetail ? 15 : 30 },
            },
            audio: false,
          });
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack && 'contentHint' in videoTrack) {
            videoTrack.contentHint = isDetail ? 'detail' : 'motion';
          }
          videoTrack?.addEventListener('ended', () => {
            setLocalScreenStream(null);
            setIsLocalScreenSharing(false);
          });
        } catch {
          showToast('Berbagi layar browser dibatalkan.');
          return;
        }
      } else {
        stream = createSimulatedWhiteboardStream();
      }

      if (stream) {
        localScreenStreamRef.current = stream;
        setLocalScreenStream(stream);
        setIsLocalScreenSharing(true);
        showToast(
          useSimulatedCanvas
            ? 'Simulasi Share Screen Papan Tulis aktif · Presentation Layout 80%'
            : isDetail
              ? 'Berbagi layar aktif · Mode Teks & Papan Tulis Tajam'
              : 'Berbagi layar aktif · Mode Gerakan Halus'
        );
      }
    },
    [session.mode, showToast, stopScreenShare]
  );

  const isLocalHandRaised = Boolean(handRaisedMap[session.identity]);

  const toggleRaiseHand = useCallback(async () => {
    const nextRaisedAt = handRaisedMap[session.identity] ? null : Date.now();
    setHandRaisedMap((prev) => {
      const next = { ...prev };
      if (nextRaisedAt === null) {
        delete next[session.identity];
      } else {
        next[session.identity] = nextRaisedAt;
      }
      return next;
    });
    await publishLiveKitData({
      type: 'hand',
      identity: session.identity,
      raisedAt: nextRaisedAt,
    });
  }, [handRaisedMap, publishLiveKitData, session.identity]);

  const lowerParticipantHand = useCallback(
    async (identity: string) => {
      if (session.role !== 'host' && identity !== session.identity) return;
      setHandRaisedMap((prev) => {
        if (!(identity in prev)) return prev;
        const next = { ...prev };
        delete next[identity];
        return next;
      });
      await publishLiveKitData({ type: 'hand', identity, raisedAt: null });
    },
    [publishLiveKitData, session.identity, session.role]
  );

  const sendChatMessage = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text) return;
      const msg: ChatMessage = {
        id: `${session.identity}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        senderIdentity: session.identity,
        senderName: session.participantName,
        senderRole: session.role,
        text: text.slice(0, 1000),
        timestamp: Date.now(),
      };
      appendChatMessage(msg);
      await publishLiveKitData({ type: 'chat', message: msg });
    },
    [appendChatMessage, publishLiveKitData, session.identity, session.participantName, session.role]
  );

  const sendReaction = useCallback(
    async (emoji: ReactionEmoji) => {
      const reaction = {
        id: `rx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        senderIdentity: session.identity,
        senderName: session.participantName,
        emoji,
        createdAt: Date.now(),
      };
      appendReaction(reaction);
      await publishLiveKitData({ type: 'reaction', reaction });
    },
    [appendReaction, publishLiveKitData, session.identity, session.participantName]
  );

  const muteParticipant = useCallback(
    async (identity: string) => {
      if (session.role !== 'host') return;
      const res = await callHostActionApi('muteParticipant', { identity });
      if (!res) return;
      if (session.mode === 'preview') {
        setSimParticipants((prev) =>
          prev.map((p) => (p.identity === identity ? { ...p, isMicOn: false, isSpeaking: false } : p))
        );
      }
      const target = participants.find((p) => p.identity === identity);
      showToast(`Mikrofon ${target?.name || 'peserta'} telah dibisukan.`);
    },
    [callHostActionApi, participants, session.mode, session.role, showToast]
  );

  const muteAllParticipants = useCallback(async () => {
    if (session.role !== 'host') return;
    const res = await callHostActionApi('muteAll', { excludeIdentity: session.identity });
    if (!res) return;
    if (session.mode === 'preview') {
      setSimParticipants((prev) => prev.map((p) => ({ ...p, isMicOn: false, isSpeaking: false })));
    }
    showToast('Seluruh peserta telah dibisukan.');
  }, [callHostActionApi, session.identity, session.mode, session.role, showToast]);

  const toggleLockRoom = useCallback(async () => {
    if (session.role !== 'host') return;
    const nextLocked = !roomMetadata.isLocked;
    const res = await callHostActionApi('toggleLock', { locked: nextLocked });
    if (res) {
      showToast(
        nextLocked
          ? 'Ruang dikunci. Peserta baru tidak dapat masuk.'
          : 'Kunci ruang dibuka. Peserta baru dapat bergabung kembali.'
      );
    }
  }, [callHostActionApi, roomMetadata.isLocked, session.role, showToast]);

  const setSpotlight = useCallback(
    async (identity: string | null) => {
      if (session.role !== 'host') return;
      const res = await callHostActionApi('setSpotlight', { identity });
      if (res) {
        if (identity) {
          const target = participants.find((p) => p.identity === identity);
          showToast(`${target?.name || 'Pembicara'} dipasang sebagai Spotlight untuk semua peserta.`);
        } else {
          showToast('Spotlight dilepas. Kembali ke tata letak adaptif.');
        }
      }
    },
    [callHostActionApi, participants, session.role, showToast]
  );

  const setCompanionLink = useCallback(
    async (url: string | null, label?: string): Promise<boolean> => {
      if (session.role !== 'host') return false;
      const res = await callHostActionApi('setCompanionLink', { url: url || '', label });
      if (!res) return false;
      showToast(
        url ? 'Link Papan Tulis Live tersemat di layar semua peserta.' : 'Link Papan Tulis Live dilepas.'
      );
      return true;
    },
    [callHostActionApi, session.role, showToast]
  );

  const endSessionForAll = useCallback(async () => {
    if (session.role !== 'host') return;
    await publishLiveKitData({ type: 'session_ended' });
    await callHostActionApi('endSession');
    if (roomRef.current) {
      await roomRef.current.disconnect().catch(() => {});
    }
    await stopScreenShare();
  }, [callHostActionApi, publishLiveKitData, session.role, stopScreenShare]);

  const leaveSession = useCallback(async () => {
    await stopScreenShare();
    if (roomRef.current) {
      await roomRef.current.disconnect().catch(() => {});
    }
    if (localPreviewStreamRef.current) {
      localPreviewStreamRef.current.getTracks().forEach((t) => t.stop());
      localPreviewStreamRef.current = null;
    }
  }, [stopScreenShare]);

  const triggerPreviewRaiseHand = useCallback(() => {
    if (session.mode !== 'preview') return;
    const candidate = simParticipants.find((p) => !handRaisedMap[p.identity]);
    if (!candidate) {
      showToast('Semua peserta contoh sudah berada di antrean angkat tangan.');
      return;
    }
    setHandRaisedMap((prev) => ({ ...prev, [candidate.identity]: Date.now() }));
    appendReaction({
      id: `rx-sim-${Date.now()}`,
      senderIdentity: candidate.identity,
      senderName: candidate.name,
      emoji: '❓',
      createdAt: Date.now(),
    });
    showToast(`${candidate.name} mengangkat tangan untuk bertanya.`);
  }, [appendReaction, handRaisedMap, session.mode, showToast, simParticipants]);

  const updateDeviceSettings = useCallback(
    async (partial: Partial<DeviceSettingsState>) => {
      const next: DeviceSettingsState = { ...deviceSettings, ...partial };
      setDeviceSettings(next);

      const audioChanged =
        partial.audioInputId !== undefined || partial.audioMode !== undefined;
      const videoChanged =
        partial.videoInputId !== undefined || partial.videoQuality !== undefined;
      const outputChanged = partial.audioOutputId !== undefined;

      if (session.mode === 'livekit' && roomRef.current) {
        const room = roomRef.current;
        try {
          if (outputChanged && next.audioOutputId) {
            await room.switchActiveDevice('audiooutput', next.audioOutputId).catch(() => {});
          }

          if (audioChanged) {
            const isStudio = next.audioMode === 'studio';
            if (isLocalMicOn) {
              await room.localParticipant.setMicrophoneEnabled(false);
              await room.localParticipant.setMicrophoneEnabled(true, {
                deviceId: next.audioInputId || undefined,
                echoCancellation: !isStudio,
                noiseSuppression: !isStudio,
                autoGainControl: !isStudio,
              });
            } else if (next.audioInputId) {
              await room.switchActiveDevice('audioinput', next.audioInputId).catch(() => {});
            }
          }

          if (videoChanged) {
            const targetRes =
              next.videoQuality === '1080p' ? VideoPresets.h1080.resolution : VideoPresets.h720.resolution;
            if (isLocalCameraOn) {
              await room.localParticipant.setCameraEnabled(false);
              await room.localParticipant.setCameraEnabled(true, {
                deviceId: next.videoInputId || undefined,
                resolution: targetRes,
              });
            } else if (next.videoInputId) {
              await room.switchActiveDevice('videoinput', next.videoInputId).catch(() => {});
            }
          }

          setLkRevision((v) => v + 1);
          if (audioChanged || videoChanged || outputChanged) {
            showToast('Pengaturan perangkat audio/video berhasil diterapkan.');
          }
        } catch {
          showToast('Gagal mengganti perangkat. Pastikan perangkat terhubung dan izin browser aktif.');
        }
        return;
      }

      // Preview Mode: reacquire local MediaStream cleanly when audio/video source or quality changes
      if ((audioChanged || videoChanged) && navigator.mediaDevices?.getUserMedia) {
        const isStudio = next.audioMode === 'studio';
        const is1080 = next.videoQuality === '1080p';

        try {
          const oldStream = localPreviewStreamRef.current;
          const freshStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              ...(next.audioInputId ? { deviceId: { exact: next.audioInputId } } : {}),
              echoCancellation: !isStudio,
              noiseSuppression: !isStudio,
              autoGainControl: !isStudio,
            },
            video: {
              ...(next.videoInputId ? { deviceId: { exact: next.videoInputId } } : {}),
              width: { ideal: is1080 ? 1920 : 1280 },
              height: { ideal: is1080 ? 1080 : 720 },
            },
          });

          freshStream.getAudioTracks().forEach((t) => {
            t.enabled = isLocalMicOn;
          });
          freshStream.getVideoTracks().forEach((t) => {
            t.enabled = isLocalCameraOn;
          });

          if (oldStream) {
            oldStream.getTracks().forEach((t) => t.stop());
          }
          localPreviewStreamRef.current = freshStream;
          setLocalPreviewStream(freshStream);
          showToast(
            partial.audioMode === 'studio'
              ? 'Mode Audio Soundcard / Studio aktif.'
              : partial.videoQuality === '1080p'
                ? 'Kualitas kamera diatur ke 1080p Tajam.'
                : 'Pengaturan perangkat berhasil diterapkan.'
          );
        } catch {
          showToast('Perangkat yang dipilih tidak dapat diakses. Periksa sambungan USB atau izin browser.');
        }
      } else if (outputChanged) {
        showToast('Output speaker / headphone diperbarui.');
      }
    },
    [deviceSettings, isLocalCameraOn, isLocalMicOn, session.mode, showToast]
  );

  const localMicStream = useMemo<MediaStream | null>(() => {
    if (session.mode === 'preview') {
      return localPreviewStream;
    }
    const micTrack = roomRef.current?.localParticipant
      ?.getTrackPublication(Track.Source.Microphone)
      ?.track?.mediaStreamTrack;
    if (!micTrack) return null;
    return new MediaStream([micTrack]);
  }, [lkRevision, localPreviewStream, session.mode]);

  return {
    participants,
    roomMetadata,
    chatMessages,
    reactions,
    attendance,
    connectionState,
    sessionEndedByHost,
    errorMessage,
    toastMessage,
    clearToast,
    isLocalMicOn,
    isLocalCameraOn,
    isLocalScreenSharing,
    isLocalHandRaised,
    screenSharePreset,
    toggleMic,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    toggleRaiseHand,
    lowerParticipantHand,
    sendChatMessage,
    sendReaction,
    muteParticipant,
    muteAllParticipants,
    toggleLockRoom,
    setSpotlight,
    setCompanionLink,
    endSessionForAll,
    leaveSession,
    deviceSettings,
    audioInputDevices,
    audioOutputDevices,
    videoInputDevices,
    localMicStream,
    updateDeviceSettings,
    refreshDevices,
    triggerPreviewRaiseHand: session.mode === 'preview' ? triggerPreviewRaiseHand : undefined,
  };
}
