import { OptionChoice } from "./types.ts";

export const CAVA_STYLE_OPTIONS: OptionChoice[] = [
  { label: "Catmull Rom", value: "catmull_rom" },
  { label: "Smooth", value: "smooth" },
  { label: "Classic Bars", value: "bars" },
  { label: "Jumping Bars", value: "jumping_bars" },
  { label: "Dots", value: "dots" },
  { label: "Circular", value: "circular" },
  { label: "Particles", value: "particles" },
  { label: "Wave Particles", value: "wave_particles" },
  { label: "Waterfall", value: "waterfall" },
  { label: "Mesh", value: "mesh" },
];

export const OS_OPTIONS: OptionChoice[] = [
  { label: "Arch Linux", value: "arch-symbolic" },
  { label: "NixOS", value: "nix-symbolic" },
];

export const BAR_POSITION_OPTIONS: OptionChoice[] = [
  { label: "Top", value: "top" },
  { label: "Bottom", value: "bottom" },
];

export const BAR_STYLE_OPTIONS: OptionChoice[] = [
  { label: "Expanded", value: "expanded" },
  { label: "Floating", value: "floating" },
  { label: "Rounded Corners", value: "corners" },
];
