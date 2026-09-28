const DEBUG_ROOT_NAME = 'constraint-debug-sketch9-sketch3';
const DEBUG_MODES = new Set([
  'assembly',
  'body',
  'spArmRight',
  'spArmLeft',
  'sp2ArmLeft',
  'sp2ArmRight',
]);

const SKETCH8_HOLE_CENTER_LOCAL = [0.005053852960763855, 0.001, -0.03382181743300991];
const SKETCH9_CENTER_LOCAL = [-0.0004093631286091127, 0.0038, 0.030128182566990073];
const RIGHT_PIN_CENTER_LOCAL = [-0.0004093631286091127, 0.002, 0.030128182566990073];
const SLOT_START_LOCAL = [0.01653374162677999, 0.002, -0.017808634267561095];
const SLOT_END_LOCAL = [0.021747065816089917, 0.002, -0.017808634267561095];

export function createConstraintOverlay({ THREE, models, parent } = {}) {
  const root = new THREE.Group();
  root.name = DEBUG_ROOT_NAME;
  root.renderOrder = 20;
  const debugAxis = new THREE.Vector3(0, 1, 0);
  const sketch9Material = new THREE.MeshBasicMaterial({
    color: 0xff2bd6,
    transparent: true,
    opacity: 0.98,
    depthTest: false,
    depthWrite: false,
  });
  const sketch3Material = new THREE.MeshBasicMaterial({
    color: 0x20e6ff,
    transparent: true,
    opacity: 0.98,
    depthTest: false,
    depthWrite: false,
  });
  const sketch9Geometry = new THREE.SphereGeometry(0.0032, 24, 16);
  const sketch3MarkerGeometry = new THREE.SphereGeometry(0.0014, 16, 12);
  const sketch3SegmentGeometry = new THREE.CylinderGeometry(0.00065, 0.00065, 1, 12);
  const sketch9Markers = [
    new THREE.Mesh(sketch9Geometry, sketch9Material),
    new THREE.Mesh(sketch9Geometry, sketch9Material),
  ];
  const sketch3Segments = [
    new THREE.Mesh(sketch3SegmentGeometry, sketch3Material),
    new THREE.Mesh(sketch3SegmentGeometry, sketch3Material),
  ];
  const sketch3Endpoints = Array.from({ length: 4 }, () => (
    new THREE.Mesh(sketch3MarkerGeometry, sketch3Material)
  ));
  [...sketch9Markers, ...sketch3Segments, ...sketch3Endpoints].forEach((object) => {
    object.renderOrder = 20;
    object.frustumCulled = false;
    root.add(object);
  });
  parent.add(root);

  let visible = true;
  let mode = 'assembly';

  function setMarkerPosition(marker, mesh, localPoint) {
    mesh.updateWorldMatrix(true, false);
    marker.position.copy(mesh.localToWorld(localPoint.clone()));
  }

  function setSegment(segment, startMarker, endMarker, mesh, localStart, localEnd) {
    mesh.updateWorldMatrix(true, false);
    const start = mesh.localToWorld(localStart.clone());
    const end = mesh.localToWorld(localEnd.clone());
    const direction = end.clone().sub(start);
    const length = direction.length();
    if (length < 1e-12) return;
    direction.normalize();
    segment.position.copy(start).add(end).multiplyScalar(0.5);
    segment.quaternion.setFromUnitVectors(debugAxis, direction);
    segment.scale.set(1, length, 1);
    startMarker.position.copy(start);
    endMarker.position.copy(end);
  }

  function update() {
    const leftSupport = models.supportLeft;
    const rightSupport = models.supportRight;
    const leftSlot = models.supportLeft2;
    const rightSlot = models.supportRight2;
    if (!leftSupport || !rightSupport || !leftSlot || !rightSlot) return;
    const leftSupportMesh = findNode(leftSupport, ['1-4']);
    const rightSupportMesh = findNode(rightSupport, ['13-1']);
    const leftSlotMesh = findNode(leftSlot, ['12-1']);
    const rightSlotMesh = findNode(rightSlot, ['12-2']);
    if (!leftSupportMesh || !rightSupportMesh || !leftSlotMesh || !rightSlotMesh) return;
    setMarkerPosition(
      sketch9Markers[0],
      leftSupportMesh,
      new THREE.Vector3(...SKETCH9_CENTER_LOCAL),
    );
    setMarkerPosition(
      sketch9Markers[1],
      rightSupportMesh,
      new THREE.Vector3(...RIGHT_PIN_CENTER_LOCAL),
    );
    setSegment(
      sketch3Segments[0],
      sketch3Endpoints[0],
      sketch3Endpoints[1],
      leftSlotMesh,
      new THREE.Vector3(...SLOT_START_LOCAL),
      new THREE.Vector3(...SLOT_END_LOCAL),
    );
    setSegment(
      sketch3Segments[1],
      sketch3Endpoints[2],
      sketch3Endpoints[3],
      rightSlotMesh,
      new THREE.Vector3(...SLOT_START_LOCAL),
      new THREE.Vector3(...SLOT_END_LOCAL),
    );
  }

  function applyVisibility() {
    root.visible = visible && DEBUG_MODES.has(mode);
  }

  function setVisible(nextVisible) {
    visible = Boolean(nextVisible);
    applyVisibility();
  }

  function setMode(nextMode) {
    mode = nextMode;
    applyVisibility();
  }

  function dispose() {
    root.removeFromParent();
    sketch9Geometry.dispose();
    sketch3MarkerGeometry.dispose();
    sketch3SegmentGeometry.dispose();
    sketch9Material.dispose();
    sketch3Material.dispose();
  }

  applyVisibility();
  return { root, update, setVisible, setMode, dispose };
}

function findNode(root, names) {
  const wanted = new Set(names);
  let result;
  root.traverse((object) => {
    if (!result && wanted.has(object.name)) result = object;
  });
  return result;
}
