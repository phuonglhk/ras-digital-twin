import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  buildChain,
  defaultParams,
  levelOf,
  report,
  UNIT_LABEL,
  warnings as computeWarnings,
  type Level,
  type Params,
  type Point,
  type UnitId,
  type Water,
} from "./model/process";
import { clockLabel, Simulation, type Sample } from "./model/simulation";
import type { SceneUnit, SceneView } from "./twin/scene";
import ChainStrip from "./ui/ChainStrip";
import { fmt, worst } from "./ui/format";
import LineChart from "./ui/LineChart";
import ParamsPanel from "./ui/ParamsPanel";
import TwinView from "./ui/TwinView";
import UnitDetail from "./ui/UnitDetail";
import Pid from "./ui/Pid";
import SelfTest from "./ui/SelfTest";

const SPEEDS = [
  { v: 0, label: "Dừng" },
  { v: 60, label: "1 phút/s" },
  { v: 600, label: "10 phút/s" },
  { v: 3600, label: "1 giờ/s" },
];

interface Snapshot {
  water: Water;
  t: number;
  history: Sample[];
}

type TrendTab = "ammonia" | "nh3" | "gas" | "ph";

export default function App() {
  const [params, setParams] = useState<Params>(() => {
    const p = defaultParams();
    const query = new URLSearchParams(location.search);
    const boxes = Number(query.get("hop"));
    const flow = Number(query.get("luu-luong"));
    if (Number.isInteger(boxes) && boxes > 0 && boxes <= 10000) {
      p.units = boxes;
      p.perUnit = 1;
    }
    if (Number.isFinite(flow) && flow > 0 && flow <= 10000) p.flow = flow;
    return p;
  });
  const simRef = useRef<Simulation | null>(null);
  if (!simRef.current) simRef.current = new Simulation(params);
  const sim = simRef.current;
  const [snap, setSnap] = useState<Snapshot>(() => ({ water: sim.state, t: sim.t, history: [...sim.history] }));
  const [speed, setSpeed] = useState(600);
  const [selected, setSelected] = useState<SceneUnit>(() => {
    const chosen = new URLSearchParams(location.search).get("chon");
    return (
      ["culture", "rdf", "skimmer", "biofilter", "degasser", "pump", "uv", "oxygen", "denit"] as string[]
    ).includes(chosen ?? "")
      ? (chosen as SceneUnit)
      : "biofilter";
  });
  const [trend, setTrend] = useState<TrendTab>("ammonia");
  const [viewMode, setViewMode] = useState<"3d" | "pid">("3d");
  const [event, setEvent] = useState<{ label: string; until: number; restore: Partial<Params> } | null>(null);

  const changeParams = useCallback(
    (next: Params) => {
      setParams(next);
      sim.setParams(next);
      setSnap({ water: sim.state, t: sim.t, history: [...sim.history] });
    },
    [sim],
  );

  // Vòng lặp mô phỏng: tiến thời gian theo tốc độ đã chọn, đẩy ảnh chụp lên giao diện 4 lần/giây.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastPush = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      if (speed > 0) sim.advance((dt * speed) / 86400);
      if (now - lastPush > 250) {
        lastPush = now;
        setSnap({ water: sim.state, t: sim.t, history: [...sim.history] });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sim, speed]);

  // Kết thúc kịch bản sự cố khi hết thời gian mô phỏng.
  useEffect(() => {
    if (event && snap.t >= event.until) {
      changeParams({ ...sim.params, ...event.restore });
      setEvent(null);
    }
  }, [snap.t, event, sim, changeParams]);

  const chain = useMemo(() => buildChain(snap.water, params), [snap.water, params]);
  const rep = useMemo(() => report(snap.water, params), [snap.water, params]);
  const species = rep.loads.species;
  const warns = useMemo(() => computeWarnings(chain, params, rep), [chain, params, rep]);
  const points = useMemo(() => Object.fromEntries(chain.map((c) => [c.id, c.point])) as Record<UnitId, Point>, [chain]);
  const tank = points.culture;

  const sceneView: SceneView = useMemo(() => {
    const L = (k: keyof Point, id: UnitId): Level => levelOf(k, points[id][k] as number, species) ?? "ok";
    const levels: Partial<Record<SceneUnit, Level>> = {
      culture: worst([
        L("tan", "culture"),
        L("nh3", "culture"),
        L("no2", "culture"),
        L("do", "culture"),
        L("co2", "culture"),
        params.salinity > 0 ? L("omega", "culture") : null,
      ]),
      rdf: L("tss", "rdf"),
      skimmer: L("tss", "skimmer"),
      biofilter: worst([L("tan", "biofilter"), L("no2", "biofilter")]),
      degasser: worst([L("co2", "degasser"), L("ph", "degasser")]),
      pump: "ok",
      uv: "ok",
      oxygen: L("do", "oxygen"),
      denit: L("no3", "culture"),
    };
    const labels: Partial<Record<SceneUnit, string>> = {
      culture: `TAN ${fmt(tank.tan, 2)} · NH₃ ${fmt(tank.nh3, 0)}µg`,
      rdf: `TSS ${fmt(points.rdf.tss, 1)}`,
      skimmer: `TSS ${fmt(points.skimmer.tss, 1)}`,
      biofilter: `TAN ${fmt(points.biofilter.tan, 2)} · η ${fmt(rep.biofilter.etaTan * 100, 0)}%`,
      degasser: `CO₂ ${fmt(points.degasser.co2, 1)} · pH ${fmt(points.degasser.ph, 2)}`,
      pump: `${fmt(params.flow, 1)} m³/h`,
      uv: `${params.uv.dose} mJ/cm²`,
      oxygen: `DO ${fmt(points.oxygen.do, 1)} mg/L`,
      denit: `NO₃⁻ ${fmt(tank.no3, 0)}`,
    };
    return { points, levels, labels, params, selected };
  }, [points, species, params, rep, selected, tank]);

  const scenario = (label: string, hours: number, apply: Partial<Params>) => {
    const restore = Object.fromEntries(
      Object.keys(apply).map((k) => [k, params[k as keyof Params]]),
    ) as Partial<Params>;
    changeParams({ ...params, ...apply });
    setEvent({ label, until: sim.t + hours / 24, restore });
    if (speed === 0) setSpeed(600);
  };

  const along = chain.map((c) => UNIT_LABEL[c.id]);
  const hist = snap.history;
  const hx = hist.map((h) => h.t);
  const timeFmt = (v: string | number) => {
    const m = Math.floor((Number(v) % 1) * 1440);
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  };
  const trendSeries = {
    ammonia: [
      {
        key: "tan",
        label: "TAN",
        color: "var(--c-tan)",
        values: hist.map((h) => h.tan),
        unit: "mg/L",
        limit: species.limits.tan,
      },
      { key: "no2", label: "NO₂⁻", color: "var(--c-no2)", values: hist.map((h) => h.no2), unit: "mg/L" },
    ],
    nh3: [
      {
        key: "nh3",
        label: "NH₃ tự do",
        color: "var(--c-nh3)",
        values: hist.map((h) => h.nh3),
        unit: "µg/L",
        limit: species.limits.nh3,
      },
    ],
    gas: [
      {
        key: "do",
        label: "DO",
        color: "var(--c-do)",
        values: hist.map((h) => h.do),
        unit: "mg/L",
        limit: species.limits.doMin,
      },
      { key: "co2", label: "CO₂", color: "var(--c-co2)", values: hist.map((h) => h.co2), unit: "mg/L" },
    ],
    ph: [
      { key: "ph", label: "pH", color: "var(--c-ph)", values: hist.map((h) => h.ph) },
      { key: "omega", label: "Ω canxit", color: "var(--c-omega)", values: hist.map((h) => h.omega), limit: 1 },
    ],
  }[trend];

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            RAS
          </span>
          <div>
            <h1>RAS Digital Twin</h1>
            <p>{species.name} · mô hình công nghệ theo iRAS</p>
          </div>
        </div>
        <dl className="kpis">
          <div>
            <dt>Sinh khối</dt>
            <dd>{fmt(rep.loads.biomass, 0)} kg</dd>
          </div>
          <div>
            <dt>Thức ăn</dt>
            <dd>{fmt(rep.loads.feed, 2)} kg/ngày</dd>
          </div>
          <div>
            <dt>Tổng nước</dt>
            <dd>{fmt(rep.loads.totalVolume, 1)} m³</dd>
          </div>
          <div>
            <dt>Tuần hoàn</dt>
            <dd>{fmt(params.pumpOn ? params.flow : 0, 1)} m³/h</dd>
          </div>
          <div>
            <dt>Một vòng</dt>
            <dd>{fmt(rep.pump.turnover, 0)} phút</dd>
          </div>
          <div>
            <dt>NaHCO₃</dt>
            <dd>{fmt(rep.alk.nahco3, 2)} kg/ngày</dd>
          </div>
          <div>
            <dt>Ôxy</dt>
            <dd>{fmt(rep.oxygen.pureO2, 2)} kg/ngày</dd>
          </div>
        </dl>
        <div className="clock">
          <b>{clockLabel(snap.t)}</b>
          <div className="speeds" role="group" aria-label="Tốc độ mô phỏng">
            {SPEEDS.map((s) => (
              <button key={s.v} type="button" className={speed === s.v ? "on" : ""} onClick={() => setSpeed(s.v)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <ParamsPanel params={params} onChange={changeParams} />

      <main className="center">
        {new URLSearchParams(location.search).get("selftest") === "1" && <SelfTest />}
        <section className="stage">
          <div className="tabs view-toggle" role="group" aria-label="Chế độ xem">
            <button
              type="button"
              className={viewMode === "3d" ? "on" : ""}
              aria-pressed={viewMode === "3d"}
              onClick={() => setViewMode("3d")}
            >
              Mô hình 3D
            </button>
            <button
              type="button"
              className={viewMode === "pid" ? "on" : ""}
              aria-pressed={viewMode === "pid"}
              onClick={() => setViewMode("pid")}
            >
              Sơ đồ P&amp;ID
            </button>
          </div>
          {viewMode === "pid" ? (
            <Pid view={sceneView} onPick={setSelected} />
          ) : (
            <TwinView view={sceneView} onPick={setSelected} />
          )}
          <div className="scenarios">
            <span>Kịch bản</span>
            <button
              type="button"
              disabled={!!event}
              onClick={() => scenario("Mất điện bơm 2 giờ", 2, { pumpOn: false })}
            >
              Mất điện bơm 2 giờ
            </button>
            <button
              type="button"
              disabled={!!event}
              onClick={() => scenario("Tắt tháp khử CO₂ 6 giờ", 6, { degasser: { ...params.degasser, on: false } })}
            >
              Tắt khử CO₂ 6 giờ
            </button>
            <button
              type="button"
              disabled={!!event}
              onClick={() => scenario("Cho ăn gấp đôi 1 ngày", 24, { feedRate: params.feedRate * 2 })}
            >
              Cho ăn gấp đôi 1 ngày
            </button>
            <button
              type="button"
              onClick={() => changeParams({ ...params, biofilter: { ...params.biofilter, maturity: 0.3 } })}
            >
              Bể vi sinh mới (chín 30%)
            </button>
            <button
              type="button"
              onClick={() => {
                sim.reset();
                setEvent(null);
                setSnap({ water: sim.state, t: sim.t, history: [...sim.history] });
              }}
            >
              Về trạng thái ổn định
            </button>
            {event && (
              <em className="event">
                Đang chạy: {event.label} · còn {fmt(Math.max(0, (event.until - snap.t) * 24), 1)} giờ
              </em>
            )}
          </div>
        </section>

        {warns.length > 0 && (
          <ul className="warnings">
            {warns.map((w) => (
              <li key={w.text} className={w.level}>
                {w.text}
              </li>
            ))}
          </ul>
        )}

        <section className="panel">
          <div className="panel-head">
            <h2>Chất lượng nước dọc tuyến</h2>
            <p>Giá trị ở đầu ra từng thiết bị, đơn vị N. Đỏ: vượt ngưỡng {species.name}. Vàng: quá nửa ngưỡng.</p>
          </div>
          <ChainStrip chain={chain} species={species} selected={selected} onSelect={setSelected} />
          <div className="charts">
            <div>
              <h3>Chất ô nhiễm dọc tuyến</h3>
              <LineChart
                ariaLabel="TAN, NO₂⁻ và TSS theo từng thiết bị"
                x={along}
                yDigits={3}
                series={[
                  {
                    key: "tan",
                    label: "TAN",
                    color: "var(--c-tan)",
                    values: chain.map((c) => c.point.tan),
                    unit: "mg/L",
                  },
                  {
                    key: "no2",
                    label: "NO₂⁻",
                    color: "var(--c-no2)",
                    values: chain.map((c) => c.point.no2),
                    unit: "mg/L",
                  },
                  {
                    key: "tss",
                    label: "TSS ÷10",
                    color: "var(--c-tss)",
                    values: chain.map((c) => c.point.tss / 10),
                    unit: "×10 mg/L",
                  },
                ]}
              />
            </div>
            <div>
              <h3>Khí hoà tan dọc tuyến</h3>
              <LineChart
                ariaLabel="DO và CO₂ theo từng thiết bị"
                x={along}
                yDigits={2}
                series={[
                  { key: "do", label: "DO", color: "var(--c-do)", values: chain.map((c) => c.point.do), unit: "mg/L" },
                  {
                    key: "co2",
                    label: "CO₂",
                    color: "var(--c-co2)",
                    values: chain.map((c) => c.point.co2),
                    unit: "mg/L",
                  },
                ]}
              />
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Diễn biến bể nuôi 48 giờ</h2>
            <div className="tabs" role="tablist">
              {(
                [
                  ["ammonia", "TAN · NO₂⁻"],
                  ["nh3", "NH₃ tự do"],
                  ["gas", "DO · CO₂"],
                  ["ph", "pH · Ω"],
                ] as [TrendTab, string][]
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={trend === k}
                  className={trend === k ? "on" : ""}
                  onClick={() => setTrend(k)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <LineChart
            ariaLabel="Diễn biến chất lượng nước bể nuôi theo thời gian"
            x={hx}
            series={trendSeries}
            xFormat={timeFmt}
            yDigits={trend === "nh3" ? 1 : 2}
            height={220}
          />
        </section>
      </main>

      <aside className="side">
        <UnitDetail unit={selected} params={params} report={rep} points={points} tank={tank} />
        <section className="detail ref">
          <h3>Nguồn mô hình</h3>
          <ul>
            <li>Thứ tự công nghệ, chuỗi dọc tuyến và ba mức cảnh báo theo iras.cn.</li>
            <li>NH₃ tự do: Emerson 1975, hiệu chỉnh mặn Khoo 1977.</li>
            <li>Tải từ thức ăn: Timmons & Ebeling 2010.</li>
            <li>Nitrat hoá theo diện tích: Rusten 2006, θ = 1.09.</li>
            <li>DO bão hoà: Benson & Krause 1984.</li>
          </ul>
          <p>Mô hình minh hoạ cho vận hành và đào tạo, không thay cho thiết kế kỹ thuật.</p>
        </section>
      </aside>
    </div>
  );
}
