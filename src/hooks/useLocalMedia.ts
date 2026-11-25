import { useCallback, useEffect, useRef, useState } from 'react';
import type { AudioProcessingMode, VideoQualityPreset } from '../types/meeting';

export interface MediaDeviceOption {
  deviceId: string;
  label: string;
}

export interface UseLocalMediaOptions {
  enabled: boolean;
  initialMicOn?: boolean;
  initialCameraOn?: boolean;
}

export function useLocalMedia({
  enabled,
  initialMicOn = true,
  initialCameraOn = true,
}: UseLocalMediaOptions) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(initialMicOn);
  const [isCameraOn, setIsCameraOn] = useState(initialCameraOn);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceOption[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceOption[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceOption[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string>('');
  const [selectedAudioOutputId, setSelectedAudioOutputId] = useState<string>('');
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [audioMode, setAudioMode] = useState<AudioProcessingMode>('standard');
  const [videoQuality, setVideoQuality] = useState<VideoQualityPreset>('720p');
  const [mirrorCamera, setMirrorCamera] = useState<boolean>(true);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isLoadingMedia, setIsLoadingMedia] = useState<boolean>(false);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const isMicOnRef = useRef(isMicOn);
  const isCameraOnRef = useRef(isCameraOn);

  useEffect(() => {
    isMicOnRef.current = isMicOn;
  }, [isMicOn]);

  useEffect(() => {
    isCameraOnRef.current = isCameraOn;
  }, [isCameraOn]);

  const stopMeter = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  const stopStream = useCallback(() => {
    stopMeter();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStream(null);
  }, [stopMeter]);

  const startMeter = useCallback(
    (mediaStream: MediaStream) => {
      stopMeter();
      const audioTracks = mediaStream.getAudioTracks();
      if (audioTracks.length === 0) return;

      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const source = ctx.createMediaStreamSource(mediaStream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.75;
        source.connect(analyser);
        audioCtxRef.current = ctx;

        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          if (!isMicOnRef.current) {
            setAudioLevel(0);
          } else {
            analyser.getByteTimeDomainData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) {
              const v = (data[i] - 128) / 128;
              sum += v * v;
            }
            const rms = Math.sqrt(sum / data.length);
            const normalized = Math.min(100, Math.round(rms * 280));
            setAudioLevel(normalized);
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        setAudioLevel(0);
      }
    },
    [stopMeter]
  );

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audios = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d, idx) => ({
          deviceId: d.deviceId,
          label: d.label || `Mikrofon ${idx + 1}`,
        }));
      const outputs = devices
        .filter((d) => d.kind === 'audiooutput')
        .map((d, idx) => ({
          deviceId: d.deviceId,
          label: d.label || `Speaker / Output ${idx + 1}`,
        }));
      const videos = devices
        .filter((d) => d.kind === 'videoinput')
        .map((d, idx) => ({
          deviceId: d.deviceId,
          label: d.label || `Kamera ${idx + 1}`,
        }));

      setAudioDevices(audios);
      setAudioOutputDevices(outputs);
      setVideoDevices(videos);

      if (audios.length > 0) {
        setSelectedAudioId((prev) => (prev && audios.some((d) => d.deviceId === prev) ? prev : audios[0].deviceId));
      }
      if (outputs.length > 0) {
        setSelectedAudioOutputId((prev) =>
          prev && outputs.some((d) => d.deviceId === prev) ? prev : outputs[0].deviceId
        );
      }
      if (videos.length > 0) {
        setSelectedVideoId((prev) => (prev && videos.some((d) => d.deviceId === prev) ? prev : videos[0].deviceId));
      }
    } catch {
      // Ignore device enumeration errors
    }
  }, []);

  const initMedia = useCallback(
    async (
      audioId?: string,
      videoId?: string,
      mode: AudioProcessingMode = 'standard',
      quality: VideoQualityPreset = '720p'
    ) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setPermissionError(
          'Browser ini belum mendukung akses kamera/mikrofon langsung. Anda tetap bisa bergabung tanpa kamera.'
        );
        return;
      }

      setIsLoadingMedia(true);
      setPermissionError(null);
      stopStream();

      const isStudio = mode === 'studio';
      const audioConstraint: MediaTrackConstraints = {
        ...(audioId ? { deviceId: { exact: audioId } } : {}),
        echoCancellation: !isStudio,
        noiseSuppression: !isStudio,
        autoGainControl: !isStudio,
      };
      const targetWidth = quality === '1080p' ? 1920 : 1280;
      const targetHeight = quality === '1080p' ? 1080 : 720;
      const videoConstraint: MediaTrackConstraints = {
        ...(videoId ? { deviceId: { exact: videoId } } : {}),
        width: { ideal: targetWidth },
        height: { ideal: targetHeight },
      };

      try {
        const media = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraint,
          video: videoConstraint,
        });
        media.getAudioTracks().forEach((t) => {
          t.enabled = isMicOnRef.current;
        });
        media.getVideoTracks().forEach((t) => {
          t.enabled = isCameraOnRef.current;
        });
        streamRef.current = media;
        setStream(media);
        startMeter(media);
        await refreshDevices();
      } catch {
        // Fallback: try audio-only if camera is unavailable
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: audioConstraint, video: false });
          audioOnly.getAudioTracks().forEach((t) => {
            t.enabled = isMicOnRef.current;
          });
          streamRef.current = audioOnly;
          setStream(audioOnly);
          setIsCameraOn(false);
          startMeter(audioOnly);
          setPermissionError('Kamera tidak terdeteksi atau izin ditolak. Mikrofon tetap siap digunakan.');
          await refreshDevices();
        } catch {
          setIsCameraOn(false);
          setIsMicOn(false);
          setPermissionError(
            'Izin kamera & mikrofon belum diaktifkan. Anda tetap dapat masuk kelas sebagai pendengar.'
          );
          await refreshDevices();
        }
      } finally {
        setIsLoadingMedia(false);
      }
    },
    [refreshDevices, startMeter, stopStream]
  );

  useEffect(() => {
    if (!enabled) {
      stopStream();
      return;
    }
    void initMedia(selectedAudioId || undefined, selectedVideoId || undefined, audioMode, videoQuality);
    return () => {
      stopStream();
    };
  }, [enabled, selectedAudioId, selectedVideoId, audioMode, videoQuality, initMedia, stopStream]);

  // Auto-refresh device list when user plugs/unplugs USB soundcard or external webcam
  useEffect(() => {
    if (!enabled || !navigator.mediaDevices?.addEventListener) return;
    const handler = () => {
      void refreshDevices();
    };
    navigator.mediaDevices.addEventListener('devicechange', handler);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handler);
    };
  }, [enabled, refreshDevices]);

  const toggleMic = useCallback(() => {
    setIsMicOn((prev) => {
      const next = !prev;
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach((t) => {
          t.enabled = next;
        });
      }
      return next;
    });
  }, []);

  const toggleCamera = useCallback(() => {
    setIsCameraOn((prev) => {
      const next = !prev;
      if (streamRef.current) {
        streamRef.current.getVideoTracks().forEach((t) => {
          t.enabled = next;
        });
      }
      return next;
    });
  }, []);

  return {
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
    retryMedia: () =>
      initMedia(selectedAudioId || undefined, selectedVideoId || undefined, audioMode, videoQuality),
    stopStream,
  };
}
