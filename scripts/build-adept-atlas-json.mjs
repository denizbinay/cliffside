import fs from "node:fs";
import path from "node:path";

const unitsDir = path.resolve(process.cwd(), "public/assets/units");

const specs = [
  {
    imageFile: "adept-walk-sheet.png",
    boxesFile: "adept-walk-sheet_V4_bounding_boxes.json",
    outputFile: "adept-walk-sheet.atlas.json"
  },
  {
    imageFile: "adept-attack-sheet.png",
    boxesFile: "adept-attack-sheet_V4_bounding_boxes.json",
    outputFile: "adept-attack-sheet.atlas.json"
  },
  {
    imageFile: "adept-death-sheet.png",
    boxesFile: "adept-death-sheet_V4_bounding_boxes.json",
    outputFile: "adept-death-sheet.atlas.json"
  }
];

function readPngSize(filePath) {
  const png = fs.readFileSync(filePath);
  if (png.toString("ascii", 1, 4) !== "PNG") {
    throw new Error(`Not a PNG file: ${filePath}`);
  }
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20)
  };
}

for (const spec of specs) {
  const boxesPath = path.join(unitsDir, spec.boxesFile);
  const imagePath = path.join(unitsDir, spec.imageFile);
  const outputPath = path.join(unitsDir, spec.outputFile);

  const rawBoxes = JSON.parse(fs.readFileSync(boxesPath, "utf8"));
  const boxes = rawBoxes
    .filter((box) => Number.isFinite(box?.x) && Number.isFinite(box?.y) && Number.isFinite(box?.width) && Number.isFinite(box?.height))
    .sort((a, b) => (a.frameIndex ?? 0) - (b.frameIndex ?? 0));

  if (boxes.length === 0) {
    throw new Error(`No valid boxes found in ${spec.boxesFile}`);
  }

  const hasOriginalPlacement = boxes.every((box) => Number.isFinite(box?.originalX) && Number.isFinite(box?.originalY));
  if (!hasOriginalPlacement) {
    throw new Error(`Missing originalX/originalY placement in ${spec.boxesFile}`);
  }

  const minOriginalX = Math.min(...boxes.map((box) => box.originalX));
  const minOriginalY = Math.min(...boxes.map((box) => box.originalY));
  const sourceWidth = Math.max(...boxes.map((box) => box.originalX + box.width)) - minOriginalX;
  const sourceHeight = Math.max(...boxes.map((box) => box.originalY + box.height)) - minOriginalY;

  const frames = {};
  for (const box of boxes) {
    frames[String(box.frameIndex)] = {
      frame: {
        x: box.x,
        y: box.y,
        w: box.width,
        h: box.height
      },
      rotated: false,
      trimmed: true,
      spriteSourceSize: {
        x: box.originalX - minOriginalX,
        y: box.originalY - minOriginalY,
        w: box.width,
        h: box.height
      },
      sourceSize: {
        w: sourceWidth,
        h: sourceHeight
      }
    };
  }

  const imageSize = readPngSize(imagePath);
  const atlas = {
    frames,
    meta: {
      app: "cliffside-atlas-generator",
      version: "1.0",
      image: spec.imageFile,
      format: "RGBA8888",
      size: {
        w: imageSize.width,
        h: imageSize.height
      },
      scale: "1"
    }
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(atlas, null, 2)}\n`, "utf8");
  console.log(`Wrote ${path.relative(process.cwd(), outputPath)}`);
}
