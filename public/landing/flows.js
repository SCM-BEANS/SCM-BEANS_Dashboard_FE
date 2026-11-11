import * as THREE from "three";
import { partAnchor } from "./annotations.js";

// Shared tube pulse: increasing UV runs from source to destination.
export function createStripeMaterial(color, { speed = .65, opacity = 1, radius = 0 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) }, time: { value: 0 }, moving: { value: 1 },
      speed: { value: speed }, opacity: { value: opacity }, thickness: { value: 1 }, radius: { value: radius }, cutoff: { value: 1 } },
    vertexShader: `uniform float thickness; uniform float radius; varying vec2 vUv;
      void main(){vUv=uv; vec3 p=position+normal*radius*(thickness-1.0); gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
    fragmentShader: `uniform vec3 color; uniform float time; uniform float moving; uniform float speed;
      uniform float opacity; uniform float cutoff; varying vec2 vUv;
      void main(){if(vUv.x>cutoff) discard;
        float stripe=smoothstep(.65,.85,sin((vUv.x*10.0-time*speed)*6.283185));
        gl_FragColor=vec4(mix(color,vec3(1.0),stripe*.65*moving),opacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: opacity < 1 || radius > 0, depthTest: false, depthWrite: false
  });
}

export function createFlows(scene) {
  const group = new THREE.Group(); scene.add(group);
  const records = new Map();
  function clear() {
    for (const child of [...group.children]) {
      child.geometry.dispose(); child.material.dispose(); group.remove(child);
    }
    records.clear();
  }
  return {
    rebuild(model, definitions, frameRadius) {
      clear();
      this.sync(model, definitions, frameRadius);
    },
    // Reuse tubes across chapters; cutoff is film time, never wall-clock time.
    sync(model, definitions, frameRadius, cutoffs = {}, opacities = {}) {
      for (const [id, record] of records) {
        for (const mesh of record.meshes) mesh.visible = definitions.some(flow => flow.id === id);
      }
      const radius = THREE.MathUtils.clamp(frameRadius * .012, model.radius * .006, model.radius * .014);
      for (const flow of definitions) {
        const parts = flow.through.map(id => model.annotations.find(part => part.id === id));
        if (parts.some(part => !part) || parts.length < 2) continue;
        const points = parts.map(partAnchor);
        const signature = points.map(point => point.toArray().join(",")).join(";");
        const curve = new THREE.CatmullRomCurve3(points);
        let record = records.get(flow.id);
        if (record) {
          record.meshes.forEach(mesh => { mesh.visible = true; });
          if (record.signature !== signature) {
            record.meshes[0].geometry.dispose(); record.meshes[1].geometry.dispose();
            record.meshes[0].geometry = new THREE.TubeGeometry(curve, 96, record.radius * 2.4, 8, false);
            record.meshes[1].geometry = new THREE.TubeGeometry(curve, 96, record.radius, 8, false);
            record.meshes.slice(2).forEach((mesh, index) => mesh.position.copy(index < 2 ? points[0] : points.at(-1)));
            record.signature = signature;
          }
          const cutoff = cutoffs[flow.id] ?? record.cutoff;
          record.cutoff = cutoff;
          record.shaders.forEach(shader => { shader.uniforms.cutoff.value = cutoff; });
          record.meshes.slice(2).forEach((mesh, index) => { mesh.visible = index < 2 ? cutoff > 0 : cutoff >= 1; });
          record.meshes.forEach((mesh, index) => {
            const opacity = opacities[flow.id] ?? 1;
            if (index < 2) mesh.material.uniforms.opacity.value = (index ? 1 : .22) * opacity;
            else { mesh.material.transparent = opacity < 1; mesh.material.opacity = opacity; }
          });
          continue;
        }
        const meshes = [], shaders = [];
        const halo = new THREE.Mesh(new THREE.TubeGeometry(curve, 96, radius * 2.4, 8, false),
          createStripeMaterial(flow.color, { opacity: .22 * (opacities[flow.id] ?? 1), speed: 0 }));
        halo.material.blending = THREE.AdditiveBlending;
        halo.renderOrder = 99; group.add(halo); meshes.push(halo); shaders.push(halo.material);
        const material = createStripeMaterial(flow.color, { opacity: opacities[flow.id] ?? 1 });
        material.transparent = true;
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 96, radius, 8, false), material);
        tube.renderOrder = 100; group.add(tube); meshes.push(tube); shaders.push(material);
        for (const point of [points[0], points.at(-1)]) {
          const ring = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.9, 16, 12),
            new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, depthWrite: false }));
          ring.position.copy(point); ring.renderOrder = 101; group.add(ring); meshes.push(ring);
          const dot = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.6, 16, 12), new THREE.MeshBasicMaterial({ color: flow.color, depthTest: false, depthWrite: false }));
          dot.position.copy(point); dot.renderOrder = 102; group.add(dot); meshes.push(dot);
        }
        const cutoff = cutoffs[flow.id] ?? 1;
        shaders.forEach(shader => { shader.uniforms.cutoff.value = cutoff; });
        meshes.slice(2).forEach((mesh, index) => { mesh.visible = index < 2 ? cutoff > 0 : cutoff >= 1; });
        records.set(flow.id, { meshes, shaders, radius, signature, cutoff });
      }
    },
    update(seconds, reducedMotion) { for (const record of records.values()) for (const shader of record.shaders) { shader.uniforms.time.value = seconds; shader.uniforms.moving.value = reducedMotion ? 0 : 1; } },
    get visible() { return group.children.length > 0; },
    clear
  };
}
