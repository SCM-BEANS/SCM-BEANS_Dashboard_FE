import { findNode } from './motionControllers.js';

// TÃ¢m lá»— Ã˜8 mm láº¥y tá»« máº·t trá»¥ cá»§a right_arm.SLDPRT (Ä‘Æ¡n vá»‹ model lÃ  mÃ©t).
// Máº·t trá»¥ Ä‘Æ°á»£c SolidWorks ghi nháº­n táº¡i x=7.85 mm, z=11.2 mm.
const RIGHT_ARM_8MM_HOLE_LOCAL = [0.00785, 0.0026, 0.0112];
const RIGHT_ARM_SKETCH4_DIRECTION_LOCAL = [0, 0, 1];
const RIGHT_ARM_HOLE_AXIS_LOCAL = [0, 1, 0];

export function createRightArmMotion({
  THREE,
  rightArmModel,
  bodyModel,
  nutModel,
  nutMotion,
  modelStage,
  worldOffset = new THREE.Vector3(),
}) {
  const holeCenterLocal = new THREE.Vector3(...RIGHT_ARM_8MM_HOLE_LOCAL);
  const sketch4DirectionLocal = new THREE.Vector3(...RIGHT_ARM_SKETCH4_DIRECTION_LOCAL);
  const holeAxisLocal = new THREE.Vector3(...RIGHT_ARM_HOLE_AXIS_LOCAL);
  let armMesh;

  function getTargetAnchor() {
    return findNode(nutModel, ['oc1-2', 'oc_phai'])
      || findNode(bodyModel, ['oc1-2', 'oc_phai']);
  }

  function alignToTarget() {
    const targetAnchor = getTargetAnchor();
    if (!targetAnchor || !armMesh) return;

    const parent = rightArmModel.parent || modelStage;
    parent.updateMatrixWorld(true);
    rightArmModel.updateMatrixWorld(true);
    armMesh.updateMatrixWorld(true);

    const targetWorld = targetAnchor.getWorldPosition(new THREE.Vector3())
      .add(worldOffset);
    const targetParent = parent.worldToLocal(targetWorld);
    const holeParent = parent.worldToLocal(
      holeCenterLocal.clone().applyMatrix4(armMesh.matrixWorld),
    );

    // Chá»‰ dá»‹ch arm Ä‘á»ƒ tÃ¢m lá»— Ã˜8 bÃ¡m Ä‘Ãºng tÃ¢m á»‘c, giá»¯ nguyÃªn hÆ°á»›ng cá»§a arm.
    rightArmModel.position.add(targetParent.sub(holeParent));
    rightArmModel.updateMatrixWorld(true);
  }

  function alignSketch4ToCamCenter() {
    const targetAnchor = getTargetAnchor();
    const camCenter = nutMotion?.getCamCenter?.();
    if (!targetAnchor || !camCenter || !armMesh) return;

    const parent = rightArmModel.parent || modelStage;
    parent.updateMatrixWorld(true);
    rightArmModel.updateMatrixWorld(true);
    armMesh.updateMatrixWorld(true);

    const holeWorld = targetAnchor.getWorldPosition(new THREE.Vector3())
      .add(worldOffset);
    const targetDirection = camCenter.sub(holeWorld);
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

    // Sketch4 lÃ  Ä‘Æ°á»ng vÃ´ hÆ°á»›ng, vÃ¬ váº­y chá»n chiá»u gáº§n nháº¥t rá»“i xoay arm
    // quanh chÃ­nh trá»¥c cá»§a lá»— Ã˜8 Ä‘á»ƒ Ä‘Æ°á»ng Ä‘Ã³ Ä‘i qua tÃ¢m cam.
    if (lineDirectionWorld.dot(targetDirection) < 0) {
      targetDirection.negate();
    }
    const signedAngle = Math.atan2(
      lineDirectionWorld.clone().cross(targetDirection).dot(holeAxisWorld),
      lineDirectionWorld.dot(targetDirection),
    );
    const worldRotation = new THREE.Quaternion().setFromAxisAngle(
      holeAxisWorld,
      signedAngle,
    );
    const currentWorldQuaternion = rightArmModel.getWorldQuaternion(
      new THREE.Quaternion(),
    );
    const desiredWorldQuaternion = worldRotation.multiply(currentWorldQuaternion);
    const parentWorldQuaternion = parent.getWorldQuaternion(new THREE.Quaternion());
    rightArmModel.quaternion.copy(
      parentWorldQuaternion.invert().multiply(desiredWorldQuaternion),
    );
    rightArmModel.updateMatrixWorld(true);
  }

  function setup() {
    const targetAnchor = getTargetAnchor();
    if (!targetAnchor) {
      throw new Error('KhÃƒÂ´ng tÃƒÂ¬m thÃ¡ÂºÂ¥y tÃƒÂ¢m con Ã¡Â»â€˜c Ã„â€˜Ã¡Â»Æ’ cÃ„Æ’n right_arm.');
    }

    const parent = rightArmModel.parent || modelStage;
    parent.updateMatrixWorld(true);
    rightArmModel.updateMatrixWorld(true);

    armMesh = findNode(rightArmModel, ['right_arm-3', 'right_arm.SLDPRT'])
      || rightArmModel.getObjectByProperty('isMesh', true);

    if (armMesh) {
      // right_arm-3 cÃ³ transform riÃªng Ä‘Æ°á»£c xuáº¥t trong GLB. TÃ­nh tÃ¢m lá»—
      // báº±ng matrixWorld Ä‘á»ƒ khÃ´ng lÃ m máº¥t transform assembly Ä‘Ã³.
      alignToTarget();
      alignSketch4ToCamCenter();
      alignToTarget();
      return;
    }

    // Dá»± phÃ²ng cho GLB cÅ© cÃ³ node oc1-2 nhÆ°ng khÃ´ng cÃ³ mesh arm.
    const rightArmAnchor = findNode(rightArmModel, ['oc1-2', 'oc_phai']);
    if (rightArmAnchor) {
      const currentWorld = rightArmAnchor.matrixWorld.clone();
      const targetWorld = targetAnchor.matrixWorld.clone();
      targetWorld.elements[12] += worldOffset.x;
      targetWorld.elements[13] += worldOffset.y;
      targetWorld.elements[14] += worldOffset.z;
      const alignDelta = targetWorld.multiply(currentWorld.invert());
      const desiredWorld = alignDelta.multiply(rightArmModel.matrixWorld.clone());
      const position = new THREE.Vector3();
      const quaternion = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      desiredWorld.decompose(position, quaternion, scale);
      rightArmModel.position.copy(position);
      rightArmModel.quaternion.copy(quaternion);
      rightArmModel.scale.copy(scale);
    }
    rightArmModel.updateMatrixWorld(true);
  }

  return {
    setup,
    sync() {
      alignSketch4ToCamCenter();
      alignToTarget();
    },
  };
}

