/*
 * Mô phỏng động: tích phân cân bằng chất theo thời gian mô phỏng.
 * Dùng để thấy hệ phản ứng khi dừng bơm, tắt thiết bị, đổi lượng cho ăn…
 * Bước tích phân 30 s mô phỏng, đủ ổn định với thời gian lưu nước tính bằng chục phút.
 */

import { describe, loads, steadyState, step, type Params, type Water } from "./process";

export interface Sample {
  t: number; // ngày mô phỏng
  tan: number;
  nh3: number;
  no2: number;
  no3: number;
  do: number;
  co2: number;
  ph: number;
  omega: number;
}

const STEP_DAYS = 30 / 86400;
const HISTORY_DAYS = 2;
const SAMPLE_EVERY_DAYS = 5 / 1440;

export class Simulation {
  params: Params;
  state: Water;
  t = 0.25; // bắt đầu 06:00
  history: Sample[] = [];
  private lastSample = -Infinity;

  constructor(params: Params) {
    this.params = params;
    this.state = steadyState(params);
    this.record(true);
  }

  get hour() {
    return (this.t % 1) * 24;
  }

  /** Đổi thông số vận hành mà giữ nguyên nước hiện tại (hệ sẽ chuyển dần sang trạng thái mới). */
  setParams(next: Params) {
    const speciesChanged = next.speciesId !== this.params.speciesId;
    this.params = next;
    if (speciesChanged) this.reset();
  }

  /** Đưa về trạng thái ổn định của thông số hiện tại. */
  reset() {
    this.state = steadyState(this.params);
    this.history = [];
    this.lastSample = -Infinity;
    this.record(true);
  }

  /** Tiến thời gian mô phỏng thêm `days` ngày. */
  advance(days: number) {
    const L = loads(this.params);
    let left = Math.min(days, 2);
    while (left > 1e-12) {
      const dt = Math.min(STEP_DAYS, left);
      this.state = step(this.state, this.params, L, dt, this.hour);
      this.t += dt;
      left -= dt;
      this.record();
    }
  }

  private record(force = false) {
    if (!force && this.t - this.lastSample < SAMPLE_EVERY_DAYS) return;
    this.lastSample = this.t;
    const p = describe(this.state, this.params);
    this.history.push({
      t: this.t,
      tan: p.tan,
      nh3: p.nh3,
      no2: p.no2,
      no3: p.no3,
      do: p.do,
      co2: p.co2,
      ph: p.ph,
      omega: p.omega,
    });
    const cutoff = this.t - HISTORY_DAYS;
    while (this.history.length && this.history[0].t < cutoff) this.history.shift();
  }
}

export function clockLabel(t: number) {
  const day = Math.floor(t) + 1;
  const minutes = Math.floor((t % 1) * 1440);
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `Ngày ${day} · ${hh}:${mm}`;
}
