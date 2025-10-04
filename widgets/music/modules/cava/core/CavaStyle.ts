export enum CavaStyle {
  SMOOTH = 0,
  CATMULL_ROM = 1,
  BARS = 2,
  JUMPING_BARS= 3,
  DOTS = 4,
  CIRCULAR = 6,
  PARTICLES = 7,
  WAVE_PARTICLES = 8,
  WATERFALL = 9,
  MESH = 10,
}

export const styleMap = {
  catmull_rom: CavaStyle.CATMULL_ROM,
  smooth: CavaStyle.SMOOTH,
  bars: CavaStyle.BARS,
  jumping_bars: CavaStyle.JUMPING_BARS,
  dots: CavaStyle.DOTS,
  circular: CavaStyle.CIRCULAR,
  particles: CavaStyle.PARTICLES,
  wave_particles: CavaStyle.WAVE_PARTICLES,
  waterfall: CavaStyle.WATERFALL,
  mesh: CavaStyle.MESH,
};

// Utility function to convert style value to enum
export function getStyleEnum(styleValue: string | number | any): CavaStyle {
  if (typeof styleValue === "string") {
    return styleMap[styleValue.toLowerCase()] ;
  } else if (typeof styleValue === "number") {
    return styleValue;
  }
  // Default style
  return CavaStyle.CATMULL_ROM;
}
