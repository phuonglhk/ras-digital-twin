// Chuyển các file Blockbench (.bbmodel, định dạng java_block) thành một JSON gọn cho web.
// Dùng: node tools/import-bbmodel.mjs <thư mục .bbmodel> <file JSON ra>
// Chỉ giữ hình khối (from/to/rotation/faces) và texture base64; 16 đơn vị = 1 m.
import fs from "node:fs";
import path from "node:path";

const [, , srcDir = "assets-src", outFile = "public/models.json"] = process.argv;

// Tên file nguồn → khoá dùng trong cảnh.
const NAMES = {
  crab_box_fixed: "crab_box",
  drum_filter: "drum_filter",
  tank: "tank",
  pump: "pump",
  rack: "rack",
};

const out = {};
for (const file of fs.readdirSync(srcDir).filter((f) => f.endsWith(".bbmodel"))) {
  const base = path.basename(file, ".bbmodel");
  const key = NAMES[base] ?? base;
  const model = JSON.parse(fs.readFileSync(path.join(srcDir, file), "utf8"));
  if (model.meta?.model_format !== "java_block") {
    console.warn(`bỏ qua ${file}: định dạng ${model.meta?.model_format}`);
    continue;
  }
  out[key] = {
    resolution: model.resolution ?? { width: 16, height: 16 },
    textures: (model.textures ?? []).map((t) => t.source),
    cubes: (model.elements ?? [])
      .filter((e) => e.type === "cube" && e.visibility !== false)
      .map((e) => ({
        from: e.from,
        to: e.to,
        inflate: e.inflate || 0,
        rotation: e.rotation && e.rotation.some((v) => v) ? e.rotation : null,
        origin: e.origin ?? [0, 0, 0],
        faces: Object.fromEntries(
          Object.entries(e.faces ?? {})
            .filter(([, f]) => f && f.texture !== null && f.texture !== undefined)
            .map(([name, f]) => [name, { uv: f.uv, texture: f.texture, rotation: f.rotation || 0 }]),
        ),
      })),
  };
  console.log(`${key}: ${out[key].cubes.length} khối, ${out[key].textures.length} texture`);
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(out));
console.log(`ghi ${outFile} (${fs.statSync(outFile).size} byte)`);
