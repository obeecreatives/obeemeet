import { useState } from 'react';
import { ExternalLink, Layers, RefreshCw, X } from 'lucide-react';
import type { CompanionLink } from '../types/meeting';
import { isSafeHttpUrl } from '../utils/urlSafety';

interface CompanionDrawerProps {
  link: CompanionLink;
  onClose: () => void;
}

export function CompanionDrawer({ link, onClose }: CompanionDrawerProps) {
  const [reloadNonce, setReloadNonce] = useState(0);

  if (!isSafeHttpUrl(link.url)) return null;

  let hostname = link.url;
  try {
    hostname = new URL(link.url).hostname;
  } catch {
    // Fallback to raw url
  }

  return (
    <aside
      aria-label="Panel Papan Tulis Pendamping"
      className="flex h-full w-full flex-col border-l border-slate-800 bg-[#0F172A] lg:w-[44%] lg:min-w-[380px] lg:max-w-[680px]"
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 bg-[#131C2E] px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Layers className="h-4 w-4 shrink-0 text-teal-400" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-100">{link.label}</p>
            <p className="truncate font-mono text-[11px] text-slate-400">{hostname}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setReloadNonce((n) => n + 1)}
            title="Muat ulang papan tulis"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/70 text-slate-300 transition-colors hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 text-xs font-medium text-teal-300 transition-colors hover:border-teal-500/60 hover:text-teal-200 whitespace-nowrap"
          >
            <span>Tab Baru</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel papan tulis"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/70 text-slate-400 transition-colors hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative flex-1 bg-white">
        <iframe
          key={`${link.url}-${reloadNonce}`}
          src={link.url}
          title={link.label}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          referrerPolicy="no-referrer"
          className="h-full w-full border-0"
        />
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-slate-800 bg-[#131C2E] px-4 py-2 text-[11px] text-slate-400">
        <span>Jika situs papan tulis menolak tampilan sematan, buka langsung di tab baru.</span>
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-teal-400 hover:text-teal-300 whitespace-nowrap shrink-0"
        >
          Buka Tab Baru
        </a>
      </div>
    </aside>
  );
}
