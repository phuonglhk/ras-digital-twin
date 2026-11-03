/* Bảng thông số vận hành, nhóm theo mục như trang iRAS (đối tượng nuôi, nước, tuần hoàn, thiết bị). */
import type { ReactNode } from "react";

import { defaultParams, type Params } from "../model/process";
import { SPECIES, speciesById } from "../model/species";

interface Props {
  params: Params;
  onChange: (p: Params) => void;
}

function Num({ id, label, value, unit, min, max, step, onChange, hint }: {
  id: string; label: string; value: number; unit?: string; min: number; max: number; step: number; onChange: (v: number) => void; hint?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>
        <span>{label}</span>
        <span className="field-value">
          <input
            id={id + "-n"}
            type="number"
            value={Number.isInteger(step) ? value : Number(value.toFixed(3))}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
            }}
            aria-label={label}
          />
          {unit && <em>{unit}</em>}
        </span>
      </label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <small>{hint}</small>}
    </div>
  );
}

function Toggle({ id, label, on, onChange }: { id: string; label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle" htmlFor={id}>
      <input id={id} type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden />
      <span>{label}</span>
    </label>
  );
}

function Section({ title, children, open = true }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="section" open={open}>
      <summary>{title}</summary>
      <div className="section-body">{children}</div>
    </details>
  );
}

export default function ParamsPanel({ params: p, onChange }: Props) {
  const set = (patch: Partial<Params>) => onChange({ ...p, ...patch });
  const sub = <K extends keyof Params>(key: K, patch: Partial<Params[K]>) => onChange({ ...p, [key]: { ...(p[key] as object), ...patch } });
  const species = speciesById(p.speciesId);

  return (
    <aside className="params" aria-label="Thông số vận hành">
      <Section title="① Đối tượng nuôi">
        <div className="species">
          {SPECIES.map((s) => (
            <button key={s.id} type="button" className={s.id === p.speciesId ? "on" : ""} onClick={() => onChange(defaultParams(s.id))}>
              <b>{s.name}</b>
              <i>{s.latin}</i>
              <small>{s.temp} °C · {s.salinity}‰ · NH₃ ≤ {s.limits.nh3} µg/L</small>
            </button>
          ))}
        </div>
        <p className="note">{species.note}</p>
      </Section>

      <Section title="② Quy mô & cho ăn">
        <Num id="units" label={`Số ${species.unitLabel}`} value={p.units} min={1} max={species.culture === "boxes" ? 480 : 12} step={1} onChange={(v) => set({ units: v })} />
        {species.culture === "tanks" && <Num id="per" label="Con mỗi bể" value={p.perUnit} min={10} max={20000} step={10} onChange={(v) => set({ perUnit: v })} />}
        <Num id="w" label="Khối lượng TB" value={p.avgWeight} unit="g" min={1} max={2000} step={1} onChange={(v) => set({ avgWeight: v })} />
        <Num id="uv" label={`Nước mỗi ${species.unitLabel}`} value={p.unitVolume} unit="m³" min={0.004} max={40} step={species.culture === "boxes" ? 0.001 : 0.5} onChange={(v) => set({ unitVolume: v })} />
        <Num id="pv" label="Nước thiết bị & hộc chứa" value={p.processVolume} unit="m³" min={0.5} max={80} step={0.1} onChange={(v) => set({ processVolume: v })} />
        <Num id="fr" label="Lượng cho ăn" value={p.feedRate} unit="%/ngày" min={0} max={8} step={0.1} onChange={(v) => set({ feedRate: v })} />
        <Num id="pc" label="Đạm thức ăn" value={p.protein * 100} unit="%" min={20} max={60} step={1} onChange={(v) => set({ protein: v / 100 })} />
        <Toggle id="meal" label="Cho ăn theo bữa (07:00, 17:00)" on={p.mealPulses} onChange={(v) => set({ mealPulses: v })} />
      </Section>

      <Section title="③ Nước">
        <Num id="t" label="Nhiệt độ" value={p.temp} unit="°C" min={10} max={34} step={0.5} onChange={(v) => set({ temp: v })} />
        <Num id="s" label="Độ mặn" value={p.salinity} unit="‰" min={0} max={35} step={1} onChange={(v) => set({ salinity: v })} />
        <Num id="ex" label="Thay nước" value={p.exchange} unit="%/ngày" min={0} max={50} step={1} onChange={(v) => set({ exchange: v })} hint="Theo tổng thể tích hệ, như iRAS v1.1" />
        <Num id="ma" label="Kiềm nước cấp" value={p.makeupAlk} unit="mg/L" min={20} max={300} step={5} onChange={(v) => set({ makeupAlk: v })} />
        {p.salinity === 0 && <Num id="ca" label="Độ cứng canxi" value={p.calciumHardness} unit="mg/L" min={0} max={500} step={5} onChange={(v) => set({ calciumHardness: v })} />}
        <Toggle id="alk" label="Châm NaHCO₃ tự động" on={p.alkDosing.on} onChange={(v) => sub("alkDosing", { on: v })} />
        {p.alkDosing.on && <Num id="alkt" label="Kiềm mục tiêu" value={p.alkDosing.target} unit="mg/L" min={60} max={250} step={5} onChange={(v) => sub("alkDosing", { target: v })} />}
      </Section>

      <Section title="④ Tuần hoàn">
        <Toggle id="pump" label="Bơm tuần hoàn" on={p.pumpOn} onChange={(v) => set({ pumpOn: v })} />
        <Num id="q" label="Lưu lượng" value={p.flow} unit="m³/h" min={0.5} max={300} step={0.5} onChange={(v) => set({ flow: v })} />
      </Section>

      <Section title="⑤ Thiết bị xử lý">
        <Toggle id="rdf" label="Lọc trống RDF" on={p.rdf.on} onChange={(v) => sub("rdf", { on: v })} />
        {p.rdf.on && <Num id="rdfe" label="Hiệu suất TSS" value={p.rdf.efficiency * 100} unit="%" min={30} max={95} step={1} onChange={(v) => sub("rdf", { efficiency: v / 100 })} />}
        <Toggle id="sk" label="Tách đạm" on={p.skimmer.on} onChange={(v) => sub("skimmer", { on: v })} />
        {p.skimmer.on && <Num id="skb" label="Nhánh qua tách đạm" value={p.skimmer.bypass * 100} unit="%" min={5} max={100} step={5} onChange={(v) => sub("skimmer", { bypass: v / 100 })} />}
        <Toggle id="bf" label="Bể vi sinh MBBR" on={p.biofilter.on} onChange={(v) => sub("biofilter", { on: v })} />
        {p.biofilter.on && (
          <>
            <Num id="bfm" label="Thể tích giá thể" value={p.biofilter.media} unit="m³" min={0.02} max={20} step={0.01} onChange={(v) => sub("biofilter", { media: v })} />
            <Num id="bfs" label="Diện tích riêng giá thể" value={p.biofilter.ssa} unit="m²/m³" min={200} max={1200} step={50} onChange={(v) => sub("biofilter", { ssa: v })} hint="K1 500 · K3 350 · K5 800" />
            <Num id="bfk" label="Hệ số nitrat hoá k" value={p.biofilter.k} unit="g/m²·d" min={0.3} max={1.2} step={0.01} onChange={(v) => sub("biofilter", { k: v })} hint="r = k·S^0.7·1.09^(T−10)·(1−0.01·S), mặc định 0.58 như iRAS" />
            <Num id="bfmat" label="Độ chín vi sinh" value={p.biofilter.maturity * 100} unit="%" min={5} max={100} step={1} onChange={(v) => sub("biofilter", { maturity: v / 100 })} />
          </>
        )}
        <Toggle id="dg" label="Tháp khử CO₂" on={p.degasser.on} onChange={(v) => sub("degasser", { on: v })} />
        {p.degasser.on && (
          <>
            <Num id="dgg" label="Tỉ lệ khí : nước" value={p.degasser.gl} min={1} max={15} step={0.5} onChange={(v) => sub("degasser", { gl: v, efficiency: Math.min(0.9, 0.2 + 0.09 * v) })} />
            <Num id="dge" label="Hiệu suất khử CO₂" value={p.degasser.efficiency * 100} unit="%" min={10} max={90} step={1} onChange={(v) => sub("degasser", { efficiency: v / 100 })} />
          </>
        )}
        <Toggle id="uvt" label="Đèn UV" on={p.uv.on} onChange={(v) => sub("uv", { on: v })} />
        {p.uv.on && <Num id="uvd" label="Liều UV" value={p.uv.dose} unit="mJ/cm²" min={10} max={200} step={5} onChange={(v) => sub("uv", { dose: v })} />}
        <Toggle id="o2" label="Côn ôxy" on={p.oxygen.on} onChange={(v) => sub("oxygen", { on: v })} />
        {p.oxygen.on && <Num id="o2t" label="DO đầu ra" value={p.oxygen.target * 100} unit="% bão hoà" min={80} max={200} step={5} onChange={(v) => sub("oxygen", { target: v / 100 })} />}
        <Toggle id="dn" label="Nhánh khử nitrat" on={p.denit.on} onChange={(v) => sub("denit", { on: v })} />
        {p.denit.on && <Num id="dnq" label="Lưu lượng nhánh" value={p.denit.flow} unit="m³/h" min={0.01} max={20} step={0.01} onChange={(v) => sub("denit", { flow: v })} />}
      </Section>
    </aside>
  );
}
