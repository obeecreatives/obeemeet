import { useState } from 'react';
import { Download, Laptop, PlusSquare, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'default' | 'compact' | 'menu-item';
  onActionTaken?: () => void;
}

export function PWAInstallButton({ variant = 'default', onActionTaken }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, platform, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
      onActionTaken?.();
      return;
    }
    setShowGuideModal(true);
  };

  const label = isIOS ? 'Install di iPhone / iPad' : 'Install Aplikasi';

  return (
    <>
      {variant === 'menu-item' ? (
        <button
          type="button"
          onClick={() => void handleClick()}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-medium text-teal-300 hover:bg-slate-800"
        >
          <Download className="h-4 w-4 text-teal-400" />
          <span>{label}</span>
        </button>
      ) : variant === 'compact' ? (
        <button
          type="button"
          onClick={() => void handleClick()}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-teal-500/40 bg-teal-600/15 px-3 text-xs font-semibold text-teal-200 transition-colors hover:bg-teal-600/25 whitespace-nowrap shrink-0"
        >
          <Download className="h-3.5 w-3.5 text-teal-400" />
          <span>Install App</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void handleClick()}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-teal-500/40 bg-teal-600/15 px-4 py-2.5 text-sm font-semibold text-teal-200 transition-colors hover:border-teal-400/70 hover:bg-teal-600/25 whitespace-nowrap shrink-0"
        >
          <Download className="h-4 w-4 text-teal-400" />
          <span>{label}</span>
        </button>
      )}

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-guide-title"
          onClick={() => setShowGuideModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#131C2E] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="pwa-install-guide-title" className="text-lg font-semibold text-white">
                  Install ObeeMeet di Perangkat Anda
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  Jalankan ObeeMeet seperti aplikasi mandiri (layar penuh tanpa bilah browser) di Laptop, PC, Android,
                  maupun iPhone/iPad.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                aria-label="Tutup panduan install"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {isIOS ? (
                <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-teal-200">
                    <Smartphone className="h-4 w-4 text-teal-400" />
                    <span>Cara Install di iPhone & iPad (Safari)</span>
                  </div>
                  <ol className="space-y-2.5 text-xs leading-relaxed text-slate-200">
                    <li className="flex items-start gap-2.5">
                      <span className="font-mono font-semibold text-teal-300">1.</span>
                      <span>
                        Pastikan membuka ObeeMeet di browser <strong>Safari</strong>, lalu ketuk ikon{' '}
                        <strong className="inline-flex items-center gap-1 text-teal-200">
                          <Share className="inline h-3.5 w-3.5" /> Bagikan (Share)
                        </strong>{' '}
                        di bilah bawah (iPhone) atau kanan atas (iPad).
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="font-mono font-semibold text-teal-300">2.</span>
                      <span>
                        Geser ke bawah dan pilih{' '}
                        <strong className="inline-flex items-center gap-1 text-teal-200">
                          <PlusSquare className="inline h-3.5 w-3.5" /> Tambahkan ke Layar Utama (Add to Home Screen)
                        </strong>
                        .
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="font-mono font-semibold text-teal-300">3.</span>
                      <span>
                        Ketuk <strong>Tambah (Add)</strong> di pojok kanan atas. Ikon ObeeMeet siap dibuka langsung dari
                        Layar Utama.
                      </span>
                    </li>
                  </ol>
                </div>
              ) : platform === 'macos-safari' ? (
                <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-teal-200">
                    <Laptop className="h-4 w-4 text-teal-400" />
                    <span>Cara Install di Mac (Safari)</span>
                  </div>
                  <ol className="space-y-2 text-xs leading-relaxed text-slate-200">
                    <li>1. Klik menu <strong>File</strong> di bilah atas layar Mac (atau ikon Bagikan di Safari).</li>
                    <li>2. Pilih <strong>Add to Dock...</strong> lalu klik <strong>Add</strong>.</li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-800 bg-[#0B1120] p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                      <Laptop className="h-4 w-4 text-teal-400" />
                      <span>Laptop / PC (Chrome & Edge)</span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-300">
                      Klik ikon <strong>Install ObeeMeet</strong> di sisi kanan kolom alamat browser (atau buka menu{' '}
                      <strong>⋮ → Simpan dan bagikan → Install halaman sebagai aplikasi</strong>).
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-[#0B1120] p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                      <Smartphone className="h-4 w-4 text-teal-400" />
                      <span>HP & Tablet (Android / iOS)</span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-300">
                      Di <strong>Android (Chrome)</strong>: ketuk menu <strong>⋮ → Tambahkan ke layar utama / Install aplikasi</strong>.
                      Di <strong>iPhone/iPad (Safari)</strong>: ketuk <strong>Bagikan (Share) → Tambahkan ke Layar Utama</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowGuideModal(false);
                  onActionTaken?.();
                }}
                className="min-h-[44px] rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-500"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
