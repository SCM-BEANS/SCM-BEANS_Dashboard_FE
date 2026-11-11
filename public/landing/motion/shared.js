import { createCluster03Motion, loadCluster03Connections } from "./cluster03.js";

// The detail section and the machine-to-platform section show the same cached c03 model,
// so they share one connection download and one kinematic solver per model.
let connections = null;
const motions = new WeakMap();

export function cluster03Connections() {
  connections ||= loadCluster03Connections().catch(error => { connections = null; throw error; });
  return connections;
}

// The solver works in the compressor file's own frame. When the model is mounted inside the body it is lifted out
// of its mount for each call, so the solved local poses stay right and simply ride along with the mount.
function inOwnFrame(model, run) {
  const mount = model.holder.parent;
  if (!mount || mount.isScene) return run();
  mount.remove(model.holder);
  try { return run(); } finally { mount.add(model.holder); model.holder.updateMatrixWorld(true); }
}

export function cluster03MotionFor(model, definitions) {
  if (!motions.has(model)) {
    const motion = inOwnFrame(model, () => createCluster03Motion(model, definitions));
    motions.set(model, {
      apply: (main, lower) => inOwnFrame(model, () => motion.apply(main, lower)),
      reset: () => inOwnFrame(model, () => motion.reset()),
      highlights: phase => motion.highlights(phase)
    });
  }
  return motions.get(model);
}
