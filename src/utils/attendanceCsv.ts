import type { AttendanceRecord } from '../types/meeting';

export function formatDurationHMS(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':');
}

export function formatTimeWIB(timestamp: number): string {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(timestamp));
}

export function formatShortClock(timestamp: number): string {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(timestamp));
}

export function getLiveAttendanceSeconds(record: AttendanceRecord, nowMs: number): number {
  if (!record.isOnline) return record.accumulatedSeconds;
  const elapsedSinceJoin = Math.max(0, Math.floor((nowMs - record.lastJoinedAt) / 1000));
  return record.accumulatedSeconds + elapsedSinceJoin;
}

function escapeCsvCell(value: string): string {
  // Prevent CSV formula injection in Excel / Google Sheets
  const neutralized = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(neutralized)) {
    return `"${neutralized.replace(/"/g, '""')}"`;
  }
  return neutralized;
}

export function downloadAttendanceCsv(roomCode: string, records: AttendanceRecord[]): void {
  const now = Date.now();
  const dateLabel = new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date(now))
    .replace(/\//g, '-');

  const headers = [
    'No',
    'Nama Peserta',
    'Peran',
    'Jam Masuk',
    'Jam Keluar Terakhir',
    'Status Saat Ini',
    'Durasi Hadir (JJ:MM:DD)',
    'Total Menit',
  ];

  const sorted = [...records].sort((a, b) => a.firstJoinedAt - b.firstJoinedAt);

  const rows = sorted.map((record, index) => {
    const totalSeconds = getLiveAttendanceSeconds(record, now);
    const totalMinutes = (totalSeconds / 60).toFixed(1);
    return [
      String(index + 1),
      record.name,
      record.role === 'host' ? 'Pemateri (Host)' : 'Peserta',
      formatTimeWIB(record.firstJoinedAt),
      record.lastLeftAt ? formatTimeWIB(record.lastLeftAt) : '-',
      record.isOnline ? 'Hadir' : 'Keluar',
      formatDurationHMS(totalSeconds),
      totalMinutes,
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  // Prefix UTF-8 BOM so Indonesian characters open cleanly in Microsoft Excel
  const csvContent = `\uFEFF${headers.join(',')}\n${rows.join('\n')}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const blobUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `Absensi-${roomCode}-${dateLabel}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}
