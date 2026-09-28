import { findNode } from './motionControllers.js';

// Through-hole measured from the GLB rim (diameter ~8.1 mm).
// GLB mesh coordinates: X/Z locate the circle, Y is the plate thickness.
// Sketch feature names cannot be recovered from the exported mesh.
const HOLE_CENTER_LOCAL = [0.0050541, 0.001, -0.0338229];
const HOLE_AXIS_LOCAL = [0, 1, 0];

export function createSupportArmRightMotion({
  THREE,
  supportArmRightModel,
  nutModel,
  meshNames = ['13-1'],
  nutNames = ['oc1-2', 'oc_phai'],
  holeCenterLocal,
  lockHoleCenter = false,
}) {
  const resolvedHoleCenterLocal = holeCenterLocal || new THREE.Vector3(...HOLE_CENTER_LOCAL);
  const holeAxisLocal = new THREE.Vector3(...HOLE_AXIS_LOCAL);
  let supportMesh;
  let nutAnchor;

  function sync() {
    if (!supportMesh || !nutAnchor) return;
    supportMesh.updateWorldMatrix(true, false);
    nutAnchor.updateWorldMatrix(true, false);

    const holeWorld = supportMesh.localToWorld(resolvedHoleCenterLocal.clone());
    const axisWorld = holeAxisLocal.clone().transformDirection(supportMesh.matrixWorld);
    const nutWorld = nutAnchor.getWorldPosition(new THREE.Vector3());

    const offsetWorld = lockHoleCenter
      ? nutWorld.sub(holeWorld)
      : nutWorld.sub(holeWorld).projectOnPlane(axisWorld);
    const parent = supportArmRightModel.parent;
    const rootWorld = supportArmRightModel.getWorldPosition(new THREE.Vector3());
    const desiredWorld = rootWorld.add(offsetWorld);
    supportArmRightModel.position.copy(parent ? parent.worldToLocal(desiredWorld) : desiredWorld);
    supportArmRightModel.updateMatrixWorld(true);
  }

  function setup() {
    supportMesh = findNode(supportArmRightModel, meshNames);
    nutAnchor = findNode(nutModel, nutNames);
    if (!supportMesh || !nutAnchor) {
      throw new Error(`KhÃ´ng tÃ¬m tháº¥y chi tiáº¿t ${meshNames[0]} hoáº·c ${nutNames[0]} Ä‘á»ƒ cÄƒn Ä‘á»“ng tÃ¢m.`);
    }
    supportMesh.updateWorldMatrix(true, false);
    nutAnchor.updateWorldMatrix(true, false);
    const holeAxis = holeAxisLocal.clone().transformDirection(supportMesh.matrixWorld);
    const nutAxis = holeAxisLocal.clone().transformDirection(nutAnchor.matrixWorld);
    if (Math.abs(holeAxis.dot(nutAxis)) < 0.99999) {
      throw new Error('Trá»¥c lá»— vÃ  trá»¥c á»‘c chÆ°a song song; cáº§n kiá»ƒm tra hÆ°á»›ng model.');
    }
    sync();
  }

  return { setup, sync };
}

