/** Hien thi so theo kieu VN: dau thap phan la dau phay. */
export function formatViHealthNumber(value) {
  if (value == null || value === '') return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return '—';
  if (Number.isInteger(n)) return String(n);
  const rounded = Math.round(n * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/** Form nhap -> so (chap nhan ca , va . lam thap phan). */
export function parseHealthNumberInput(s) {
  const t = (s ?? '').toString().trim().replace(/\s/g, '').replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  if (Number.isNaN(n)) return null;
  return n;
}

/** So trong DB -> chuoi trong o nhap (thap phan bang dau phay). */
export function healthNumberToInputString(value) {
  if (value == null || value === '') return '';
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return '';
  if (Number.isInteger(n)) return String(n);
  return n.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
