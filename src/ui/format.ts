export function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(+d)) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** datetime-local 输入框需要的本地时间格式 */
export function toInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(+d)) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
