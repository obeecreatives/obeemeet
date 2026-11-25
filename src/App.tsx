/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { MeetingRoom } from './components/MeetingRoom';
import { PreJoinLobby } from './components/PreJoinLobby';
import { SetupGuideModal } from './components/SetupGuideModal';
import type {
  ActiveSessionConfig,
  AudioProcessingMode,
  HealthStatus,
  PreJoinConfig,
  RoomMetadata,
  VideoQualityPreset,
} from './types/meeting';
import { extractRoomCodeFromInput } from './utils/urlSafety';

type AppView = 'landing' | 'lobby' | 'room';

export default function App() {
  const [view, setView] = useState<AppView>('landing');
  const [health, setHealth] = useState<HealthStatus>({
    ok: true,
    livekitConfigured: false,
    livekitHost: null,
  });
  const [isSetupGuideOpen, setIsSetupGuideOpen] = useState(false);

  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [preJoinConfig, setPreJoinConfig] = useState<PreJoinConfig | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSessionConfig | null>(null);

  // Check backend LiveKit configuration status + parse ?room=MEET-XXXX invite URL on load
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data: HealthStatus) => {
        if (typeof data.livekitConfigured === 'boolean') {
          setHealth(data);
        }
      })
      .catch(() => {
        // Keep preview fallback status if health endpoint unreachable
      });

    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      const code = extractRoomCodeFromInput(roomParam);
      if (code) {
        setPreJoinConfig({
          roomCode: code,
          isHostIntent: false,
        });
        setView('lobby');
      }
    }
  }, []);

  const syncRoomQueryParam = (roomCode: string | null) => {
    try {
      const url = new URL(window.location.href);
      if (roomCode) {
        url.searchParams.set('room', roomCode);
      } else {
        url.searchParams.delete('room');
      }
      window.history.replaceState({}, '', url.toString());
    } catch {
      // Ignore history API restrictions
    }
  };

  const handleCreateRoom = async (roomTitle: string) => {
    setIsCreatingRoom(true);
    setJoinError(null);
    try {
      const res = await fetch('/api/room/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: roomTitle || undefined }),
      });
      const data = (await res.json()) as {
        roomCode?: string;
        hostPin?: string;
        hostToken?: string;
        metadata?: RoomMetadata;
        error?: string;
      };

      if (!res.ok || !data.roomCode) {
        setJoinError(data.error || 'Gagal membuat ruang kelas baru.');
        return;
      }

      setPreJoinConfig({
        roomCode: data.roomCode,
        roomTitle: roomTitle || data.metadata?.title,
        isHostIntent: true,
        hostPin: data.hostPin,
        hostToken: data.hostToken,
      });
      syncRoomQueryParam(data.roomCode);
      setView('lobby');
    } catch {
      setJoinError('Tidak dapat menghubungi server untuk membuat ruang.');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleJoinFromLanding = (roomCode: string) => {
    setJoinError(null);
    setPreJoinConfig({
      roomCode,
      isHostIntent: false,
    });
    syncRoomQueryParam(roomCode);
    setView('lobby');
  };

  const handleConfirmJoin = async (params: {
    participantName: string;
    micOn: boolean;
    cameraOn: boolean;
    audioDeviceId?: string;
    audioOutputDeviceId?: string;
    videoDeviceId?: string;
    audioMode: AudioProcessingMode;
    videoQuality: VideoQualityPreset;
    mirrorCamera: boolean;
    hostPin?: string;
  }) => {
    if (!preJoinConfig) return;
    setIsJoiningRoom(true);
    setJoinError(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (preJoinConfig.hostToken) {
        headers.Authorization = `Bearer ${preJoinConfig.hostToken}`;
      }

      const res = await fetch('/api/token', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          roomCode: preJoinConfig.roomCode,
          participantName: params.participantName,
          asHost: preJoinConfig.isHostIntent || Boolean(params.hostPin),
          hostPin: params.hostPin,
        }),
      });

      const data = (await res.json()) as {
        mode?: 'livekit' | 'preview';
        livekitUrl?: string;
        token?: string;
        roomCode?: string;
        identity?: string;
        participantName?: string;
        role?: 'host' | 'participant';
        hostToken?: string;
        metadata?: RoomMetadata;
        error?: string;
      };

      if (!res.ok || !data.identity || !data.metadata) {
        setJoinError(data.error || 'Gagal masuk ke ruang kelas.');
        return;
      }

      const resolvedHostToken = data.hostToken || preJoinConfig.hostToken;
      const resolvedHostPin = preJoinConfig.hostPin || params.hostPin;

      setActiveSession({
        mode: data.mode === 'livekit' ? 'livekit' : 'preview',
        livekitUrl: data.livekitUrl,
        token: data.token,
        roomCode: data.roomCode || preJoinConfig.roomCode,
        identity: data.identity,
        participantName: data.participantName || params.participantName,
        role: data.role === 'host' ? 'host' : 'participant',
        hostToken: data.role === 'host' ? resolvedHostToken : undefined,
        hostPin: data.role === 'host' ? resolvedHostPin : undefined,
        initialMicOn: params.micOn,
        initialCameraOn: params.cameraOn,
        selectedAudioDeviceId: params.audioDeviceId,
        selectedAudioOutputId: params.audioOutputDeviceId,
        selectedVideoDeviceId: params.videoDeviceId,
        audioMode: params.audioMode,
        videoQuality: params.videoQuality,
        mirrorCamera: params.mirrorCamera,
        metadata: {
          ...data.metadata,
          title: data.metadata.title || preJoinConfig.roomTitle,
        },
      });
      setView('room');
    } catch {
      setJoinError('Koneksi ke server gagal. Periksa jaringan Anda lalu coba lagi.');
    } finally {
      setIsJoiningRoom(false);
    }
  };

  const handleExitToLanding = () => {
    setActiveSession(null);
    setPreJoinConfig(null);
    setJoinError(null);
    syncRoomQueryParam(null);
    setView('landing');
  };

  return (
    <>
      {view === 'landing' && (
        <LandingPage
          health={health}
          isCreatingRoom={isCreatingRoom}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinFromLanding}
          onOpenSetupGuide={() => setIsSetupGuideOpen(true)}
        />
      )}

      {view === 'lobby' && preJoinConfig && (
        <PreJoinLobby
          config={preJoinConfig}
          health={health}
          isJoining={isJoiningRoom}
          joinError={joinError}
          onBack={handleExitToLanding}
          onJoinConfirm={handleConfirmJoin}
        />
      )}

      {view === 'room' && activeSession && (
        <MeetingRoom
          session={activeSession}
          onExitRoom={handleExitToLanding}
          onOpenSetupGuide={() => setIsSetupGuideOpen(true)}
        />
      )}

      <SetupGuideModal
        isOpen={isSetupGuideOpen}
        livekitConfigured={health.livekitConfigured}
        livekitHost={health.livekitHost}
        onClose={() => setIsSetupGuideOpen(false)}
      />
    </>
  );
}
