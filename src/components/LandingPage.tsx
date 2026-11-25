import { FormEvent, useState } from 'react';
import {
  ArrowRight,
  Clock,
  FileSpreadsheet,
  Hand,
  Info,
  Layers,
  MonitorUp,
  Plus,
  ShieldCheck,
  Video,
} from 'lucide-react';
import type { HealthStatus } from '../types/meeting';
import { extractRoomCodeFromInput } from '../utils/urlSafety';
import { PWAInstallButton } from './PWAInstallButton';

interface LandingPageProps {
  health: HealthStatus;
  isCreatingRoom: boolean;
  onCreateRoom: (roomTitle: string) => Promise<void>;
  onJoinRoom: (roomCode: string) => void;
  onOpenSetupGuide: () => void;
}

export function LandingPage({
  health,
  isCreatingRoom,
  onCreateRoom,
  onJoinRoom,
  onOpenSetupGuide,
}: LandingPageProps) {
  const [roomTitle, setRoomTitle] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onCreateRoom(roomTitle.trim());
  };

  const handleJoinSubmit = (e: FormEvent) => {
    e.preventDefault();
    const extracted = extractRoomCodeFromInput(joinInput);
    if (!extracted) {
      setJoinError('Masukkan kode ruang yang valid (contoh: MEET-7K2P) atau tempel tautan kelas.');
      return;
    }
    setJoinError(null);
    onJoinRoom(extracted);
  };

  return (
    <div className="min-h-dvh bg-[#0B1120] text-slate-100">
      {/* Top Bar Contract: Single-line Wordmark — Concise Nav Links — 1 Primary Action */}
      <header className="pt-safe border-b border-slate-800/80 bg-[#0B1120]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:gap-8 sm:px-6 sm:py-4">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white">
              <Video className="h-4 w-4" />
            </span>
            <span>ObeeMeet</span>
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
            <a href="#alur-kelas" className="transition-colors hover:text-slate-100 whitespace-nowrap shrink-0">
              Alur Kelas
            </a>
            <a href="#fitur-pelatihan" className="transition-colors hover:text-slate-100 whitespace-nowrap shrink-0">
              Fitur Pelatihan
            </a>
            <button
              type="button"
              onClick={onOpenSetupGuide}
              className="transition-colors hover:text-slate-100 whitespace-nowrap shrink-0"
            >
              Panduan Deploy
            </button>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              disabled={isCreatingRoom}
              onClick={() => onCreateRoom(roomTitle.trim())}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-500 disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {isCreatingRoom ? 'Menyiapkan...' : 'Buat Kelas Baru'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
        {/* Informative Mode Preview Banner when LiveKit env vars are not yet set */}
        {!health.livekitConfigured && (
          <div className="mb-10 flex flex-col justify-between gap-3 rounded-xl border border-slate-800 bg-[#131C2E] px-5 py-3.5 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3 sm:items-center">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-400 sm:mt-0" />
              <p className="text-sm text-slate-300">
                <span className="font-medium text-slate-100">Mode Uji Preview Aktif</span> — Variabel{' '}
                <span className="font-mono text-xs text-teal-300">LIVEKIT_*</span> belum diisi, sehingga ruang berjalan
                dengan simulasi peserta interaktif dan kamera lokal Anda.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenSetupGuide}
              className="self-start text-sm font-medium text-teal-400 underline underline-offset-4 transition-colors hover:text-teal-300 sm:self-auto whitespace-nowrap shrink-0"
            >
              Lihat Cara Setup
            </button>
          </div>
        )}

        {/* Two-Column Hero: Value Proposition + Dual Action Panel */}
        <section id="alur-kelas" className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="flex flex-col justify-center lg:col-span-7">
            <p className="text-sm font-medium text-teal-400">obeecreatives · Ruang Belajar Daring</p>
            <h1 className="mt-3 max-w-2xl text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[42px] lg:leading-[1.14]">
              Video meeting pelatihan online tanpa batas durasi sesi.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300">
              Dirancang untuk sesi mengajar 2 hingga 4 jam nonstop tanpa wajib daftar akun. Berdampingan nyaman dengan
              papan tulis digital, antrean angkat tangan terurut, dan rekap absensi otomatis ke CSV.
            </p>

            {/* Unboxed Metadata Line */}
            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-400">
              <span>Tanpa batas waktu sesi</span>
              <span aria-hidden="true">·</span>
              <span>Arsitektur LiveKit 10–50+ peserta</span>
              <span aria-hidden="true">·</span>
              <span>Kompatibel Laptop, Android & iOS</span>
            </div>

            {/* In-App PWA Install Action (Laptop, PC, Android, iPhone/iPad) */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <PWAInstallButton />
            </div>

            {/* Clean horizontal key facts */}
            <div className="mt-10 grid grid-cols-1 gap-6 border-t border-slate-800/80 pt-8 sm:grid-cols-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                  <Clock className="h-4 w-4 text-teal-400" />
                  <span>2–4+ Jam Nonstop</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                  Timer mengajar berjalan mulus tanpa memutus kelas di tengah materi.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                  <Layers className="h-4 w-4 text-teal-400" />
                  <span>Pendamping Papan Tulis</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                  Sematkan tautan flipchart agar peserta membukanya dalam satu klik.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                  <ShieldCheck className="h-4 w-4 text-teal-400" />
                  <span>PIN Rejoin Pemateri</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                  Kendali Host terlindungi token server dan PIN cadangan tanpa login.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Single-Elevation Action Panel */}
          <div className="lg:col-span-5">
            <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-800 bg-[#131C2E] p-6 sm:p-7">
              {/* Action 1: Create Room as Host */}
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Mulai Kelas sebagai Pemateri</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Dapatkan kode ruang <span className="font-mono text-xs text-teal-300">MEET-XXXX</span> dan PIN
                    Pemateri secara instan.
                  </p>
                </div>

                <div>
                  <label htmlFor="room-title-input" className="block text-xs font-medium text-slate-300">
                    Judul Sesi Pelatihan <span className="text-slate-500">(opsional)</span>
                  </label>
                  <input
                    id="room-title-input"
                    type="text"
                    maxLength={80}
                    value={roomTitle}
                    onChange={(e) => setRoomTitle(e.target.value)}
                    placeholder="Mis. Workshop Desain Sistem — Sesi 1"
                    className="mt-1.5 w-full rounded-lg border border-slate-700/80 bg-[#0B1120] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreatingRoom}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-500 disabled:opacity-60 whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" />
                  <span>{isCreatingRoom ? 'Membuat Ruang Kelas...' : 'Buat Kelas Baru (Host)'}</span>
                </button>
              </form>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-800" />
                <span className="text-xs text-slate-500">atau gabung kelas yang berjalan</span>
                <div className="h-px flex-1 bg-slate-800" />
              </div>

              {/* Action 2: Join Room */}
              <form onSubmit={handleJoinSubmit} className="space-y-3">
                <div>
                  <label htmlFor="join-code-input" className="block text-xs font-medium text-slate-300">
                    Kode Ruang atau Tautan Undangan
                  </label>
                  <div className="mt-1.5 flex gap-2">
                    <input
                      id="join-code-input"
                      type="text"
                      value={joinInput}
                      onChange={(e) => {
                        setJoinInput(e.target.value);
                        if (joinError) setJoinError(null);
                      }}
                      placeholder="MEET-7K2P atau tempel URL"
                      className="min-w-0 flex-1 rounded-lg border border-slate-700/80 bg-[#0B1120] px-3.5 py-2.5 font-mono text-sm text-slate-100 placeholder:font-sans placeholder:text-slate-500 focus:border-teal-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/90 px-4 py-2.5 text-sm font-semibold text-slate-100 transition-colors hover:border-teal-500/60 hover:bg-slate-800 whitespace-nowrap shrink-0"
                    >
                      <span>Gabung</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                  {joinError && <p className="mt-2 text-xs text-red-400">{joinError}</p>}
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* Feature Overview Section */}
        <section id="fitur-pelatihan" className="mt-20 border-t border-slate-800/80 pt-14">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Dirancang khusus untuk ritme kelas pelatihan langsung
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Setiap kontrol disusun agar pemateri tetap fokus menyampaikan materi dan peserta nyaman menyimak dari
              laptop maupun ponsel.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="space-y-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-[#131C2E] text-teal-400">
                <MonitorUp className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-100">01. Fokus Materi & Papan Tulis</h3>
              <p className="text-sm leading-relaxed text-slate-400">
                Otomatis beralih ke Presentation Layout 80% saat Share Screen aktif dengan preset ketajaman teks, plus
                bar sematan <span className="text-slate-200">Buka Papan Tulis Live</span> untuk panel samping atau tab
                baru.
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-[#131C2E] text-teal-400">
                <Hand className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-100">02. Antrean Tanya & Kendali Host</h3>
              <p className="text-sm leading-relaxed text-slate-400">
                Antrean Angkat Tangan terurut kronologis siapa yang lebih dulu bertanya. Pemateri bisa Mute Semua,
                Spotlight pembicara, Kunci Ruang, atau Akhiri Sesi untuk semua.
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-[#131C2E] text-teal-400">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-100">03. Rekap Absensi Otomatis CSV</h3>
              <p className="text-sm leading-relaxed text-slate-400">
                Mencatat nama peserta, jam masuk, status hadir, dan durasi kehadiran secara otomatis. Unduh berkas CSV
                siap buka di Excel begitu sesi pelatihan selesai.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="pb-safe mt-12 border-t border-slate-800/70 py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-xs text-slate-500 sm:flex-row sm:px-6">
          <span>ObeeMeet · by obeecreatives</span>
          <span>Ruang video meeting pelatihan online berbasis LiveKit</span>
        </div>
      </footer>
    </div>
  );
}
