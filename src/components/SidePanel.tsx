import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Download,
  ExternalLink,
  Hand,
  Layers,
  Lock,
  MessageSquare,
  Mic,
  MicOff,
  Pin,
  PinOff,
  Send,
  SlidersHorizontal,
  Trash2,
  Unlock,
  UserPlus,
  Users,
  VolumeX,
  X,
} from 'lucide-react';
import type {
  AttendanceRecord,
  ChatMessage,
  ConnectionMode,
  ParticipantState,
  RoomMetadata,
  SidePanelTab,
} from '../types/meeting';
import {
  downloadAttendanceCsv,
  formatDurationHMS,
  formatShortClock,
  getLiveAttendanceSeconds,
} from '../utils/attendanceCsv';
import { normalizeHttpUrl, parseTextWithLinks } from '../utils/urlSafety';

interface SidePanelProps {
  activeTab: SidePanelTab;
  onSelectTab: (tab: SidePanelTab) => void;
  onClose: () => void;
  isHost: boolean;
  mode: ConnectionMode;
  roomMetadata: RoomMetadata;
  localIdentity: string;
  participants: ParticipantState[];
  chatMessages: ChatMessage[];
  attendance: AttendanceRecord[];
  onSendChat: (text: string) => Promise<void>;
  onLowerHand: (identity: string) => Promise<void>;
  onMuteParticipant: (identity: string) => Promise<void>;
  onMuteAll: () => Promise<void>;
  onToggleLock: () => Promise<void>;
  onSetSpotlight: (identity: string | null) => Promise<void>;
  onSetCompanionLink: (url: string | null, label?: string) => Promise<boolean>;
  onOpenInvite: () => void;
  onTriggerPreviewRaiseHand?: () => void;
}

export function SidePanel({
  activeTab,
  onSelectTab,
  onClose,
  isHost,
  mode,
  roomMetadata,
  localIdentity,
  participants,
  chatMessages,
  attendance,
  onSendChat,
  onLowerHand,
  onMuteParticipant,
  onMuteAll,
  onToggleLock,
  onSetSpotlight,
  onSetCompanionLink,
  onOpenInvite,
  onTriggerPreviewRaiseHand,
}: SidePanelProps) {
  const [chatInput, setChatInput] = useState('');
  const [companionUrlInput, setCompanionUrlInput] = useState(roomMetadata.companionLink?.url || '');
  const [companionLabelInput, setCompanionLabelInput] = useState(
    roomMetadata.companionLink?.label || 'Papan Tulis Live'
  );
  const [companionError, setCompanionError] = useState<string | null>(null);
  const [isSavingCompanion, setIsSavingCompanion] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCompanionUrlInput(roomMetadata.companionLink?.url || '');
    setCompanionLabelInput(roomMetadata.companionLink?.label || 'Papan Tulis Live');
  }, [roomMetadata.companionLink]);

  // Refresh attendance durations every 5 seconds while Participants tab is open
  useEffect(() => {
    if (activeTab !== 'participants') return;
    setNowTick(Date.now());
    const id = window.setInterval(() => setNowTick(Date.now()), 5000);
    return () => window.clearInterval(id);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, chatMessages.length]);

  const raisedHandQueue = useMemo(
    () =>
      participants
        .filter((p) => p.handRaisedAt !== null)
        .sort((a, b) => (a.handRaisedAt ?? 0) - (b.handRaisedAt ?? 0)),
    [participants]
  );

  const attendanceByIdentity = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendance.forEach((rec) => map.set(rec.identity, rec));
    return map;
  }, [attendance]);

  if (!activeTab) return null;

  const handleChatSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    setChatInput('');
    await onSendChat(trimmed);
  };

  const handleCompanionSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const normalized = normalizeHttpUrl(companionUrlInput);
    if (!normalized) {
      setCompanionError('Masukkan URL papan tulis yang valid (diawali https://).');
      return;
    }
    setCompanionError(null);
    setIsSavingCompanion(true);
    const ok = await onSetCompanionLink(normalized, companionLabelInput.trim() || 'Papan Tulis Live');
    setIsSavingCompanion(false);
    if (ok) {
      setCompanionUrlInput(normalized);
    }
  };

  const handleRemoveCompanion = async () => {
    setIsSavingCompanion(true);
    await onSetCompanionLink(null);
    setCompanionUrlInput('');
    setCompanionLabelInput('Papan Tulis Live');
    setCompanionError(null);
    setIsSavingCompanion(false);
  };

  const handleApplyDemoWhiteboard = async () => {
    const demoUrl = 'https://excalidraw.com';
    setCompanionUrlInput(demoUrl);
    setCompanionLabelInput('Papan Tulis Live (Excalidraw)');
    setCompanionError(null);
    setIsSavingCompanion(true);
    await onSetCompanionLink(demoUrl, 'Papan Tulis Live (Excalidraw)');
    setIsSavingCompanion(false);
  };

  return (
    <aside
      aria-label="Panel Samping Kelas"
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[360px] flex-col border-l border-slate-800 bg-[#11192B] pt-safe pb-safe pr-safe shadow-2xl lg:static lg:z-auto lg:w-[350px] lg:shrink-0 lg:pt-0 lg:pb-0 lg:pr-0 lg:shadow-none"
    >
      {/* Panel Tab Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2.5">
        <div className="flex items-center gap-1 rounded-lg bg-[#0B1120] p-1">
          <button
            type="button"
            onClick={() => onSelectTab('participants')}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'participants'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Peserta ({participants.length})</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('chat')}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'chat'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Chat</span>
          </button>

          {isHost && (
            <button
              type="button"
              onClick={() => onSelectTab('controls')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'controls'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Ruang</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup panel samping"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white lg:h-8 lg:w-8"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* TAB 1: PARTICIPANTS, RAISE-HAND QUEUE & ATTENDANCE */}
      {activeTab === 'participants' && (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Host Bulk Controls */}
          {isHost && (
            <div className="flex items-center gap-2 border-b border-slate-800/80 px-4 py-3">
              <button
                type="button"
                onClick={() => void onMuteAll()}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-800/70 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-red-500/50 hover:text-white whitespace-nowrap"
              >
                <VolumeX className="h-3.5 w-3.5 text-red-400" />
                <span>Mute Semua</span>
              </button>
              <button
                type="button"
                onClick={() => downloadAttendanceCsv(roomMetadata.roomCode, attendance)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-teal-600/20 border border-teal-500/40 px-3 py-2 text-xs font-semibold text-teal-300 transition-colors hover:bg-teal-600/30 whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Unduh CSV</span>
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
            {/* Raise-Hand Queue Section */}
            <section>
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                  <Hand className="h-3.5 w-3.5" />
                  <span>Antrean Angkat Tangan ({raisedHandQueue.length})</span>
                </h3>
                {mode === 'preview' && onTriggerPreviewRaiseHand && (
                  <button
                    type="button"
                    onClick={onTriggerPreviewRaiseHand}
                    className="text-[11px] font-medium text-teal-400 hover:text-teal-300 whitespace-nowrap"
                  >
                    + Uji Antrean
                  </button>
                )}
              </div>

              {raisedHandQueue.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500">
                  Belum ada peserta yang mengangkat tangan. Antrean otomatis urut berdasarkan siapa yang lebih dulu.
                </p>
              ) : (
                <ul className="mt-2.5 space-y-2">
                  {raisedHandQueue.map((p, idx) => (
                    <li
                      key={p.identity}
                      className="flex items-center justify-between gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-100">
                          <span className="font-mono font-semibold text-amber-300 tabular-nums">#{idx + 1}</span>
                          <span className="truncate">{p.name}</span>
                        </div>
                        <p className="mt-0.5 font-mono text-[11px] text-amber-200/75 tabular-nums">
                          Sejak {formatShortClock(p.handRaisedAt || Date.now())}
                        </p>
                      </div>
                      {(isHost || p.identity === localIdentity) && (
                        <button
                          type="button"
                          onClick={() => void onLowerHand(p.identity)}
                          className="rounded-md border border-amber-400/30 bg-slate-900/70 px-2.5 py-1 text-[11px] font-medium text-amber-200 transition-colors hover:bg-slate-900 whitespace-nowrap shrink-0"
                        >
                          Turunkan
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Active Participants List */}
            <section className="border-t border-slate-800/80 pt-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-300">Peserta di Ruang ({participants.length})</h3>
                <button
                  type="button"
                  onClick={onOpenInvite}
                  className="inline-flex items-center gap-1 text-xs font-medium text-teal-400 hover:text-teal-300 whitespace-nowrap"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Undang</span>
                </button>
              </div>

              <ul className="mt-3 divide-y divide-slate-800/70">
                {participants.map((p) => {
                  const rec = attendanceByIdentity.get(p.identity);
                  const liveSecs = rec ? getLiveAttendanceSeconds(rec, nowTick) : 0;
                  const isSpot = roomMetadata.spotlightIdentity === p.identity;

                  return (
                    <li key={p.identity} className="flex items-center justify-between gap-2 py-2.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-100">
                          <span className="truncate">
                            {p.name}
                            {p.isLocal ? ' (Anda)' : ''}
                          </span>
                          {p.role === 'host' && (
                            <span className="shrink-0 text-[11px] font-semibold text-teal-400">· Pemateri</span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400 tabular-nums">
                          <span>Hadir {formatDurationHMS(liveSecs)}</span>
                          {isSpot && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-teal-300">Spotlight</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isHost && (
                          <button
                            type="button"
                            onClick={() => void onSetSpotlight(isSpot ? null : p.identity)}
                            title={isSpot ? 'Lepas Spotlight' : 'Spotlight untuk semua'}
                            className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                              isSpot
                                ? 'bg-teal-600/25 text-teal-300'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                            }`}
                          >
                            {isSpot ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                          </button>
                        )}

                        {isHost && !p.isLocal && p.isMicOn ? (
                          <button
                            type="button"
                            onClick={() => void onMuteParticipant(p.identity)}
                            title={`Bisukan ${p.name}`}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-red-500/20 hover:text-red-300"
                          >
                            <Mic className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-md ${
                              p.isMicOn ? 'text-teal-400' : 'text-red-400/80'
                            }`}
                            aria-label={p.isMicOn ? 'Mic menyala' : 'Mic mati'}
                          >
                            {p.isMicOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* Attendance Summary Footer for Host */}
            {isHost && (
              <section className="rounded-xl border border-slate-800 bg-[#0B1120] p-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200">Rekap Absensi Otomatis</span>
                  <span className="font-mono text-teal-300 tabular-nums">{attendance.length} tercatat</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                  Mencatat jam masuk dan akumulasi durasi hadir setiap peserta secara otomatis.
                </p>
                <button
                  type="button"
                  onClick={() => downloadAttendanceCsv(roomMetadata.roomCode, attendance)}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-100 transition-colors hover:border-teal-500/60 whitespace-nowrap"
                >
                  <Download className="h-3.5 w-3.5 text-teal-400" />
                  <span>Unduh Absensi (CSV)</span>
                </button>
              </section>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: REAL-TIME CLASS CHAT WITH SAFE CLICKABLE LINKS */}
      {activeTab === 'chat' && (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {chatMessages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center px-4">
                <MessageSquare className="h-8 w-8 text-slate-600" />
                <p className="mt-2.5 text-sm font-medium text-slate-300">Belum ada pesan di ruang kelas</p>
                <p className="mt-1 text-xs text-slate-500">
                  Kirim pertanyaan atau bagikan tautan materi; URL otomatis dapat diklik langsung oleh peserta.
                </p>
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isMine = msg.senderIdentity === localIdentity;
                const segments = parseTextWithLinks(msg.text);

                return (
                  <div key={msg.id} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`truncate font-semibold ${isMine ? 'text-teal-300' : 'text-slate-200'}`}>
                          {msg.senderName}
                          {isMine ? ' (Anda)' : ''}
                        </span>
                        {msg.senderRole === 'host' && (
                          <span className="shrink-0 text-[11px] font-medium text-teal-400">· Pemateri</span>
                        )}
                      </div>
                      <span className="shrink-0 font-mono text-[11px] text-slate-500 tabular-nums">
                        {formatShortClock(msg.timestamp)}
                      </span>
                    </div>

                    <div
                      className={`rounded-xl border px-3.5 py-2.5 text-sm leading-relaxed break-words ${
                        isMine
                          ? 'border-teal-500/30 bg-teal-500/10 text-slate-100'
                          : 'border-slate-800 bg-[#0B1120] text-slate-200'
                      }`}
                    >
                      {segments.map((seg, i) =>
                        seg.type === 'link' && seg.href ? (
                          <a
                            key={i}
                            href={seg.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 font-medium text-teal-300 underline underline-offset-2 hover:text-teal-200 break-all"
                          >
                            <span>{seg.value}</span>
                            <ExternalLink className="inline h-3 w-3 shrink-0" />
                          </a>
                        ) : (
                          <span key={i}>{seg.value}</span>
                        )
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleChatSubmit} className="border-t border-slate-800 p-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                maxLength={1000}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Tulis pesan atau tempel tautan..."
                className="min-w-0 flex-1 rounded-lg border border-slate-700/80 bg-[#0B1120] px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                aria-label="Kirim pesan chat"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white transition-colors hover:bg-teal-500 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: HOST ROOM CONTROLS & COMPANION WHITEBOARD LINK */}
      {activeTab === 'controls' && isHost && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {/* Companion Whiteboard Link Integration */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-white">
                <Layers className="h-4 w-4 text-teal-400" />
                <span>Pendamping Papan Tulis</span>
              </h3>
              {mode === 'preview' && !roomMetadata.companionLink && (
                <button
                  type="button"
                  onClick={() => void handleApplyDemoWhiteboard()}
                  className="text-[11px] font-medium text-teal-400 hover:text-teal-300 whitespace-nowrap"
                >
                  Coba Link Contoh
                </button>
              )}
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              Tempel tautan Read-Only aplikasi papan tulis / flipchart atau materi ajar. Bar sematan{' '}
              <span className="text-slate-200">Buka Papan Tulis Live</span> langsung muncul di atas layar semua
              peserta.
            </p>

            <form onSubmit={handleCompanionSubmit} className="space-y-3">
              <div>
                <label htmlFor="companion-label" className="block text-xs font-medium text-slate-300">
                  Label Tombol
                </label>
                <input
                  id="companion-label"
                  type="text"
                  maxLength={80}
                  value={companionLabelInput}
                  onChange={(e) => setCompanionLabelInput(e.target.value)}
                  placeholder="Papan Tulis Live"
                  className="mt-1 w-full rounded-lg border border-slate-700/80 bg-[#0B1120] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="companion-url" className="block text-xs font-medium text-slate-300">
                  URL Papan Tulis / Materi (https://)
                </label>
                <input
                  id="companion-url"
                  type="url"
                  value={companionUrlInput}
                  onChange={(e) => {
                    setCompanionUrlInput(e.target.value);
                    if (companionError) setCompanionError(null);
                  }}
                  placeholder="https://papan-tulis-anda.vercel.app/view/123"
                  className="mt-1 w-full rounded-lg border border-slate-700/80 bg-[#0B1120] px-3 py-2 font-mono text-xs text-slate-100 placeholder:font-sans placeholder:text-slate-500 focus:border-teal-500 focus:outline-none"
                />
                {companionError && <p className="mt-1.5 text-xs text-red-400">{companionError}</p>}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSavingCompanion || !companionUrlInput.trim()}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-teal-500 disabled:opacity-50 whitespace-nowrap"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{roomMetadata.companionLink ? 'Perbarui Tautan' : 'Pasang di Layar Peserta'}</span>
                </button>
                {roomMetadata.companionLink && (
                  <button
                    type="button"
                    disabled={isSavingCompanion}
                    onClick={() => void handleRemoveCompanion()}
                    aria-label="Hapus link papan tulis"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 transition-colors hover:bg-red-500/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </form>
          </section>

          {/* Lock Room Control */}
          <section className="border-t border-slate-800 pt-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-white">
                  {roomMetadata.isLocked ? (
                    <Lock className="h-4 w-4 text-amber-400" />
                  ) : (
                    <Unlock className="h-4 w-4 text-teal-400" />
                  )}
                  <span>Kunci Ruang Kelas</span>
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  {roomMetadata.isLocked
                    ? 'Ruang sedang dikunci. Peserta baru tidak dapat masuk sampai Anda membukanya.'
                    : 'Ruang terbuka. Siapa pun dengan kode ruang dapat bergabung.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void onToggleLock()}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  roomMetadata.isLocked
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
                }`}
              >
                {roomMetadata.isLocked ? 'Buka Kunci' : 'Kunci Ruang'}
              </button>
            </div>
          </section>

          {/* Spotlight Control */}
          <section className="border-t border-slate-800 pt-5 space-y-3">
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-white">
                <Pin className="h-4 w-4 text-teal-400" />
                <span>Spotlight Pembicara</span>
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Kunci fokus kamera pemateri di semua layar peserta selama penjelasan berlangsung.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  void onSetSpotlight(roomMetadata.spotlightIdentity === localIdentity ? null : localIdentity)
                }
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                  roomMetadata.spotlightIdentity === localIdentity
                    ? 'bg-teal-600 text-white hover:bg-teal-500'
                    : 'border border-slate-700 bg-slate-800/80 text-slate-200 hover:border-teal-500/60'
                }`}
              >
                {roomMetadata.spotlightIdentity === localIdentity ? (
                  <>
                    <PinOff className="h-3.5 w-3.5" />
                    <span>Lepas Spotlight Saya</span>
                  </>
                ) : (
                  <>
                    <Pin className="h-3.5 w-3.5" />
                    <span>Spotlight Saya</span>
                  </>
                )}
              </button>
              {roomMetadata.spotlightIdentity && roomMetadata.spotlightIdentity !== localIdentity && (
                <button
                  type="button"
                  onClick={() => void onSetSpotlight(null)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white whitespace-nowrap"
                >
                  Reset
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </aside>
  );
}
