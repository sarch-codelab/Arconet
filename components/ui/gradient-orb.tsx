"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export type GradientOrbConfig = {
  background?: string;
  hue?: number;
  rotationSpeed?: number;
  noiseScale?: number;
  innerRadius?: number;
};

const defaults: Required<GradientOrbConfig> = {
  background: "#0a0a0a", hue: 0, rotationSpeed: 0.3, noiseScale: 0.65, innerRadius: 0.1,
};

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform float iTime;
  uniform vec3 iResolution;
  uniform float hue;
  uniform float rot;
  uniform float noiseScale;
  uniform float innerRadius;
  varying vec2 vUv;

  vec3 rgb2yiq(vec3 c) {
    return vec3(dot(c, vec3(0.299, 0.587, 0.114)),
      dot(c, vec3(0.596, -0.274, -0.322)), dot(c, vec3(0.211, -0.523, 0.312)));
  }
  vec3 yiq2rgb(vec3 c) {
    return vec3(c.x + 0.956 * c.y + 0.621 * c.z,
      c.x - 0.272 * c.y - 0.647 * c.z, c.x - 1.106 * c.y + 1.703 * c.z);
  }
  vec3 adjustHue(vec3 color, float hueDeg) {
    float hueRad = radians(hueDeg);
    vec3 yiq = rgb2yiq(color);
    float cosA = cos(hueRad);
    float sinA = sin(hueRad);
    yiq.yz = vec2(yiq.y * cosA - yiq.z * sinA, yiq.y * sinA + yiq.z * cosA);
    return yiq2rgb(yiq);
  }
  vec3 hash33(vec3 p3) {
    p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
    p3 += dot(p3, p3.yxz + 19.19);
    return -1.0 + 2.0 * fract(vec3(p3.x + p3.y, p3.x + p3.z, p3.y + p3.z) * p3.zyx);
  }
  float snoise3(vec3 p) {
    const float K1 = 0.333333333;
    const float K2 = 0.166666667;
    vec3 i = floor(p + (p.x + p.y + p.z) * K1);
    vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
    vec3 e = step(vec3(0.0), d0 - d0.yzx);
    vec3 i1 = e * (1.0 - e.zxy);
    vec3 i2 = 1.0 - e.zxy * (1.0 - e);
    vec3 d1 = d0 - (i1 - K2);
    vec3 d2 = d0 - (i2 - K1);
    vec3 d3 = d0 - 0.5;
    vec4 h = max(0.6 - vec4(dot(d0,d0), dot(d1,d1), dot(d2,d2), dot(d3,d3)), 0.0);
    vec4 n = h*h*h*h * vec4(dot(d0,hash33(i)), dot(d1,hash33(i+i1)),
      dot(d2,hash33(i+i2)), dot(d3,hash33(i+1.0)));
    return dot(vec4(31.316), n);
  }
  vec4 extractAlpha(vec3 colorIn) {
    float a = max(max(colorIn.r, colorIn.g), colorIn.b);
    return vec4(colorIn.rgb / (a + 1e-5), a);
  }
  const vec3 baseColor0 = vec3(0.239, 0.353, 1.0);
  const vec3 baseColor1 = vec3(0.616, 0.0, 1.0);
  const vec3 baseColor2 = vec3(1.0, 0.373, 0.122);
  const vec3 baseColor3 = vec3(0.0);
  float light1(float intensity, float attenuation, float dist) {
    return intensity / (1.0 + dist * attenuation);
  }
  float light2(float intensity, float attenuation, float dist) {
    return intensity / (1.0 + dist * dist * attenuation);
  }
  vec4 draw(vec2 uv) {
    vec3 color0 = adjustHue(baseColor0, hue);
    vec3 color1 = adjustHue(baseColor1, hue);
    vec3 color2 = adjustHue(baseColor2, hue);
    vec3 color3 = adjustHue(baseColor3, hue);
    float len = length(uv);
    float invLen = len > 0.0 ? 1.0 / len : 0.0;
    float pulse = sin(iTime * 1.5) * 0.02;
    float n0 = snoise3(vec3(uv * noiseScale, iTime * 0.5)) * 0.5 + 0.5;
    float r0 = mix(mix(innerRadius + pulse, 1.0, 0.4), mix(innerRadius + pulse, 1.0, 0.6), n0);
    float d0 = distance(uv, (r0 * invLen) * uv);
    float v0 = light1(1.0, 10.0, d0);
    // Invert the result, not the edges: reversed smoothstep is undefined in GLSL.
    v0 *= 1.0 - smoothstep(r0, r0 * 1.05, len);
    float cl = cos(atan(uv.y, uv.x) + iTime * 2.0) * 0.5 + 0.5;
    float a = iTime * -1.0;
    vec2 pos = vec2(cos(a), sin(a)) * r0;
    float d = distance(uv, pos);
    float v1 = light2(1.5, 5.0, d) * light1(1.0, 50.0, d0);
    float v2 = 1.0 - smoothstep(mix(innerRadius, 1.0, n0 * 0.5), 1.0, len);
    float v3 = smoothstep(innerRadius, mix(innerRadius, 1.0, 0.5), len);
    vec3 col = mix(color1, color2, cl);
    col = mix(col, color0, n0);
    col = mix(color3, col, v0);
    col = (col + v1) * v2 * v3;
    return extractAlpha(clamp(col, 0.0, 1.0));
  }
  void main() {
    vec2 center = iResolution.xy * 0.5;
    float size = min(iResolution.x, iResolution.y);
    vec2 uv = (vUv * iResolution.xy - center) / size * 2.0;
    float s = sin(rot);
    float c = cos(rot);
    uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);
    vec4 col = draw(uv);
    gl_FragColor = vec4(col.rgb * col.a, col.a);
  }
`;

// Un renderizador pequeño evita el THREE.Clock interno de React Three Fiber.
// No se parchean dependencias ni se filtran advertencias de la consola.
export function GradientOrb({ config: overrides, className = "", onContextLost }: {
  config?: GradientOrbConfig; className?: string; onContextLost?: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const lostCallback = useRef(onContextLost);
  useEffect(() => { lostCallback.current = onContextLost; }, [onContextLost]);
  const { background, hue, rotationSpeed, noiseScale, innerRadius } = { ...defaults, ...overrides };

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: element, antialias: false, alpha: background === "transparent", powerPreference: "low-power" });
    } catch { lostCallback.current?.(); return; }
    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([-1,-1,0, 3,-1,0, -1,3,0], 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute([0,0, 2,0, 0,2], 2));
    const uniforms = {
      iTime: { value: 0 }, iResolution: { value: new THREE.Vector3(1, 1, 1) },
      hue: { value: hue }, rot: { value: 0 }, noiseScale: { value: noiseScale }, innerRadius: { value: innerRadius },
    };
    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms,
      transparent: true, premultipliedAlpha: true, depthWrite: false, depthTest: false, toneMapped: false });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    scene.add(mesh);
    renderer.setClearColor(background === "transparent" ? 0 : background, background === "transparent" ? 0 : 1);
    const timer = new THREE.Timer();
    timer.connect(document);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let task: ReturnType<typeof setTimeout>;
    let stopped = false;
    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(Math.max(1, width), Math.max(1, height), false);
      uniforms.iResolution.value.set(Math.max(1, width), Math.max(1, height), 1);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    const tick = () => {
      if (document.hidden || stopped) return;
      timer.update();
      const reduced = motion.matches;
      const dt = Math.min(timer.getDelta(), 0.1) * (reduced ? 0.3 : 1);
      uniforms.iTime.value += dt;
      uniforms.rot.value += dt * rotationSpeed;
      renderer.render(scene, camera);
      task = setTimeout(tick, reduced ? 80 : 33);
    };
    const visibility = () => { clearTimeout(task); timer.reset(); tick(); };
    const lost = () => { stopped = true; clearTimeout(task); lostCallback.current?.(); };
    element.addEventListener("webglcontextlost", lost, { once: true });
    document.addEventListener("visibilitychange", visibility);
    motion.addEventListener("change", visibility);
    tick();
    return () => {
      stopped = true;
      clearTimeout(task);
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      motion.removeEventListener("change", visibility);
      element.removeEventListener("webglcontextlost", lost);
      timer.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      // Strict Mode puede reutilizar el mismo canvas después de limpiar el efecto.
      queueMicrotask(() => { if (!element.isConnected) renderer.forceContextLoss(); });
    };
  }, [background, hue, rotationSpeed, noiseScale, innerRadius]);

  return <div className={className} style={{ width: "100%", height: "100%", background }} data-orb-renderer="webgl">
    <canvas ref={canvas} aria-hidden="true" style={{ display: "block", width: "100%", height: "100%" }} />
  </div>;
}
export default GradientOrb;
