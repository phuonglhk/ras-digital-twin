/* Chi tiết từng thiết bị, theo mục "② 工艺单元" của iRAS: số liệu vận hành và cân bằng. */
import type { ReactNode } from "react";

import { UNIT_LABEL, type Params, type Point, type UnitId, type UnitReport } from "../model/process";
import type { SceneUnit } from "../twin/scene";
import { fmt } from "./format";

interface Props {
  unit: SceneUnit;
  params: Params;
  report: UnitReport;
  points: Partial<Record<UnitId, Point>>;
  tank: Point;
}

function Row({ label, value, unit, tone }: { label: string; value: ReactNode; unit?: string; tone?: string }) {
  return (
    <div className="kv">
      <span>{label}</span>
      <b className={tone}>
        {value}
        {unit && <em> {unit}</em>}
      </b>
    </div>
  );
}

const DESC: Record<SceneUnit, string> = {
  culture:
    "Nguồn tải ô nhiễm. Tải suy từ lượng thức ăn theo Timmons & Ebeling: TAN = F·PC·0.092, TSS = 0.25·F, CO₂ = 1.375·O₂.",
  rdf: "Lọc cơ học lưới 60 µm, rửa ngược tự động. Bỏ chất rắn sớm để giảm tải BOD cho bể vi sinh.",
  skimmer: "Phân đoạn bọt trên một nhánh tuần hoàn, kéo chất hữu cơ hoà tan và hạt mịn lên cốc bọt.",
  biofilter:
    "MBBR giá thể trôi. Nitrat hoá theo diện tích giá thể: r = k·S^0.7·1.09^(T−10)·(1−0.01·Sal), chặn nhiệt ở 25 °C.",
  degasser: "Tháp đệm thổi khí ngược chiều. Khử CO₂ để nâng pH và Ω canxit, đồng thời nạp lại ôxy.",
  pump: "Bơm chính cột áp ~7 m, hệ dòng tự chảy về hộc bơm.",
  uv: "Khử trùng trên nhánh, không đổi hoá học nước trong mô hình.",
  oxygen: "Côn ôxy hoà tan ôxy tinh khiết, đưa DO đầu ra vượt mức bão hoà không khí.",
  denit: "Nhánh thiếu khí khử NO₃⁻ thành N₂ bằng nguồn carbon (methanol), hồi lại một nửa kiềm đã tiêu hao.",
};

export default function UnitDetail({ unit, params: p, report: r, points, tank }: Props) {
  const L = r.loads;
  const out = unit === "denit" ? undefined : points[unit];
  let body: ReactNode = null;

  switch (unit) {
    case "culture":
      body = (
        <>
          <Row label="Số con" value={fmt(L.animals, 0)} />
          <Row label="Sinh khối" value={fmt(L.biomass, 1)} unit="kg" />
          <Row label="Mật độ" value={fmt(L.density, 1)} unit="kg/m³" />
          <Row label="Thể tích nuôi / tổng" value={`${fmt(L.cultureVolume, 2)} / ${fmt(L.totalVolume, 2)}`} unit="m³" />
          <Row label="Thức ăn" value={fmt(L.feed, 2)} unit="kg/ngày" />
          <Row label="TAN thải" value={fmt(L.tan, 0)} unit="g N/ngày" />
          <Row
            label="TAN trung bình / cao điểm"
            value={`${fmt(L.tan, 0)} / ${fmt(r.peakLoads.tan, 0)}`}
            unit="g N/ngày"
          />
          <Row
            label="O₂ trung bình / cao điểm"
            value={`${fmt(r.averageLoads.o2, 0)} / ${fmt(r.peakLoads.o2, 0)}`}
            unit="g/ngày"
          />
          <Row
            label="CO₂ trung bình / cao điểm"
            value={`${fmt(r.averageLoads.co2, 0)} / ${fmt(r.peakLoads.co2, 0)}`}
            unit="g/ngày"
          />
          <Row label="DOM thải" value={fmt(L.dom, 0)} unit="g/ngày" />
          <Row label="TSS thải" value={fmt(L.tss, 0)} unit="g/ngày" />
          <Row label="Tiêu hao O₂ / thải CO₂" value={`${fmt(L.o2, 0)} / ${fmt(L.co2, 0)}`} unit="g/ngày" />
          <Row label="NH₃ tự do trong bể" value={`${fmt(tank.nh3, 1)} (${fmt(tank.fNh3 * 100, 2)}% TAN)`} unit="µg/L" />
          <Row label="Ω canxit" value={fmt(tank.omega, 2)} tone={tank.omega < 1 ? "warn" : ""} />
        </>
      );
      break;
    case "rdf":
      body = (
        <>
          <Row label="Hiệu suất TSS một lượt" value={fmt(p.rdf.efficiency * 100, 0)} unit="%" />
          <Row label="Chất rắn giữ lại" value={fmt(r.rdf.solids, 3)} unit="kg/ngày" />
          <Row label="Nước rửa ngược" value={fmt(r.rdf.backwash, 2)} unit="m³/ngày" />
        </>
      );
      break;
    case "skimmer":
      body = (
        <>
          <Row label="Nhánh qua tách đạm" value={fmt(p.skimmer.bypass * 100, 0)} unit="%" />
          <Row label="Lưu lượng nhánh" value={fmt(p.flow * p.skimmer.bypass, 2)} unit="m³/h" />
          <Row label="TSS giảm trên toàn dòng" value={fmt(p.skimmer.bypass * 40, 0)} unit="%" />
        </>
      );
      break;
    case "biofilter": {
      const b = r.biofilter;
      body = (
        <>
          <Row label="Giá thể / diện tích" value={`${fmt(p.biofilter.media, 2)} m³ · ${fmt(b.area, 0)}`} unit="m²" />
          <Row label="Tốc độ bề mặt" value={fmt(b.rate, 3)} unit="g N/m²·ngày" />
          <Row label="Hiệu suất một lượt NH₄⁺" value={fmt(b.etaTan * 100, 1)} unit="%" />
          <Row label="Giới hạn bởi" value={b.limitedBy} />
          <Row label="Hiệu suất một lượt NO₂⁻" value={fmt(b.etaNo2 * 100, 1)} unit="%" />
          <Row
            label="TAN bể nuôi / mục tiêu thiết kế"
            value={`${fmt(tank.tan, 3)} / ${fmt(b.designTan, 2)}`}
            unit="mg/L"
            tone={tank.tan > b.designTan * 2 ? "bad" : tank.tan > b.designTan ? "warn" : ""}
          />
          <Row label="Hệ số nhiệt · hệ số mặn" value={`${fmt(b.fTemp, 2)}× · ${fmt(b.fSalt, 2)}×`} />
          <Row label="TAN xử lý" value={fmt(b.removed, 0)} unit="g N/ngày" />
          <Row label="O₂ cho nitrat hoá" value={fmt(b.o2, 3)} unit="kg/ngày" />
          <Row label="Gió sục MBBR" value={fmt(b.airFlow, 1)} unit="m³/h" />
        </>
      );
      break;
    }
    case "degasser":
      body = (
        <>
          <Row label="Tỉ lệ khí : nước" value={fmt(p.degasser.gl, 1)} />
          <Row label="Lưu lượng gió" value={fmt(r.degasser.airFlow, 1)} unit="m³/h" />
          <Row label="Hiệu suất khử CO₂" value={fmt(p.degasser.efficiency * 100, 0)} unit="%" />
          <Row label="CO₂ khử" value={fmt(r.degasser.co2Removed, 3)} unit="kg/ngày" />
          <Row label="pH vào → ra" value={`${fmt(points.biofilter?.ph, 2)} → ${fmt(points.degasser?.ph, 2)}`} />
        </>
      );
      break;
    case "pump":
      body = (
        <>
          <Row label="Lưu lượng" value={fmt(p.pumpOn ? p.flow : 0, 1)} unit="m³/h" />
          <Row label="Cột áp" value={fmt(r.pump.head, 0)} unit="m" />
          <Row label="Công suất trục (η 60%)" value={fmt(r.pump.power, 2)} unit="kW" />
          <Row
            label="Thời gian một vòng"
            value={fmt(r.pump.turnover, 0)}
            unit="phút"
            tone={r.pump.turnover > 60 ? "warn" : ""}
          />
        </>
      );
      break;
    case "uv":
      body = (
        <>
          <Row label="Liều" value={fmt(p.uv.dose, 0)} unit="mJ/cm²" />
          <Row label="Lưu lượng qua UV" value={fmt(r.uv.flow, 2)} unit="m³/h" />
          <Row label="Công suất đèn ước tính" value={fmt(r.uv.power, 2)} unit="kW" />
        </>
      );
      break;
    case "oxygen":
      body = (
        <>
          <Row label="DO mục tiêu" value={fmt(p.oxygen.target * 100, 0)} unit="% bão hoà" />
          <Row label="DO vào → ra" value={`${fmt(points.pump?.do, 2)} → ${fmt(points.oxygen?.do, 2)}`} unit="mg/L" />
          <Row label="TGP đầu ra / bể nuôi" value={`${fmt(r.oxygen.tgpOutlet, 1)} / ${fmt(r.tgpTank, 1)}`} unit="%" />
          <Row label="Ôxy tinh khiết" value={fmt(r.oxygen.pureO2, 2)} unit="kg/ngày" />
        </>
      );
      break;
    case "denit":
      body = (
        <>
          <Row label="Lưu lượng nhánh" value={fmt(p.denit.on ? p.denit.flow : 0, 2)} unit="m³/h" />
          <Row label="NO₃⁻ bể nuôi" value={fmt(tank.no3, 1)} unit="mg N/L" />
          <Row label="NO₃⁻ khử" value={fmt(r.denit.removed, 0)} unit="g N/ngày" />
          <Row label="Methanol (2.47 g/g N)" value={fmt(r.denit.methanol, 3)} unit="kg/ngày" />
          <Row label="Kiềm hồi lại" value={fmt(r.denit.alkBack, 3)} unit="kg CaCO₃/ngày" />
        </>
      );
      break;
  }

  return (
    <section className="detail" aria-live="polite">
      <h2>{UNIT_LABEL[unit]}</h2>
      <p className="detail-desc">{DESC[unit]}</p>
      {unit === "biofilter" && (
        <p>
          <a href={`${import.meta.env.BASE_URL}waterkit/mbbr-design.html`}>
            Tính chi tiết MBBR trong bộ công cụ xử lý nước →
          </a>
        </p>
      )}
      <div className="kvs">{body}</div>
      {out && (
        <p className="detail-foot">
          Đầu ra: TAN {fmt(out.tan, 3)} · NO₂⁻ {fmt(out.no2, 3)} · DO {fmt(out.do, 2)} · CO₂ {fmt(out.co2, 1)} · pH{" "}
          {fmt(out.ph, 2)}
        </p>
      )}
      <h3>Cân bằng kiềm</h3>
      <div className="kvs">
        <Row label="Sức đệm β" value={fmt((out ?? tank).beta, 1)} unit="mg/L CaCO₃/pH" />
        <Row label="Nitrat hoá tiêu hao" value={fmt(r.alk.consumed, 3)} unit="kg CaCO₃/ngày" />
        <Row label="Khử nitrat hồi lại" value={fmt(r.denit.alkBack, 3)} unit="kg CaCO₃/ngày" />
        <Row label="NaHCO₃ cần châm" value={fmt(r.alk.nahco3, 3)} unit="kg/ngày" />
      </div>
    </section>
  );
}
