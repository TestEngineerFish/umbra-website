// 首页「从星空落到枝头」的分层表（方案 §二、§四）。纯数据 + 纯函数，不碰 DOM，测试见 tests/layers.test.ts。
//
// 一段内容对应一层高度：首页的段数只由 LAYERS 决定，zh.ts 里 home.sections 的 id 必须和这里一一对上。
// 加段 / 减段只改这张表；场景（scene.ts）里的元素按层 id 找自己的位置，不按下标。
//
// 首页场景不跟明暗主题（从夜到昼本身就是一次换色），颜色只写在这张表里。色值是占位，待设计侧裁。

import { clamp, lerp } from '../shared/camera';

/** 场景里的四个绘制器。 */
export type Drawer = 'stars' | 'clouds' | 'horizon' | 'branch';

export interface Layer {
  id: string;
  /** 这一段居中时相机的位置，单位「屏高」，从天顶往下，必须严格递增。 */
  cam: number;
  /** 天色：天顶、半空、天边。 */
  sky: [string, string, string];
  /** 这一层上面的文字用浅色还是深色。 */
  ink: 'light' | 'dark';
  /** 星空可见度 0..1（星点和银河一起淡出）。 */
  stars: number;
  /** 月亮与月光 0..1。 */
  moon: number;
  /** 天边晨光 0..1。 */
  dawn: number;
  /** 满屏云雾 0..1：只有穿云那一层高。 */
  fog: number;
  /** 这一层要开的绘制器；相邻两层的并集才是过渡途中要画的。 */
  draw: Drawer[];
}

export const LAYERS: Layer[] = [
  { id: 'sky', cam: 0, sky: ['#04060e', '#0a0f25', '#141a3a'], ink: 'light', stars: 1, moon: 0, dawn: 0, fog: 0, draw: ['stars'] },
  { id: 'stars', cam: 0.9, sky: ['#060917', '#0d1330', '#1b2150'], ink: 'light', stars: 1, moon: 0, dawn: 0, fog: 0, draw: ['stars'] },
  { id: 'above-clouds', cam: 2.1, sky: ['#090f2c', '#172049', '#2d3466'], ink: 'light', stars: 0.75, moon: 1, dawn: 0, fog: 0, draw: ['stars', 'clouds'] },
  { id: 'in-clouds', cam: 3.3, sky: ['#2a2f52', '#4a4a6e', '#6e6684'], ink: 'light', stars: 0.2, moon: 0.4, dawn: 0.1, fog: 1, draw: ['clouds'] },
  { id: 'dawn', cam: 4.5, sky: ['#27315f', '#76668c', '#ee9a6c'], ink: 'light', stars: 0.12, moon: 0, dawn: 1, fog: 0, draw: ['stars', 'clouds', 'horizon'] },
  { id: 'treetops', cam: 5.7, sky: ['#5b84b6', '#a6bdd3', '#f1d3b2'], ink: 'dark', stars: 0, moon: 0, dawn: 0.5, fog: 0, draw: ['horizon'] },
  { id: 'branch', cam: 6.8, sky: ['#6c9dce', '#b3cfe5', '#e7eef0'], ink: 'dark', stars: 0, moon: 0, dawn: 0.15, fog: 0, draw: ['horizon', 'branch'] },
];

/** 几个单值属性的名字。 */
export type Weight = 'stars' | 'moon' | 'dawn' | 'fog';

/**
 * 相机位置（屏高）→ 连续的层进度 p：落在第 i 层与第 i+1 层之间时 p = i + u。
 * 越过首尾就夹在 0 或 n−1。
 */
export function progress(layers: Layer[], camScreens: number): number {
  const n = layers.length;
  if (n === 0) throw new Error('LAYERS 不能为空');
  if (n === 1 || camScreens <= layers[0].cam) return 0;
  for (let i = 0; i < n - 1; i++) {
    const a = layers[i].cam, b = layers[i + 1].cam;
    if (camScreens <= b) return i + (b > a ? clamp((camScreens - a) / (b - a), 0, 1) : 1);
  }
  return n - 1;
}

/** p 落在哪两层之间：回 `[i, j, u]`。 */
function around(layers: Layer[], p: number): [number, number, number] {
  const q = clamp(p, 0, layers.length - 1);
  const i = Math.floor(q), u = q - i;
  return [i, u > 0 ? Math.min(i + 1, layers.length - 1) : i, u];
}

/** `#rrggbb` → [r, g, b]。 */
export function hex(c: string): [number, number, number] {
  const v = parseInt(c.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/** 两色在 RGB 空间里插值，回整数分量。 */
export function mix(a: string, b: string, u: number): [number, number, number] {
  const x = hex(a), y = hex(b);
  return [0, 1, 2].map((k) => Math.round(lerp(x[k], y[k], u))) as [number, number, number];
}

export const rgb = (c: [number, number, number], a = 1): string => (a >= 1 ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${a})`);

/** 进度 p 处的三段天色。 */
export function skyAt(layers: Layer[], p: number): [number, number, number][] {
  const [i, j, u] = around(layers, p);
  return [0, 1, 2].map((k) => mix(layers[i].sky[k], layers[j].sky[k], u));
}

/** 进度 p 处某个单值属性。 */
export function weightAt(layers: Layer[], p: number, key: Weight): number {
  const [i, j, u] = around(layers, p);
  return lerp(layers[i][key], layers[j][key], u);
}

/** 进度 p 处要不要画某个绘制器：当前两层任一层开了就画。 */
export function drawerOn(layers: Layer[], p: number, d: Drawer): boolean {
  const [i, j] = around(layers, p);
  return layers[i].draw.includes(d) || layers[j].draw.includes(d);
}

/** 按 id 找层下标，找不到回 −1（场景据此决定某个元素画不画）。 */
export const indexOf = (layers: Layer[], id: string): number => layers.findIndex((l) => l.id === id);
