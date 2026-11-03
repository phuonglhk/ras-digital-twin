import { useEffect, useRef, useState } from "react";

import type { BbLibrary } from "../twin/bbmodel";
import { TwinScene, type SceneUnit, type SceneView } from "../twin/scene";

const NAMES: Record<SceneUnit, string> = {
  culture: "Bể nuôi",
  rdf: "Lọc trống RDF",
  skimmer: "Tách đạm",
  biofilter: "Bể vi sinh MBBR",
  degasser: "Tháp khử CO₂",
  pump: "Bơm tuần hoàn",
  uv: "Đèn UV",
  oxygen: "Côn ôxy",
  denit: "Khử nitrat",
};

interface Props {
  library: BbLibrary;
  view: SceneView;
  onPick: (id: SceneUnit) => void;
}

export default function TwinView({ library, view, onPick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<TwinScene | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const [hover, setHover] = useState<{ id: SceneUnit; x: number; y: number } | null>(null);

  useEffect(() => {
    const scene = new TwinScene(canvasRef.current!, library);
    scene.onPick = (id) => id && pickRef.current(id);
    scene.onHover = (id, x, y) => setHover(id ? { id, x, y } : null);
    sceneRef.current = scene;
    return () => scene.dispose();
  }, [library]);

  useEffect(() => {
    sceneRef.current?.update(view);
  }, [view]);

  return (
    <div className="twin">
      <canvas ref={canvasRef} aria-label="Mô hình 3D hệ thống RAS. Bấm vào thiết bị để xem chi tiết." />
      <div className="twin-tools">
        <button type="button" onClick={() => sceneRef.current?.overview()}>Toàn cảnh</button>
        {view.selected && (
          <button type="button" onClick={() => sceneRef.current?.focus(view.selected!)}>
            Nhìn gần {NAMES[view.selected]}
          </button>
        )}
      </div>
      <div className="twin-legend" aria-hidden>
        <span><i className="ok" />Đạt</span>
        <span><i className="warn" />Quá nửa ngưỡng</span>
        <span><i className="bad" />Vượt ngưỡng</span>
        <span><i className="off" />Tắt</span>
      </div>
      {hover && (
        <div className="twin-tip" style={{ left: hover.x, top: hover.y }}>
          {NAMES[hover.id]} · {view.labels[hover.id]}
        </div>
      )}
    </div>
  );
}
