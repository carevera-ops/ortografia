import qrcode from 'qrcode-generator';

/** Código QR en SVG (generado en el propio dispositivo, sin servicios externos). */
export function QrCode({ text, size = 280, label }: { text: string; size?: number; label: string }) {
  const qr = qrcode(0, 'M');
  qr.addData(text, 'Byte');
  qr.make();
  const n = qr.getModuleCount();
  const quiet = 4;
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + quiet},${r + quiet}h1v1h-1z`;
  const total = n + quiet * 2;
  return (
    <svg className="qr" viewBox={`0 0 ${total} ${total}`} width={size} height={size} role="img" aria-label={label} shapeRendering="crispEdges">
      {/* Siempre negro sobre blanco (también en modo oscuro) para que la cámara lo lea bien */}
      <rect width={total} height={total} fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  );
}
