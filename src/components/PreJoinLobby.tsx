import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CameraOff,
  Check,
  Copy,
  FlipHorizontal2,
  KeyRound,
  Mic,
  MicOff,
  RefreshCw,
  ShieldCheck,
  Video,
} from 'lucide-react';
import { useLocalMedia } from '../hooks/useLocalMedia';
import type { AudioProcessingMode, HealthStatus, PreJoinConfig, VideoQualityPreset } from '../types/meeting';

interface PreJoinLobbyProps {
  config: PreJoinConfig;
  health: HealthStatus;
  isJoining: boolean;
  joinError: string | null;
  onBack: () => void;
  onJoinConfirm: (params: {
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
  }) => Promise<void>;
}

export function PreJoinLobby({
  config,
  health,
  isJoining,
  joinError,
  onBack,
  onJoinConfirm,
}: PreJoinLobbyProps) {
  const [participantName, setParticipantName] = useState(() => {
    try {
      return window.sessionStorage.getItem('obeemeet_last_name') || (config.isHostIntent ? 'Pemateri' : '');
    } catch {
      return config.isHostIntent ? 'Pemateri' : '';
    }
  });
  const [showRejoinPinInput, setShowRejoinPinInput] = useState(false);
  const [rejoinPin, setRejoinPin] = useState('');
  const [copiedPin, setCopiedPin] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const previewVideoRef = useRef<HTMLVideoElement | null>(null);

  const {
    stream,
    isMicOn,
    isCameraOn,
    audioDevices,
    audioOutputDevices,
    videoDevices,
    selectedAudioId,
    selectedAudioOutputId,
    selectedVideoId,
    setSelectedAudioId,
    setSelectedAudioOutputId,
    setSelectedVideoId,
    audioMode,
    setAudioMode,
    videoQuality,
    setVideoQuality,
    mirrorCamera,
    setMirrorCamera,
    audioLevel,
    permissionError,
    isLoadingMedia,
    toggleMic,
    toggleCamera,
    refreshDevices,
    retryMedia,
    stopStream,
  } = useLocalMedia({ enabled: true, initialMicOn: true, initialCameraOn: true });

  useEffect(() => {
    const videoEl = previewVideoRef.current;
    if (!videoEl) return;
    if (stream && isCameraOn) {
      videoEl.srcObject = stream;
    } else {
      videoEl.srcObject = null;
    }
  }, [stream, isCameraOn]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = participantName.trim();
    if (!trimmed) {
      setLocalError('Silakan masukkan nama tampilan Anda sebelum masuk ruang kelas.');
      return;
    }
    setLocalError(null);
    try {
      window.sessionStorage.setItem('obeemeet_last_name', trimmed);
    } catch {
      // Ignore storage failure
    }

    // Release lobby preview tracks cleanly before the live room claims the devices
    stopStream();

    await onJoinConfirm({
      participantName: trimmed,
      micOn: isMicOn,
      cameraOn: isCameraOn,
      audioDeviceId: selectedAudioId || undefined,
      audioOutputDeviceId: selectedAudioOutputId || undefined,
      videoDeviceId: selectedVideoId || undefined,
      audioMode,
      videoQuality,
      mirrorCamera,
      hostPin: showRejoinPinInput && rejoinPin.trim() ? rejoinPin.trim() : undefined,
    });
  };

  const handleCopyPin = async () => {
    if (!config.hostPin) return;
    try {
      await navigator.clipboard.writeText(config.hostPin);
      setCopiedPin(true);
      window.setTimeout(() => setCopiedPin(false), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

  const isHostBadgeVisible = config.isHostIntent || (showRejoinPinInput && rejoinPin.trim().length >= 4);

  return (
    <div className="min-h-dvh bg-[#0B1120] text-slate-100">
      <header className="pt-safe border-b border-slate-800/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:gap-4 sm:px-6 sm:py-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                stopStream();
                onBack();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#131C2E] px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:text-white whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Kembali</span>
            </button>
            <div className="flex items-center gap-2 text-base font-bold text-white whitespace-nowrap shrink-0">
              <Video className="h-4 w-4 text-teal-400" />
              <span>ObeeMeet</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Ruang</span>
            <span className="font-mono font-semibold text-teal-300 tabular-nums">{config.roomCode}</span>
            {!health.livekitConfigured && (
              <>
                <span aria-hidden="true">·</span>
                <span className="hidden sm:inline text-slate-400">Mode Uji Preview</span>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-6 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:pt-8 sm:pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))] lg:pt-12 lg:pb-[calc(3rem+env(safe-area-inset-bottom,0px))]">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:items-start lg:gap-8">
          {/* Left: Camera Preview & Device Checks */}
          <div className="space-y-4 md:col-span-7">
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-slate-800 bg-[#11192B]">
              {isCameraOn && stream && stream.getVideoTracks().length > 0 ? (
                <video
                  ref={previewVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`h-full w-full object-cover ${mirrorCamera ? '-scale-x-100' : ''}`}
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center px-6 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-700 bg-slate-800/80 text-2xl font-bold text-teal-300">
                    {(participantName.trim() || 'OB').slice(0, 2).toUpperCase()}
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-300">
                    {isLoadingMedia ? 'Menghubungkan kamera...' : 'Kamera dimatikan'}
                  </p>
                </div>
              )}

              {/* Bottom Media Controls Overlay */}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pt-8 pb-4">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={toggleMic}
                    aria-label={isMicOn ? 'Matikan mikrofon' : 'Nyalakan mikrofon'}
                    className={`flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors whitespace-nowrap ${
                      isMicOn
                        ? 'bg-slate-900/90 text-slate-100 hover:bg-slate-800 border border-slate-700/80'
                        : 'bg-red-600 text-white hover:bg-red-500'
                    }`}
                  >
                    {isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    <span>{isMicOn ? 'Mic Nyala' : 'Mic Mati'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleCamera}
                    aria-label={isCameraOn ? 'Matikan kamera' : 'Nyalakan kamera'}
                    className={`flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors whitespace-nowrap ${
                      isCameraOn
                        ? 'bg-slate-900/90 text-slate-100 hover:bg-slate-800 border border-slate-700/80'
                        : 'bg-red-600 text-white hover:bg-red-500'
                    }`}
                  >
                    {isCameraOn ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
                    <span>{isCameraOn ? 'Kamera Nyala' : 'Kamera Mati'}</span>
                  </button>
                </div>

                {/* Live Microphone Audio Meter */}
                <div className="hidden items-center gap-2 rounded-lg bg-slate-950/80 px-3 py-2 backdrop-blur-sm sm:flex">
                  <span className="text-xs text-slate-400">Suara</span>
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-teal-400 transition-all duration-75"
                      style={{ width: `${isMicOn ? Math.max(4, audioLevel) : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Audio Meter */}
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#131C2E] px-4 py-3 sm:hidden">
              <span className="text-xs font-medium text-slate-300">Indikator Suara Mikrofon</span>
              <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-teal-400 transition-all duration-75"
                  style={{ width: `${isMicOn ? Math.max(4, audioLevel) : 0}%` }}
                />
              </div>
            </div>

            {permissionError && (
              <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <p className="leading-relaxed">{permissionError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void retryMedia()}
                  className="inline-flex items-center gap-1 font-medium text-amber-300 hover:text-amber-200 whitespace-nowrap shrink-0"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Coba Lagi</span>
                </button>
              </div>
            )}

            {/* Device Selectors & Pro Audio/Video Controls */}
            <div className="space-y-3 rounded-xl border border-slate-800/90 bg-[#131C2E]/70 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-200">
                  Sumber Perangkat (Soundcard / Kamera Eksternal)
                </span>
                <button
                  type="button"
                  onClick={() => void refreshDevices()}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-400 hover:text-teal-300 whitespace-nowrap"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Pindai Ulang</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="mic-device-select" className="block text-xs font-medium text-slate-400">
                    Mikrofon / Audio Interface
                  </label>
                  <select
                    id="mic-device-select"
                    value={selectedAudioId}
                    onChange={(e) => setSelectedAudioId(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-800 bg-[#0B1120] px-3 py-2 text-sm text-slate-200 focus:border-teal-500 focus:outline-none"
                  >
                    {audioDevices.length === 0 ? (
                      <option value="">Mikrofon Default Sistem</option>
                    ) : (
                      audioDevices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label htmlFor="cam-device-select" className="block text-xs font-medium text-slate-400">
                    Kamera / Capture Card
                  </label>
                  <select
                    id="cam-device-select"
                    value={selectedVideoId}
                    onChange={(e) => setSelectedVideoId(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-800 bg-[#0B1120] px-3 py-2 text-sm text-slate-200 focus:border-teal-500 focus:outline-none"
                  >
                    {videoDevices.length === 0 ? (
                      <option value="">Kamera Default Sistem</option>
                    ) : (
                      videoDevices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {audioOutputDevices.length > 0 &&
                typeof HTMLMediaElement !== 'undefined' &&
                'setSinkId' in HTMLMediaElement.prototype && (
                  <div>
                    <label htmlFor="speaker-device-select" className="block text-xs font-medium text-slate-400">
                      Output Speaker / Headphone Monitor
                    </label>
                    <select
                      id="speaker-device-select"
                      value={selectedAudioOutputId}
                      onChange={(e) => setSelectedAudioOutputId(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-slate-800 bg-[#0B1120] px-3 py-2 text-sm text-slate-200 focus:border-teal-500 focus:outline-none"
                    >
                      {audioOutputDevices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

              <div className="grid grid-cols-1 gap-3 border-t border-slate-800/80 pt-3 sm:grid-cols-3">
                <div>
                  <span className="block text-[11px] font-medium text-slate-400">Profil Audio</span>
                  <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-lg border border-slate-800 bg-[#0B1120] p-0.5">
                    <button
                      type="button"
                      onClick={() => setAudioMode('standard')}
                      className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                        audioMode === 'standard' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Standar
                    </button>
                    <button
                      type="button"
                      onClick={() => setAudioMode('studio')}
                      className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                        audioMode === 'studio' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Soundcard
                    </button>
                  </div>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-400">Kualitas Video</span>
                  <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-lg border border-slate-800 bg-[#0B1120] p-0.5">
                    <button
                      type="button"
                      onClick={() => setVideoQuality('720p')}
                      className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                        videoQuality === '720p' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      720p
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoQuality('1080p')}
                      className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                        videoQuality === '1080p' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      1080p
                    </button>
                  </div>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-400">Pratinjau Kamera</span>
                  <button
                    type="button"
                    onClick={() => setMirrorCamera((v) => !v)}
                    className={`mt-1.5 flex h-[34px] w-full items-center justify-center gap-1.5 rounded-lg border text-[11px] font-semibold transition-colors whitespace-nowrap ${
                      mirrorCamera
                        ? 'border-slate-800 bg-[#0B1120] text-slate-200 hover:border-teal-500/50'
                        : 'border-teal-500/50 bg-teal-600/15 text-teal-200'
                    }`}
                  >
                    <FlipHorizontal2 className="h-3.5 w-3.5 text-teal-400" />
                    <span>{mirrorCamera ? 'Mirror Aktif' : 'Non-Mirror'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Participant Info & Host Identity */}
          <div className="rounded-2xl border border-slate-800 bg-[#131C2E] p-5 sm:p-6 md:col-span-5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm font-semibold text-teal-300 tabular-nums">{config.roomCode}</span>
              {isHostBadgeVisible && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-300">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Pemateri (Host)</span>
                </span>
              )}
            </div>

            <h1 className="mt-2 text-xl font-bold text-white">
              {config.roomTitle || 'Ruang Persiapan Kelas'}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Periksa kamera, mikrofon, dan nama tampilan Anda sebelum bergabung.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label htmlFor="participant-name" className="block text-xs font-medium text-slate-300">
                  Nama Peserta / Pemateri
                </label>
                <input
                  id="participant-name"
                  type="text"
                  maxLength={50}
                  autoFocus
                  value={participantName}
                  onChange={(e) => {
                    setParticipantName(e.target.value);
                    if (localError) setLocalError(null);
                  }}
                  placeholder="Contoh: Raka Pratama"
                  className="mt-1.5 w-full rounded-lg border border-slate-700/80 bg-[#0B1120] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-500 focus:outline-none"
                />
              </div>

              {/* Show Auto-Generated Host PIN when creating a room */}
              {config.isHostIntent && config.hostPin && (
                <div className="rounded-xl border border-slate-800 bg-[#0B1120] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                      <KeyRound className="h-3.5 w-3.5 text-teal-400" />
                      <span>PIN Pemateri (Rejoin Cadangan)</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyPin}
                      className="inline-flex items-center gap-1 text-xs font-medium text-teal-400 hover:text-teal-300 whitespace-nowrap"
                    >
                      {copiedPin ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedPin ? 'Tersalin' : 'Salin PIN'}</span>
                    </button>
                  </div>
                  <p className="mt-2 font-mono text-xl font-bold tracking-[0.25em] text-teal-300 tabular-nums">
                    {config.hostPin}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                    Catat PIN ini untuk masuk kembali sebagai Pemateri bila koneksi sempat terputus di tengah sesi.
                  </p>
                </div>
              )}

              {/* Option for returning Host joining via link/code */}
              {!config.isHostIntent && (
                <div className="border-t border-slate-800 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowRejoinPinInput((v) => !v)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-teal-300"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    <span>
                      {showRejoinPinInput
                        ? 'Batal masuk sebagai Pemateri'
                        : 'Masuk sebagai Pemateri? Gunakan PIN Host'}
                    </span>
                  </button>

                  {showRejoinPinInput && (
                    <div className="mt-3">
                      <label htmlFor="rejoin-pin-input" className="block text-xs font-medium text-slate-300">
                        PIN Pemateri (6 digit)
                      </label>
                      <input
                        id="rejoin-pin-input"
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        value={rejoinPin}
                        onChange={(e) => setRejoinPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="Masukkan 6 digit PIN"
                        className="mt-1.5 w-full rounded-lg border border-slate-700/80 bg-[#0B1120] px-3.5 py-2.5 font-mono text-sm tracking-widest text-slate-100 placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-500 focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              {(localError || joinError) && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{localError || joinError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isJoining}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-500 disabled:opacity-60 whitespace-nowrap"
              >
                <span>{isJoining ? 'Menghubungkan ke Ruang...' : 'Masuk ke Ruang Kelas'}</span>
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
