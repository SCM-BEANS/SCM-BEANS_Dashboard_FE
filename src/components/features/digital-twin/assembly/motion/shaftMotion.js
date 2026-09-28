import { findNode } from './motionControllers.js';

const SHAFT_AXIS = [0, 1, 0];

export function createShaftMotion({ THREE, shaftModel, bodyModel, modelStage }) {
  let shaftController;
  let shaftControllerBaseQuaternion;

  function setup() {
    const shaft = findNode(shaftModel, ['truc-1', 'truc']);
    const bodyHole = findNode(bodyModel, ['truc-1', 'truc']);
    if (!shaft || !bodyHole) {
      throw new Error('KhÃ´ng tÃ¬m tháº¥y tÃ¢m trá»¥c hoáº·c lá»— truc-1.');
    }

    shaftModel.updateMatrixWorld(true);
    bodyHole.updateMatrixWorld(true);
    const shaftWorld = shaftModel.matrixWorld.clone();
    const holeWorld = bodyHole.matrixWorld.clone();

    shaftController = new THREE.Group();
    shaftController.name = 'shaft_hole_pivot';
    modelStage.add(shaftController);
    holeWorld.decompose(
      shaftController.position,
      shaftController.quaternion,
      shaftController.scale,
    );
    shaftController.updateMatrixWorld(true);

    modelStage.remove(shaftModel);
    shaftController.add(shaftModel);
    const localShaftWorld = shaftController.matrixWorld.clone().invert().multiply(shaftWorld);
    const localPosition = new THREE.Vector3();
    const localQuaternion = new THREE.Quaternion();
    const localScale = new THREE.Vector3();
    localShaftWorld.decompose(localPosition, localQuaternion, localScale);
    shaftModel.position.copy(localPosition);
    shaftModel.quaternion.copy(localQuaternion);
    shaftModel.scale.copy(localScale);
    shaftModel.updateMatrixWorld(true);

    shaftControllerBaseQuaternion = shaftController.quaternion.clone();
  }

  function applyPose(animationAngle) {
    if (!shaftController) return;
    const shaftSpin = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(...SHAFT_AXIS),
      animationAngle,
    );
    shaftController.quaternion.copy(shaftControllerBaseQuaternion).multiply(shaftSpin);
  }

  function attachFollower(follower) {
    if (!shaftController || !follower) return;
    shaftController.attach(follower);
  }

  return { setup, applyPose, attachFollower, getController: () => shaftController };
}

