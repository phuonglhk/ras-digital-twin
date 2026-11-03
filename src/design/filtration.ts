import { calculate } from "../model/calculators";
import { defaultParams, loads } from "../model/process";
import type { Component, RackDesign } from "./types";
/** Phòng lọc sơ bộ; tải cua và tính MBBR, UV dùng cùng mô hình sẵn có. */
export function filterRoom(d: RackDesign, pumpHead: number) {
  const boxes = d.cols * d.tiers * d.racks,
    flow = boxes * d.flow,
    flowM3h = flow * 0.06;
  const p = defaultParams("mud-crab");
  p.units = boxes;
  p.perUnit = 1;
  p.avgWeight = d.crabWeight * 1000;
  const load = loads(p);
  const mbbr = calculate("mbbr", { load: load.tan, temp: p.temp, salt: p.salinity, ssa: p.biofilter.ssa });
  const lamps = calculate("den-uv", { q: flowM3h, dose: d.uvDose, uvt: d.uvTransmittance, q40: d.uvQ40 })[0].value;
  // HRT là giả định; V=Q×t. Sump 5 phút theo Louisiana Sea Grant:
  // https://repository.library.noaa.gov/view/noaa/39465/noaa_39465_DS1.pdf
  const settling = (flow * d.settlingMinutes) / 1000,
    sump = (flow * 5) / 1000;
  // Tải 30–40 m³/m²·h là miền ví dụ cho bình lọc áp lực, cần xác nhận nhà cung cấp:
  // https://www.poltank.com/wp-content/uploads/2019/10/0028_43417E200_Manual_DAS-HP_EN_ES_FR.pdf
  const sandArea = flowM3h / d.sandRate,
    sandDiameter = Math.sqrt((4 * sandArea) / Math.PI);
  const spec = (n: number, unit: string) => `${n.toFixed(2)} ${unit}`;
  const components: Component[] = [];
  let i = 0;
  const add = (type: string, description: string, count = 1, unit = "cái") =>
    components.push({
      id: `loc-${++i}`,
      type,
      system: "Phòng lọc",
      position: [0, 0, 0],
      count,
      spec: description,
      unit,
    });
  if (d.mechanical === "lang-cat") {
    add("Bể lắng", spec(settling, "m³"));
    add("Bình lọc cát", `Ø ${spec(sandDiameter, "m")}`);
  } else add("Lọc trống", spec(flowM3h, "m³/giờ"));
  add("Bể vi sinh MBBR", spec(mbbr[1].value / 0.5, "m³ bể"));
  add("Giá thể MBBR", `${spec(mbbr[0].value, "m² diện tích")}`, mbbr[1].value, "m³");
  add("Bơm tuần hoàn", `${spec(flowM3h, "m³/giờ")} · ${spec(pumpHead, "m cột áp")}`, 2);
  add("Đèn UV", `${lamps} đèn 40 W · ${d.uvDose} mJ/cm²`);
  add("Hộc bơm", spec(sump, "m³"));
  return {
    flow,
    flowM3h,
    load,
    settling,
    sump,
    sandArea,
    sandDiameter,
    mediaArea: mbbr[0].value,
    mediaVolume: mbbr[1].value,
    lamps,
    uvPower: lamps * 40,
    components,
  };
}
