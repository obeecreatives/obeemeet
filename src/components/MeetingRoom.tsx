import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CameraOff,
  Check,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Hand,
  Info,
  Layers,
  Lock,
  MessageSquare,
  Mic,
  MicOff,
  MonitorOff,
  MonitorUp,
  MoreHorizontal,
  PanelRight,
  PhoneOff,
  Settings,
  SlidersHorizontal,
  Smile,
  UserPlus,
  Users,
  Video,
  Volume2,
} from 'lucide-react';
import { useMeetingSession } from '../hooks/useMeetingSession';
import type { ActiveSessionConfig, ReactionEmoji, SidePanelTab } from '../types/meeting';
import { downloadAttendanceCsv, formatDurationHMS } from '../utils/attendanceCsv';
import { CompanionDrawer } from './CompanionDrawer';
import { DeviceSettingsModal } from './DeviceSettingsModal';
import { InviteModal } from './InviteModal';
import { PWAInstallButton } from './PWAInstallButton';
import { SidePanel } from './SidePanel';
import { VideoTile } from './VideoTile';

interface MeetingRoomProps {
  session: ActiveSessionConfig;
  onExitRoom: () => void;
  onOpenSetupGuide: () => void;
}

const REACTION_CHOICES: { emoji: ReactionEmoji; label: string }[] = [
  { emoji: '👍', label: 'Setuju / Paham' },
  { emoji: '👏', label: 'Apresiasi' },
  { emoji: '❓', label: 'Ada Pertanyaan' },
];

export function MeetingRoom({ session, onExitRoom, onOpenSetupGuide }: MeetingRoomProps) {
  const meeting = useMeetingSession(session);
  const isHost = session.role === 'host';

  const [activeSideTab, setActiveSideTab] = useState<SidePanelTab>(null);
  const [isCompanionDrawerOpen, setIsCompanionDrawerOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isDeviceSettingsOpen, setIsDeviceSettingsOpen] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [isReactionMenuOpen, setIsReactionMenuOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastReadChatCount, setLastReadChatCount] = useState(0);

  // Elapsed teaching timer (counts up smoothly with no session limit)
  useEffect(() => {
    const compute = () => {
      const diff = Math.max(0, Math.floor((Date.now() - meeting.roomMetadata.createdAt) / 1000));
      setElapsedSeconds(diff);
    };
    compute();
    const id = window.setInterval(compute, 1000);
    return () => window.clearInterval(id);
  }, [meeting.roomMetadata.createdAt]);

  // Track unread chat count
  useEffect(() => {
    if (activeSideTab === 'chat') {
      setLastReadChatCount(meeting.chatMessages.length);
    }
  }, [activeSideTab, meeting.chatMessages.length]);

  // Close companion drawer automatically if Host clears the companion link
  useEffect(() => {
    if (!meeting.roomMetadata.companionLink) {
      setIsCompanionDrawerOpen(false);
    }
  }, [meeting.roomMetadata.companionLink]);

  const unreadChatCount =
    activeSideTab === 'chat' ? 0 : Math.max(0, meeting.chatMessages.length - lastReadChatCount);
  const raisedHandCount = useMemo(
    () => meeting.participants.filter((p) => p.handRaisedAt !== null).length,
    [meeting.participants]
  );

  // Determine smart layout: Screen Share Presentation -> Spotlight -> Adaptive Grid
  const activeScreenSharer = useMemo(
    () => meeting.participants.find((p) => p.isScreenSharing) ?? null,
    [meeting.participants]
  );

  const spotlightParticipant = useMemo(() => {
    if (!meeting.roomMetadata.spotlightIdentity) return null;
    return meeting.participants.find((p) => p.identity === meeting.roomMetadata.spotlightIdentity) ?? null;
  }, [meeting.participants, meeting.roomMetadata.spotlightIdentity]);

  const filmstripParticipants = useMemo(() => {
    if (activeScreenSharer) {
      return meeting.participants;
    }
    if (spotlightParticipant) {
      return meeting.participants.filter((p) => p.identity !== spotlightParticipant.identity);
    }
    return [];
  }, [activeScreenSharer, meeting.participants, spotlightParticipant]);

  const gridClass = useMemo(() => {
    const count = meeting.participants.length;
    if (count <= 1) return 'grid-cols-1 max-w-4xl mx-auto';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2';
    if (count <= 4) return 'grid-cols-1 sm:grid-cols-2';
    if (count <= 6) return 'grid-cols-2 lg:grid-cols-3';
    return 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4';
  }, [meeting.participants.length]);

  const toggleSideTab = (tab: Exclude<SidePanelTab, null>) => {
    setActiveSideTab((prev) => (prev === tab ? null : tab));
    setIsMobileMoreOpen(false);
  };

  const handleCopyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(meeting.roomMetadata.roomCode);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleToggleSpotlight = async (identity: string) => {
    const isAlready = meeting.roomMetadata.spotlightIdentity === identity;
    await meeting.setSpotlight(isAlready ? null : identity);
  };

  const handleLeaveSelf = async () => {
    setIsLeaveModalOpen(false);
    await meeting.leaveSession();
    onExitRoom();
  };

  const handleEndForAll = async () => {
    setIsLeaveModalOpen(false);
    await meeting.endSessionForAll();
    onExitRoom();
  };

  // Session ended screen (when Host terminates class for everyone)
  if (meeting.sessionEndedByHost) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0B1120] p-6 text-slate-100">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#131C2E] p-7 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600/20 text-teal-400">
            <Video className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-white">Sesi Pelatihan Telah Berakhir</h1>
          <p className="mt-2 text-sm text-slate-400">
            Pemateri telah mengakhiri sesi kelas <span className="font-mono text-slate-200">{session.roomCode}</span>.
            Terima kasih telah mengikuti pelatihan.
          </p>
          <p className="mt-3 font-mono text-xs text-slate-400 tabular-nums">
            Durasi sesi tercatat: {formatDurationHMS(elapsedSeconds)}
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            {isHost && (
              <button
                type="button"
                onClick={() => downloadAttendanceCsv(session.roomCode, meeting.attendance)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-teal-500/40 bg-teal-600/15 px-4 py-2.5 text-sm font-semibold text-teal-300 transition-colors hover:bg-teal-600/25"
              >
                <Download className="h-4 w-4" />
                <span>Unduh Rekap Absensi (CSV)</span>
              </button>
            )}
            <button
              type="button"
              onClick={onExitRoom}
              className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-500"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#0B1120] text-slate-100">
      {/* TOP BAR: Room Info, Lock Status, Preview Indicator, Elapsed Timer & Invite */}
      <header className="pt-safe landscape-compact-header flex min-h-14 shrink-0 items-center justify-between gap-2 border-b border-slate-800/90 bg-[#0F172A] pl-[max(0.75rem,env(safe-area-inset-left,0px))] pr-[max(0.75rem,env(safe-area-inset-right,0px))] sm:gap-3 sm:pl-[max(1.25rem,env(safe-area-inset-left,0px))] sm:pr-[max(1.25rem,env(safe-area-inset-right,0px))]">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white">
            <Video className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-semibold text-white">
                {meeting.roomMetadata.title || 'ObeeMeet'}
              </h1>
              <span aria-hidden="true" className="hidden text-slate-600 sm:inline">
                ·
              </span>
              <button
                type="button"
                onClick={handleCopyRoomCode}
                title="Klik untuk menyalin kode ruang"
                className="hidden items-center gap-1 font-mono text-xs font-medium text-teal-300 hover:text-teal-200 sm:inline-flex whitespace-nowrap tabular-nums"
              >
                <span>{meeting.roomMetadata.roomCode}</span>
                {copiedCode ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3 opacity-70" />}
              </button>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>{isHost ? 'Pemateri (Host)' : 'Peserta'}</span>
              {meeting.roomMetadata.isLocked && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 font-medium text-amber-300">
                    <Lock className="h-3 w-3" />
                    <span>Ruang Terkunci</span>
                  </span>
                </>
              )}
              {session.mode === 'preview' && (
                <>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={onOpenSetupGuide}
                    className="inline-flex items-center gap-1 text-teal-400 hover:text-teal-300 whitespace-nowrap"
                  >
                    <Info className="h-3 w-3" />
                    <span>Mode Preview</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Elapsed Teaching Duration Timer (No Limit) + Quick Invite */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div
            title="Durasi sesi mengajar (tanpa batas waktu)"
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#0B1120] px-2.5 py-1.5 font-mono text-xs font-medium text-slate-200 tabular-nums"
          >
            <Clock className="h-3.5 w-3.5 text-teal-400 shrink-0" />
            <span>{formatDurationHMS(elapsedSeconds)}</span>
          </div>

          <button
            type="button"
            onClick={() => setIsInviteOpen(true)}
            className="hidden items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-100 transition-colors hover:border-teal-500/60 hover:bg-slate-800 sm:inline-flex whitespace-nowrap"
          >
            <UserPlus className="h-3.5 w-3.5 text-teal-400" />
            <span>Undang</span>
          </button>
        </div>
      </header>

      {/* COMPANION WHITEBOARD PINNED BAR (Visible to all participants when set by Host) */}
      {meeting.roomMetadata.companionLink && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-teal-500/25 bg-[#10252C] px-3 py-2 sm:px-5">
          <div className="flex min-w-0 items-center gap-2 text-xs sm:text-sm">
            <Layers className="h-4 w-4 shrink-0 text-teal-400" />
            <span className="truncate font-semibold text-teal-100">
              {meeting.roomMetadata.companionLink.label}
            </span>
            <span className="hidden text-teal-300/70 md:inline">· Tautan disematkan Pemateri</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsCompanionDrawerOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                isCompanionDrawerOpen
                  ? 'bg-teal-500 text-slate-950'
                  : 'bg-teal-600 text-white hover:bg-teal-500'
              }`}
            >
              <PanelRight className="h-3.5 w-3.5" />
              <span>{isCompanionDrawerOpen ? 'Tutup Panel Samping' : 'Buka Panel Samping'}</span>
            </button>

            <a
              href={meeting.roomMetadata.companionLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/40 bg-slate-950/50 px-3 py-1.5 text-xs font-medium text-teal-200 transition-colors hover:bg-slate-950/80 whitespace-nowrap"
            >
              <span>Tab Baru</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            {isHost && (
              <button
                type="button"
                onClick={() => setActiveSideTab('controls')}
                className="hidden rounded-lg px-2 py-1.5 text-xs font-medium text-teal-300/90 hover:bg-teal-500/15 sm:inline-block whitespace-nowrap"
              >
                Ubah
              </button>
            )}
          </div>
        </div>
      )}

      {/* iOS Safari Audio Autoplay Unlock Banner */}
      {meeting.audioPlaybackBlocked && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-teal-500/40 bg-teal-600/20 px-4 py-2.5 text-xs text-teal-100">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 shrink-0 text-teal-300" />
            <span>Browser iOS/Safari menjeda suara kelas otomatis. Ketuk tombol di samping untuk mengaktifkan audio.</span>
          </div>
          <button
            type="button"
            onClick={() => void meeting.unlockAudio()}
            className="min-h-[36px] shrink-0 rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition-colors hover:bg-teal-400 whitespace-nowrap"
          >
            Aktifkan Suara
          </button>
        </div>
      )}

      {/* Connection error or reconnecting banner */}
      {(meeting.errorMessage || meeting.connectionState === 'reconnecting') && (
        <div className="flex shrink-0 items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-500/15 px-4 py-2 text-xs text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
          <span>
            {meeting.errorMessage || 'Koneksi sempat terputus. Sedang menyambungkan ulang ke ruang kelas...'}
          </span>
        </div>
      )}

      {/* MAIN WORKSPACE: Video Stage + Optional Companion Drawer + Optional Side Panel */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Video Stage */}
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden p-2.5 sm:p-4">
          {/* Smart Layout Mode 1: Presentation Layout (75-80% Screen Share + Auto-Rotate Filmstrip) */}
          {activeScreenSharer ? (
            <div className="flex h-full flex-col gap-2.5 landscape:flex-row md:flex-row sm:gap-3">
              {/* Filmstrip on top for mobile portrait, on right for landscape phone / tablet / desktop */}
              <div className="order-2 flex-1 min-h-0 landscape:order-1 md:order-1">
                <VideoTile
                  participant={activeScreenSharer}
                  mode="screen"
                  isHostViewer={isHost}
                />
              </div>

              <div className="order-1 flex shrink-0 gap-2 overflow-x-auto pb-1 landscape:order-2 landscape:w-36 landscape:flex-col landscape:overflow-y-auto landscape:overflow-x-hidden landscape:pb-0 md:order-2 md:w-48 md:flex-col md:overflow-y-auto md:overflow-x-hidden md:pb-0 lg:w-56 xl:w-64">
                {filmstripParticipants.map((p) => (
                  <div key={p.identity} className="w-36 shrink-0 landscape:w-full md:w-full">
                    <VideoTile
                      participant={p}
                      compact
                      mirrorLocal={meeting.deviceSettings.mirrorCamera}
                      audioOutputDeviceId={meeting.deviceSettings.audioOutputId}
                      isSpotlight={meeting.roomMetadata.spotlightIdentity === p.identity}
                      isHostViewer={isHost}
                      onToggleSpotlight={handleToggleSpotlight}
                      onMuteParticipant={meeting.muteParticipant}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : spotlightParticipant ? (
            /* Smart Layout Mode 2: Global Spotlight Layout (Auto-Rotate Aware) */
            <div className="flex h-full flex-col gap-2.5 landscape:flex-row md:flex-row sm:gap-3">
              <div className="order-2 flex-1 min-h-0 landscape:order-1 md:order-1">
                <VideoTile
                  participant={spotlightParticipant}
                  isSpotlight
                  mirrorLocal={meeting.deviceSettings.mirrorCamera}
                  audioOutputDeviceId={meeting.deviceSettings.audioOutputId}
                  isHostViewer={isHost}
                  onToggleSpotlight={handleToggleSpotlight}
                  onMuteParticipant={meeting.muteParticipant}
                />
              </div>

              {filmstripParticipants.length > 0 && (
                <div className="order-1 flex shrink-0 gap-2 overflow-x-auto pb-1 landscape:order-2 landscape:w-36 landscape:flex-col landscape:overflow-y-auto landscape:overflow-x-hidden landscape:pb-0 md:order-2 md:w-48 md:flex-col md:overflow-y-auto md:overflow-x-hidden md:pb-0 lg:w-56 xl:w-64">
                  {filmstripParticipants.map((p) => (
                    <div key={p.identity} className="w-36 shrink-0 landscape:w-full md:w-full">
                      <VideoTile
                        participant={p}
                        compact
                        mirrorLocal={meeting.deviceSettings.mirrorCamera}
                        audioOutputDeviceId={meeting.deviceSettings.audioOutputId}
                        isHostViewer={isHost}
                        onToggleSpotlight={handleToggleSpotlight}
                        onMuteParticipant={meeting.muteParticipant}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Smart Layout Mode 3: Adaptive Participant Camera Grid */
            <div className={`grid h-full w-full auto-rows-fr gap-3 overflow-y-auto ${gridClass}`}>
              {meeting.participants.map((p) => (
                <VideoTile
                  key={p.identity}
                  participant={p}
                  mirrorLocal={meeting.deviceSettings.mirrorCamera}
                  audioOutputDeviceId={meeting.deviceSettings.audioOutputId}
                  isSpotlight={meeting.roomMetadata.spotlightIdentity === p.identity}
                  isHostViewer={isHost}
                  onToggleSpotlight={handleToggleSpotlight}
                  onMuteParticipant={meeting.muteParticipant}
                />
              ))}
            </div>
          )}

          {/* Floating Quick Reactions Overlay (Compositor-only animation) */}
          <div className="pointer-events-none absolute inset-x-4 bottom-4 z-20 h-32 overflow-hidden">
            {meeting.reactions.map((rx) => (
              <div
                key={rx.id}
                style={{ left: `${rx.offsetX}%` }}
                className="animate-float-reaction absolute bottom-0 flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-900/90 px-3 py-1.5 text-sm shadow-lg backdrop-blur-sm"
              >
                <span className="text-base leading-none">{rx.emoji}</span>
                <span className="max-w-[120px] truncate text-xs font-medium text-slate-200">{rx.senderName}</span>
              </div>
            ))}
          </div>

          {/* Non-intrusive Action Toast */}
          {meeting.toastMessage && (
            <div className="pointer-events-none absolute top-4 left-1/2 z-30 -translate-x-1/2">
              <div className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-slate-700 bg-slate-900/95 px-4 py-2.5 text-xs font-medium text-slate-100 shadow-xl backdrop-blur-sm">
                <span>{meeting.toastMessage}</span>
              </div>
            </div>
          )}
        </main>

        {/* Optional Split-View Companion Whiteboard Drawer */}
        {isCompanionDrawerOpen && meeting.roomMetadata.companionLink && (
          <CompanionDrawer
            link={meeting.roomMetadata.companionLink}
            onClose={() => setIsCompanionDrawerOpen(false)}
          />
        )}

        {/* Contextual Side Panel (Participants / Chat / Host Room Controls) */}
        <SidePanel
          activeTab={activeSideTab}
          onSelectTab={setActiveSideTab}
          onClose={() => setActiveSideTab(null)}
          isHost={isHost}
          mode={session.mode}
          roomMetadata={meeting.roomMetadata}
          localIdentity={session.identity}
          participants={meeting.participants}
          chatMessages={meeting.chatMessages}
          attendance={meeting.attendance}
          onSendChat={meeting.sendChatMessage}
          onLowerHand={meeting.lowerParticipantHand}
          onMuteParticipant={meeting.muteParticipant}
          onMuteAll={meeting.muteAllParticipants}
          onToggleLock={meeting.toggleLockRoom}
          onSetSpotlight={meeting.setSpotlight}
          onSetCompanionLink={meeting.setCompanionLink}
          onOpenInvite={() => setIsInviteOpen(true)}
          onTriggerPreviewRaiseHand={meeting.triggerPreviewRaiseHand}
        />
      </div>

      {/* BOTTOM CONTROL BAR: Auto-tidy, touch-friendly (>= 44px), safe-area & zero overlap on 360px phones */}
      <footer className="pb-safe px-safe landscape-compact-footer relative z-30 shrink-0 border-t border-slate-800/90 bg-[#0F172A]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-1.5 px-2 py-2 sm:gap-2 sm:px-5 sm:py-2.5">
          {/* Left: Primary Media Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => void meeting.toggleMic()}
              aria-label={meeting.isLocalMicOn ? 'Bisukan mikrofon' : 'Nyalakan mikrofon'}
              className={`flex h-11 min-w-[44px] items-center justify-center gap-2 rounded-xl px-2.5 text-xs font-semibold transition-colors sm:px-3 whitespace-nowrap ${
                meeting.isLocalMicOn
                  ? 'border border-slate-700/80 bg-slate-800/90 text-slate-100 hover:bg-slate-700'
                  : 'bg-red-600 text-white hover:bg-red-500'
              }`}
            >
              {meeting.isLocalMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              <span className="hidden md:inline">{meeting.isLocalMicOn ? 'Mic' : 'Mati'}</span>
            </button>

            <button
              type="button"
              onClick={() => void meeting.toggleCamera()}
              aria-label={meeting.isLocalCameraOn ? 'Matikan kamera' : 'Nyalakan kamera'}
              className={`flex h-11 min-w-[44px] items-center justify-center gap-2 rounded-xl px-2.5 text-xs font-semibold transition-colors sm:px-3 whitespace-nowrap ${
                meeting.isLocalCameraOn
                  ? 'border border-slate-700/80 bg-slate-800/90 text-slate-100 hover:bg-slate-700'
                  : 'bg-red-600 text-white hover:bg-red-500'
              }`}
            >
              {meeting.isLocalCameraOn ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
              <span className="hidden md:inline">{meeting.isLocalCameraOn ? 'Kamera' : 'Mati'}</span>
            </button>

            {/* Share Screen Button (Desktop / Tablet / Landscape; neatly inside mobile menu on narrow portrait phones) */}
            <div className="relative hidden sm:block">
              {meeting.isLocalScreenSharing ? (
                <button
                  type="button"
                  onClick={() => void meeting.stopScreenShare()}
                  className="flex h-11 min-w-[44px] items-center justify-center gap-2 rounded-xl bg-teal-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-teal-500 whitespace-nowrap"
                >
                  <MonitorOff className="h-4 w-4" />
                  <span className="hidden md:inline">Hentikan Share</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!meeting.canScreenShare) {
                      setIsShareMenuOpen(true);
                      return;
                    }
                    setIsShareMenuOpen((v) => !v);
                    setIsReactionMenuOpen(false);
                    setIsMobileMoreOpen(false);
                  }}
                  aria-label="Bagikan layar"
                  className="flex h-11 min-w-[44px] items-center justify-center gap-2 rounded-xl border border-slate-700/80 bg-slate-800/90 px-3 text-xs font-semibold text-slate-100 transition-colors hover:border-teal-500/60 hover:bg-slate-800 whitespace-nowrap"
                >
                  <MonitorUp className="h-4 w-4 text-teal-400" />
                  <span className="hidden md:inline">Share Screen</span>
                </button>
              )}

              {isShareMenuOpen && !meeting.isLocalScreenSharing && (
                <div className="absolute bottom-14 left-0 z-50 w-72 rounded-xl border border-slate-700 bg-[#131C2E] p-2 shadow-2xl">
                  {!meeting.canScreenShare ? (
                    <div className="p-2.5 text-xs leading-relaxed text-slate-300">
                      <p className="font-semibold text-slate-100">Berbagi Layar Tidak Didukung di Browser HP Ini</p>
                      <p className="mt-1 text-slate-400">
                        Browser mobile (terutama iOS Safari) membatasi Share Screen. Gunakan Laptop/PC untuk berbagi
                        layar materi atau papan tulis.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-400">
                        Pilih Kualitas Share Screen
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsShareMenuOpen(false);
                          void meeting.startScreenShare('whiteboard', false);
                        }}
                        className="w-full rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-slate-800"
                      >
                        <p className="text-xs font-semibold text-teal-300">Teks & Papan Tulis Tajam (Disarankan)</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          1080p · detail tinggi untuk tulisan & diagram papan tulis.
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsShareMenuOpen(false);
                          void meeting.startScreenShare('motion', false);
                        }}
                        className="mt-1 w-full rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-slate-800"
                      >
                        <p className="text-xs font-semibold text-slate-100">Video & Gerakan Halus</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          30 fps untuk memutar video demo atau animasi.
                        </p>
                      </button>
                      {session.mode === 'preview' && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsShareMenuOpen(false);
                            void meeting.startScreenShare('whiteboard', true);
                          }}
                          className="mt-1 w-full rounded-lg border-t border-slate-800 px-2.5 py-2 text-left transition-colors hover:bg-slate-800"
                        >
                          <p className="text-xs font-semibold text-slate-200">Simulasi Slide Papan Tulis</p>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            Uji Presentation Layout 80% tanpa membagikan layar perangkat.
                          </p>
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Center: Classroom Interaction Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Raise Hand */}
            <button
              type="button"
              onClick={() => void meeting.toggleRaiseHand()}
              aria-label={meeting.isLocalHandRaised ? 'Turunkan tangan' : 'Angkat tangan'}
              className={`flex h-11 min-w-[44px] items-center justify-center gap-2 rounded-xl px-2.5 text-xs font-semibold transition-colors sm:px-3 whitespace-nowrap ${
                meeting.isLocalHandRaised
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                  : 'border border-slate-700/80 bg-slate-800/90 text-slate-100 hover:bg-slate-700'
              }`}
            >
              <Hand className="h-4 w-4" />
              <span className="hidden lg:inline">
                {meeting.isLocalHandRaised ? 'Turunkan' : 'Angkat Tangan'}
              </span>
            </button>

            {/* Quick Reactions (👍 👏 ❓) — visible on sm+, also inside mobile Lainnya menu */}
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => {
                  setIsReactionMenuOpen((v) => !v);
                  setIsShareMenuOpen(false);
                  setIsMobileMoreOpen(false);
                }}
                aria-label="Reaksi cepat"
                className="flex h-11 min-w-[44px] items-center justify-center gap-2 rounded-xl border border-slate-700/80 bg-slate-800/90 px-3 text-xs font-semibold text-slate-100 transition-colors hover:bg-slate-700 whitespace-nowrap"
              >
                <Smile className="h-4 w-4" />
                <span className="hidden lg:inline">Reaksi</span>
              </button>

              {isReactionMenuOpen && (
                <div className="absolute bottom-14 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1.5 rounded-xl border border-slate-700 bg-[#131C2E] p-1.5 shadow-2xl">
                  {REACTION_CHOICES.map((item) => (
                    <button
                      key={item.emoji}
                      type="button"
                      title={item.label}
                      onClick={() => {
                        void meeting.sendReaction(item.emoji);
                        setIsReactionMenuOpen(false);
                      }}
                      className="flex h-11 w-11 items-center justify-center rounded-lg text-xl transition-transform hover:scale-110 hover:bg-slate-800"
                    >
                      {item.emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Chat Button */}
            <button
              type="button"
              onClick={() => toggleSideTab('chat')}
              aria-label="Buka chat kelas"
              className={`relative flex h-11 min-w-[44px] items-center justify-center gap-2 rounded-xl px-2.5 text-xs font-semibold transition-colors sm:px-3 whitespace-nowrap ${
                activeSideTab === 'chat'
                  ? 'bg-teal-600/25 border border-teal-500/60 text-teal-200'
                  : 'border border-slate-700/80 bg-slate-800/90 text-slate-100 hover:bg-slate-700'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden md:inline">Chat</span>
              {unreadChatCount > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-teal-500 px-1 font-mono text-[10px] font-bold text-slate-950 tabular-nums">
                  {unreadChatCount}
                </span>
              )}
            </button>

            {/* Participants & Queue Button */}
            <button
              type="button"
              onClick={() => toggleSideTab('participants')}
              aria-label="Buka daftar peserta"
              className={`relative flex h-11 min-w-[44px] items-center justify-center gap-2 rounded-xl px-2.5 text-xs font-semibold transition-colors sm:px-3 whitespace-nowrap ${
                activeSideTab === 'participants'
                  ? 'bg-teal-600/25 border border-teal-500/60 text-teal-200'
                  : 'border border-slate-700/80 bg-slate-800/90 text-slate-100 hover:bg-slate-700'
              }`}
            >
              <Users className="h-4 w-4" />
              <span className="hidden md:inline">Peserta</span>
              {raisedHandCount > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 font-mono text-[10px] font-bold text-slate-950 tabular-nums">
                  {raisedHandCount}
                </span>
              )}
            </button>

            {/* Host Room & Whiteboard Controls (Desktop / Tablet) */}
            {isHost && (
              <button
                type="button"
                onClick={() => toggleSideTab('controls')}
                aria-label="Kontrol ruang dan papan tulis"
                className={`hidden h-11 items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold transition-colors sm:flex whitespace-nowrap ${
                  activeSideTab === 'controls'
                    ? 'bg-teal-600/25 border border-teal-500/60 text-teal-200'
                    : 'border border-slate-700/80 bg-slate-800/90 text-slate-100 hover:bg-slate-700'
                }`}
              >
                <SlidersHorizontal className="h-4 w-4 text-teal-400" />
                <span className="hidden lg:inline">Papan Tulis & Ruang</span>
              </button>
            )}

            {/* Device Settings (Audio Interface / External Camera) — Desktop / Tablet */}
            <button
              type="button"
              onClick={() => {
                setIsDeviceSettingsOpen(true);
                setIsShareMenuOpen(false);
                setIsReactionMenuOpen(false);
              }}
              aria-label="Pengaturan audio dan kamera"
              title="Pengaturan Mikrofon / Soundcard & Kamera Eksternal"
              className="hidden h-11 items-center justify-center gap-2 rounded-xl border border-slate-700/80 bg-slate-800/90 px-3 text-xs font-semibold text-slate-100 transition-colors hover:border-teal-500/60 hover:bg-slate-800 sm:flex whitespace-nowrap"
            >
              <Settings className="h-4 w-4 text-slate-300" />
              <span className="hidden xl:inline">Perangkat</span>
            </button>

            {/* Mobile Overflow Menu (Portrait Phone: Reactions, Share Screen, Audio/Cam Settings, Invite, Host Controls, Install) */}
            <div className="relative sm:hidden">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMoreOpen((v) => !v);
                  setIsShareMenuOpen(false);
                  setIsReactionMenuOpen(false);
                }}
                aria-label="Menu lainnya"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-800/90 text-slate-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {isMobileMoreOpen && (
                <div className="absolute right-0 bottom-14 z-50 w-60 rounded-xl border border-slate-700 bg-[#131C2E] p-2 shadow-2xl">
                  {/* Quick Reactions row inside mobile drawer */}
                  <div className="mb-1.5 flex items-center justify-around rounded-lg bg-[#0B1120] p-1">
                    {REACTION_CHOICES.map((item) => (
                      <button
                        key={item.emoji}
                        type="button"
                        title={item.label}
                        onClick={() => {
                          void meeting.sendReaction(item.emoji);
                          setIsMobileMoreOpen(false);
                        }}
                        className="flex h-10 w-12 items-center justify-center rounded-md text-lg hover:bg-slate-800"
                      >
                        {item.emoji}
                      </button>
                    ))}
                  </div>

                  {meeting.canScreenShare && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMoreOpen(false);
                        if (meeting.isLocalScreenSharing) {
                          void meeting.stopScreenShare();
                        } else {
                          void meeting.startScreenShare('whiteboard', session.mode === 'preview');
                        }
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-medium text-slate-100 hover:bg-slate-800"
                    >
                      {meeting.isLocalScreenSharing ? (
                        <MonitorOff className="h-4 w-4 text-teal-400" />
                      ) : (
                        <MonitorUp className="h-4 w-4 text-teal-400" />
                      )}
                      <span>{meeting.isLocalScreenSharing ? 'Hentikan Share Screen' : 'Share Screen'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMoreOpen(false);
                      setIsDeviceSettingsOpen(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-medium text-slate-100 hover:bg-slate-800"
                  >
                    <Settings className="h-4 w-4 text-teal-400" />
                    <span>Pengaturan Audio & Kamera</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMoreOpen(false);
                      setIsInviteOpen(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-medium text-slate-100 hover:bg-slate-800"
                  >
                    <UserPlus className="h-4 w-4 text-teal-400" />
                    <span>Undang & QR Code</span>
                  </button>

                  {isHost && (
                    <button
                      type="button"
                      onClick={() => toggleSideTab('controls')}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-medium text-slate-100 hover:bg-slate-800"
                    >
                      <SlidersHorizontal className="h-4 w-4 text-teal-400" />
                      <span>Papan Tulis & Kontrol Ruang</span>
                    </button>
                  )}

                  <div className="mt-1 border-t border-slate-800 pt-1">
                    <PWAInstallButton variant="menu-item" onActionTaken={() => setIsMobileMoreOpen(false)} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Leave / End Session */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => {
                if (isHost) {
                  setIsLeaveModalOpen(true);
                } else {
                  void handleLeaveSelf();
                }
              }}
              aria-label={isHost ? 'Keluar atau akhiri kelas' : 'Keluar dari kelas'}
              className="flex h-11 min-w-[44px] items-center justify-center gap-2 rounded-xl bg-red-600 px-2.5 text-xs font-semibold text-white transition-colors hover:bg-red-500 sm:px-3.5 whitespace-nowrap"
            >
              <PhoneOff className="h-4 w-4" />
              <span className="hidden sm:inline">{isHost ? 'Akhiri' : 'Keluar'}</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Invite & QR Code Modal */}
      <InviteModal
        isOpen={isInviteOpen}
        roomCode={meeting.roomMetadata.roomCode}
        roomTitle={meeting.roomMetadata.title}
        isHost={isHost}
        hostPin={session.hostPin}
        onClose={() => setIsInviteOpen(false)}
      />

      {/* Live Audio/Video Device Settings Modal */}
      <DeviceSettingsModal
        isOpen={isDeviceSettingsOpen}
        settings={meeting.deviceSettings}
        audioInputDevices={meeting.audioInputDevices}
        audioOutputDevices={meeting.audioOutputDevices}
        videoInputDevices={meeting.videoInputDevices}
        localMicStream={meeting.localMicStream}
        isMicOn={meeting.isLocalMicOn}
        onUpdateSettings={meeting.updateDeviceSettings}
        onRefreshDevices={meeting.refreshDevices}
        onClose={() => setIsDeviceSettingsOpen(false)}
      />

      {/* Host Leave / End For All Modal */}
      {isLeaveModalOpen && isHost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-modal-title"
          onClick={() => setIsLeaveModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-800 bg-[#131C2E] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="leave-modal-title" className="text-lg font-semibold text-white">
              Akhiri atau Keluar dari Kelas?
            </h2>
            <p className="mt-1.5 text-sm text-slate-400">
              Anda dapat mengunduh rekap absensi CSV terlebih dahulu sebelum menutup sesi untuk seluruh peserta.
            </p>

            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                onClick={() => downloadAttendanceCsv(meeting.roomMetadata.roomCode, meeting.attendance)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-teal-500/40 bg-teal-600/15 px-4 py-2.5 text-sm font-semibold text-teal-300 transition-colors hover:bg-teal-600/25"
              >
                <Download className="h-4 w-4" />
                <span>Unduh Absensi (CSV) Dulu</span>
              </button>

              <button
                type="button"
                onClick={() => void handleEndForAll()}
                className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500"
              >
                Akhiri Kelas untuk Semua
              </button>

              <button
                type="button"
                onClick={() => void handleLeaveSelf()}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700"
              >
                Keluar Sendiri (Ruang Tetap Aktif)
              </button>

              <button
                type="button"
                onClick={() => setIsLeaveModalOpen(false)}
                className="w-full py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
