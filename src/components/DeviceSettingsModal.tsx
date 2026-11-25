import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  FlipHorizontal2,
  Headphones,
  Mic,
  RefreshCw,
  Sliders,
  Volume2,
  X,
} from 'lucide-react';
import type { MediaDeviceOption } from '../hooks/useLocalMedia';
import type { DeviceSettingsState } from '../types/meeting';

interface DeviceSettingsModalProps {
  isOpen: boolean;
  settings: DeviceSettingsState;
  audioInputDevices: MediaDeviceOption[];
  audioOutputDevices: MediaDeviceOption[];
  videoInputDevices: MediaDeviceOption[];
  localMicStream?: MediaStream | null;
  isMicOn: boolean;
  onUpdateSettings: (partial: Partial<DeviceSettingsState>) => Promise<void>;
  onRefreshDevices: () => Promise<void>;
  onClose: () => void;
}

export function DeviceSettingsModal({
  isOpen,
  settings,
  audioInputDevices,
  audioOutputDevices,
  videoInputDevices,
  localMicStream,
  isMicOn,
  onUpdateSettings,
  onRefreshDevices,
  onClose,
}: DeviceSettingsModalProps) {
  const [micLevel, setMicLevel] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTestingSpeaker, setIsTestingSpeaker] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  // Live microphone signal meter while modal is open (great for verifying soundcard input gain)
  useEffect(() => {
    if (!isOpen || !isMicOn || !localMicStream || localMicStream.getAudioTracks().length === 0) {
      setMicLevel(0);
      return;
    }

    let cancelled = false;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      void ctx.resume().catch(() => {});
      const source = ctx.createMediaStreamSource(localMicStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.72;
      source.connect(analyser);
      audioCtxRef.current = ctx;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (cancelled) return;
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        setMicLevel(Math.min(100, Math.round(rms * 280)));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setMicLevel(0);
    }

    return () => {
      cancelled = true;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, [isOpen, isMicOn, localMicStream]);

  if (!isOpen) return null;

  const handleApply = async (partial: Partial<DeviceSettingsState>) => {
    setIsApplying(true);
    try {
      await onUpdateSettings(partial);
    } finally {
      setIsApplying(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefreshDevices();
    window.setTimeout(() => setIsRefreshing(false), 400);
  };

  const handleTestSpeaker = async () => {
    if (isTestingSpeaker) return;
    setIsTestingSpeaker(true);
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      await ctx.resume().catch(() => {});
      const sinkAwareCtx = ctx as AudioContext & { setSinkId?: (id: string) => Promise<void> };
      if (settings.audioOutputId && typeof sinkAwareCtx.setSinkId === 'function') {
        await sinkAwareCtx.setSinkId(settings.audioOutputId).catch(() => {});
      }

      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      gain.connect(ctx.destination);

      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.setValueAtTime(659.25, now + 0.22); // E5
      osc1.connect(gain);
      osc1.start(now);
      osc1.stop(now + 0.68);

      window.setTimeout(() => {
        ctx.close().catch(() => {});
        setIsTestingSpeaker(false);
      }, 750);
    } catch {
      setIsTestingSpeaker(false);
    }
  };

  const supportsSpeakerSelection =
    audioOutputDevices.length > 0 &&
    typeof HTMLMediaElement !== 'undefined' &&
    'setSinkId' in HTMLMediaElement.prototype;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="device-settings-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-800 bg-[#131C2E] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700/80 bg-[#0B1120] text-teal-400">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 id="device-settings-title" className="text-lg font-semibold text-white">
                Pengaturan Audio & Kamera
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Ganti soundcard/audio interface, speaker, atau kamera eksternal secara langsung tanpa keluar kelas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => void handleRefresh()}
              title="Pindai ulang perangkat USB yang baru dicolokkan"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-800 bg-[#0B1120] px-2.5 text-xs font-medium text-slate-300 transition-colors hover:border-teal-500/50 hover:text-white whitespace-nowrap"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-teal-400' : ''}`} />
              <span className="hidden sm:inline">Pindai Ulang</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup pengaturan perangkat"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 transition-colors hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* SECTION 1: AUDIO (MICROPHONE / SOUNDCARD & SPEAKER OUTPUT) */}
        <section className="mt-6 space-y-4 border-t border-slate-800 pt-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Mic className="h-4 w-4 text-teal-400" />
              <span>Mikrofon & Soundcard / Audio Interface</span>
            </h3>
            {isApplying && <span className="text-xs text-teal-400">Menerapkan...</span>}
          </div>

          <div>
            <label htmlFor="live-mic-select" className="block text-xs font-medium text-slate-400">
              Sumber Input Mikrofon
            </label>
            <select
              id="live-mic-select"
              value={settings.audioInputId}
              disabled={isApplying}
              onChange={(e) => void handleApply({ audioInputId: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-slate-700/80 bg-[#0B1120] px-3 py-2.5 text-sm text-slate-100 focus:border-teal-500 focus:outline-none disabled:opacity-60"
            >
              {audioInputDevices.length === 0 ? (
                <option value="">Mikrofon Default Sistem</option>
              ) : (
                audioInputDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))
              )}
            </select>

            {/* Live Input Signal Meter */}
            <div className="mt-2.5 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400">
                {isMicOn ? 'Level sinyal input mikrofon' : 'Mikrofon sedang dibisukan (nyalakan untuk cek sinyal)'}
              </span>
              <div className="h-2 w-36 shrink-0 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-teal-400 transition-all duration-75"
                  style={{ width: `${isMicOn ? Math.max(4, micLevel) : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Audio Processing Profile (Standard vs Soundcard/Studio) */}
          <div>
            <span className="block text-xs font-medium text-slate-400">Profil Pemrosesan Audio</span>
            <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-xl border border-slate-800 bg-[#0B1120] p-1">
              <button
                type="button"
                disabled={isApplying}
                onClick={() => void handleApply({ audioMode: 'standard' })}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                  settings.audioMode === 'standard'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Standar (Mic Laptop)
              </button>
              <button
                type="button"
                disabled={isApplying}
                onClick={() => void handleApply({ audioMode: 'studio' })}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                  settings.audioMode === 'studio'
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Soundcard / Studio
              </button>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              {settings.audioMode === 'studio'
                ? 'Mode Studio mematikan Echo Cancellation, Noise Suppression, dan Auto Gain browser agar karakter suara soundcard tetap utuh dan tidak terpotong (disarankan memakai headphone).'
                : 'Mode Standar mengaktifkan peredam gema & bising otomatis browser, cocok untuk mikrofon bawaan laptop tanpa headphone.'}
            </p>
          </div>

          {/* Speaker / Headphone Output */}
          <div>
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="live-speaker-select" className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <Headphones className="h-3.5 w-3.5 text-slate-400" />
                <span>Output Speaker / Headphone Monitor</span>
              </label>
              <button
                type="button"
                onClick={() => void handleTestSpeaker()}
                disabled={isTestingSpeaker}
                className="inline-flex items-center gap-1 text-xs font-medium text-teal-400 hover:text-teal-300 disabled:opacity-60 whitespace-nowrap"
              >
                <Volume2 className="h-3.5 w-3.5" />
                <span>{isTestingSpeaker ? 'Memutar nada...' : 'Tes Suara'}</span>
              </button>
            </div>

            {supportsSpeakerSelection ? (
              <select
                id="live-speaker-select"
                value={settings.audioOutputId}
                disabled={isApplying}
                onChange={(e) => void handleApply({ audioOutputId: e.target.value })}
                className="mt-1.5 w-full rounded-lg border border-slate-700/80 bg-[#0B1120] px-3 py-2.5 text-sm text-slate-100 focus:border-teal-500 focus:outline-none disabled:opacity-60"
              >
                {audioOutputDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-1.5 rounded-lg border border-slate-800 bg-[#0B1120] px-3 py-2 text-xs text-slate-400">
                Pada iOS/Safari, jalur output speaker/earphone diatur otomatis melalui Control Center, AirPlay, atau
                perangkat Bluetooth. Di Chrome/Edge desktop, output headphone soundcard dapat dipilih langsung di sini.
              </p>
            )}
          </div>
        </section>

        {/* SECTION 2: VIDEO (EXTERNAL WEBCAM / CAPTURE CARD / QUALITY & MIRROR) */}
        <section className="mt-6 space-y-4 border-t border-slate-800 pt-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Camera className="h-4 w-4 text-teal-400" />
            <span>Kamera Eksternal & Kualitas Video</span>
          </h3>

          <div>
            <label htmlFor="live-cam-select" className="block text-xs font-medium text-slate-400">
              Sumber Kamera (Webcam / Capture Card / Kamera Virtual)
            </label>
            <select
              id="live-cam-select"
              value={settings.videoInputId}
              disabled={isApplying}
              onChange={(e) => void handleApply({ videoInputId: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-slate-700/80 bg-[#0B1120] px-3 py-2.5 text-sm text-slate-100 focus:border-teal-500 focus:outline-none disabled:opacity-60"
            >
              {videoInputDevices.length === 0 ? (
                <option value="">Kamera Default Sistem</option>
              ) : (
                videoInputDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Resolution Preset */}
            <div>
              <span className="block text-xs font-medium text-slate-400">Kualitas Kamera</span>
              <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-xl border border-slate-800 bg-[#0B1120] p-1">
                <button
                  type="button"
                  disabled={isApplying}
                  onClick={() => void handleApply({ videoQuality: '720p' })}
                  className={`rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                    settings.videoQuality === '720p'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  720p Stabil
                </button>
                <button
                  type="button"
                  disabled={isApplying}
                  onClick={() => void handleApply({ videoQuality: '1080p' })}
                  className={`rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                    settings.videoQuality === '1080p'
                      ? 'bg-teal-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  1080p Tajam
                </button>
              </div>
            </div>

            {/* Mirror Preview Toggle */}
            <div>
              <span className="block text-xs font-medium text-slate-400">Tampilan Pratinjau Diri</span>
              <button
                type="button"
                onClick={() => void handleApply({ mirrorCamera: !settings.mirrorCamera })}
                className={`mt-1.5 flex h-[42px] w-full items-center justify-between rounded-xl border px-3 text-xs font-semibold transition-colors ${
                  settings.mirrorCamera
                    ? 'border-slate-700 bg-[#0B1120] text-slate-200 hover:border-teal-500/50'
                    : 'border-teal-500/50 bg-teal-600/15 text-teal-200'
                }`}
              >
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <FlipHorizontal2 className="h-3.5 w-3.5 text-teal-400" />
                  <span>{settings.mirrorCamera ? 'Cermin (Mirror) Aktif' : 'Non-Mirror (Teks Asli)'}</span>
                </span>
              </button>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            Matikan <span className="text-slate-200">Cermin (Mirror)</span> jika Anda mengarahkan kamera eksternal ke
            papan tulis fisik atau kertas catatan agar teks tidak terlihat terbalik di layar Anda.
          </p>
        </section>

        <div className="mt-6 flex justify-end border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-500 whitespace-nowrap"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
