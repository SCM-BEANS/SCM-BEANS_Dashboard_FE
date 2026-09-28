import { createMotionController, findNode } from './motionControllers.js';

const PISTON_DIRECTION = -1;

export function createPistonMotion({
  THREE,
  pistonModel,
  gearLeftButton,
  gearRightButton,
  toggleAnimationButton,
  animationSpeedInput,
}) {
  let gearController;
  let pistonController;
  let pistonControllerBasePosition;
  let gearControllerBaseRotation;

  function setup() {
    const gear = findNode(pistonModel, ['gear_piston-1', 'gear_piston']);
    const piston = findNode(pistonModel, ['piston-1', 'piston']);

    if (!gear || !piston) {
      throw new Error('KhÃ´ng tÃ¬m tháº¥y node gear_piston-1 hoáº·c piston-1 trong piston.glb.');
    }

    gearController = createMotionController(THREE, gear, 'gear_motion_controller');
    pistonController = createMotionController(THREE, piston, 'piston_motion_controller');
    if (!gearController || !pistonController) {
      throw new Error('KhÃ´ng thá»ƒ táº¡o controller cho gear/piston.');
    }

    gearControllerBaseRotation = gearController.rotation.clone();
    pistonControllerBasePosition = pistonController.position.clone();

    gearLeftButton.disabled = false;
    gearRightButton.disabled = false;
    toggleAnimationButton.disabled = false;
    animationSpeedInput.disabled = false;
    toggleAnimationButton.textContent = 'Báº­t tá»± Ä‘á»™ng';
  }

  function applyGearPose(animationAngle) {
    if (!gearController) return;
    gearController.rotation.set(
      gearControllerBaseRotation.x,
      gearControllerBaseRotation.y + animationAngle,
      gearControllerBaseRotation.z,
    );
  }

  function applyPistonPose(animationAngle) {
    if (!gearController || !pistonController) return;

    const crankRadius = 0.014;
    const connectingRodLength = 0.07;
    const crankHeight = crankRadius * Math.cos(animationAngle);
    const crankOffset = crankRadius * Math.sin(animationAngle);
    const rodHeight = Math.sqrt(
      Math.max(connectingRodLength ** 2 - crankOffset ** 2, 0),
    );
    const displacement = PISTON_DIRECTION
      * (crankHeight + rodHeight - (crankRadius + connectingRodLength));

    applyGearPose(animationAngle);
    pistonController.position.set(
      pistonControllerBasePosition.x,
      pistonControllerBasePosition.y + displacement,
      pistonControllerBasePosition.z,
    );
  }

  function applyManualPistonPose(manualDisplacement) {
    if (!pistonController) return;
    pistonController.position.set(
      pistonControllerBasePosition.x,
      pistonControllerBasePosition.y + manualDisplacement,
      pistonControllerBasePosition.z,
    );
  }

  return {
    setup,
    applyGearPose,
    applyPistonPose,
    applyManualPistonPose,
  };
}

