import type { Component } from "./types";
const key = (p: Component["position"]) => p.map((v) => v.toFixed(6)).join(",");
/** Kiểm tra các điểm nối và chiều chảy của mạng; nguồn và cửa ra được ghi rõ trên đoạn ống. */
export function inspectNetwork(parts: Component[]): string[] {
  const errors: string[] = [];
  for (const network of ["cấp", "thoát"] as const) {
    const pipes = parts.filter((p) => p.network === network && p.end),
      outgoing = new Map<string, string[]>(),
      incoming = new Map<string, number>(),
      sources = new Set<string>(),
      sinks = new Set<string>();
    for (const p of pipes) {
      const a = key(p.position),
        b = key(p.end!);
      outgoing.set(a, [...(outgoing.get(a) ?? []), b]);
      if (!outgoing.has(b)) outgoing.set(b, []);
      incoming.set(b, (incoming.get(b) ?? 0) + 1);
      if (p.source) sources.add(a);
      if (p.sink) sinks.add(b);
      if (network === "thoát" && p.end![1] >= p.position[1] - 1e-9)
        errors.push(`Đoạn ${p.id} không dốc xuống theo chiều chảy.`);
    }
    for (const [node, edges] of outgoing) {
      if (!incoming.has(node) && !sources.has(node)) errors.push(`Đầu vào mạng ${network} chưa nối: ${node}.`);
      if (!edges.length && !sinks.has(node)) errors.push(`Đầu ra mạng ${network} chưa nối: ${node}.`);
    }
    const reachable = new Set<string>(),
      stack = [...sources];
    while (stack.length) {
      const node = stack.pop()!;
      if (reachable.has(node)) continue;
      reachable.add(node);
      stack.push(...(outgoing.get(node) ?? []));
    }
    for (const node of outgoing.keys())
      if (!reachable.has(node)) errors.push(`Nút mạng ${network} không nối tới nguồn: ${node}.`);
    const reverse = new Map<string, string[]>();
    for (const [a, ends] of outgoing) for (const b of ends) reverse.set(b, [...(reverse.get(b) ?? []), a]);
    const toSink = new Set<string>(),
      todo = [...sinks];
    while (todo.length) {
      const node = todo.pop()!;
      if (toSink.has(node)) continue;
      toSink.add(node);
      todo.push(...(reverse.get(node) ?? []));
    }
    for (const node of outgoing.keys())
      if (!toSink.has(node)) errors.push(`Nút mạng ${network} không nối tới cửa ra: ${node}.`);
  }
  // Đoạn ống đứng phía dưới cửa tràn là nhánh kín, không có dòng.
  const caps = new Set(parts.filter((c) => c.type === "Nút bịt").map((c) => key(c.position)));
  const gravityNodes = new Set(
    parts.filter((c) => c.network === "thoát" && c.end).flatMap((c) => [key(c.position), key(c.end!)]),
  );
  for (const p of parts.filter((p) => p.type === "Ống thẳng" && p.system === "tràn" && !p.network && p.end)) {
    const cap = caps.has(key(p.position));
    const connected = gravityNodes.has(key(p.end!));
    if (!cap || !connected) errors.push(`Đoạn ống kín ${p.id} thiếu nút bịt hoặc mối nối.`);
  }
  return errors;
}
