import { useState } from 'react';
import { Check, Copy, ExternalLink, Server, X } from 'lucide-react';

interface SetupGuideModalProps {
  isOpen: boolean;
  livekitConfigured: boolean;
  livekitHost: string | null;
  onClose: () => void;
}

const ENV_TEMPLATE = `LIVEKIT_URL=wss://nama-proyek-anda.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`;

export function SetupGuideModal({
  isOpen,
  livekitConfigured,
  livekitHost,
  onClose,
}: SetupGuideModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ENV_TEMPLATE);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-guide-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-slate-800 bg-[#131C2E] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="setup-guide-title" className="text-lg font-semibold text-slate-100">
              Panduan Deploy Vercel & LiveKit Cloud
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {livekitConfigured
                ? `Terhubung aktif ke server LiveKit (${livekitHost || 'configured'}).`
                : 'Saat ini berjalan dalam Mode Simulasi Interaktif. Pasang 3 variabel di bawah agar 10–50+ peserta terhubung real-time.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panduan deploy"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 transition-colors hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ol className="mt-6 space-y-4 text-sm text-slate-300">
          <li className="flex gap-3">
            <span className="font-mono text-xs font-semibold text-teal-400">01.</span>
            <div>
              <p className="font-medium text-slate-100">Buat Proyek Gratis di LiveKit Cloud</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                Daftar di{' '}
                <a
                  href="https://cloud.livekit.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-teal-400 underline underline-offset-2 hover:text-teal-300"
                >
                  cloud.livekit.io
                  <ExternalLink className="h-3 w-3" />
                </a>
                , buat proyek baru, lalu buka menu Settings → Keys untuk menyalin URL WebSocket, API Key, dan API
                Secret.
              </p>
            </div>
          </li>

          <li className="flex gap-3">
            <span className="font-mono text-xs font-semibold text-teal-400">02.</span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-100">Push ke GitHub & Import di Vercel</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                Proyek ini sudah menyertakan <span className="font-mono text-slate-200">vercel.json</span> dan rute
                Node Serverless <span className="font-mono text-slate-200">/api/*</span>. Pada pengaturan proyek
                Vercel, tambahkan Environment Variables berikut:
              </p>
              <div className="mt-2.5 overflow-hidden rounded-lg border border-slate-800 bg-[#0B1120]">
                <div className="flex items-center justify-between border-b border-slate-800/80 px-3 py-1.5">
                  <span className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Server className="h-3.5 w-3.5 text-teal-400" />
                    Environment Variables (Server-side)
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 text-xs font-medium text-teal-400 hover:text-teal-300 whitespace-nowrap"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Tersalin' : 'Salin Template'}</span>
                  </button>
                </div>
                <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-slate-300">
                  {ENV_TEMPLATE}
                </pre>
              </div>
            </div>
          </li>

          <li className="flex gap-3">
            <span className="font-mono text-xs font-semibold text-teal-400">03.</span>
            <div>
              <p className="font-medium text-slate-100">Deploy Tanpa Database Tambahan</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                Status kunci ruang, PIN Pemateri terenkripsi, Spotlight, dan Link Papan Tulis tersimpan langsung di
                LiveKit Room Metadata sehingga 100% kompatibel dengan fungsi serverless Vercel yang stateless.
              </p>
            </div>
          </li>
        </ol>

        <div className="mt-6 flex justify-end border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-700 whitespace-nowrap"
          >
            Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}
