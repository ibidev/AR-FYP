import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

// Transparent-background hero viewer: idle animation, drag-to-spin with inertia,
// gentle auto-rotate, brand orange rim light. Renders behind the CSS portal rings.
// Ported from the design handoff's avatar-viewer.js, wired to the Draco-compressed ib.glb.
export default function HeroAvatar({ src = '/models/ib.glb', accent = '#ff5e00' }) {
  const mountRef = useRef(null);
  const [status, setStatus] = useState('INITIALIZING');

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let raf, renderer, mixer, resizeObs;
    let disposed = false;
    const clock = new THREE.Clock();

    const init = async () => {
      try {
        setStatus('LOADING MODEL');
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab;';
        mount.appendChild(renderer.domElement);

        // Lighting: soft key + orange rim for the brand look
        scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        const key = new THREE.DirectionalLight(0xffffff, 1.6);
        key.position.set(2, 4, 3);
        scene.add(key);
        const rim = new THREE.DirectionalLight(new THREE.Color(accent), 2.2);
        rim.position.set(-3, 2, -4);
        scene.add(rim);
        const fill = new THREE.DirectionalLight(0x8899ff, 0.5);
        fill.position.set(-2, 1, 3);
        scene.add(fill);

        const group = new THREE.Group();
        scene.add(group);

        const loader = new GLTFLoader();
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
        loader.setDRACOLoader(dracoLoader);

        const gltf = await new Promise((res, rej) => {
          loader.load(src, res, (p) => {
            if (p.total) setStatus('LOADING MODEL ' + Math.round((p.loaded / p.total) * 100) + '%');
          }, rej);
        });
        if (disposed) return;

        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        model.scale.setScalar(2.6 / maxDim);
        group.add(model);
        const nb = new THREE.Box3().setFromObject(group);
        const ns = nb.getSize(new THREE.Vector3());
        group.position.y = -ns.y * 0.06;

        camera.position.set(0, ns.y * 0.12, ns.y * 1.35);
        camera.lookAt(0, 0, 0);

        if (gltf.animations && gltf.animations.length) {
          mixer = new THREE.AnimationMixer(model);
          const idle = gltf.animations.find((c) => /idle/i.test(c.name)) || gltf.animations[0];
          mixer.clipAction(idle).play();
        }

        // drag to spin with inertia
        let vel = 0, dragging = false, lastX = 0;
        const el = renderer.domElement;
        el.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; el.setPointerCapture(e.pointerId); el.style.cursor = 'grabbing'; });
        el.addEventListener('pointermove', (e) => { if (!dragging) return; vel = (e.clientX - lastX) * 0.005; group.rotation.y += vel; lastX = e.clientX; });
        const end = () => { dragging = false; el.style.cursor = 'grab'; };
        el.addEventListener('pointerup', end);
        el.addEventListener('pointercancel', end);

        const resize = () => {
          const w = mount.clientWidth || 1, h = mount.clientHeight || 1;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        };
        resizeObs = new ResizeObserver(resize);
        resizeObs.observe(mount);
        resize();

        setStatus('');

        const tick = () => {
          raf = requestAnimationFrame(tick);
          const dt = clock.getDelta();
          if (mixer) mixer.update(dt);
          if (!dragging) {
            vel *= 0.95;
            group.rotation.y += vel + 0.0022; // gentle auto-rotate
          }
          renderer.render(scene, camera);
        };
        tick();
      } catch (err) {
        console.error('HeroAvatar failed:', err);
        setStatus('MODEL PREVIEW UNAVAILABLE');
      }
    };

    init();

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      if (resizeObs) resizeObs.disconnect();
      if (renderer) {
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }
    };
  }, [src, accent]);

  return (
    <div ref={mountRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      {status && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', font: '500 11px/1 ui-monospace, Menlo, monospace', letterSpacing: '.2em', color: 'rgba(255,255,255,.45)', pointerEvents: 'none' }}>
          {status}
        </div>
      )}
    </div>
  );
}
