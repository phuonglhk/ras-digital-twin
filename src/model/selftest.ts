import { defaultParams, describe, steadyState, type Point } from "./process";
import { Simulation } from "./simulation";
import { SPECIES } from "./species";

export const metrics = ["tan", "no2", "no3", "do", "co2", "ph", "nh3", "omega"] as const;
export type Metric = (typeof metrics)[number];
export type Baseline = Record<string, Record<Metric, number>>;
export const tolerances: Record<Metric, number> = {
  tan: 0.0001,
  no2: 0.0001,
  no3: 0.001,
  do: 0.001,
  co2: 0.001,
  ph: 0.0001,
  nh3: 0.001,
  omega: 0.001,
};

function values(point: Point): Record<Metric, number> {
  return Object.fromEntries(metrics.map((key) => [key, point[key]])) as Record<Metric, number>;
}

export function runCases(): Baseline {
  const result: Baseline = {};
  for (const species of SPECIES) {
    const p = defaultParams(species.id);
    result[species.name] = values(describe(steadyState(p), p));
  }
  const p = defaultParams();
  const sim = new Simulation(p);
  sim.setParams({ ...p, pumpOn: false });
  sim.advance(2 / 24);
  result["Mất điện bơm 2 giờ"] = values(describe(sim.state, sim.params));
  const young = { ...p, biofilter: { ...p.biofilter, maturity: 0.3 } };
  result["Bể vi sinh chín 30%"] = values(describe(steadyState(young), young));
  return result;
}
