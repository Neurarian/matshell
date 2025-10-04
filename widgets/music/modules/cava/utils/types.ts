export interface TimeState {
  lastUpdate: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface ParticleState extends TimeState {
  particles: Array<{
    x: number;
    y: number;
    velocity: number;
    life: number;
  }>;
}

export interface WaterfallState {
  historyFrames: number[][];
  maxHistoryFrames: number;
  transitionAlpha: number;
}

export interface JumpingBarsState extends TimeState {
  barHeights: number[];
  barVelocities: number[];
}

export function createParticleState(): ParticleState {
  return {
    particles: [],
    lastUpdate: 0,
  };
}
export function createWaterfallState(): WaterfallState {
  return {
    historyFrames: [],
    maxHistoryFrames: 30, // Increased for smoother vertical transition
    transitionAlpha: 0.3, // Controls how quickly new frames blend in
  };
}

export function createJumpingBarsState(): JumpingBarsState {
  return {
    barVelocities: [],
    barHeights: [],
    lastUpdate: 0,
  };
}
