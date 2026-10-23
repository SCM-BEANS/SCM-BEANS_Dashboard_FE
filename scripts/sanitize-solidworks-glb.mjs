import fs from "node:fs";
import path from "node:path";

const source = process.argv[2];

if (!source) {
  throw new Error("Usage: node scripts/sanitize-solidworks-glb.mjs <file.glb>");
}

const input = fs.readFileSync(source);
if (input.toString("ascii", 0, 4) !== "glTF") {
  throw new Error(`${source} is not a binary glTF file.`);
}

let offset = 12;
let json;
let binChunk;

while (offset < input.length) {
  const length = input.readUInt32LE(offset);
  const type = input.readUInt32LE(offset + 4);
  const chunk = input.subarray(offset + 8, offset + 8 + length);

  if (type === 0x4e4f534a) json = JSON.parse(chunk.toString("utf8"));
  if (type === 0x004e4942) binChunk = chunk;
  offset += 8 + length;
}

if (!json || !binChunk) {
  throw new Error(`${source} is missing its JSON or binary GLB chunk.`);
}

// SOLIDWORKS can label embedded DDS normal maps as image/png. Browsers reject
// those blobs. Keep geometry and PBR factors, but remove only the bad textures.
for (const material of json.materials ?? []) {
  delete material.normalTexture;
  delete material.occlusionTexture;
  delete material.emissiveTexture;
  delete material.pbrMetallicRoughness?.baseColorTexture;
  delete material.pbrMetallicRoughness?.metallicRoughnessTexture;
}
delete json.images;
delete json.textures;
delete json.samplers;

const jsonBytes = Buffer.from(JSON.stringify(json), "utf8");
const jsonPadding = (4 - (jsonBytes.length % 4)) % 4;
const paddedJson = Buffer.concat([jsonBytes, Buffer.alloc(jsonPadding, 0x20)]);
const binPadding = (4 - (binChunk.length % 4)) % 4;
const paddedBin = Buffer.concat([binChunk, Buffer.alloc(binPadding)]);

const output = Buffer.alloc(12 + 8 + paddedJson.length + 8 + paddedBin.length);
output.write("glTF", 0, "ascii");
output.writeUInt32LE(2, 4);
output.writeUInt32LE(output.length, 8);
output.writeUInt32LE(paddedJson.length, 12);
output.writeUInt32LE(0x4e4f534a, 16);
paddedJson.copy(output, 20);

const binOffset = 20 + paddedJson.length;
output.writeUInt32LE(paddedBin.length, binOffset);
output.writeUInt32LE(0x004e4942, binOffset + 4);
paddedBin.copy(output, binOffset + 8);

fs.writeFileSync(source, output);
console.log(`Sanitized embedded invalid textures in ${path.resolve(source)}.`);
