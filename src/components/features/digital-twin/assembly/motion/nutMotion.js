import {
  createAnchorMotionController,
  findNode,
} from './motionControllers.js';

export const NUT_PATH_SPEED = 0.7;

const SKETCH11_LINE_END = [0.006600000000001082, 0.06509104353730492, 0.002];
const SKETCH11_LINE_START = [0.006600000000001082, 0.08013466546621638, 0.002];
const SKETCH11_ARC_END = [0.02975023972022662, 0.07253417429182737, 0.002];
const SKETCH11_ARC_CENTER = [0.007940308640865293, 0.04516033812819277, 0.002];
const SKETCH11_ARC_RADIUS = 0.035;
const SKETCH11_PLANE_ROTATION_Y = Math.PI / 2;
const SKETCH11_PATH_ROTATION = 0;
const SKETCH11_FLIP_LOCAL_Y = true;
const SKETCH11_ANCHOR_SHIFT = 0.009;

function createCircularArcCurve3(THREE) {
  return class CircularArcCurve3 extends THREE.Curve {
    constructor(center, radius, startAngle, deltaAngle, basisX, basisY) {
      super();
      this.center = center.clone();
      this.radius = radius;
      this.startAngle = startAngle;
      this.deltaAngle = deltaAngle;
      this.basisX = basisX.clone().normalize();
      this.basisY = basisY.clone().normalize();
    }

    getPoint(t, target = new THREE.Vector3()) {
      const angle = this.startAngle + this.deltaAngle * t;
      return target.copy(this.center)
        .addScaledVector(this.basisX, this.radius * Math.cos(angle))
        .addScaledVector(this.basisY, this.radius * Math.sin(angle));
    }
  };
}

export function createNutMotion({
  THREE,
  nutModel,
  bodyModel,
  modelStage,
  nutAnchorNames = ['oc1-2', 'oc_phai'],
  bodyAnchorNames = ['oc1-2', 'oc_phai'],
  assetLabel = 'oc_phai.glb',
  anchorShift = SKETCH11_ANCHOR_SHIFT,
  pathOffset = new THREE.Vector3(),
  initialProgress = 0,
}) {
  const CircularArcCurve3 = createCircularArcCurve3(THREE);
  const sketch11LineEnd = new THREE.Vector3(...SKETCH11_LINE_END);
  const sketch11LineStart = new THREE.Vector3(...SKETCH11_LINE_START);
  const sketch11ArcEnd = new THREE.Vector3(...SKETCH11_ARC_END);
  const sketch11ArcCenter = new THREE.Vector3(...SKETCH11_ARC_CENTER);
  let nutController;
  let nutPath;
  let nutPathGuide;
  let camCenterMarker;
  let camCenter;
  let nutProgress = 0;

  function setup() {
    const nut = findNode(nutModel, nutAnchorNames);
    const bodyNutAnchor = findNode(bodyModel, bodyAnchorNames);
    if (!nut) throw new Error('KhÃ´ng tÃ¬m tháº¥y node oc1-2 trong oc_phai.glb.');
    if (!bodyNutAnchor) throw new Error('KhÃ´ng tÃ¬m tháº¥y má»‘c oc1-2 trÃªn body.');

    nutController = createAnchorMotionController(
      THREE,
      nutModel,
      nut,
      'nut_groove_controller',
      modelStage,
    );

    const bodyAnchorWorld = bodyNutAnchor.getWorldPosition(new THREE.Vector3());
    const bodyWorldQuaternion = bodyModel.getWorldQuaternion(new THREE.Quaternion());
    const sketchPlaneRotation = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      SKETCH11_PLANE_ROTATION_Y,
    );
    const sketchPathRotation = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 0, 1),
      SKETCH11_PATH_ROTATION,
    );
    const transformSketchOffset = (point) => {
      const offset = point.clone().sub(sketch11LineEnd);
      if (SKETCH11_FLIP_LOCAL_Y) offset.y *= -1;
      return offset
        .applyQuaternion(sketchPathRotation)
        .applyQuaternion(sketchPlaneRotation)
        .applyQuaternion(bodyWorldQuaternion);
    };
    const sketchBasisX = new THREE.Vector3(1, 0, 0)
      .applyQuaternion(sketchPathRotation)
      .applyQuaternion(sketchPlaneRotation)
      .applyQuaternion(bodyWorldQuaternion)
      .normalize();
    const sketchBasisY = new THREE.Vector3(0, SKETCH11_FLIP_LOCAL_Y ? -1 : 1, 0)
      .applyQuaternion(sketchPathRotation)
      .applyQuaternion(sketchPlaneRotation)
      .applyQuaternion(bodyWorldQuaternion)
      .normalize();
    const lineOffset = transformSketchOffset(sketch11LineStart);
    const pathOrigin = bodyAnchorWorld.clone()
      .addScaledVector(lineOffset.normalize(), -anchorShift);
    pathOrigin.add(pathOffset);
    const lineEnd = pathOrigin.clone();
    const lineStart = pathOrigin.clone().add(transformSketchOffset(sketch11LineStart));
    const arcEnd = pathOrigin.clone().add(transformSketchOffset(sketch11ArcEnd));
    const arcCenter = pathOrigin.clone().add(transformSketchOffset(sketch11ArcCenter));
    camCenter = arcCenter.clone();
    const startVector = lineStart.clone().sub(arcCenter);
    const endVector = arcEnd.clone().sub(arcCenter);
    const startAngle = Math.atan2(
      startVector.dot(sketchBasisY),
      startVector.dot(sketchBasisX),
    );
    const endAngle = Math.atan2(
      endVector.dot(sketchBasisY),
      endVector.dot(sketchBasisX),
    );
    let arcDelta = endAngle - startAngle;
    while (arcDelta > Math.PI) arcDelta -= Math.PI * 2;
    while (arcDelta < -Math.PI) arcDelta += Math.PI * 2;

    nutPath = new THREE.CurvePath();
    nutPath.add(new THREE.LineCurve3(lineEnd, lineStart));
    nutPath.add(new CircularArcCurve3(
      arcCenter,
      SKETCH11_ARC_RADIUS,
      startAngle,
      arcDelta,
      sketchBasisX,
      sketchBasisY,
    ));
    createNutPathGuide(bodyModel);
    createCamCenterMarker(arcCenter);
    setProgress(initialProgress);
  }

  function createNutPathGuide(body) {
    if (!nutPath) return;

    if (nutPathGuide) {
      modelStage.remove(nutPathGuide);
      nutPathGuide.geometry.dispose();
      nutPathGuide.material.dispose();
    }

    const guideGeometry = new THREE.TubeGeometry(nutPath, 96, 0.00055, 8, false);
    const guideMaterial = new THREE.MeshBasicMaterial({
      color: 0xff7a00,
      transparent: true,
      opacity: 0.98,
      depthTest: false,
      depthWrite: false,
    });
    nutPathGuide = new THREE.Mesh(guideGeometry, guideMaterial);
    nutPathGuide.name = 'sketch11_groove_guide';

    const bodyQuaternion = body.getWorldQuaternion(new THREE.Quaternion());
    const surfaceNormal = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(bodyQuaternion)
      .normalize();
    nutPathGuide.position.copy(surfaceNormal.multiplyScalar(0.0008));
    modelStage.add(nutPathGuide);
  }

  function createCamCenterMarker(center) {
    if (camCenterMarker) {
      modelStage.remove(camCenterMarker);
      camCenterMarker.geometry.dispose();
      camCenterMarker.material.dispose();
    }

    camCenterMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.0028, 20, 12),
      new THREE.MeshBasicMaterial({
        color: 0xffdf4d,
        depthTest: false,
        depthWrite: false,
      }),
    );
    camCenterMarker.name = 'sketch11_cam_center';
    camCenterMarker.position.copy(center);
    modelStage.add(camCenterMarker);
  }

  function applyPose() {
    if (!nutController || !nutPath) return;
    const point = nutPath.getPointAt(nutProgress);
    nutController.position.copy(point);
  }

  function setProgress(progress) {
    nutProgress = THREE.MathUtils.clamp(progress, 0, 1);
    applyPose();
  }

  function advanceProgress(delta) {
    setProgress(nutProgress + delta);
  }

  function setVisible(visible) {
    if (nutPathGuide) nutPathGuide.visible = visible;
    if (camCenterMarker) camCenterMarker.visible = visible;
  }

  return {
    setup,
    setProgress,
    getProgress: () => nutProgress,
    advanceProgress,
    setVisible,
    getCamCenter: () => camCenter?.clone() || null,
  };
}

