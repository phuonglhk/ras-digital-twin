/** Định dạng số thống nhất cho giao diện và cảnh báo. */
export const fmt = (v: number | null | undefined, digits = 2) =>
  v == null || !Number.isFinite(v)
    ? "—"
    : v.toLocaleString("vi-VN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
