export const fmtSize = (b: number) =>
  b >= 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(1)} GB`
    : b >= 1024 ** 2 ? `${(b / 1024 ** 2).toFixed(1)} MB`
    : `${Math.max(1, Math.round(b / 1024))} KB`;

export const pad = (n: number) => String(n).padStart(2, '0');
