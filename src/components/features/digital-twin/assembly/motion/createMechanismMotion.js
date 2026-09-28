import { findNode } from './motionControllers.js';
import { createLeftArmMotion } from './leftArmMotion.js';
import { createNutMotion, NUT_PATH_SPEED } from './nutMotion.js';
import { createPistonMotion } from './pistonMotion.js';
import { createRightArmMotion } from './rightArmMotion.js';
import { createShaftMotion } from './shaftMotion.js';
import { createSupportArmRightMotion } from './supportArmRightMotion.js';

const MANUAL_STEP = Math.PI / 24;
const MANUAL_TRAVEL = 0.018;
const MANUAL_TRAVEL_SPEED = 0.045;

const RIGHT_ARM_AXIS_OFFSET = [0.002, 0, 0];
const LEFT_ARM_AXIS_OFFSET = [-0.001, 0, 0];
const MODEL12_HOLE_CENTER_LOCAL = [-0.01867293418391008, 0, -0.017758634267561094];
const SP_ARM_LEFT_SKETCH8_HOLE_CENTER_LOCAL = [0.005053852960763855, 0.001, -0.03382181743300991];
const SP_ARM_LEFT_HOLE_AXIS_LOCAL = [0, 1, 0];
const SP_ARM_LEFT_SKETCH9_CENTER_LOCAL = [-0.0004093631286091127, 0.0038, 0.030128182566990073];
const SP_ARM_RIGHT_PIN_CENTER_LOCAL = [-0.0004093631286091127, 0.002, 0.030128182566990073];
const MODEL12_SLOT_START_LOCAL = [0.01653374162677999, 0.002, -0.017808634267561095];
const MODEL12_SLOT_END_LOCAL = [0.021747065816089917, 0.002, -0.017808634267561095];
const WIPER_GEAR_LINE_START_LOCAL = [0.02765094010042036, 0.01, 0.023363392054499804];
const WIPER_GEAR_LINE_END_LOCAL = [0.03216589489335985, 0.01, 0.027314997198958524];
const WIPER_RIGHT_LINE_START_LOCAL = [-0.013385570969639125, 0.02289131566115299, 0.0063];
const WIPER_RIGHT_LINE_END_LOCAL = [-0.013385570969639125, 0.02289131566115299, 0.0325];
const WIPER_LEFT_LINE_START_LOCAL = [0.04010890466973341, 0.02289131566115299, 0.0325];
const WIPER_LEFT_LINE_END_LOCAL = [0.04010890466973341, 0.02289131566115299, 0.0063];
const RIGHT_ARM_WIPER_PIN_LOCAL = [-0.024525, 0.0052, -0.048725];
const LEFT_ARM_WIPER_PIN_LOCAL = [-0.024525, -0.0033, -0.048725];

const EMPTY_MOTION_UI = {
  gearLeftButton: { disabled: true },
  gearRightButton: { disabled: true },
  toggleAnimationButton: { disabled: true, textContent: '' },
  animationSpeedInput: { disabled: true },
};

export function createMechanismMotion({
  THREE,
  models,
  modelStage,
  config,
  onStatus,
} = {}) {
  const {
    body: bodyModel,
    piston: pistonModel,
    shaft: shaftModel,
    rightNut: nutModel,
    leftNut: leftNutModel,
    rightArm: rightArmModel,
    leftArm: leftArmModel,
    supportRight: supportArmRightModel,
    supportLeft: supportArmLeftModel,
    supportLeft2: supportArmLeft2Model,
    supportRight2: supportArmRight2Model,
    wiperGear: wiperGearModel,
    wiper: wiperModel,
  } = models;
  const camPathOffset = new THREE.Vector3(...config.camPathOffset);
  const model12HoleCenterLocal = new THREE.Vector3(...MODEL12_HOLE_CENTER_LOCAL);
  const sketch8HoleCenterLocal = new THREE.Vector3(...SP_ARM_LEFT_SKETCH8_HOLE_CENTER_LOCAL);
  const sketch9CenterLocal = new THREE.Vector3(...SP_ARM_LEFT_SKETCH9_CENTER_LOCAL);
  const rightPinCenterLocal = new THREE.Vector3(...SP_ARM_RIGHT_PIN_CENTER_LOCAL);
  const holeAxisLocal = new THREE.Vector3(...SP_ARM_LEFT_HOLE_AXIS_LOCAL);
  const slotStartLocal = new THREE.Vector3(...MODEL12_SLOT_START_LOCAL);
  const slotEndLocal = new THREE.Vector3(...MODEL12_SLOT_END_LOCAL);
  const wiperGearLineStartLocal = new THREE.Vector3(...WIPER_GEAR_LINE_START_LOCAL);
  const wiperGearLineEndLocal = new THREE.Vector3(...WIPER_GEAR_LINE_END_LOCAL);
  const wiperRightLineStartLocal = new THREE.Vector3(...WIPER_RIGHT_LINE_START_LOCAL);
  const wiperRightLineEndLocal = new THREE.Vector3(...WIPER_RIGHT_LINE_END_LOCAL);
  const wiperLeftLineStartLocal = new THREE.Vector3(...WIPER_LEFT_LINE_START_LOCAL);
  const wiperLeftLineEndLocal = new THREE.Vector3(...WIPER_LEFT_LINE_END_LOCAL);
  const rightArmWiperPinLocal = new THREE.Vector3(...RIGHT_ARM_WIPER_PIN_LOCAL);
  const leftArmWiperPinLocal = new THREE.Vector3(...LEFT_ARM_WIPER_PIN_LOCAL);
  const rightArmAxisOffset = new THREE.Vector3(...RIGHT_ARM_AXIS_OFFSET);
  const leftArmAxisOffset = new THREE.Vector3(...LEFT_ARM_AXIS_OFFSET);

  const pistonMotion = createPistonMotion({
    THREE,
    pistonModel,
    ...EMPTY_MOTION_UI,
  });
  const shaftMotion = createShaftMotion({ THREE, shaftModel, bodyModel, modelStage });
  const nutMotion = createNutMotion({
    THREE,
    nutModel,
    bodyModel,
    modelStage,
    anchorShift: 0,
    pathOffset: camPathOffset,
    initialProgress: config.camInitialProgress,
  });
  const leftNutMotion = createNutMotion({
    THREE,
    nutModel: leftNutModel,
    bodyModel,
    modelStage,
    nutAnchorNames: ['oc1-1', 'oc_trai'],
    bodyAnchorNames: ['oc1-1', 'oc_trai'],
    assetLabel: 'oc_trai.glb',
    anchorShift: 0,
    pathOffset: camPathOffset,
    initialProgress: config.camInitialProgress,
  });
  const rightArmMotion = createRightArmMotion({
    THREE,
    rightArmModel,
    bodyModel,
    nutModel,
    nutMotion,
    modelStage,
    worldOffset: rightArmAxisOffset,
  });
  const leftArmMotion = createLeftArmMotion({
    THREE,
    leftArmModel,
    leftNutModel,
    nutMotion: leftNutMotion,
    bodyModel,
    modelStage,
    worldOffset: leftArmAxisOffset,
  });
  const supportArmRightMotion = createSupportArmRightMotion({
    THREE,
    supportArmRightModel,
    nutModel,
    holeCenterLocal: sketch8HoleCenterLocal,
  });
  const supportArmLeftMotion = createSupportArmRightMotion({
    THREE,
    supportArmRightModel: supportArmLeftModel,
    nutModel: leftNutModel,
    meshNames: ['1-4'],
    nutNames: ['oc1-1', 'oc_trai'],
    holeCenterLocal: sketch8HoleCenterLocal,
  });

  let status = 'idle';
  let constraintStatus = 'not-initialized';
  let acceptedMotionPose;
  let animationAngle = 0;
  let animationPlaying = false;
  let manualDirection = 0;
  let manualDisplacement = 0;
  let animationSpeed = 1;
  let disposed = false;

  function reportStatus(nextStatus, details = {}) {
    status = nextStatus;
    onStatus?.({ status: nextStatus, constraintStatus, ...details });
  }

  function arrangeModelsTogether() {
    for (const model of [
      bodyModel, pistonModel, shaftModel, nutModel, leftNutModel,
      rightArmModel, leftArmModel, supportArmRightModel, supportArmLeft2Model,
    ]) {
      model.position.set(0, 0, 0);
      model.updateMatrixWorld(true);
    }
    wiperGearModel.updateMatrixWorld(true);

    const alignModelAnchor = (targetModel, targetNames, sourceModel, sourceNames) => {
      const targetAnchor = findNode(targetModel, targetNames);
      const sourceAnchor = findNode(sourceModel, sourceNames);
      if (!targetAnchor || !sourceAnchor) return;
      targetModel.updateMatrixWorld(true);
      sourceModel.updateMatrixWorld(true);
      const alignDelta = targetAnchor.matrixWorld.clone()
        .multiply(sourceAnchor.matrixWorld.clone().invert());
      const desiredWorld = alignDelta.multiply(sourceModel.matrixWorld.clone());
      desiredWorld.decompose(sourceModel.position, sourceModel.quaternion, sourceModel.scale);
      sourceModel.updateMatrixWorld(true);
    };

    alignModelAnchor(bodyModel, ['gear_piston-1', 'gear_piston'], pistonModel, ['gear_piston-1', 'gear_piston']);
    alignModelAnchor(bodyModel, ['truc-1', 'truc'], shaftModel, ['truc-1', 'truc']);
    alignModelAnchor(bodyModel, ['oc1-2', 'oc_phai'], nutModel, ['oc1-2', 'oc_phai']);
    alignModelAnchor(bodyModel, ['oc1-1', 'oc_trai'], leftNutModel, ['oc1-1', 'oc_trai']);

    const bodyShaftAnchor = findNode(bodyModel, ['truc-1', 'truc']);
    const bodySupportAnchor = findNode(bodyModel, ['13-1']) || bodyShaftAnchor;
    const supportAnchor = findNode(supportArmRightModel, ['13-1'])
      || findNode(supportArmRightModel, ['truc-1', 'truc']);
    if (bodySupportAnchor && supportAnchor) {
      alignModelAnchor(bodyModel, ['13-1'], supportArmRightModel, ['13-1']);
    }

    const shaftModelPartAnchor = findNode(shaftModel, ['12-1']);
    const supportPartAnchor = findNode(supportArmLeft2Model, ['12-1']);
    const shaftReference = findNode(shaftModel, ['truc-1', 'truc']);
    if (shaftModelPartAnchor && supportPartAnchor && shaftReference) {
      alignModelAnchor(shaftModel, ['12-1'], supportArmLeft2Model, ['12-1']);
      const holeWorld = supportPartAnchor.localToWorld(model12HoleCenterLocal.clone());
      const shaftFrame = shaftReference.matrixWorld.clone();
      const holeInShaftFrame = holeWorld.clone().applyMatrix4(shaftFrame.clone().invert());
      holeInShaftFrame.x = 0;
      holeInShaftFrame.z = 0;
      const targetHoleWorld = holeInShaftFrame.applyMatrix4(shaftFrame);
      const correctionWorld = targetHoleWorld.sub(holeWorld);
      const rootWorld = supportArmLeft2Model.getWorldPosition(new THREE.Vector3()).add(correctionWorld);
      supportArmLeft2Model.position.copy(supportArmLeft2Model.parent.worldToLocal(rootWorld));
      supportArmLeft2Model.updateMatrixWorld(true);
    }

    const rightPart = findNode(supportArmRight2Model, ['12-2']);
    const rightReference = findNode(shaftModel, ['12-2']);
    if (!rightPart || !rightReference || !shaftReference) {
      throw new Error('Thiếu mốc 12-2 để lắp sp2_arm_right.');
    }
    supportArmRight2Model.updateWorldMatrix(true, true);
    rightReference.updateWorldMatrix(true, false);
    const rightDesired = rightReference.matrixWorld.clone()
      .multiply(rightPart.matrixWorld.clone().invert())
      .multiply(supportArmRight2Model.matrixWorld);
    const rightLocal = supportArmRight2Model.parent.matrixWorld.clone().invert().multiply(rightDesired);
    rightLocal.decompose(
      supportArmRight2Model.position,
      supportArmRight2Model.quaternion,
      supportArmRight2Model.scale,
    );
    supportArmRight2Model.updateMatrixWorld(true);
    const rightHole = rightPart.localToWorld(model12HoleCenterLocal.clone());
    const rightHoleInShaft = rightHole.clone().applyMatrix4(shaftReference.matrixWorld.clone().invert());
    rightHoleInShaft.x = 0;
    rightHoleInShaft.z = 0;
    const correction = rightHoleInShaft.applyMatrix4(shaftReference.matrixWorld).sub(rightHole);
    const rightRoot = supportArmRight2Model.getWorldPosition(new THREE.Vector3()).add(correction);
    supportArmRight2Model.position.copy(supportArmRight2Model.parent.worldToLocal(rightRoot));
    supportArmRight2Model.updateMatrixWorld(true);
  }

  function alignSupportArmLeftHoleToLeftNut() {
    const supportLeftMesh = findNode(supportArmLeftModel, ['1-4']);
    const supportLeftTarget = findNode(leftNutModel, ['oc1-1', 'oc_trai']);
    if (!supportLeftMesh || !supportLeftTarget) return;
    supportArmLeftModel.updateMatrixWorld(true);
    supportLeftMesh.updateMatrixWorld(true);
    supportLeftTarget.updateMatrixWorld(true);
    const holeWorld = supportLeftMesh.localToWorld(sketch8HoleCenterLocal.clone());
    const targetWorld = supportLeftTarget.getWorldPosition(new THREE.Vector3());
    const holeAxisWorld = holeAxisLocal.clone()
      .transformDirection(supportLeftMesh.matrixWorld)
      .normalize();
    const correctionWorld = targetWorld.sub(holeWorld).projectOnPlane(holeAxisWorld);
    const rootWorld = supportArmLeftModel.getWorldPosition(new THREE.Vector3()).add(correctionWorld);
    supportArmLeftModel.position.copy(supportArmLeftModel.parent.worldToLocal(rootWorld));
    supportArmLeftModel.updateMatrixWorld(true);
  }

  function syncSupportLeftSketch9ToSlot(right = false) {
    const support = right ? supportArmRightModel : supportArmLeftModel;
    const mesh = findNode(support, right ? ['13-1'] : ['1-4']);
    const slotMesh = findNode(
      right ? supportArmRight2Model : supportArmLeft2Model,
      right ? ['12-2'] : ['12-1'],
    );
    if (!mesh || !slotMesh) throw new Error('Thiếu model để căn Sketch9 vào Sketch3.');
    mesh.updateWorldMatrix(true, false);
    slotMesh.updateWorldMatrix(true, false);
    const pivot = mesh.localToWorld(sketch8HoleCenterLocal.clone());
    const axis = holeAxisLocal.clone().transformDirection(mesh.matrixWorld);
    const radius = mesh.localToWorld((right ? rightPinCenterLocal : sketch9CenterLocal).clone())
      .sub(pivot).projectOnPlane(axis);
    const start = slotMesh.localToWorld(slotStartLocal.clone()).sub(pivot).projectOnPlane(axis);
    const end = slotMesh.localToWorld(slotEndLocal.clone()).sub(pivot).projectOnPlane(axis);
    const direction = end.clone().sub(start);
    const a = direction.lengthSq();
    const b = 2 * start.dot(direction);
    const c = start.lengthSq() - radius.lengthSq();
    const discriminant = b * b - 4 * a * c;
    if (a < 1e-16 || discriminant < -1e-20) return false;
    const tolerance = 1e-7;
    const margin = tolerance / Math.sqrt(a);
    const angles = [(-b - Math.sqrt(Math.max(0, discriminant))) / (2 * a),
      (-b + Math.sqrt(Math.max(0, discriminant))) / (2 * a)]
      .filter(t => t >= -margin && t <= 1 + margin)
      .map(t => {
        const target = start.clone().addScaledVector(direction, THREE.MathUtils.clamp(t, 0, 1));
        return Math.atan2(radius.clone().cross(target).dot(axis), radius.dot(target));
      });
    if (!angles.length) return false;
    const angle = angles.sort((x, y) => Math.abs(x) - Math.abs(y))[0];
    const rotation = new THREE.Quaternion().setFromAxisAngle(axis, angle);
    const position = support.getWorldPosition(new THREE.Vector3())
      .sub(pivot).applyQuaternion(rotation).add(pivot);
    const orientation = rotation.clone().multiply(support.getWorldQuaternion(new THREE.Quaternion()));
    const parent = support.parent;
    support.position.copy(parent.worldToLocal(position));
    support.quaternion.copy(parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(orientation));
    support.updateMatrixWorld(true);
    return true;
  }

  function followLeftNutWithShaft() {
    const supports = [supportArmLeftModel, supportArmRightModel];
    const savedSupports = supports.map(model => ({
      position: model.position.clone(), quaternion: model.quaternion.clone(),
    }));
    const restoreSupports = () => supports.forEach((model, index) => {
      model.position.copy(savedSupports[index].position);
      model.quaternion.copy(savedSupports[index].quaternion);
      model.updateMatrixWorld(true);
    });
    const syncBoth = () => {
      restoreSupports();
      if (syncSupportLeftSketch9ToSlot() && syncSupportLeftSketch9ToSlot(true)) return true;
      restoreSupports();
      return false;
    };
    if (syncBoth()) return true;
    const controller = shaftMotion.getController();
    controller.updateWorldMatrix(true, true);
    const center = controller.getWorldPosition(new THREE.Vector3());
    const axis = new THREE.Vector3(0, 1, 0).transformDirection(controller.matrixWorld);
    const candidates = [];
    for (const right of [false, true]) {
      const mesh = findNode(right ? supportArmRightModel : supportArmLeftModel, right ? ['13-1'] : ['1-4']);
      const slot = findNode(right ? supportArmRight2Model : supportArmLeft2Model, right ? ['12-2'] : ['12-1']);
      mesh.updateWorldMatrix(true, false);
      const pivot = mesh.localToWorld(sketch8HoleCenterLocal.clone());
      const pin = mesh.localToWorld((right ? rightPinCenterLocal : sketch9CenterLocal).clone());
      const radius = pin.sub(pivot).projectOnPlane(axis).length();
      const p = pivot.sub(center).projectOnPlane(axis);
      const a = slot.localToWorld(slotStartLocal.clone()).sub(center).projectOnPlane(axis);
      const b = slot.localToWorld(slotEndLocal.clone()).sub(center).projectOnPlane(axis);
      const addSolutions = (vector, value) => {
        const x = p.dot(vector);
        const y = p.dot(axis.clone().cross(vector));
        const magnitude = Math.hypot(x, y);
        if (magnitude < 1e-16 || Math.abs(value) > magnitude + 1e-14) return;
        const phase = Math.atan2(y, x);
        const offset = Math.acos(THREE.MathUtils.clamp(value / magnitude, -1, 1));
        for (const angle of [phase - offset, phase + offset]) {
          candidates.push(Math.atan2(Math.sin(angle), Math.cos(angle)));
        }
      };
      for (const endpoint of [a, b]) {
        addSolutions(endpoint, (p.lengthSq() + endpoint.lengthSq() - radius * radius) / 2);
      }
      const normal = axis.clone().cross(b.clone().sub(a)).normalize();
      const distance = normal.dot(a);
      addSolutions(normal, distance - radius);
      addSolutions(normal, distance + radius);
    }
    const original = controller.quaternion.clone();
    for (const angle of candidates.sort((x, y) => Math.abs(x) - Math.abs(y))) {
      controller.quaternion.copy(original).multiply(
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle),
      );
      controller.updateMatrixWorld(true);
      if (syncBoth()) return true;
    }
    controller.quaternion.copy(original);
    controller.updateMatrixWorld(true);
    return false;
  }

  function alignWiperGearToShaft() {
    const gear = findNode(wiperGearModel, ['wiper_gear-2']);
    const shaft = findNode(shaftModel, ['truc-1', 'truc']);
    if (!gear || !shaft) throw new Error('Missing wiper gear or shaft anchor.');
    wiperGearModel.updateWorldMatrix(true, true);
    shaft.updateWorldMatrix(true, false);
    const center = gear.localToWorld(new THREE.Vector3(0, 0.01, 0));
    const axis = new THREE.Vector3(0, 1, 0).transformDirection(shaft.matrixWorld);
    const origin = shaft.getWorldPosition(new THREE.Vector3());
    const target = origin.clone().addScaledVector(axis, center.clone().sub(origin).dot(axis) + 0.003);
    const rootWorld = wiperGearModel.getWorldPosition(new THREE.Vector3()).add(target.sub(center));
    wiperGearModel.position.copy(wiperGearModel.parent.worldToLocal(rootWorld));
    wiperGearModel.updateMatrixWorld(true);
  }

  function syncWiperGearLineToRightSketch8() {
    const gear = findNode(wiperGearModel, ['wiper_gear-2']);
    const support = findNode(supportArmRightModel, ['13-1']);
    const shaft = findNode(shaftModel, ['truc-1', 'truc']);
    if (!gear || !support || !shaft) return false;
    modelStage.updateMatrixWorld(true);
    const circleCenter = gear.localToWorld(new THREE.Vector3(0, 0.01, 0));
    const lineStart = gear.localToWorld(wiperGearLineStartLocal.clone());
    const lineEnd = gear.localToWorld(wiperGearLineEndLocal.clone());
    const lineDirection = lineEnd.clone().sub(lineStart);
    const axis = new THREE.Vector3(0, 1, 0).transformDirection(shaft.matrixWorld).normalize();
    const target = support.localToWorld(rightPinCenterLocal.clone());
    const targetRadial = target.clone().sub(circleCenter).projectOnPlane(axis);
    const startRadial = lineStart.clone().sub(circleCenter).projectOnPlane(axis);
    const directionRadial = lineDirection.clone().projectOnPlane(axis);
    const a = directionRadial.lengthSq();
    const b = 2 * startRadial.dot(directionRadial);
    const c = startRadial.lengthSq() - targetRadial.lengthSq();
    const discriminant = b * b - 4 * a * c;
    if (a < 1e-16 || discriminant < -1e-20) return false;
    const root = Math.sqrt(Math.max(0, discriminant));
    const candidates = [-1, 1].map(sign => {
      const t = (-b + sign * root) / (2 * a);
      const point = startRadial.clone().addScaledVector(directionRadial, t);
      const angle = targetRadial.lengthSq() < 1e-20
        ? 0
        : Math.atan2(point.clone().cross(targetRadial).dot(axis), point.dot(targetRadial));
      return { t, angle };
    });
    const segmentDistance = t => Math.max(0, -t, t - 1);
    const solution = candidates.sort((left, right) =>
      segmentDistance(left.t) - segmentDistance(right.t)
      || Math.abs(left.angle) - Math.abs(right.angle))[0];
    const rotation = new THREE.Quaternion().setFromAxisAngle(axis, solution.angle);
    const rootWorld = wiperGearModel.getWorldPosition(new THREE.Vector3())
      .sub(circleCenter).applyQuaternion(rotation).add(circleCenter);
    const orientation = rotation.clone().multiply(wiperGearModel.getWorldQuaternion(new THREE.Quaternion()));
    wiperGearModel.position.copy(wiperGearModel.parent.worldToLocal(rootWorld));
    wiperGearModel.quaternion.copy(wiperGearModel.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(orientation));
    wiperGearModel.updateMatrixWorld(true);
    return true;
  }

  function syncWiperLinesToArmPins() {
    const wiper = findNode(wiperModel, ['wiper-1']);
    const rightArm = findNode(rightArmModel, ['right_arm-3']);
    const leftArm = findNode(leftArmModel, ['left_arm-2']);
    if (!wiper || !rightArm || !leftArm) return false;
    modelStage.updateMatrixWorld(true);
    const rightStart = wiper.localToWorld(wiperRightLineStartLocal.clone());
    const rightEnd = wiper.localToWorld(wiperRightLineEndLocal.clone());
    const leftStart = wiper.localToWorld(wiperLeftLineStartLocal.clone());
    const leftEnd = wiper.localToWorld(wiperLeftLineEndLocal.clone());
    const rightPin = rightArm.localToWorld(rightArmWiperPinLocal.clone());
    const leftPin = leftArm.localToWorld(leftArmWiperPinLocal.clone());
    const rightAxis = new THREE.Vector3(0, 1, 0).transformDirection(rightArm.matrixWorld).normalize();
    const leftAxis = new THREE.Vector3(0, 1, 0).transformDirection(leftArm.matrixWorld).normalize();
    if (rightAxis.dot(leftAxis) < 0) leftAxis.negate();
    if (rightAxis.clone().cross(leftAxis).length() > 1e-7) return false;
    const rightMid = rightStart.clone().add(rightEnd).multiplyScalar(0.5);
    const leftMid = leftStart.clone().add(leftEnd).multiplyScalar(0.5);
    const lineDirection = rightEnd.clone().sub(rightStart).normalize();
    const lineSeparation = leftMid.clone().sub(rightMid);
    const lineLength = lineSeparation.length();
    if (lineLength < 1e-16) return false;
    const sourceD = lineDirection;
    const sourceN = lineSeparation.clone().normalize();
    const sourceB = sourceD.clone().cross(sourceN).normalize();
    const targetD = sourceD.clone();
    const separationNormal = targetD.clone().cross(rightAxis).normalize();
    if (separationNormal.lengthSq() < 1e-16) return false;
    const targetA = targetD.clone().cross(separationNormal).normalize();
    const projectedAxisSeparation = leftPin.clone().sub(rightPin).dot(separationNormal);
    const axialComponent = Math.sqrt(Math.max(0,
      lineLength * lineLength - projectedAxisSeparation * projectedAxisSeparation));
    const sign = Math.sign(leftPin.clone().sub(rightPin).dot(targetA)) || -1;
    const targetN = targetA.multiplyScalar(sign * axialComponent)
      .addScaledVector(separationNormal, projectedAxisSeparation).normalize();
    const targetB = targetD.clone().cross(targetN).normalize();
    if (targetN.lengthSq() < 1e-16) return false;
    const sourceBasis = new THREE.Matrix4().makeBasis(sourceD, sourceN, sourceB);
    const targetBasis = new THREE.Matrix4().makeBasis(targetD, targetN, targetB);
    const rotation = new THREE.Quaternion().setFromRotationMatrix(targetBasis.multiply(sourceBasis.invert()));
    const pivot = rightMid;
    const currentRoot = wiperModel.getWorldPosition(new THREE.Vector3());
    const rotatedRoot = currentRoot.clone().sub(pivot).applyQuaternion(rotation).add(pivot);
    const rotatedRightMid = rightMid.clone().sub(pivot).applyQuaternion(rotation).add(pivot);
    const lineAxisNormal = targetD.clone().cross(rightAxis).normalize();
    const correction = lineAxisNormal.multiplyScalar(rightPin.clone().sub(rotatedRightMid).dot(lineAxisNormal));
    const rootWorld = rotatedRoot.add(correction);
    const orientation = rotation.clone().multiply(wiperModel.getWorldQuaternion(new THREE.Quaternion()));
    wiperModel.position.copy(wiperModel.parent.worldToLocal(rootWorld));
    wiperModel.quaternion.copy(wiperModel.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(orientation));
    wiperModel.updateMatrixWorld(true);
    const finalRightStart = wiper.localToWorld(wiperRightLineStartLocal.clone());
    const finalRightEnd = wiper.localToWorld(wiperRightLineEndLocal.clone());
    const finalLeftStart = wiper.localToWorld(wiperLeftLineStartLocal.clone());
    const finalLeftEnd = wiper.localToWorld(wiperLeftLineEndLocal.clone());
    const finalRightDirection = finalRightEnd.sub(finalRightStart).normalize();
    const finalLeftDirection = finalLeftEnd.sub(finalLeftStart).normalize();
    const rightError = Math.abs(rightPin.clone().sub(finalRightStart)
      .dot(finalRightDirection.clone().cross(rightAxis).normalize()));
    const leftError = Math.abs(leftPin.clone().sub(finalLeftStart)
      .dot(finalLeftDirection.clone().cross(leftAxis).normalize()));
    return rightError < 1e-7 && leftError < 1e-7;
  }

  function rememberMotionPose() {
    if (!acceptedMotionPose) {
      const transforms = [];
      modelStage.traverse(object => transforms.push({
        object,
        position: object.position.clone(),
        quaternion: object.quaternion.clone(),
        scale: object.scale.clone(),
      }));
      acceptedMotionPose = { transforms };
    }
    for (const entry of acceptedMotionPose.transforms) {
      entry.position.copy(entry.object.position);
      entry.quaternion.copy(entry.object.quaternion);
      entry.scale.copy(entry.object.scale);
    }
    Object.assign(acceptedMotionPose, {
      angle: animationAngle,
      displacement: manualDisplacement,
      rightProgress: nutMotion.getProgress(),
      leftProgress: leftNutMotion.getProgress(),
    });
  }

  function finishConstrainedMotionPose() {
    if (followLeftNutWithShaft()
      && syncWiperGearLineToRightSketch8()
      && syncWiperLinesToArmPins()) {
      constraintStatus = 'satisfied';
      rememberMotionPose();
      onStatus?.({ status, constraintStatus });
      return true;
    }
    if (!acceptedMotionPose) {
      constraintStatus = 'unsatisfied';
      return false;
    }
    const saved = acceptedMotionPose;
    animationAngle = saved.angle;
    manualDisplacement = saved.displacement;
    nutMotion.setProgress(saved.rightProgress);
    leftNutMotion.setProgress(saved.leftProgress);
    for (const entry of saved.transforms) {
      entry.object.position.copy(entry.position);
      entry.object.quaternion.copy(entry.quaternion);
      entry.object.scale.copy(entry.scale);
      entry.object.updateMatrix();
    }
    modelStage.updateMatrixWorld(true);
    animationPlaying = false;
    manualDirection = 0;
    constraintStatus = 'rollback';
    onStatus?.({ status, constraintStatus });
    return false;
  }

  function applyManualMotionPose() {
    pistonMotion.applyGearPose(animationAngle);
    pistonMotion.applyManualPistonPose(manualDisplacement);
    rightArmMotion.sync();
    leftArmMotion.sync();
    supportArmRightMotion.sync();
    supportArmLeftMotion.sync();
    finishConstrainedMotionPose();
  }

  function updatePistonMotion(deltaSeconds) {
    if (manualDirection) {
      const previousProgress = leftNutMotion.getProgress();
      nutMotion.advanceProgress(-manualDirection * deltaSeconds * animationSpeed * NUT_PATH_SPEED);
      leftNutMotion.advanceProgress(-manualDirection * deltaSeconds * animationSpeed * NUT_PATH_SPEED);
      const travelled = leftNutMotion.getProgress() - previousProgress;
      animationAngle = (animationAngle - travelled * Math.PI / NUT_PATH_SPEED) % (Math.PI * 2);
      manualDisplacement = THREE.MathUtils.clamp(
        manualDisplacement - travelled * MANUAL_TRAVEL_SPEED / NUT_PATH_SPEED,
        -MANUAL_TRAVEL,
        MANUAL_TRAVEL,
      );
      applyManualMotionPose();
      return;
    }
    if (!animationPlaying) return;
    animationAngle = (animationAngle + deltaSeconds * animationSpeed * Math.PI) % (Math.PI * 2);
    nutMotion.setProgress((1 - Math.cos(animationAngle)) * 0.5);
    leftNutMotion.setProgress((1 - Math.cos(animationAngle)) * 0.5);
    pistonMotion.applyPistonPose(animationAngle);
    rightArmMotion.sync();
    leftArmMotion.sync();
    supportArmRightMotion.sync();
    supportArmLeftMotion.sync();
    finishConstrainedMotionPose();
  }

  function setup() {
    status = 'loading';
    pistonMotion.setup();
    arrangeModelsTogether();
    alignWiperGearToShaft();
    shaftMotion.setup();
    shaftMotion.attachFollower(supportArmLeft2Model);
    shaftMotion.attachFollower(supportArmRight2Model);
    nutMotion.setup();
    leftNutMotion.setup();
    alignSupportArmLeftHoleToLeftNut();
    supportArmRightMotion.setup();
    supportArmLeftMotion.setup();
    if (!followLeftNutWithShaft()) {
      const error = new Error('Tư thế ban đầu không thỏa ràng buộc Sketch9–Sketch3.');
      error.code = 'INITIAL_CONSTRAINT_UNSATISFIED';
      throw error;
    }
    rightArmMotion.setup();
    leftArmMotion.setup();
    if (!syncWiperGearLineToRightSketch8() || !syncWiperLinesToArmPins()) {
      const error = new Error('Cannot connect wiper Sketch14/15 lines to arm pins.');
      error.code = 'WIPER_LINK_UNSATISFIED';
      throw error;
    }
    rememberMotionPose();
    constraintStatus = 'satisfied';
    reportStatus('ready');
  }

  function update(deltaSeconds) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new TypeError('deltaSeconds must be a non-negative finite number.');
    }
    if (disposed || status !== 'ready') return;
    updatePistonMotion(deltaSeconds);
  }

  function setAnimationPlaying(playing) {
    animationPlaying = Boolean(playing);
    if (animationPlaying) manualDirection = 0;
  }

  function setAnimationSpeed(speed) {
    if (!Number.isFinite(speed) || speed < 0) {
      throw new TypeError('Animation speed must be a non-negative finite number.');
    }
    animationSpeed = speed;
  }

  function setManualDirection(direction) {
    if (![-1, 0, 1].includes(direction)) {
      throw new RangeError('Manual direction must be -1, 0 or 1.');
    }
    manualDirection = direction;
    if (direction) animationPlaying = false;
  }

  function stepManual(direction) {
    if (![-1, 1].includes(direction)) {
      throw new RangeError('Manual step direction must be -1 or 1.');
    }
    animationPlaying = false;
    manualDirection = 0;
    const previousProgress = leftNutMotion.getProgress();
    const requested = -direction * MANUAL_STEP / (Math.PI * 2);
    nutMotion.advanceProgress(requested);
    leftNutMotion.advanceProgress(requested);
    const fraction = requested === 0
      ? 0
      : (leftNutMotion.getProgress() - previousProgress) / requested;
    animationAngle = (animationAngle + direction * MANUAL_STEP * fraction) % (Math.PI * 2);
    manualDisplacement = THREE.MathUtils.clamp(
      manualDisplacement + direction * MANUAL_TRAVEL / 8 * fraction,
      -MANUAL_TRAVEL,
      MANUAL_TRAVEL,
    );
    applyManualMotionPose();
    return getState();
  }

  function getState() {
    return {
      status,
      constraintStatus,
      animationPlaying,
      animationSpeed,
      manualDirection,
      animationAngle,
      manualDisplacement,
      rightProgress: nutMotion.getProgress(),
      leftProgress: leftNutMotion.getProgress(),
      disposed,
    };
  }

  function dispose() {
    disposed = true;
    status = 'disposed';
  }

  return {
    setup,
    update,
    setAnimationPlaying,
    setAnimationSpeed,
    setManualDirection,
    stepManual,
    getState,
    dispose,
    getModels: () => ({
      body: bodyModel,
      piston: pistonModel,
      shaft: shaftModel,
      rightNut: nutModel,
      leftNut: leftNutModel,
      rightArm: rightArmModel,
      leftArm: leftArmModel,
      supportRight: supportArmRightModel,
      supportLeft: supportArmLeftModel,
      supportLeft2: supportArmLeft2Model,
      supportRight2: supportArmRight2Model,
      wiperGear: wiperGearModel,
      wiper: wiperModel,
    }),
  };
}
