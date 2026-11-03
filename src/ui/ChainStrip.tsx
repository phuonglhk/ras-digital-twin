/* Chuỗi chất lượng nước dọc tuyến (沿程链 của iRAS): mỗi thiết bị một thẻ, giá trị ở đầu ra. */
import { Fragment } from "react";

import { levelOf, UNIT_LABEL, type Point, type UnitId } from "../model/process";
import type { Species } from "../model/species";
import { fmt, METRICS } from "./format";

interface Props {
  chain: { id: UnitId; point: Point; note: string; active: boolean }[];
  species: Species;
  selected: string | null;
  onSelect: (id: UnitId) => void;
}

const ICON: Record<UnitId, string> = {
  culture: "◉",
  rdf: "◎",
  skimmer: "⫶",
  biofilter: "✲",
  degasser: "▥",
  pump: "⟳",
  uv: "✦",
  oxygen: "▽",
};

export default function ChainStrip({ chain, species, selected, onSelect }: Props) {
  return (
    <div className="chain" role="list" aria-label="Chất lượng nước dọc tuyến">
      {chain.map((c, i) => (
        <Fragment key={c.id}>
          {i > 0 && (
            <span className="chain-arrow" aria-hidden>
              →
            </span>
          )}
          <button
            type="button"
            role="listitem"
            className={`chain-card ${selected === c.id ? "selected" : ""} ${c.active ? "" : "off"}`}
            onClick={() => onSelect(c.id)}
          >
            <header>
              <span className="chain-icon" aria-hidden>
                {ICON[c.id]}
              </span>
              <span>
                <b>{UNIT_LABEL[c.id]}</b>
                <small>{c.note}</small>
              </span>
            </header>
            <dl>
              {METRICS.map((m) => {
                const v = c.point[m.key] as number;
                const lvl = levelOf(m.key, v, species);
                return (
                  <div key={m.key}>
                    <dt>{m.label}</dt>
                    <dd className={lvl ?? ""}>{fmt(v, m.digits)}</dd>
                  </div>
                );
              })}
            </dl>
          </button>
        </Fragment>
      ))}
      <span className="chain-return">↩ hồi về bể nuôi</span>
    </div>
  );
}
