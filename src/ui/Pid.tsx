import { useRef } from "react";
import { levelOf, UNIT_LABEL, UNIT_ORDER, type Point, type UnitId } from "../model/process";
import { speciesById } from "../model/species";
import type { SceneUnit, SceneView } from "../twin/scene";
import { fmt } from "./format";

function Symbol({ id }: { id: SceneUnit }) {
  if (id === "rdf")
    return (
      <>
        <circle r="28" />
        <path d="M-20 -20 L20 20 M-20 20 L20 -20 M-27 0 H27 M0 -27 V27" />
      </>
    );
  if (id === "pump")
    return (
      <>
        <circle r="28" />
        <path d="M-13 -18 L19 0 L-13 18 Z" />
      </>
    );
  if (id === "oxygen") return <path d="M0 -33 L30 25 H-30 Z M-18 8 H18" />;
  if (id === "degasser" || id === "skimmer" || id === "denit")
    return (
      <>
        <rect x="-22" y="-36" width="44" height="72" rx="5" />
        <path d="M-20 -17 L20 7 M-20 7 L20 -17 M-20 7 L20 30 M-20 30 L20 7" />
      </>
    );
  if (id === "uv")
    return (
      <>
        <rect x="-35" y="-14" width="70" height="28" rx="14" />
        <path d="M-15 -22 l-5 -9 M0 -23 v-10 M15 -22 l5 -9 M-15 22 l-5 9 M0 23 v10 M15 22 l5 9" />
      </>
    );
  return (
    <>
      <rect x="-34" y="-30" width="68" height="60" />
      <path d="M-33 -8 Q-20 -14 -8 -8 T17 -8 T33 -8" />
    </>
  );
}

const tag: Record<UnitId, { code: string; label: string; metric: keyof Point; unit: string }> = {
  culture: { code: "AT-203", label: "TAN", metric: "tan", unit: "mg/L" },
  rdf: { code: "AT-101", label: "TSS", metric: "tss", unit: "mg/L" },
  skimmer: { code: "AT-102", label: "TSS", metric: "tss", unit: "mg/L" },
  biofilter: { code: "AT-204", label: "NO₂⁻", metric: "no2", unit: "mg/L" },
  degasser: { code: "AT-201", label: "pH", metric: "ph", unit: "" },
  pump: { code: "FT-101", label: "Lưu lượng", metric: "do", unit: "m³/h" },
  oxygen: { code: "AT-202", label: "DO", metric: "do", unit: "mg/L" },
  uv: { code: "AT-205", label: "CO₂", metric: "co2", unit: "mg/L" },
};

export default function Pid({ view, onPick }: { view: SceneView; onPick: (unit: SceneUnit) => void }) {
  const svg = useRef<SVGSVGElement>(null);
  const { params, selected } = view;
  const points = view.points as Record<UnitId, Point>;
  const active = (id: UnitId) => (id === "culture" ? true : id === "pump" ? params.pumpOn : params[id].on);
  const width = UNIT_ORDER.length * 170 + 40;
  const download = () => {
    if (!svg.current) return;
    const copy = svg.current.cloneNode(true) as SVGSVGElement;
    copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent =
      ".pipe{fill:none;stroke:#368ca0;stroke-width:4}.branch{fill:none;stroke:#368ca0;stroke-width:2}.gas{fill:none;stroke:#8599a3;stroke-width:2;stroke-dasharray:2 5}.symbol{fill:#e8f5f5;stroke:#23505c;stroke-width:3}.off{opacity:.4;stroke-dasharray:6 4}.selected .symbol{stroke:#e49a22;stroke-width:5}.tag{fill:white;stroke:#315b67}.ok{fill:#177447}.warn{fill:#9a6500}.bad{fill:#b22d30} text{font-family:sans-serif;font-size:13px;fill:#183c48}.value{font-weight:bold}";
    copy.prepend(style);
    const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(copy)], { type: "image/svg+xml;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "so-do-pid.svg";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="pid-wrap">
      <div className="pid-toolbar">
        <span>Sơ đồ dòng nước · nét chấm: khí · nét mảnh: nhánh</span>
        <button type="button" onClick={download}>
          Tải SVG
        </button>
      </div>
      <div className="pid-scroll">
        <svg ref={svg} viewBox={`0 0 ${width} 460`} role="img" aria-label="Sơ đồ P&ID hệ thống tuần hoàn">
          <defs>
            <marker id="pid-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0 0 L10 5 L0 10 Z" fill="#368ca0" />
            </marker>
          </defs>
          {UNIT_ORDER.slice(0, -1).map((id, i) => (
            <g key={id}>
              <path className="pipe" d={`M${i * 170 + 125} 125 H${(i + 1) * 170 + 55}`} markerEnd="url(#pid-arrow)" />
              {params.pumpOn && <path className="pid-flow" d={`M${i * 170 + 125} 125 H${(i + 1) * 170 + 55}`} />}
            </g>
          ))}
          <path
            className="pipe"
            d={`M${(UNIT_ORDER.length - 1) * 170 + 125} 125 H${width - 10} V430 H25 V125 H55`}
            markerEnd="url(#pid-arrow)"
          />
          {params.pumpOn && (
            <path
              className="pid-flow"
              d={`M${(UNIT_ORDER.length - 1) * 170 + 125} 125 H${width - 10} V430 H25 V125 H55`}
            />
          )}
          <path className="branch" d="M90 155 V340 H600 V155" markerEnd="url(#pid-arrow)" />
          <path className="branch" d="M260 125 V205 H430 V125" markerEnd="url(#pid-arrow)" />
          <path className="gas" d="M600 48 V88 M770 48 V88 M1110 48 V88" />
          <text x="600" y="35" textAnchor="middle">
            Không khí
          </text>
          <text x="770" y="35" textAnchor="middle">
            Không khí
          </text>
          <text x="1110" y="35" textAnchor="middle">
            O₂
          </text>
          <path className="symbol" d="M315 195 l10 10 -10 10 Z M335 195 l-10 10 10 10 Z" />
          {UNIT_ORDER.map((id, i) => {
            const x = i * 170 + 90,
              t = tag[id],
              value = id === "pump" ? (params.pumpOn ? params.flow : 0) : (points[id][t.metric] as number);
            const level = id === "pump" ? "ok" : (levelOf(t.metric, value, speciesById(params.speciesId)) ?? "ok");
            return (
              <g
                key={id}
                className={`${active(id) ? "" : "off"} ${selected === id ? "selected" : ""}`}
                transform={`translate(${x} 125)`}
                role="button"
                tabIndex={0}
                aria-label={`Chọn ${UNIT_LABEL[id]}`}
                onClick={() => onPick(id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onPick(id);
                  }
                }}
              >
                <g className="symbol">
                  <Symbol id={id} />
                </g>
                <text y="-48" textAnchor="middle">
                  {UNIT_LABEL[id]}
                </text>
                <circle className="tag" cy="63" r="28" />
                <text y="67" textAnchor="middle">
                  {t.code}
                </text>
                <text className={`value ${level}`} y="108" textAnchor="middle">
                  {t.label} {fmt(value, 2)} {t.unit}
                </text>
              </g>
            );
          })}
          <g
            transform="translate(345 340)"
            className={`${params.denit.on ? "" : "off"} ${selected === "denit" ? "selected" : ""}`}
            role="button"
            tabIndex={0}
            aria-label="Chọn Khử nitrat"
            onClick={() => onPick("denit")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onPick("denit");
            }}
          >
            <g className="symbol">
              <Symbol id="denit" />
            </g>
            <text x="38" y="-10">
              Khử nitrat
            </text>
            <circle className="tag" cx="55" cy="16" r="25" />
            <text x="55" y="20" textAnchor="middle">
              AT-206
            </text>
            <text
              className={`value ${levelOf("no3", points.culture.no3, speciesById(params.speciesId)) ?? "ok"}`}
              x="85"
              y="20"
            >
              NO₃⁻ {fmt(points.culture.no3, 2)} mg/L
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
