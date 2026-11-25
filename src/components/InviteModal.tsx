import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Eye, EyeOff, KeyRound, Link2, QrCode, X } from 'lucide-react';
import { buildInviteLink } from '../utils/urlSafety';

interface InviteModalProps {
  isOpen: boolean;
  roomCode: string;
  roomTitle?: string;
  isHost: boolean;
  hostPin?: string;
  onClose: () => void;
}

export function InviteModal({
  isOpen,
  roomCode,
  roomTitle,
  isHost,
  hostPin,
  onClose,
}: InviteModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedField, setCopiedField] = useState<'link' | 'code' | 'pin' | null>(null);
  const [showPin, setShowPin] = useState(false);

  const inviteUrl = buildInviteLink(roomCode);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    QRCode.toDataURL(inviteUrl, {
      width: 240,
      margin: 2,
      color: {
        dark: '#0B1120',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [inviteUrl, isOpen]);

  if (!isOpen) return null;

  const copyText = async (value: string, field: 'link' | 'code' | 'pin') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback ignored
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#131C2E] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="invite-modal-title" className="text-lg font-semibold text-slate-100">
              Undang Peserta ke Kelas
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {roomTitle ? `${roomTitle} · ` : ''}Bagikan tautan, kode ruang, atau pindai QR Code dari HP.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal undangan"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 transition-colors hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-[180px_1fr] sm:items-center">
          {/* QR Code for mobile join */}
          <div className="flex flex-col items-center">
            <div className="flex h-44 w-44 items-center justify-center rounded-xl bg-white p-2.5">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code ruang ${roomCode}`}
                  className="h-full w-full object-contain"
                />
              ) : (
                <QrCode className="h-12 w-12 text-slate-400" />
              )}
            </div>
            <span className="mt-2 text-xs text-slate-400">Pindai dari kamera HP</span>
          </div>

          {/* Code & Invite URL */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-400">Kode Ruang</label>
              <div className="mt-1.5 flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-[#0B1120] px-3.5 py-2.5">
                <span className="font-mono text-base font-semibold tracking-wider text-teal-300 tabular-nums">
                  {roomCode}
                </span>
                <button
                  type="button"
                  onClick={() => copyText(roomCode, 'code')}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white whitespace-nowrap shrink-0"
                >
                  {copiedField === 'code' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-teal-400" />
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Salin Kode</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400">Tautan Langsung Peserta</label>
              <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-slate-800 bg-[#0B1120] px-3 py-2">
                <Link2 className="h-4 w-4 shrink-0 text-slate-500" />
                <span className="truncate font-mono text-xs text-slate-300">{inviteUrl}</span>
              </div>
              <button
                type="button"
                onClick={() => copyText(inviteUrl, 'link')}
                className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-500 whitespace-nowrap"
              >
                {copiedField === 'link' ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Link Kelas Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Salin Link Kelas</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Host Rejoin PIN Backup */}
        {isHost && hostPin && (
          <div className="mt-6 border-t border-slate-800 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-teal-400" />
                <span className="text-sm font-medium text-slate-200">PIN Pemateri (Rejoin Cadangan)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-slate-800 bg-[#0B1120] px-3 py-1 font-mono text-sm font-semibold tracking-widest text-teal-300 tabular-nums">
                  {showPin ? hostPin : '••••••'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowPin((v) => !v)}
                  aria-label={showPin ? 'Sembunyikan PIN Host' : 'Tampilkan PIN Host'}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
                >
                  {showPin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => copyText(hostPin, 'pin')}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900 px-2.5 text-xs font-medium text-slate-300 hover:text-white whitespace-nowrap"
                >
                  {copiedField === 'pin' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-teal-400" />
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Simpan PIN ini hanya untuk Anda. Jika koneksi terputus saat mengajar, masuk ulang ke kode{' '}
              <span className="font-mono text-slate-300">{roomCode}</span> lalu masukkan PIN ini untuk mengambil
              kembali kendali Pemateri.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
