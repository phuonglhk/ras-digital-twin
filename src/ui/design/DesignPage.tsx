import { useEffect, useMemo, useRef, useState } from "react";
import { amountOf, bom, csv, displayQuantity, priceOf, type Currency, type Prices } from "../../design/bom";
import { decompose } from "../../design/decompose";
import { hydraulics, dns, velocity, halfPipeVelocity } from "../../design/hydraulics";
import { inspectNetwork } from "../../design/network";
import { DesignScene, type Layer } from "../../design/scene";
import { boxPresets, defaultDesign, type RackDesign } from "../../design/types";
import "./design.css";
const layers: Layer[] = ["hộp", "khung", "cấp", "tràn", "xả cặn", "ống đứng", "nước"];
function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function DesignPage() {
  const [d, setD] = useState<RackDesign>(defaultDesign),
    [visible, setVisible] = useState(new Set(layers)),
    [exploded, setExploded] = useState(false),
    [one, setOne] = useState(false),
    [doorOpen, setDoorOpen] = useState(false),
    [flushing, setFlushing] = useState(false),
    [currency, setCurrency] = useState<Currency>("USD"),
    [exchange, setExchange] = useState(25000),
    [prices, setPrices] = useState<Prices>({}),
    [selected, setSelected] = useState<string[]>([]);
  const components = useMemo(() => decompose(d), [d]),
    rows = useMemo(() => bom(components), [components]),
    h = useMemo(() => hydraulics(d), [d]),
    networkErrors = useMemo(() => inspectNetwork(components), [components]);
  const host = useRef<HTMLDivElement>(null),
    scene = useRef<DesignScene | null>(null),
    picked = useRef<(id: string) => void>(() => {});
  picked.current = (id) => setSelected([id]);
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-label", "Mô hình 3D kệ hộp cua, kéo để xoay và bấm để chọn");
    host.current!.appendChild(canvas);
    const s = new DesignScene(canvas);
    s.onPick = (id) => picked.current(id);
    scene.current = s;
    return () => {
      s.dispose();
      canvas.remove();
      scene.current = null;
    };
  }, []);
  useEffect(() => {
    scene.current?.update(d, components, visible, exploded, one, selected);
  }, [d, components, visible, exploded, one, selected]);
  useEffect(() => {
    scene.current?.overview();
  }, [one]);
  const number = (key: keyof RackDesign, label: string, min: number, max: number, step: number) => (
    <label>
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={d[key] as number}
        onChange={(e) => {
          const value = e.target.valueAsNumber;
          if (Number.isFinite(value))
            setD((old) => ({
              ...old,
              [key]: Math.min(max, Math.max(min, ["cols", "tiers", "racks"].includes(key) ? Math.round(value) : value)),
            }));
        }}
      />
    </label>
  );
  const toggle = (key: "supplyValve" | "sludgeValve" | "tierValve", label: string) => (
    <label className="design-check">
      <input type="checkbox" checked={d[key]} onChange={(e) => setD({ ...d, [key]: e.target.checked })} />
      {label}
    </label>
  );
  const chosen = components.find((c) => selected.length === 1 && c.id === selected[0]);
  return (
    <main className="site-content design-page">
      <h1>Thiết kế mô hình kệ hộp cua</h1>
      <p>Thay đổi cấu hình để cập nhật đồng thời mô hình, vật tư và phép tính sơ bộ.</p>
      <div className="design-grid">
        <section className="site-panel design-config">
          <h2>Cấu hình</h2>
          <h3>Hộp nuôi</h3>
          <label>
            Mẫu hộp
            <select
              value={d.boxPreset}
              onChange={(e) => {
                const boxPreset = e.target.value as RackDesign["boxPreset"];
                const p = boxPresets[boxPreset];
                setD({ ...d, boxPreset, length: p.length, width: p.width, height: p.height, boxWeight: p.boxWeight });
              }}
            >
              {Object.entries(boxPresets).map(([id, p]) => (
                <option key={id} value={id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <p>Vật liệu: {boxPresets[d.boxPreset].material}. Kích thước có thể điều chỉnh.</p>
          {number("length", "Chiều dài hộp (m)", 0.2, 1, 0.01)}
          {number("width", "Chiều rộng hộp (m)", 0.2, 1, 0.01)}
          {number("height", "Chiều cao hộp (m)", 0.1, 0.5, 0.01)}
          {number("floorSlope", "Độ dốc đáy (m/m)", 0, 0.2, 0.01)}
          {number("overflowHeight", "Chiều cao ống tràn (m)", 0.02, 0.15, 0.01)}
          <label>
            Khối lượng hộp (kg)
            <input
              type="number"
              min="0.1"
              max="10"
              step="0.1"
              value={d.boxWeight ?? ""}
              onChange={(e) =>
                setD({
                  ...d,
                  boxWeight: e.target.value === "" ? null : Math.min(10, Math.max(0.1, e.target.valueAsNumber || 0.1)),
                })
              }
            />
          </label>
          <h3>Kệ và bố trí</h3>
          {number("cols", "Hộp mỗi tầng", 1, 25, 1)}
          {number("tiers", "Số tầng", 1, 8, 1)}
          {number("racks", "Số kệ", 1, 10, 1)}
          <label>
            Bố trí
            <select value={d.layout} onChange={(e) => setD({ ...d, layout: e.target.value as RackDesign["layout"] })}>
              <option>một dãy</option>
              <option>quay lưng</option>
              <option>song song</option>
            </select>
          </label>
          {number("gap", "Khe giữa hộp (m)", 0, 0.2, 0.01)}
          {number("tierSpacing", "Khoảng cách tầng (m)", 0.18, 1, 0.01)}
          {number("bottomHeight", "Chiều cao tầng thấp nhất (m)", 0.1, 1, 0.01)}
          {number("aisle", "Bề rộng lối đi (m)", 0.3, 3, 0.1)}
          <h3>Thuỷ lực và van</h3>
          {number("flow", "Lưu lượng mỗi hộp (L/phút)", 0.5, 5, 0.1)}
          {number("residualHead", "Cột áp dư tại vòi (m)", 0.1, 10, 0.1)}
          {number("filterDistance", "Khoảng cách tới phòng lọc (m)", 1, 100, 1)}
          {number("slope", "Độ dốc ống thoát (m/m)", 0.001, 0.1, 0.001)}
          <label>
            Ống góp cấp
            <select value={d.headerDn} onChange={(e) => setD({ ...d, headerDn: Number(e.target.value) })}>
              {dns.map((n) => (
                <option key={n} value={n}>
                  DN{n}
                </option>
              ))}
            </select>
          </label>
          {toggle("supplyValve", "Van cấp từng hộp")}
          {toggle("sludgeValve", "Van xả cặn từng hộp")}
          <label className="design-check">
            <input
              type="checkbox"
              checked={d.flushEnabled}
              onChange={(e) => setD({ ...d, flushEnabled: e.target.checked })}
            />
            Lắp nhánh xả rửa định kỳ
          </label>
          {d.flushEnabled && number("flushFlow", "Lưu lượng xả rửa giả định mỗi hộp (L/phút)", 0.1, 10, 0.1)}
          {toggle("tierValve", "Van chặn mỗi tầng")}
          <p>Ống uPVC; lưu lượng mặc định 1,5 L/phút/hộp là giá trị tham khảo, cần đối chiếu nhà cung cấp.</p>
        </section>
        <section className="site-panel design-view">
          <h2>Mô hình 3D</h2>
          <p>Kéo để xoay, cuộn để phóng to, bấm vào hộp hoặc ống để chọn.</p>
          <div className="design-canvas" ref={host} />
          <div className="design-buttons">
            <button onClick={() => scene.current?.overview()}>Toàn cảnh</button>
            <button onClick={() => setExploded(!exploded)}>{exploded ? "Ghép lại" : "Tách rời"}</button>
            <button onClick={() => setOne(!one)}>{one ? "Tất cả hộp" : "Một hộp"}</button>
            <button
              disabled={!d.flushEnabled}
              aria-pressed={flushing}
              onClick={() => {
                const next = !flushing;
                setFlushing(next);
                scene.current?.setFlush(next);
              }}
            >
              {flushing ? "Dừng xả rửa" : "Xả rửa"}
            </button>
            <button
              onClick={() => {
                const open = !doorOpen;
                setDoorOpen(open);
                scene.current?.setDoor(open);
              }}
            >
              {doorOpen ? "Đóng cửa" : "Mở cửa"}
            </button>
          </div>
          <div className="design-layers">
            {layers.map((l) => (
              <label key={l}>
                <input
                  type="checkbox"
                  checked={visible.has(l)}
                  onChange={(e) =>
                    setVisible((old) => {
                      const next = new Set(old);
                      if (e.target.checked) next.add(l);
                      else next.delete(l);
                      return next;
                    })
                  }
                />
                {l}
              </label>
            ))}
          </div>
          <p>Ống cấp: xanh lam · tràn: xanh lục · xả cặn: nâu · van: đỏ.</p>
          {one && (
            <p>
              Ống bọc có khía chân hút nước sát hố gom, qua ống đứng đặt mực nước vào ống góp tràn kiêm xả cặn. Nhánh xả
              rửa chỉ vận hành định kỳ; hoạt ảnh giả định tất cả hộp cùng xả ở lưu lượng xả rửa đã nhập.
            </p>
          )}
          {chosen && (
            <p>
              Đã chọn {chosen.id} · {chosen.type} {chosen.dn ? `· DN${chosen.dn}` : ""}{" "}
              {chosen.length !== undefined ? `· ${displayQuantity(chosen.length)} m` : ""}{" "}
              {chosen.flow !== undefined
                ? `· ${displayQuantity(chosen.flow + (flushing ? (chosen.flushFlow ?? 0) : 0))} L/phút`
                : ""}{" "}
              {chosen.flow !== undefined && chosen.dn
                ? `· ${displayQuantity((chosen.network === "thoát" ? halfPipeVelocity : velocity)(chosen.flow + (flushing ? (chosen.flushFlow ?? 0) : 0), chosen.dn))} m/s`
                : ""}
            </p>
          )}
        </section>
        <section className="site-panel design-results">
          <h2>Tóm tắt</h2>
          <p>
            {h.boxes} hộp · {h.boxes} con ·{" "}
            {displayQuantity(d.racks * d.cols * (d.length + d.gap) * (d.width + d.aisle))} m² sàn ước tính
          </p>
          <p>
            Q {displayQuantity(h.q)} L/phút · sump tối thiểu {displayQuantity(h.sump)} L · cột áp bơm{" "}
            {displayQuantity(h.pumpHead)} m
          </p>
          <p>
            Đồng đều {displayQuantity(h.uniform)}% · thay nước {displayQuantity(h.turnover)} phút · mức tối thiểu theo
            diện tích {displayQuantity(h.minimum)} L/phút/hộp
          </p>
          <p>
            Ống chính cấp DN{h.mainDn} · ống đứng cấp DN{h.riserDn} · thoát DN{h.gravityDn}
          </p>
          <p>
            Ống góp tràn kiêm xả cặn DN{h.headerDn}, sức tải nửa ống {displayQuantity(h.headerCapacity)} L/phút; ống thu
            xả rửa DN34, sức tải {displayQuantity(h.flushCapacity)} L/phút theo Manning. Xả rửa không cộng vào Q thiết
            kế.
          </p>
          <p>
            TAN {displayQuantity(h.water.tan)} mg N/L · DO {displayQuantity(h.water.do)} mg/L · NH₃ tự do{" "}
            {displayQuantity(h.water.nh3)} µg N/L
          </p>
          <p>
            Thời gian thay nước 15 phút là ngưỡng minh hoạ. Kết quả chất lượng nước dùng cấu hình lọc mặc định của mô
            hình.
          </p>
          {h.warnings.map((w) => (
            <p className="design-warning" key={w}>
              {w}
            </p>
          ))}
          {networkErrors.length > 0 && (
            <p className="design-warning">
              Mạng có {networkErrors.length} lỗi kết nối hoặc cao độ. {networkErrors[0]}
            </p>
          )}
          <a href={`/quy-trinh?hop=${h.boxes}&luu-luong=${h.q * 0.06}`}>Mở trong Quy trình →</a>
          <h2>Bảng vật tư</h2>
          <p>
            Giá hộp mẫu 6,4 USD nằm trong khoảng FOB tham khảo 5,5–7,3 USD/hộp của{" "}
            <a href="https://zkaqua.en.made-in-china.com/product-group/XqTtpjkbZLVc/Crab-Box-catalog-1.html">ZKAQUA</a>,
            chưa gồm vận chuyển và thuế. Các giá khác là giá mẫu: nhập theo báo giá địa phương. Tỉ giá ban đầu chỉ là ví
            dụ và cần cập nhật.
          </p>
          <div className="design-buttons">
            <label>
              Tiền tệ{" "}
              <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
                <option>USD</option>
                <option>VND</option>
              </select>
            </label>
            <label>
              Tỉ giá (VND/USD){" "}
              <input
                type="number"
                min="1"
                value={exchange}
                onChange={(e) => setExchange(Math.max(1, e.target.valueAsNumber || 1))}
              />
            </label>
          </div>
          <div className="design-buttons">
            <button
              onClick={() => download("vat-tu.csv", csv(rows, prices, currency, exchange), "text/csv;charset=utf-8")}
            >
              Tải CSV
            </button>
            <button
              onClick={() => download("cau-hinh.json", JSON.stringify(d, null, 2), "application/json;charset=utf-8")}
            >
              Tải JSON cấu hình
            </button>
          </div>
          <div className="design-table">
            <table>
              <thead>
                <tr>
                  <th>Hệ thống</th>
                  <th>Hạng mục</th>
                  <th>Quy cách</th>
                  <th>Đơn vị</th>
                  <th>Số lượng</th>
                  <th>Đơn giá ({currency})</th>
                  <th>Thành tiền ({currency})</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {[...new Set(rows.map((r) => r.system))].flatMap((system) => [
                  ...rows
                    .filter((r) => r.system === system)
                    .map((r) => (
                      <tr
                        key={r.key}
                        className={selected.some((id) => r.ids.includes(id)) ? "design-selected" : ""}
                        onClick={() => setSelected(r.ids)}
                      >
                        <td>{r.system}</td>
                        <td>{r.item}</td>
                        <td>{r.spec}</td>
                        <td>{r.unit}</td>
                        <td>{displayQuantity(r.quantity)}</td>
                        <td>
                          <input
                            aria-label={`Đơn giá ${r.item} ${r.spec} ${r.system}`}
                            type="number"
                            min="0"
                            step="any"
                            value={Number((priceOf(r, prices) * (currency === "VND" ? exchange : 1)).toFixed(2))}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const v = e.target.valueAsNumber;
                              if (Number.isFinite(v) && v >= 0)
                                setPrices({ ...prices, [r.key]: v / (currency === "VND" ? exchange : 1) });
                            }}
                          />
                        </td>
                        <td>{displayQuantity(amountOf(r, prices) * (currency === "VND" ? exchange : 1))}</td>
                        <td>{r.note}</td>
                      </tr>
                    )),
                  <tr key={`${system}-total`}>
                    <td>{system}</td>
                    <td>Tổng hệ thống</td>
                    <td>—</td>
                    <td>—</td>
                    <td>—</td>
                    <td>—</td>
                    <td>
                      {displayQuantity(
                        rows.filter((r) => r.system === system).reduce((sum, r) => sum + amountOf(r, prices), 0) *
                          (currency === "VND" ? exchange : 1),
                      )}
                    </td>
                    <td />
                  </tr>,
                ])}
                <tr>
                  <td />
                  <td>Tổng cộng</td>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                  <td>
                    {displayQuantity(
                      rows.reduce((sum, r) => sum + amountOf(r, prices), 0) * (currency === "VND" ? exchange : 1),
                    )}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
