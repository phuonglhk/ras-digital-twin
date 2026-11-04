/** Chuyển đường dẫn trình duyệt thành đường dẫn của ứng dụng. */
export function stripBase(pathname: string, base: string): string {
  const prefix = `/${base.split("/").filter(Boolean).join("/")}`;
  if (prefix === "/") return pathname || "/";
  if (pathname === prefix || pathname === `${prefix}/`) return "/";
  return pathname.startsWith(`${prefix}/`) ? pathname.slice(prefix.length) : pathname;
}

/** Giữ nguyên chuỗi truy vấn và đoạn neo khi tạo liên kết nội bộ. */
export function prefixBase(path: string, base: string): string {
  const prefix = `/${base.split("/").filter(Boolean).join("/")}`;
  const route = path.startsWith("/") ? path : `/${path}`;
  return prefix === "/" ? route : `${prefix}${route}`;
}
