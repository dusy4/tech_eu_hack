import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import { PACKAGES, churnColor, type Pkg } from "../data/repo";

// One building per package: footprint from file count, height from lines of code,
// colour from 90-day churn.

// Reduced motion, or ?still in the URL (screenshots, recordings), skips the entrance.
const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches || location.search.includes("still");

type Placed = Pkg & { x: number; z: number; w: number; h: number };

function place(): Placed[] {
  const sorted = [...PACKAGES].sort((a, b) => b.loc - a.loc);
  const cols = 4, cell = 5.2;
  return sorted.map((p, i) => {
    const w = 1.2 + Math.sqrt(p.files) * 0.19;
    const h = 0.4 + Math.pow(p.loc / 1000, 0.62) * 0.75;
    const r = Math.floor(i / cols), c = i % cols;
    return { ...p, w, h, x: (c - (cols - 1) / 2) * cell, z: (r - 1.5) * cell };
  });
}

function Building({ b, hovered, onHover }: { b: Placed; hovered: boolean; onHover: (n: string | null) => void }) {
  const mesh = useRef<THREE.Mesh>(null);
  const grow = useRef(0);
  const reduced = useMemo(still, []);
  useFrame((_, dt) => {
    // The one entrance on the screen: buildings rise once on load.
    grow.current = reduced ? 1 : Math.min(1, grow.current + dt * 1.4);
    const e = 1 - Math.pow(1 - grow.current, 3);
    if (mesh.current) {
      mesh.current.scale.y = Math.max(0.001, e);
      mesh.current.position.y = (b.h * e) / 2;
    }
  });
  return (
    <group position={[b.x, 0, b.z]}>
      <mesh
        ref={mesh}
        onPointerOver={(e) => { e.stopPropagation(); onHover(b.name); }}
        onPointerOut={() => onHover(null)}
      >
        <boxGeometry args={[b.w, b.h, b.w]} />
        <meshStandardMaterial color={hovered ? "#131416" : churnColor(b.churn)} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[b.w + 0.5, b.w + 0.5]} />
        <meshBasicMaterial color="#e3e8eb" />
      </mesh>
      {hovered && (
        <Html position={[0, b.h + 0.6, 0]} center>
          <div className="city-tip">
            <b>{b.name}</b><br />
            {b.loc.toLocaleString("en-US")} lines in {b.files} files<br />
            {b.churn} commits in 90 days
          </div>
        </Html>
      )}
    </group>
  );
}

type Label = { name: string; x: number; y: number };

// Labels are plain DOM over the canvas, placed by projecting each roof point every frame.
function Projector({ targets, onMove }: { targets: Placed[]; onMove: (l: Label[]) => void }) {
  const { camera, size } = useThree();
  const last = useRef("");
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const out = targets.map((t) => {
      v.set(t.x, t.h + 0.5, t.z).project(camera);
      return { name: t.name, x: Math.round(((v.x + 1) / 2) * size.width), y: Math.round(((1 - v.y) / 2) * size.height) };
    });
    const key = out.map((o) => o.x + "," + o.y).join(";");
    if (key !== last.current) {
      last.current = key;
      onMove(out);
    }
  });
  return null;
}

function Rig() {
  const { camera } = useThree();
  const t = useRef(0);
  const reduced = useMemo(still, []);
  useFrame((_, dt) => {
    if (t.current >= 1) return;
    t.current = reduced ? 1 : Math.min(1, t.current + dt * 0.6);
    const e = 1 - Math.pow(1 - t.current, 3);
    camera.position.set(THREE.MathUtils.lerp(46, 29, e), THREE.MathUtils.lerp(42, 25, e), THREE.MathUtils.lerp(46, 32, e));
    camera.lookAt(0, 5, 0);
  });
  return null;
}

export default function CodeCity() {
  const placed = useMemo(place, []);
  const [hover, setHover] = useState<string | null>(null);
  const busiest = useMemo(() => [...placed].sort((a, b) => b.churn - a.churn).slice(0, 3), [placed]);
  const [labels, setLabels] = useState<Label[]>([]);
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
    <Canvas flat camera={{ position: [34, 30, 34], fov: 30 }} dpr={[1, 2]} style={{ background: "#f1f4f6" }} aria-label="Code city: one block per package">
      <ambientLight intensity={1.6} />
      <directionalLight position={[12, 20, 8]} intensity={1.4} />
      <directionalLight position={[-10, 8, -6]} intensity={0.35} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshBasicMaterial color="#f1f4f6" />
      </mesh>
      {placed.map((b) => (
        <Building key={b.name} b={b} hovered={hover === b.name} onHover={setHover} />
      ))}
      <Rig />
      <Projector targets={busiest} onMove={setLabels} />
      <OrbitControls enablePan={false} minDistance={14} maxDistance={60} maxPolarAngle={Math.PI / 2.3} target={[0, 5, 0]} />
    </Canvas>
    {labels.filter((l) => l.name !== hover).map((l) => (
      <span key={l.name} className="city-label" style={{ position: "absolute", left: l.x, top: l.y, transform: "translate(-50%, -100%)" }}>{l.name}</span>
    ))}
    </div>
  );
}
