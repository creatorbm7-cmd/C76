import { useEffect, useRef } from "react";
import * as THREE from "three";

interface UsersSceneProps {
  height?: number;
  /** Number of user "nodes" orbiting the hub (caps at 60 for perf) */
  nodeCount?: number;
}

/**
 * USERS COMMAND CENTER — premium 3D scene.
 *
 * Visual language:
 *  • Central gold wireframe icosahedron = the platform hub
 *  • Orbiting amber/rose spheres at multiple radii = user accounts
 *  • Subtle network lines connecting hub to ~6 featured nodes
 *  • Dense particle dust = atmospheric depth
 *  • Mouse parallax + auto rotation
 *
 * Built with vanilla three.js — lighter than @react-three/fiber.
 */
export default function UsersScene({ height = 220, nodeCount = 36 }: UsersSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const mount = mountRef.current;
    const w = () => mount.clientWidth;
    const h = height;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0a14, 8, 22);

    const camera = new THREE.PerspectiveCamera(58, w() / h, 0.1, 100);
    camera.position.set(0, 0, 9);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(w(), h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // ── Particle dust field (subtle ambient) ──
    const PARTICLE_N = 700;
    const pGeo = new THREE.BufferGeometry();
    const pPositions = new Float32Array(PARTICLE_N * 3);
    const pColors = new Float32Array(PARTICLE_N * 3);
    const c = new THREE.Color();
    for (let i = 0; i < PARTICLE_N; i++) {
      pPositions[i * 3] = (Math.random() - 0.5) * 26;
      pPositions[i * 3 + 1] = (Math.random() - 0.5) * 14;
      pPositions[i * 3 + 2] = (Math.random() - 0.5) * 16;
      // amber/gold dust
      const hue = 0.09 + Math.random() * 0.06;
      c.setHSL(hue, 0.85, 0.4 + Math.random() * 0.35);
      pColors[i * 3] = c.r;
      pColors[i * 3 + 1] = c.g;
      pColors[i * 3 + 2] = c.b;
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPositions, 3));
    pGeo.setAttribute("color", new THREE.BufferAttribute(pColors, 3));
    const pMat = new THREE.PointsMaterial({
      size: 0.055,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // ── Central hub: gold wireframe icosahedron ──
    const hubGeo = new THREE.IcosahedronGeometry(1.45, 1);
    const hubMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      wireframe: true,
      transparent: true,
      opacity: 0.55,
    });
    const hub = new THREE.Mesh(hubGeo, hubMat);
    scene.add(hub);

    // Solid inner core
    const coreGeo = new THREE.IcosahedronGeometry(0.55, 0);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      wireframe: true,
      transparent: true,
      opacity: 0.75,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    scene.add(core);

    // ── User nodes (orbital spheres) ──
    const NODES = Math.min(60, Math.max(8, nodeCount));
    const nodeGroup = new THREE.Group();
    scene.add(nodeGroup);

    interface NodeData {
      mesh: THREE.Mesh;
      radius: number;
      theta: number;
      phi: number;
      speed: number;
      featured: boolean;
      // for connecting line animation
      lineGeo?: THREE.BufferGeometry;
      lineMat?: THREE.LineBasicMaterial;
      line?: THREE.Line;
    }
    const nodes: NodeData[] = [];

    // Sphere geo reused across all nodes
    const sphereGeo = new THREE.SphereGeometry(0.08, 8, 8);

    // Define ~6 featured nodes that will have connecting lines
    const featuredIndices = new Set<number>();
    while (featuredIndices.size < Math.min(6, Math.floor(NODES / 5))) {
      featuredIndices.add(Math.floor(Math.random() * NODES));
    }

    for (let i = 0; i < NODES; i++) {
      const isFeatured = featuredIndices.has(i);
      // 3 orbit rings: inner, mid, outer
      const radiusBand = i % 3; // 0,1,2
      const radius = radiusBand === 0 ? 2.3 + Math.random() * 0.3
        : radiusBand === 1 ? 3.4 + Math.random() * 0.3
        : 4.5 + Math.random() * 0.4;

      // node colour: featured = rose/gold, normal = amber
      const isRose = i % 7 === 0;
      const isEmerald = i % 11 === 0;
      const colour = isFeatured ? 0xfbbf24
        : isRose ? 0xf43f5e
        : isEmerald ? 0x34d399
        : 0xf59e0b;

      const mat = new THREE.MeshBasicMaterial({
        color: colour,
        transparent: true,
        opacity: isFeatured ? 1.0 : 0.7,
      });
      const sphere = new THREE.Mesh(sphereGeo, mat);
      // bigger for featured
      const scale = isFeatured ? 1.6 + Math.random() * 0.5 : 0.7 + Math.random() * 0.6;
      sphere.scale.setScalar(scale);
      nodeGroup.add(sphere);

      const node: NodeData = {
        mesh: sphere,
        radius,
        theta: Math.random() * Math.PI * 2,
        phi: (Math.random() - 0.5) * Math.PI * 0.7, // mostly equatorial
        speed: 0.001 + Math.random() * 0.004 * (radiusBand === 0 ? 1.4 : radiusBand === 1 ? 1.0 : 0.7),
        featured: isFeatured,
      };

      // Connecting line for featured nodes — animated gold lines from hub to node
      if (isFeatured) {
        const lineGeo = new THREE.BufferGeometry();
        const linePts = new Float32Array(6); // 2 points × xyz
        lineGeo.setAttribute("position", new THREE.BufferAttribute(linePts, 3));
        const lineMat = new THREE.LineBasicMaterial({
          color: 0xfbbf24,
          transparent: true,
          opacity: 0.25,
        });
        const line = new THREE.Line(lineGeo, lineMat);
        scene.add(line);
        node.lineGeo = lineGeo;
        node.lineMat = lineMat;
        node.line = line;
      }

      nodes.push(node);
    }

    // ── Outer ring (subtle) ──
    const ringGeo = new THREE.TorusGeometry(5.2, 0.012, 8, 120);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.18,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.3;
    scene.add(ring);

    // Second perpendicular ring (rose)
    const ring2Geo = new THREE.TorusGeometry(4.6, 0.008, 8, 120);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      transparent: true,
      opacity: 0.15,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = Math.PI / 6;
    ring2.rotation.y = Math.PI / 4;
    scene.add(ring2);

    // ── Mouse parallax ──
    let mx = 0,
      my = 0;
    const onMove = (e: PointerEvent) => {
      const r = mount.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width) * 2 - 1;
      my = -((e.clientY - r.top) / r.height) * 2 + 1;
    };
    mount.addEventListener("pointermove", onMove);

    // ── Animation loop ──
    let frame = 0;
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      frame += 1;

      // hub: slow rotation + breathing opacity
      hub.rotation.x += 0.0025;
      hub.rotation.y += 0.0035;
      core.rotation.x -= 0.005;
      core.rotation.y -= 0.006;
      const t = (Math.sin(frame * 0.025) + 1) * 0.5;
      hubMat.opacity = 0.4 + t * 0.25;
      coreMat.opacity = 0.55 + t * 0.25;

      // rings rotate
      ring.rotation.z += 0.0018;
      ring2.rotation.x += 0.0012;
      ring2.rotation.z -= 0.0015;

      // particle drift
      particles.rotation.y += 0.0005;

      // node orbits — true 3D spherical-ish orbits
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.theta += n.speed;
        const x = n.radius * Math.cos(n.theta) * Math.cos(n.phi);
        const y = n.radius * Math.sin(n.phi);
        const z = n.radius * Math.sin(n.theta) * Math.cos(n.phi);
        n.mesh.position.set(x, y, z);
        // featured nodes pulse
        if (n.featured) {
          const pulse = 1 + Math.sin(frame * 0.06 + i) * 0.18;
          n.mesh.scale.setScalar(1.6 * pulse);
        }
        // update connecting line
        if (n.line && n.lineGeo) {
          const pos = n.lineGeo.attributes.position.array as Float32Array;
          // start at hub (origin)
          pos[0] = 0; pos[1] = 0; pos[2] = 0;
          // end at node
          pos[3] = x; pos[4] = y; pos[5] = z;
          n.lineGeo.attributes.position.needsUpdate = true;
          if (n.lineMat) {
            n.lineMat.opacity = 0.15 + 0.20 * (Math.sin(frame * 0.04 + i * 0.7) + 1) * 0.5;
          }
        }
      }
      // entire node group rotates slowly for parallax
      nodeGroup.rotation.y += 0.0008;

      // mouse parallax
      camera.position.x += (mx * 1.6 - camera.position.x) * 0.04;
      camera.position.y += (my * 0.9 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    animate();

    // ── Resize handling ──
    const onResize = () => {
      const cw = w();
      camera.aspect = cw / h;
      camera.updateProjectionMatrix();
      renderer.setSize(cw, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    // ── Cleanup ──
    return () => {
      cancelAnimationFrame(raf);
      mount.removeEventListener("pointermove", onMove);
      ro.disconnect();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);

      pGeo.dispose();
      pMat.dispose();
      hubGeo.dispose();
      hubMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      sphereGeo.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();

      // dispose per-node material + line resources
      for (const n of nodes) {
        (n.mesh.material as THREE.Material).dispose();
        if (n.lineGeo) n.lineGeo.dispose();
        if (n.lineMat) n.lineMat.dispose();
      }

      renderer.dispose();
    };
  }, [height, nodeCount]);

  return (
    <div
      ref={mountRef}
      style={{ width: "100%", height, pointerEvents: "auto", position: "relative" }}
    />
  );
}
