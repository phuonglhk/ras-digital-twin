import { useEffect, useMemo, useRef, useState } from "react";
import {
  amountOf,
  bom,
  csv,
  displayQuantity,
  displaySpec,
  priceOf,
  type Currency,
  type Prices,
} from "../../design/bom";
import { decompose } from "../../design/decompose";
import { hydraulics, dns, velocity, halfPipeVelocity } from "../../design/hydraulics";
import { inspectNetwork } from "../../design/network";
import { filterRoom } from "../../design/filtration";
import { cellsCsv } from "../../design/cells";
import { assembledComponents, assemblyCaptions } from "../../design/assembly";
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
    [showCodes, setShowCodes] = useState(true),
    [assembly, setAssembly] = useState(false),
    [assemblyStep, setAssemblyStep] = useState(0),
    [assemblyPlaying, setAssemblyPlaying] = useState(false),
    [closedTier, setClosedTier] = useState<{ rack: number; tier: number; block: number } | null>(null),
    [flushing, setFlushing] = useState(false),
    [currency, setCurrency] = useState<Currency>("USD"),
    [exchange, setExchange] = useState(25000),
    [prices, setPrices] = useState<Prices>({}),
    [selected, setSelected] = useState<string[]>([]);
  const h = useMemo(() => hydraulics(d), [d]),
    room = useMemo(() => filterRoom(d, h.pumpHead), [d, h.pumpHead]),
    components = useMemo(() => [...decompose(d), ...room.components], [d, room]),
    rows = useMemo(() => bom(components), [components]),
    networkErrors = useMemo(() => inspectNetwork(components), [components]);
  const steps = useMemo(() => assemblyCaptions(d), [d]);
  const currentStep = Math.min(assemblyStep, steps.length - 1);
  const shownComponents = useMemo(
    () => (assembly ? assembledComponents(components, d, currentStep) : components),
    [assembly, components, d, currentStep],
  );
  const assembledRows = useMemo(() => (assembly ? bom(shownComponents) : []), [assembly, shownComponents]);
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
    const movingTier =
      assembly && currentStep >= 1 && currentStep <= 2 * d.tiers && currentStep % 2 === 1
        ? (currentStep - 1) / 2
        : null;
    scene.current?.update(
      d,
      shownComponents,
      visible,
      exploded,
      one,
      selected,
      showCodes,
      !assembly || currentStep === steps.length - 1,
      movingTier,
    );
  }, [d, shownComponents, visible, exploded, one, selected, showCodes, assembly, currentStep, steps.length]);
  useEffect(() => {
    if (!assembly || !assemblyPlaying) return;
    const timer = window.setInterval(
      () =>
        setAssemblyStep((old) => {
          if (old >= steps.length - 1) {
            setAssemblyPlaying(false);
            return old;
          }
          return old + 1;
        }),
      2000,
    );
    return () => window.clearInterval(timer);
  }, [assembly, assemblyPlaying, steps.length]);
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
              [key]: Math.min(
                max,
                Math.max(
                  min,
                  ["cols", "tiers", "racks", "stackLimit", "blockCols"].includes(key) ? Math.round(value) : value,
                ),
              ),
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
          <label>
            Kiểu đặt hộp
            <select
              value={d.stacking}
              onChange={(e) => setD({ ...d, stacking: e.target.value as RackDesign["stacking"] })}
            >
              <option value="xep-chong">Xếp chồng căn hộ</option>
              <option value="gia-do">Giá đỡ có khoảng hở</option>
            </select>
          </label>
          {number("cols", "Hộp mỗi tầng", 1, 25, 1)}
          {number("tiers", "Số tầng", 1, 20, 1)}
          {number("racks", "Số kệ", 1, 10, 1)}
          {number("blockCols", "Số cột tối đa mỗi khối", 1, 25, 1)}
          {number("blockGap", "Khe giữa khối (m)", 0, 2, 0.05)}
          {d.plumbing === "van-hong" && (
            <>
              <label>
                Thoát ống góp
                <select
                  value={d.drainEnds}
                  onChange={(e) => setD({ ...d, drainEnds: e.target.value as RackDesign["drainEnds"] })}
                >
                  <option value="hai">Hai đầu khối</option>
                  <option value="mot">Một đầu khối</option>
                </select>
              </label>
              <label>
                Cấp nước ở đầu khối
                <select
                  value={d.supplyEnds}
                  onChange={(e) => setD({ ...d, supplyEnds: e.target.value as RackDesign["supplyEnds"] })}
                >
                  <option value="trai">Đầu trái</option>
                  <option value="phai">Đầu phải</option>
                  <option value="hai">Hai đầu</option>
                </select>
              </label>
            </>
          )}
          <label>
            Kiểu cửa
            <select
              value={d.doorStyle}
              onChange={(e) => setD({ ...d, doorStyle: e.target.value as RackDesign["doorStyle"] })}
            >
              <option value="ban-le">Cửa bản lề</option>
              <option value="ngan-keo">Cửa ngăn kéo</option>
            </select>
          </label>
          <label>
            Bố trí
            <select value={d.layout} onChange={(e) => setD({ ...d, layout: e.target.value as RackDesign["layout"] })}>
              <option>một dãy</option>
              <option>quay lưng</option>
              <option>song song</option>
            </select>
          </label>
          {number("gap", "Khe giữa hộp (m)", 0, 0.2, 0.01)}
          {d.stacking === "xep-chong" && (
            <>
              <label>
                Kiểu đế
                <select
                  value={d.baseStyle}
                  onChange={(e) => setD({ ...d, baseStyle: e.target.value as RackDesign["baseStyle"] })}
                >
                  <option value="gach-soi">Gạch bê tông + sỏi</option>
                  <option value="be-do">Bệ bê tông đổ</option>
                </select>
              </label>
              {d.baseStyle === "gach-soi" && (
                <>
                  {number("brickLength", "Chiều dài viên gạch (m)", 0.1, 1, 0.01)}
                  {number("gravelDepth", "Độ dày lớp sỏi (m)", 0.005, 0.5, 0.005)}
                </>
              )}
            </>
          )}
          {d.stacking === "xep-chong" ? (
            <>
              {number("interlock", "Độ lồng khóa (m)", 0, 0.05, 0.001)}
              {number("slotWidth", "Bề rộng rãnh luồn ống (m)", 0.01, 0.15, 0.005)}
              {number("maxStackHeight", "Chiều cao tối đa giả định (m)", 0.5, 5, 0.1)}
              {number("crabWeight", "Khối lượng mỗi con cua (kg)", 0, 3, 0.05)}
              <p>Chiều cao tối đa là giả định, cần xác nhận với nhà sản xuất.</p>
              <p>
                Ước tính tối đa{" "}
                {Math.max(0, 1 + Math.floor((d.maxStackHeight - d.bottomHeight - d.height) / (d.height - d.interlock)))}{" "}
                tầng theo chiều cao hiện tại.
              </p>
            </>
          ) : (
            number("tierSpacing", "Khoảng cách tầng (m)", 0.18, 1, 0.01)
          )}
          {number(
            "bottomHeight",
            d.stacking === "xep-chong" ? "Chiều cao đế kê (m)" : "Chiều cao tầng thấp nhất (m)",
            0.05,
            1,
            0.01,
          )}
          {number("aisle", "Bề rộng lối đi (m)", 0.3, 3, 0.1)}
          <h3>Thuỷ lực và van</h3>
          <label>
            Đầu cấp từng hộp
            <select
              value={d.outletStyle}
              onChange={(e) => setD({ ...d, outletStyle: e.target.value as RackDesign["outletStyle"] })}
            >
              <option value="te-ong">Tê + ống ngắn</option>
              <option value="lo-khoan">Lỗ khoan định lượng</option>
            </select>
          </label>
          {d.outletStyle === "lo-khoan" && number("orificeDiameter", "Đường kính lỗ khoan (mm)", 0.5, 10, 0.1)}
          <label>
            Phương án cấp thoát
            <select
              value={d.plumbing}
              onChange={(e) =>
                setD({
                  ...d,
                  plumbing: e.target.value as RackDesign["plumbing"],
                  baseStyle: e.target.value === "ong-tren-cao" ? "be-do" : "gach-soi",
                  drainEnds: e.target.value === "ong-tren-cao" ? "hai" : d.drainEnds,
                })
              }
            >
              <option value="van-hong">Van hông theo tầng</option>
              <option value="ong-tren-cao">Ống chính trên cao, thoát ra mương</option>
            </select>
          </label>
          {d.plumbing === "ong-tren-cao" && (
            <>
              <label>
                Mật độ ống thả
                <select
                  value={d.dropEvery}
                  onChange={(e) => setD({ ...d, dropEvery: Number(e.target.value) as 1 | 2 })}
                >
                  <option value="1">Một ống mỗi cột</option>
                  <option value="2">Một ống mỗi hai cột</option>
                </select>
              </label>
              {number("trenchWidth", "Bề rộng mương (m)", 0.05, 2, 0.01)}
              {number("trenchDepth", "Độ sâu nước thiết kế trong mương (m)", 0.02, 1, 0.01)}
              {number("trunkSection", "Chiều dài đoạn ống chính trên cao (m)", 1, 20, 1)}
            </>
          )}
          {number("flow", "Lưu lượng mỗi hộp (L/phút)", 0.5, 5, 0.1)}
          {number("residualHead", "Cột áp dư tại vòi (m)", 0.1, 10, 0.1)}
          {number("filterDistance", "Khoảng cách tới phòng lọc (m)", 1, 100, 1)}
          {number("slope", "Độ dốc ống thoát (m/m)", 0.001, 0.1, 0.001)}
          {number("availableHead", "Chênh cao khả dụng tại cửa ra (m)", 0.001, 0.3, 0.005)}
          {number("freeboard", "Dự phòng mép hộp (m)", 0, 0.15, 0.005)}
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
          {d.stacking === "xep-chong" && (
            <>
              <label>
                Ống góp tràn kiêm xả cặn
                <select value={d.drainHeaderDn} onChange={(e) => setD({ ...d, drainHeaderDn: Number(e.target.value) })}>
                  {dns.map((n) => (
                    <option key={n} value={n}>
                      DN{n}
                    </option>
                  ))}
                </select>
              </label>
              {number("drainDownMinutes", "Thời gian xả hết một hộp (phút)", 0.25, 30, 0.25)}
            </>
          )}
          {toggle("supplyValve", "Van cấp từng hộp")}
          {d.stacking === "gia-do" && (
            <>
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
            </>
          )}
          {d.plumbing === "van-hong" && (
            <>
              {toggle("tierValve", "Van chặn mỗi tầng")}
              <label className="design-check">
                <input
                  type="checkbox"
                  checked={d.drainValve}
                  onChange={(e) => setD({ ...d, drainValve: e.target.checked })}
                />
                Van thoát mỗi tầng
              </label>
              <p>Van và rắc co giúp cô lập, tháo từng tầng để bảo trì.</p>
            </>
          )}
          <p>Ống uPVC; lưu lượng mặc định 1,5 L/phút/hộp là giá trị tham khảo, cần đối chiếu nhà cung cấp.</p>
          <h3>Phòng lọc</h3>
          <label>
            Lọc cơ học
            <select
              value={d.mechanical}
              onChange={(e) => setD({ ...d, mechanical: e.target.value as RackDesign["mechanical"] })}
            >
              <option value="lang-cat">Bể lắng + lọc cát</option>
              <option value="loc-trong">Lọc trống</option>
            </select>
          </label>
          {d.mechanical === "lang-cat" && (
            <>
              {number("settlingMinutes", "Thời gian lưu bể lắng giả định (phút)", 1, 120, 1)}
              {number("sandRate", "Tải lọc cát (m³/m²·giờ)", 1, 80, 1)}
            </>
          )}
          {number("uvDose", "Liều UV (mJ/cm²)", 1, 200, 1)}
          {number("uvTransmittance", "Độ truyền UVT (%)", 1, 100, 1)}
          {number("uvQ40", "q40 mỗi đèn (m³/giờ; 30 mJ/cm², UVT 90%)", 0.01, 100, 0.1)}
          <p>q40 là giả định kiểu catalogue; hiệu chỉnh 90/UVT gần đúng. Cần đối chiếu nhà cung cấp.</p>
        </section>
        <section className="site-panel design-view">
          <h2>Mô hình 3D</h2>
          <p>Kéo để xoay, cuộn để phóng to, bấm vào hộp hoặc ống để chọn.</p>
          <div className="design-canvas" ref={host} />
          <div className="design-buttons">
            <button onClick={() => scene.current?.overview()}>Toàn cảnh</button>
            <button onClick={() => scene.current?.overview(true)}>Gồm ống chính</button>
            <button onClick={() => setExploded(!exploded)}>{exploded ? "Ghép lại" : "Tách rời"}</button>
            <button onClick={() => setOne(!one)}>{one ? "Tất cả hộp" : "Một hộp"}</button>
            <button
              aria-pressed={assembly}
              onClick={() => {
                setAssembly(!assembly);
                setAssemblyStep(0);
                setAssemblyPlaying(!assembly);
                if (!assembly) setOne(false);
              }}
            >
              {assembly ? "Kết thúc lắp ráp" : "Lắp ráp"}
            </button>
            <button
              aria-pressed={!!closedTier}
              onClick={() => {
                const next = closedTier
                  ? null
                  : { rack: chosen?.rack ?? 0, tier: chosen?.tier ?? 0, block: chosen?.block ?? 0 };
                setClosedTier(next);
                scene.current?.setClosedTier(next);
              }}
            >
              {closedTier ? `Mở tầng ${closedTier.tier + 1}` : "Đóng tầng đã chọn"}
            </button>
            <button
              disabled={d.stacking === "gia-do" && !d.flushEnabled}
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
          {assembly && (
            <div className="design-assembly">
              <p>
                Bước {currentStep + 1}/{steps.length}: {steps[currentStep]}
              </p>
              <div className="design-buttons">
                <button
                  disabled={currentStep === 0}
                  onClick={() => {
                    setAssemblyPlaying(false);
                    setAssemblyStep(Math.max(0, currentStep - 1));
                  }}
                >
                  Bước trước
                </button>
                <button onClick={() => setAssemblyPlaying(!assemblyPlaying)}>
                  {assemblyPlaying ? "Tạm dừng" : "Tiếp tục"}
                </button>
                <button
                  disabled={currentStep === steps.length - 1}
                  onClick={() => {
                    setAssemblyPlaying(false);
                    setAssemblyStep(Math.min(steps.length - 1, currentStep + 1));
                  }}
                >
                  Bước sau
                </button>
              </div>
              <details>
                <summary>Vật tư đã dùng đến bước này ({assembledRows.length} hạng mục)</summary>
                <div className="design-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Hệ thống</th>
                        <th>Hạng mục</th>
                        <th>Quy cách</th>
                        <th>Số lượng</th>
                        <th>Đơn vị</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assembledRows.map((row) => (
                        <tr key={row.key}>
                          <td>{row.system}</td>
                          <td>{row.item}</td>
                          <td>{displaySpec(row)}</td>
                          <td>{displayQuantity(row.quantity)}</td>
                          <td>{row.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          )}
          <div className="design-layers">
            <label>
              <input type="checkbox" checked={showCodes} onChange={(e) => setShowCodes(e.target.checked)} />
              Mã ô
            </label>
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
          <p>
            Ống cấp: xanh lam · tràn: xanh lục · xả cặn: nâu · van hông: cam. Chọn van hoặc hộp trước khi đóng tầng.
          </p>
          <p>
            Nguồn tham khảo: <a href="https://www.youtube.com/watch?v=jXCRomdc_o4">Lắp căn hộ nuôi cua</a> và{" "}
            <a href="https://www.youtube.com/watch?v=jJqlI1b1gA8">Tham quan trại nuôi cua</a> của RAS Aquaculture.
          </p>
          {one && (
            <p>
              {d.stacking === "xep-chong"
                ? "Nhấc ống đứng trong để xả nước và cặn qua ống bọc vào ống góp. Nhấn Xả rửa để xem hình động."
                : "Ống bọc có khía chân hút nước sát hố gom. Nhánh đáy xả rửa định kỳ; hoạt ảnh giả định tất cả hộp cùng xả ở lưu lượng đã nhập."}
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
            {h.boxes} hộp · {h.boxes} con · {displayQuantity(h.area)} m² sàn ước tính ·{" "}
            {displayQuantity(h.boxes / h.area)} con/m²; mốc Bing: 1.000 con/66 m² ({displayQuantity(1000 / 66)} con/m²)
          </p>
          <p>
            Diện tích gồm khe giữa các khối và lối đi, không gồm phòng lọc; cùng số hộp có thể cần diện tích khác khi
            thay số kệ, số tầng hoặc cách bố trí.
          </p>
          {d.stacking === "xep-chong" && (
            <p>
              Bước tầng {displayQuantity((d.height - d.interlock) * 100)} cm · tải lên hộp đáy{" "}
              {h.bottomLoad === null ? "chưa tính: cần khối lượng hộp" : `${displayQuantity(h.bottomLoad)} kg`} (nước
              giả định 1 kg/L).
            </p>
          )}
          {h.height > 1.8 && <p>Đỉnh hộp cao {displayQuantity(h.height)} m: cần ghế hoặc thang.</p>}
          {d.plumbing === "ong-tren-cao" && (
            <p>
              Mương sức tải {displayQuantity(h.trenchFlow)} L/phút · chênh lệch lưu lượng tầng trên và dưới{" "}
              {displayQuantity(h.tierDifference * 100)}%.
            </p>
          )}
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
            Ống góp tràn kiêm xả cặn DN{h.headerDn}, sức tải chảy đầy ước tính {displayQuantity(h.headerCapacity)}{" "}
            L/phút; tổn thất khi xả {displayQuantity(h.flushHead * 100)} cm, chênh cao khả dụng{" "}
            {displayQuantity(d.availableHead * 100)} cm;{" "}
            {d.stacking === "xep-chong"
              ? `khi xả một hộp cần ${displayQuantity(h.flushRequired)} L/phút.`
              : `ống thu xả rửa DN34 có sức tải ${displayQuantity(h.flushCapacity)} L/phút.`}{" "}
            Chỉ xả rửa lần lượt từng hộp trên một tầng; xả rửa không cộng vào Q thiết kế.
          </p>
          <p>
            TAN {displayQuantity(h.water.tan)} mg N/L · DO {displayQuantity(h.water.do)} mg/L · NH₃ tự do{" "}
            {displayQuantity(h.water.nh3)} µg N/L
          </p>
          <p>
            Thời gian thay nước 15 phút là ngưỡng minh hoạ. Chất lượng nước dùng lưu lượng thiết kế và diện tích giá thể
            MBBR của phòng lọc đề xuất; các công đoạn khác theo giả định mặc định của mô hình.
          </p>
          {h.warnings.map((w) => (
            <p className="design-warning" key={w}>
              {w}
            </p>
          ))}
          <h2>Phòng lọc đề xuất</h2>
          <p>
            {d.mechanical === "lang-cat"
              ? `Bể lắng ${displayQuantity(room.settling)} m³ (thời gian lưu giả định ${d.settlingMinutes} phút); bình lọc cát đường kính ${displayQuantity(room.sandDiameter)} m, tải ${displayQuantity(d.sandRate)} m³/m²·giờ.`
              : "Lọc trống theo lưu lượng tuần hoàn."}
          </p>
          <p>
            MBBR: {displayQuantity(room.mediaArea)} m² diện tích giá thể, {displayQuantity(room.mediaVolume)} m³ giá
            thể; 2 bơm, một chạy một dự phòng, mỗi bơm {displayQuantity(room.flowM3h)} m³/giờ tại{" "}
            {displayQuantity(h.pumpHead)} m cột áp.
          </p>
          <p>
            UV: {room.lamps} đèn 40 W ({room.uvPower} W), liều {d.uvDose} mJ/cm²; hộc bơm tối thiểu{" "}
            {displayQuantity(room.sump)} m³. Cần hiệu chỉnh thời gian lưu và báo giá theo thiết bị thực tế.
          </p>
          {networkErrors.length > 0 && (
            <p className="design-warning">
              Mạng có {networkErrors.length} lỗi kết nối hoặc cao độ. {networkErrors[0]}
            </p>
          )}
          <a href={`/quy-trinh?hop=${h.boxes}&luu-luong=${h.q * 0.06}&loc-co-hoc=${d.mechanical}`}>
            Mở trong Quy trình →
          </a>
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
            <button onClick={() => download("so-do-o.csv", cellsCsv(d), "text/csv;charset=utf-8")}>
              Tải sơ đồ ô CSV
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
                        <td>{displaySpec(r)}</td>
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
