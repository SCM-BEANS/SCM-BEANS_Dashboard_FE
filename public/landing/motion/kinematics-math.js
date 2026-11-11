const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const subtract = (left, right) => left.map((value, index) => value - right[index]);
const add = (left, right) => left.map((value, index) => value + right[index]);
const scale = (value, amount) => value.map(component => component * amount);
const dot = (left, right) => left.reduce((sum, value, index) => sum + value * right[index], 0);
const cross = (left, right) => [
  left[1] * right[2] - left[2] * right[1],
  left[2] * right[0] - left[0] * right[2],
  left[0] * right[1] - left[1] * right[0]
];
const normalize = value => {
  const length = Math.hypot(...value);
  return length > 1e-15 ? scale(value, 1 / length) : [0, 0, 0];
};

// Matches CurvePath.getPointAt for the verified Arc + Line motion paths.
export function pointOnCadPath(path, progress) {
  const [arc, line] = path.segments;
  const totalLength = path.lengthMeters;
  const arcLength = arc.lengthMeters ?? arc.radius * Math.abs(arc.sweepRadians);
  const distance = clamp(progress, 0, 1) * totalLength;
  if (distance <= arcLength) {
    const basisX = normalize(subtract(arc.start, arc.center));
    const basisY = normalize(cross(normalize(arc.normal), basisX));
    const angle = arc.sweepRadians * distance / arcLength;
    return add(arc.center, add(
      scale(basisX, arc.radius * Math.cos(angle)),
      scale(basisY, arc.radius * Math.sin(angle))
    ));
  }
  const lineLength = totalLength - arcLength;
  const lineProgress = lineLength > 0 ? clamp((distance - arcLength) / lineLength, 0, 1) : 1;
  return add(line.start, scale(subtract(line.end, line.start), lineProgress));
}

export function interpolateCalibration(samples, progress) {
  const value = clamp(progress, samples[0].camProgress, samples.at(-1).camProgress);
  if (value <= samples[0].camProgress) return samples[0].motorAngleRadians;
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1], current = samples[index];
    if (value > current.camProgress) continue;
    const amount = (value - previous.camProgress) / (current.camProgress - previous.camProgress);
    return previous.motorAngleRadians + (current.motorAngleRadians - previous.motorAngleRadians) * amount;
  }
  return samples.at(-1).motorAngleRadians;
}
