import * as THREE from "three";
import { partAnchor } from "./annotations.js";
import { createStripeMaterial } from "./flows.js";

export function createSignals(scene) {
  const group = new THREE.Group(); scene.add(group);
  const bounds = new THREE.Box3();
  function clear() {
    bounds.makeEmpty();
    for (const tube of [...group.children]) {
      tube.geometry.dispose(); tube.material.dispose(); group.remove(tube);
    }
  }
  return {
    rebuild(model, data, state) {
      clear();
      const source = model.annotations.find(part => part.id === data.source);
      if (!source) return;
      const start = partAnchor(source), radius = model.radius * .011;
      bounds.expandByPoint(start);
      const lift = model.radius * .28, up = model.machineFrame.U;
      const targets = new Map();
      for (const channel of data.channels) {
        if (!channel.target) continue;
        const target = model.annotations.find(part => part.id === channel.target);
        if (!target) continue;
        const end = partAnchor(target), middle = start.clone().lerp(end, .5);
        const outward = middle.clone().sub(model.center); outward.y = 0;
        if (outward.lengthSq() < 1e-12) outward.copy(model.machineFrame.L);
        middle.addScaledVector(outward.normalize(), model.radius * .18);
        middle.addScaledVector(up, lift);
        const duplicate = targets.get(channel.target) || 0;
        targets.set(channel.target, duplicate + 1);
        middle.addScaledVector(model.machineFrame.L, duplicate * model.radius * .08);
        const departure = start.clone().addScaledVector(up, lift * .6);
        const curve = new THREE.CatmullRomCurve3([start, departure, middle, end]);
        bounds.expandByPoint(end);
        for (const point of curve.getPoints(96)) bounds.expandByPoint(point);
        // A negative speed runs the pulses back towards the board (sensor readings).
        const material = createStripeMaterial(channel.color, { speed: channel.speed ?? 1.3, opacity: .7, radius });
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 96, radius, 8, false), material);
        tube.userData.channel = channel.id; tube.renderOrder = 110;
        group.add(tube);
      }
      this.setState(state);
    },
    setState(state) {
      const emphasized = state.hoverChannel || state.channel;
      for (const tube of group.children) {
        // A list of channels (the process section) shows only those lines, all at full strength.
        if (state.channels) {
          tube.visible = state.channels.includes(tube.userData.channel);
          tube.material.uniforms.opacity.value = 1; tube.material.uniforms.thickness.value = state.signalThickness ?? 1.6; tube.material.uniforms.cutoff.value = 1;
          continue;
        }
        tube.visible = true;
        const on = tube.userData.channel === emphasized, uniforms = tube.material.uniforms;
        uniforms.opacity.value = emphasized ? (on ? 1 : .10) : .7;
        uniforms.thickness.value = on ? 2.2 : 1;
        // Clip in curve UV space so close-up mode retains only the board end.
        uniforms.cutoff.value = state.mode === "boards" ? .2 : 1;
      }
    },
    update(seconds, reducedMotion) {
      for (const tube of group.children) {
        tube.material.uniforms.time.value = seconds;
        tube.material.uniforms.moving.value = reducedMotion ? 0 : 1;
      }
    },
    expandBounds(box) { return box.union(bounds); },
    get visible() { return group.children.length > 0; },
    clear
  };
}
