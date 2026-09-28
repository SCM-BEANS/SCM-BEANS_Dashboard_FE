export function findNode(root, names) {
  const wantedNames = new Set(names);
  let result;
  root.traverse((object) => {
    if (!result && wantedNames.has(object.name)) result = object;
  });
  return result;
}

export function createMotionController(THREE, object, name) {
  const parent = object.parent;
  if (!parent) return null;

  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  object.matrix.decompose(position, quaternion, scale);

  const controller = new THREE.Group();
  controller.name = name;
  controller.position.copy(position);
  controller.quaternion.copy(quaternion);
  controller.scale.copy(scale);
  parent.add(controller);
  parent.remove(object);
  controller.add(object);

  object.position.set(0, 0, 0);
  object.quaternion.identity();
  object.scale.set(1, 1, 1);
  object.updateMatrix();
  return controller;
}

export function createRootMotionController(THREE, object, name, parent) {
  object.updateMatrixWorld(true);
  const worldMatrix = object.matrixWorld.clone();
  const controller = new THREE.Group();
  controller.name = name;
  parent.add(controller);
  worldMatrix.decompose(controller.position, controller.quaternion, controller.scale);
  parent.remove(object);
  controller.add(object);
  object.position.set(0, 0, 0);
  object.quaternion.identity();
  object.scale.set(1, 1, 1);
  object.updateMatrix();
  return controller;
}

export function createAnchorMotionController(THREE, object, anchor, name, parent) {
  object.updateMatrixWorld(true);
  anchor.updateMatrixWorld(true);

  const objectWorld = object.matrixWorld.clone();
  const anchorWorld = anchor.matrixWorld.clone();
  const controller = new THREE.Group();
  controller.name = name;
  parent.add(controller);
  anchorWorld.decompose(
    controller.position,
    controller.quaternion,
    controller.scale,
  );
  controller.updateMatrixWorld(true);

  parent.remove(object);
  controller.add(object);

  const localObjectWorld = controller.matrixWorld.clone().invert().multiply(objectWorld);
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  localObjectWorld.decompose(position, quaternion, scale);
  object.position.copy(position);
  object.quaternion.copy(quaternion);
  object.scale.copy(scale);
  object.updateMatrixWorld(true);
  return controller;
}


