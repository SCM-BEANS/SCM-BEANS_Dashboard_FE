import { findNode } from './motionControllers.js';

const LEFT_ARM_SKETCH4_DIRECTION_LOCAL = [0, 0, 1];
const LEFT_ARM_HOLE_AXIS_LOCAL = [0, 1, 0];
const LEFT_ARM_8MM_HOLE_LOCAL = [0.00785, -0.0007, 0.0112];

export function createLeftArmMotion({
  THREE,
  leftArmModel,
  leftNutModel,
  nutMotion,
  bodyModel,
  modelStage,
  worldOffset = new THREE.Vector3(),
}) {
  const sketch4DirectionLocal = new THREE.Vector3(...LEFT_ARM_SKETCH4_DIRECTION_LOCAL);
  const holeAxisLocal = new THREE.Vector3(...LEFT_ARM_HOLE_AXIS_LOCAL);
  const holeCenterLocal = new THREE.Vector3(...LEFT_ARM_8MM_HOLE_LOCAL);
  let armMesh;

  function getTargetAnchor() {
    return findNode(leftNutModel, ['oc1-1', 'oc_trai'])
      || findNode(bodyModel, ['oc1-1', 'oc_trai']);
  }

  function alignSketch4ToCamCenter() {
    const targetAnchor = getTargetAnchor();
    const camCenter = nutMotion?.getCamCenter?.();
    if (!armMesh || !targetAnchor || !camCenter) return;

    leftArmModel.updateMatrixWorld(true);
    armMesh.updateMatrixWorld(true);
    const targetWorld = targetAnchor.getWorldPosition(new THREE.Vector3())
      .add(worldOffset);
    const targetDirection = camCenter.sub(targetWorld);
    const holeAxisWorld = holeAxisLocal
      .clone()
      .transformDirection(armMesh.matrixWorld)
      .normalize();
    const lineDirectionWorld = sketch4DirectionLocal
      .clone()
      .transformDirection(armMesh.matrixWorld)
      .projectOnPlane(holeAxisWorld)
      .normalize();
    targetDirection.projectOnPlane(holeAxisWorld).normalize();

    if (targetDirection.lengthSq() < 1e-10 || lineDirectionWorld.lengthSq() < 1e-10) return;
    if (lineDirectionWorld.dot(targetDirection) < 0) targetDirection.negate();

    const signedAngle = Math.atan2(
      lineDirectionWorld.clone().cross(targetDirection).dot(holeAxisWorld),
      lineDirectionWorld.dot(targetDirection),
    );
    const worldRotation = new THREE.Quaternion().setFromAxisAngle(
      holeAxisWorld,
      signedAngle,
    );
    const currentWorldQuaternion = leftArmModel.getWorldQuaternion(
      new THREE.Quaternion(),
    );
    const desiredWorldQuaternion = worldRotation.multiply(currentWorldQuaternion);
    const parent = leftArmModel.parent || modelStage;
    const parentWorldQuaternion = parent.getWorldQuaternion(new THREE.Quaternion());
    leftArmModel.quaternion.copy(
      parentWorldQuaternion.invert().multiply(desiredWorldQuaternion),
    );
    leftArmModel.updateMatrixWorld(true);
  }

  function alignHoleToTarget() {
    const targetAnchor = getTargetAnchor();
    if (!armMesh || !targetAnchor) return;

    const parent = leftArmModel.parent || modelStage;
    leftArmModel.updateMatrixWorld(true);
    armMesh.updateMatrixWorld(true);
    const targetParent = parent.worldToLocal(
      targetAnchor.getWorldPosition(new THREE.Vector3()).add(worldOffset),
    );
    const holeParent = parent.worldToLocal(
      holeCenterLocal.clone().applyMatrix4(armMesh.matrixWorld),
    );
    leftArmModel.position.add(targetParent.sub(holeParent));
    leftArmModel.updateMatrixWorld(true);
  }

  function sync() {
    alignSketch4ToCamCenter();
    alignHoleToTarget();
  }

  function setup() {
    const armAnchor = findNode(leftArmModel, ['oc1-1', 'oc_trai']);
    if (!armAnchor) {
      throw new Error('left_arm.glb khÃƒÂ´ng cÃƒÂ³ node oc1-1.');
    }
    armMesh = findNode(leftArmModel, ['left_arm-2', 'left_arm.SLDPRT'])
      || leftArmModel.getObjectByProperty('isMesh', true);
    alignHoleToTarget();
    alignSketch4ToCamCenter();
    alignHoleToTarget();
  }

  return { setup, sync };
}

