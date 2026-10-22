export const SKINS = [
  {
    id: 'phoenix',
    name: 'Fênix Dourada',
    bodyColor: '#f59e0b',
    bellyColor: '#fef08a',
    wingColor: '#d97706',
    ghostBodyColor: '#67e8f9',
    ghostGlow: '#06b6d4',
    trailColor: '#38bdf8',
  },
  {
    id: 'cyber',
    name: 'Cyberpunk Violet',
    bodyColor: '#a855f7',
    bellyColor: '#e9d5ff',
    wingColor: '#7e22ce',
    ghostBodyColor: '#f472b6',
    ghostGlow: '#ec4899',
    trailColor: '#f43f5e',
  },
  {
    id: 'emerald',
    name: 'Esmeralda Ninja',
    bodyColor: '#10b981',
    bellyColor: '#a7f3d0',
    wingColor: '#047857',
    ghostBodyColor: '#2dd4bf',
    ghostGlow: '#14b8a6',
    trailColor: '#5eead4',
  },
  {
    id: 'phantom',
    name: 'Espectro Noturno',
    bodyColor: '#64748b',
    bellyColor: '#cbd5e1',
    wingColor: '#334155',
    ghostBodyColor: '#c084fc',
    ghostGlow: '#9333ea',
    trailColor: '#a855f7',
  }
];

export const GAME_CONSTANTS = {
  CANVAS_WIDTH: 400,
  CANVAS_HEIGHT: 640,
  FIXED_STEP: 1000 / 60,
  GRAVITY: 0.29,
  JUMP_FORCE: -6.0,
  BASE_SPEED: 2.4,
  PIPE_GAP: 155,
  PIPE_SPAWN_INTERVAL: 100, // frames a 60fps
  GROUND_HEIGHT: 75,
  GHOST_DRAIN_RATE: 20, // % por segundo
  GHOST_RECHARGE_RATE: 13, // % por segundo
  GHOST_MIN_ACTIVATION: 20, // % mínima
  GHOST_INVULNERABLE_DURATION: 0.55 // segundos de segurança
};
