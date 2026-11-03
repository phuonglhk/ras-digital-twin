import { Component, useEffect, useState, type ReactNode } from "react";
import TwinApp from "./App";
import { calculate, type Values } from "./model/calculators";
import { freeAmmoniaFraction } from "./model/chemistry";
import { fmt } from "./model/format";
import { equipment, initialValues, tools, type Entry } from "./ui/catalog";
import { EquipmentView, useThumbnails } from "./ui/EquipmentView";
import LineChart from "./ui/LineChart";
import { equipmentContent } from "./ui/equipmentContent";
import { UNIT_ORDER } from "./model/process";
import { compatibleUnits, convertUnit, unitNames, type UnitKind } from "./model/converter";

function Link({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <a
      href={to}
      onClick={(e) => {
        if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          history.pushState({}, "", to);
          window.dispatchEvent(new PopStateEvent("popstate"));
          window.scrollTo(0, 0);
        }
      }}
    >
      {children}
    </a>
  );
}
function Cards({ entries }: { entries: Entry[] }) {
  const images = useThumbnails(equipment);
  return (
    <div className="catalog-grid">
      {entries.map((e) => (
        <Link key={e.id} to={`${e.group === "Công cụ" ? "/cong-cu" : "/thiet-bi"}/${e.id}`}>
          <article className="catalog-card">
            {images[e.id] && <img src={images[e.id]} alt="" />}
            <small>{e.group}</small>
            <h3>{e.name}</h3>
            <p>{e.description}</p>
            <span>Khám phá →</span>
          </article>
        </Link>
      ))}
    </div>
  );
}
function Calculator({ entry }: { entry: Entry }) {
  const [values, setValues] = useState<Values>(() => initialValues(entry));
  const [from, setFrom] = useState<UnitKind>("no3n");
  const [to, setTo] = useState<UnitKind>("no3");
  const [media, setMedia] = useState("K1");
  const results =
    entry.id === "doi-don-vi"
      ? [
          {
            label: unitNames[to],
            value: convertUnit(values.value, from, to, values.ph, values.temp, values.salt),
            unit: "",
            formula: "Tỉ lệ khối lượng mol; cân bằng NH₃/NH₄⁺ theo pH, nhiệt độ và độ mặn",
            source: "Emerson và cộng sự (1975); khối lượng mol và xấp xỉ tỉ trọng 1 + 0,00075 × độ mặn",
          },
        ]
      : calculate(entry.id, values);
  return (
    <section className="site-panel">
      <h2>Máy tính nhanh</h2>
      <div className="calculator-fields">
        {entry.fields
          .filter((f) => f.key !== "factor")
          .map((f) => (
            <label key={f.key}>
              {f.label}
              <input
                type="number"
                min={f.min}
                step="any"
                value={values[f.key]}
                onChange={(e) => {
                  setValues({ ...values, [f.key]: Number(e.target.value) });
                  if (f.key === "ssa") setMedia("custom");
                }}
              />
            </label>
          ))}
        {entry.id === "mbbr" && (
          <label>
            Loại giá thể
            <select
              value={media}
              onChange={(e) => {
                setMedia(e.target.value);
                if (e.target.value !== "custom") setValues({ ...values, ssa: e.target.value === "K5" ? 800 : 500 });
              }}
            >
              <option value="K1">K1 · 500 m²/m³</option>
              <option value="K3">K3 · 500 m²/m³</option>
              <option value="K5">K5 · 800 m²/m³</option>
              <option value="custom">Tự nhập</option>
            </select>
            <small>
              Nguồn: <a href="https://www.fndae.fr/documentation/PDF/fndae_38_chap_01_02.pdf">FNDAE, bảng giá thể</a>.
            </small>
          </label>
        )}
        {entry.id === "tach-dam" && (
          <label>
            <span>Ozone</span>
            <input
              type="checkbox"
              checked={!!values.ozone}
              onChange={(e) => setValues({ ...values, ozone: e.target.checked ? 1 : 0 })}
            />
          </label>
        )}
        {entry.id === "doi-don-vi" && (
          <>
            <label>
              Đơn vị đầu vào
              <select
                value={from}
                onChange={(e) => {
                  const next = e.target.value as UnitKind;
                  setFrom(next);
                  setTo(compatibleUnits(next)[0]);
                }}
              >
                {Object.entries(unitNames).map(([id, name]) => (
                  <option value={id} key={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Đơn vị đầu ra
              <select value={to} onChange={(e) => setTo(e.target.value as UnitKind)}>
                {compatibleUnits(from).map((id) => (
                  <option value={id} key={id}>
                    {unitNames[id]}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>
      <div className="results">
        {results.map((r) => (
          <div key={r.label}>
            <strong>
              {r.label}: {fmt(r.value, r.unit.startsWith("đèn") ? 0 : entry.id === "doi-don-vi" ? 4 : 2)} {r.unit}
            </strong>
            <p>Công thức: {r.formula}</p>
            <p>Nguồn: {r.source}</p>
          </div>
        ))}
      </div>
      {entry.id === "nh3-tu-do" && (
        <>
          <h3>NH₃ theo pH</h3>
          <LineChart
            ariaLabel="Tỉ lệ NH₃ theo pH"
            x={[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]}
            series={[
              {
                key: "nh3",
                label: "NH₃",
                color: "#f4b65d",
                values: [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map(
                  (ph) => 100 * freeAmmoniaFraction(ph, values.temp, values.salt),
                ),
                unit: "%",
              },
            ]}
          />
        </>
      )}
    </section>
  );
}
function Detail({ entry }: { entry: Entry }) {
  return (
    <main className="site-content">
      <p className="eyebrow">THƯ VIỆN THIẾT BỊ / {entry.group}</p>
      <h1>{entry.name}</h1>
      <p className="lead">{entry.description}</p>
      <div className="detail-grid">
        <section className="site-panel">
          <h2>Mô hình tương tác</h2>
          <p>Kéo để xoay, cuộn để phóng to và chọn bộ phận để xem chức năng.</p>
          <EquipmentView entry={entry} />
        </section>
        <section className="site-panel">
          <h2>Nguyên lý hoạt động</h2>
          {equipmentContent[entry.id].principles.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <div className="flow-diagram">
            {equipmentContent[entry.id].flow.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
          <h3>Thông số điển hình</h3>
          <table>
            <thead>
              <tr>
                <th>Thông số</th>
                <th>Giá trị tham khảo</th>
                <th>Nguồn</th>
              </tr>
            </thead>
            <tbody>
              {equipmentContent[entry.id].parameters.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{row.value}</td>
                  <td>
                    <a href={row.url} target="_blank" rel="noreferrer">
                      {row.source}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Link to={`/quy-trinh?chon=${entry.unit}`}>Xem trong quy trình →</Link>
        </section>
      </div>
      <Calculator key={entry.id} entry={entry} />
    </main>
  );
}
class RouteBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="site-content">
          <h1>Không thể hiển thị trang</h1>
          <p>Đã xảy ra lỗi khi tải trang này.</p>
          <button onClick={() => location.reload()}>Tải lại trang</button>
        </main>
      );
    return this.props.children;
  }
}
function Site() {
  const [path, setPath] = useState(location.pathname);
  const [group, setGroup] = useState("Tất cả");
  useEffect(() => {
    const handler = () => setPath(location.pathname);
    addEventListener("popstate", handler);
    return () => removeEventListener("popstate", handler);
  }, []);
  const entry = equipment.find((e) => path === `/thiet-bi/${e.id}`),
    tool = tools.find((e) => path === `/cong-cu/${e.id}`);
  const title =
    entry?.name ??
    tool?.name ??
    (
      { "/": "Trang chủ", "/thiet-bi": "Thiết bị", "/quy-trinh": "Quy trình", "/gioi-thieu": "Giới thiệu" } as Record<
        string,
        string
      >
    )[path] ??
    "Không tìm thấy";
  useEffect(() => {
    document.title = `${title} · RAS Digital Twin`;
  }, [title]);
  return (
    <>
      <nav className="site-nav">
        <Link to="/">RAS DIGITAL TWIN</Link>
        <div>
          <Link to="/quy-trinh">Quy trình</Link>
          <Link to="/thiet-bi">Thiết bị</Link>
          <Link to="/cong-cu/nh3-tu-do">Công cụ</Link>
          <Link to="/gioi-thieu">Giới thiệu</Link>
        </div>
      </nav>
      <RouteBoundary key={path}>
        {path === "/quy-trinh" ? (
          <TwinApp />
        ) : entry ? (
          <Detail key={entry.id} entry={entry} />
        ) : tool ? (
          <main className="site-content">
            <p className="eyebrow">CÔNG CỤ TÍNH</p>
            <h1>{tool.name}</h1>
            <p className="lead">{tool.description}</p>
            <Calculator key={tool.id} entry={tool} />
            <h2>Công cụ khác</h2>
            <Cards entries={tools} />
          </main>
        ) : path === "/" ? (
          <main className="site-content">
            <p className="eyebrow">NUÔI TRỒNG THUỶ SẢN TUẦN HOÀN</p>
            <h1>Khám phá hệ thống RAS qua mô hình 3D</h1>
            <p className="lead">Tìm hiểu thiết bị, dòng nước và các phép tính cơ bản cho hệ thống nuôi tuần hoàn.</p>
            <Link to="/quy-trinh">Mở mô phỏng toàn hệ →</Link>
            <h2>Hành trình của dòng nước</h2>
            <div className="flow-links">
              {UNIT_ORDER.map(
                (unit) =>
                  equipment.find((item) => item.unit === unit && (unit !== "culture" || item.id === "ho-nuoi-cua"))!,
              ).map((e) => (
                <Link key={e.id} to={`/thiet-bi/${e.id}`}>
                  {e.name} →
                </Link>
              ))}
              <span>Hồi về bể nuôi</span>
              <p>
                Bể tròn là phương án nuôi cá và tôm: <Link to="/thiet-bi/be-tron">Xem bể tròn</Link>.
              </p>
              <div>
                Nhánh xử lý: <Link to="/thiet-bi/khu-nitrat">Bể nuôi → khử nitrat → bể nuôi</Link>
              </div>
            </div>
            <h2>Thư viện thiết bị</h2>
            <Cards entries={equipment} />
            <h2>Công cụ tính</h2>
            <Cards entries={tools} />
          </main>
        ) : path === "/thiet-bi" ? (
          <main className="site-content">
            <h1>Thư viện thiết bị</h1>
            <p className="lead">Tìm hiểu cấu tạo và nguyên lý từng thiết bị trong hệ thống.</p>
            <div className="filters">
              {["Tất cả", "Cơ học", "Sinh học", "Khí", "Khử trùng", "Vận chuyển nước", "Nuôi"].map((g) => (
                <button className={group === g ? "active" : ""} key={g} onClick={() => setGroup(g)}>
                  {g}
                </button>
              ))}
            </div>
            <Cards entries={equipment.filter((e) => group === "Tất cả" || e.group === group)} />
          </main>
        ) : path === "/gioi-thieu" ? (
          <main className="site-content">
            <h1>Giới thiệu và nguồn</h1>
            <p>
              Trang web minh hoạ nguyên lý RAS và các phép tính sơ bộ, phục vụ học tập; không thay thế thiết kế hoặc đo
              đạc vận hành.
            </p>
            <p>
              Mô hình nước sử dụng các quan hệ của Emerson và cộng sự (1975), Khoo và cộng sự (1977), Dickson và cộng sự
              (2007), Rusten và cộng sự (2006), Timmons & Ebeling (2010), Benson & Krause (1984). Các giả định được ghi
              tại từng kết quả.
            </p>
            <p>
              Mô hình khối được xây dựng từ tài nguyên Blockbench của dự án. Trang tham khảo cách tổ chức nội dung từ
              iRAS và waterkit; không sử dụng mã nguồn hoặc giao diện của các dự án đó. Hai dự án tham khảo mang giấy
              phép AGPL-3.0.
            </p>
          </main>
        ) : (
          <main className="site-content">
            <h1>Không tìm thấy trang</h1>
            <Link to="/">Về trang chủ</Link>
          </main>
        )}
      </RouteBoundary>
      <footer className="site-footer">
        RAS Digital Twin · Mô hình minh hoạ và công cụ học tập <Link to="/gioi-thieu">Nguồn và giới hạn</Link>
      </footer>
    </>
  );
}
export default Site;
