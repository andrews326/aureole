// src/components/ui/LiquidEther.tsx

"use client";
import * as THREE from "three";
import { useEffect, useRef } from "react";

export default function LiquidPlasma({
  colors = ["#5227FF", "#FF9FFC", "#B19EEF"],
  speed = 0.25,
}: {
  colors?: string[];
  speed?: number;
}) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uniforms = {
      u_time: { value: 0.0 },
      u_colors: { value: colors.map((c) => new THREE.Color(c)) },
    };

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float u_time;
      uniform vec3 u_colors[3];
      varying vec2 vUv;

      float noise(vec2 p) {
        return sin(p.x)*sin(p.y);
      }

      void main() {
        vec2 p = vUv * 6.0;
        float t = u_time * ${speed.toFixed(2)};
        float n = noise(p + vec2(t, t*0.8)) + noise(p*1.5 - vec2(t*0.5, t*1.2));
        n = sin(n*1.5);
        vec3 color = mix(u_colors[0], u_colors[1], 0.5 + 0.5*sin(n*3.14));
        color = mix(color, u_colors[2], 0.5 + 0.5*sin((n + t*0.2)*3.14));
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    const clock = new THREE.Clock();

    function animate() {
      uniforms.u_time.value += clock.getDelta();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    animate();

    function handleResize() {
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [colors, speed]);

  return <div ref={mountRef} className="absolute inset-0 -z-10" />;
}