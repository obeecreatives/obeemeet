import { useEffect, useRef, useState } from 'react';
import { Hand, Mic, MicOff, Monitor, Pin, PinOff, VolumeX } from 'lucide-react';
import type { ParticipantState } from '../types/meeting';

interface VideoTileProps {
  participant: ParticipantState;
  mode?: 'camera' | 'screen';
  isSpotlight?: boolean;
  isHostViewer?: boolean;
  compact?: boolean;
  mirrorLocal?: boolean;
  audioOutputDeviceId?: string;
  onToggleSpotlight?: (identity: string) => void;
  onMuteParticipant?: (identity: string) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'OB';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function VideoTile({
  participant,
  mode = 'camera',
  isSpotlight = false,
  isHostViewer = false,
  compact = false,
  mirrorLocal = true,
  audioOutputDeviceId,
  onToggleSpotlight,
  onMuteParticipant,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  const activeLiveKitVideoTrack = mode === 'screen' ? participant.screenTrack : participant.cameraTrack;
  const activeLocalMediaStream = mode === 'screen' ? participant.localScreenStream : participant.localStream;

  // Attach LiveKit video track or local MediaStream
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (activeLiveKitVideoTrack) {
      activeLiveKitVideoTrack.attach(videoEl);
      return () => {
        activeLiveKitVideoTrack.detach(videoEl);
      };
    }

    if (activeLocalMediaStream) {
      videoEl.srcObject = activeLocalMediaStream;
      return () => {
        videoEl.srcObject = null;
      };
    }

    videoEl.srcObject = null;
  }, [activeLiveKitVideoTrack, activeLocalMediaStream]);

  // Attach remote audio track (only in camera tile so audio is never duplicated)
  useEffect(() => {
    if (mode !== 'camera' || participant.isLocal || !participant.audioTrack) return;
    const audioEl = audioRef.current;
    if (!audioEl) return;
    participant.audioTrack.attach(audioEl);
    return () => {
      participant.audioTrack?.detach(audioEl);
    };
  }, [mode, participant.audioTrack, participant.isLocal]);

  // Route remote audio element to selected speaker / headphone monitor (when supported by browser)
  useEffect(() => {
    if (mode !== 'camera' || participant.isLocal || !audioOutputDeviceId) return;
    const audioEl = audioRef.current as (HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }) | null;
    if (audioEl && typeof audioEl.setSinkId === 'function') {
      audioEl.setSinkId(audioOutputDeviceId).catch(() => {});
    }
  }, [audioOutputDeviceId, mode, participant.isLocal]);

  const showLiveVideo =
    mode === 'screen'
      ? Boolean(activeLiveKitVideoTrack || activeLocalMediaStream)
      : participant.isCameraOn && Boolean(activeLiveKitVideoTrack || activeLocalMediaStream);

  const showSimulatedImage =
    mode === 'camera' && !showLiveVideo && participant.isCameraOn && Boolean(participant.avatarImage) && !imgFailed;

  const isMirror = mode === 'camera' && participant.isLocal && mirrorLocal;

  const borderStyle =
    mode === 'screen'
      ? 'border-slate-700/80'
      : isSpotlight
        ? 'border-teal-400 ring-1 ring-teal-400/40'
        : participant.isSpeaking && participant.isMicOn
          ? 'border-teal-500/80 ring-1 ring-teal-500/30'
          : 'border-slate-800/90';

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border bg-[#11192B] transition-colors duration-150 ${borderStyle} ${
        mode === 'screen' ? 'h-full w-full' : compact ? 'aspect-video w-full' : 'h-full w-full min-h-[140px]'
      }`}
    >
      {/* Hidden audio element for remote LiveKit microphone stream */}
      {mode === 'camera' && !participant.isLocal && participant.audioTrack ? (
        <audio ref={audioRef} autoPlay playsInline />
      ) : null}

      {/* Primary video or simulated feed */}
      {showLiveVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isLocal || mode === 'screen'}
          className={`h-full w-full ${
            mode === 'screen' ? 'object-contain bg-[#090E1A]' : 'object-cover'
          } ${isMirror ? '-scale-x-100' : ''}`}
        />
      ) : showSimulatedImage ? (
        <img
          src={participant.avatarImage}
          alt={`Kamera ${participant.name}`}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className={`h-full w-full object-cover ${participant.avatarCropClass || 'object-center'}`}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-[#131C2E] px-4 text-center">
          <div
            className={`flex items-center justify-center rounded-full border border-slate-700 bg-slate-800/90 font-semibold text-teal-300 ${
              compact ? 'h-11 w-11 text-sm' : 'h-16 w-16 text-xl'
            }`}
          >
            {getInitials(participant.name)}
          </div>
          {!compact && (
            <span className="mt-2.5 text-xs text-slate-400">
              {mode === 'screen' ? 'Menunggu layar presentasi...' : 'Kamera nonaktif'}
            </span>
          )}
        </div>
      )}

      {/* Top-left state indicators (Spotlight or Hand Raised) */}
      <div className="pointer-events-none absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1.5">
        {mode === 'screen' && (
          <div className="flex items-center gap-1.5 rounded-md bg-slate-950/80 px-2.5 py-1 text-xs font-medium text-teal-300 backdrop-blur-sm">
            <Monitor className="h-3.5 w-3.5 shrink-0" />
            <span className="whitespace-nowrap">Presentasi · {participant.name}</span>
          </div>
        )}
        {mode === 'camera' && isSpotlight && (
          <div className="flex items-center gap-1 rounded-md bg-teal-600/90 px-2 py-0.5 text-xs font-medium text-white">
            <Pin className="h-3 w-3 shrink-0" />
            <span className="whitespace-nowrap">Spotlight</span>
          </div>
        )}
        {mode === 'camera' && participant.handRaisedAt !== null && (
          <div className="flex items-center gap-1 rounded-md bg-amber-500/95 px-2 py-0.5 text-xs font-semibold text-slate-950">
            <Hand className="h-3 w-3 shrink-0" />
            <span className="whitespace-nowrap">Angkat Tangan</span>
          </div>
        )}
      </div>

      {/* Host quick hover actions on camera tiles */}
      {mode === 'camera' && isHostViewer && (onToggleSpotlight || onMuteParticipant) && (
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-100 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
          {onToggleSpotlight && (
            <button
              type="button"
              onClick={() => onToggleSpotlight(participant.identity)}
              title={isSpotlight ? 'Lepas Spotlight' : 'Spotlight untuk semua peserta'}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700/80 bg-slate-950/80 text-slate-200 backdrop-blur-sm transition-colors hover:border-teal-500/60 hover:text-teal-300 focus-visible:outline-2 focus-visible:outline-teal-400"
            >
              {isSpotlight ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            </button>
          )}
          {onMuteParticipant && !participant.isLocal && participant.isMicOn && (
            <button
              type="button"
              onClick={() => onMuteParticipant(participant.identity)}
              title={`Bisukan ${participant.name}`}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700/80 bg-slate-950/80 text-slate-200 backdrop-blur-sm transition-colors hover:border-red-500/60 hover:text-red-300 focus-visible:outline-2 focus-visible:outline-red-400"
            >
              <VolumeX className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Bottom measured contrast scrim with name + mic status */}
      {mode === 'camera' && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pt-7 pb-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-slate-100">
              <span className="truncate">
                {participant.name}
                {participant.isLocal ? ' (Anda)' : ''}
              </span>
              {participant.role === 'host' && (
                <>
                  <span aria-hidden="true" className="text-slate-400">
                    ·
                  </span>
                  <span className="shrink-0 font-semibold text-teal-300">Pemateri</span>
                </>
              )}
            </div>
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                participant.isMicOn
                  ? participant.isSpeaking
                    ? 'bg-teal-500/25 text-teal-300'
                    : 'bg-slate-900/70 text-slate-300'
                  : 'bg-red-500/25 text-red-300'
              }`}
              aria-label={participant.isMicOn ? 'Mikrofon aktif' : 'Mikrofon dibisukan'}
            >
              {participant.isMicOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
