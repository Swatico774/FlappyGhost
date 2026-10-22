import React, { useEffect, useRef, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  Play, 
  RotateCcw, 
  Ghost, 
  Zap, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Trophy, 
  Coins, 
  Palette,
  Sparkles,
  Gauge
} from 'lucide-react';
import { sound } from './audio';
import { SKINS, GAME_CONSTANTS } from './constants';

export default function App() {
  const canvasRef = useRef(null);

  // Estados React da UI
  const [gameState, setGameState] = useState('START'); // 'START', 'PLAYING', 'GAMEOVER'
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(() => parseInt(localStorage.getItem('flappy_coins') || '0'));
  const [bestScore, setBestScore] = useState(() => parseInt(localStorage.getItem('flappy_best') || '0'));
  const [selectedSkinId, setSelectedSkinId] = useState(() => localStorage.getItem('flappy_skin') || 'phoenix');
  const [speedMode, setSpeedMode] = useState('normal'); // 'normal', 'fast', 'slow'
  const [ghostEnergy, setGhostEnergy] = useState(100);
  const [isGhostActive, setIsGhostActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSkinSelector, setShowSkinSelector] = useState(false);

  // Referências para o motor de física (60fps desvinculado de re-render do React)
  const engineRef = useRef({
    bird: {
      x: 75,
      y: 280,
      width: 34,
      height: 26,
      vy: 0,
      rotation: 0,
      wingPhase: 0,
      wingSpeed: 0.15,
      floatOffset: 0
    },
    ghost: {
      active: false,
      energy: 100,
      invulnerableTimer: 0
    },
    pipes: [],
    coinsList: [],
    particles: [],
    ghostTrails: [],
    clouds: [
      { x: 30, y: 70, scale: 0.9, speed: 0.3 },
      { x: 220, y: 130, scale: 0.7, speed: 0.2 },
      { x: 360, y: 90, scale: 1.1, speed: 0.4 }
    ],
    groundScroll: 0,
    pipeTimer: 0,
    score: 0,
    coinsCollected: 0,
    gameState: 'START',
    speedMode: 'normal',
    skin: SKINS[0]
  });

  // Atualizar skin ativa na engine
  useEffect(() => {
    const skin = SKINS.find(s => s.id === selectedSkinId) || SKINS[0];
    engineRef.current.skin = skin;
    localStorage.setItem('flappy_skin', selectedSkinId);
  }, [selectedSkinId]);

  // Sons Mudo
  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  // Fullscreen
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Alternar Velocidade (Q e R)
  const setGameSpeed = useCallback((mode) => {
    const nextMode = engineRef.current.speedMode === mode ? 'normal' : mode;
    engineRef.current.speedMode = nextMode;
    setSpeedMode(nextMode);
  }, []);

  // Alternar Modo Fantasma (E)
  const toggleGhost = useCallback(() => {
    if (engineRef.current.gameState !== 'PLAYING') return;
    const ghost = engineRef.current.ghost;
    const bird = engineRef.current.bird;

    sound.init();

    if (!ghost.active) {
      if (ghost.energy >= GAME_CONSTANTS.GHOST_MIN_ACTIVATION) {
        ghost.active = true;
        ghost.invulnerableTimer = 0;
        sound.playGhostActivate();
        setIsGhostActive(true);
        // Explosão de partículas fantasmagóricas
        createBurst(bird.x + bird.width / 2, bird.y + bird.height / 2, engineRef.current.skin.ghostGlow, 20);
      }
    } else {
      ghost.active = false;
      ghost.invulnerableTimer = GAME_CONSTANTS.GHOST_INVULNERABLE_DURATION;
      sound.playGhostDeactivate();
      setIsGhostActive(false);
      createBurst(bird.x + bird.width / 2, bird.y + bird.height / 2, '#38bdf8', 12);
    }
  }, []);

  // Ação primária (Pular / Começar / Reiniciar)
  const handlePrimaryAction = useCallback(() => {
    const engine = engineRef.current;
    sound.init();

    if (engine.gameState === 'START') {
      engine.gameState = 'PLAYING';
      setGameState('PLAYING');
      engine.bird.vy = GAME_CONSTANTS.JUMP_FORCE;
      sound.playFlap();
      createFeathers(engine.bird.x, engine.bird.y + 12);
    } else if (engine.gameState === 'PLAYING') {
      engine.bird.vy = GAME_CONSTANTS.JUMP_FORCE;
      engine.bird.wingSpeed = 0.35;
      sound.playFlap();
      createFeathers(engine.bird.x, engine.bird.y + 12);
    } else if (engine.gameState === 'GAMEOVER') {
      // Reiniciar
      engine.bird.x = 75;
      engine.bird.y = 280;
      engine.bird.vy = 0;
      engine.bird.rotation = 0;
      engine.pipes = [];
      engine.coinsList = [];
      engine.particles = [];
      engine.ghostTrails = [];
      engine.pipeTimer = 0;
      engine.score = 0;
      engine.coinsCollected = 0;
      engine.ghost.active = false;
      engine.ghost.energy = 100;
      engine.ghost.invulnerableTimer = 0;
      engine.gameState = 'PLAYING';

      setScore(0);
      setGhostEnergy(100);
      setIsGhostActive(false);
      setGameState('PLAYING');

      engine.bird.vy = GAME_CONSTANTS.JUMP_FORCE;
      sound.playFlap();
    }
  }, []);

  // Helper de partículas
  const createBurst = (x, y, color, count = 16) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i;
      const spd = 2 + Math.random() * 4;
      engineRef.current.particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: 3 + Math.random() * 3,
        alpha: 1,
        color
      });
    }
  };

  const createFeathers = (x, y) => {
    for (let i = 0; i < 4; i++) {
      engineRef.current.particles.push({
        x, y,
        vx: -1.5 - Math.random() * 2,
        vy: (Math.random() - 0.5) * 2,
        size: 3 + Math.random() * 2,
        alpha: 0.85,
        color: engineRef.current.skin.bellyColor
      });
    }
  };

  // Controles de Teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handlePrimaryAction();
      } else if (e.code === 'KeyE') {
        toggleGhost();
      } else if (e.code === 'KeyQ') {
        setGameSpeed('fast');
      } else if (e.code === 'KeyR') {
        setGameSpeed('slow');
      } else if (e.code === 'KeyF') {
        handleToggleFullscreen();
      } else if (e.code === 'KeyM') {
        handleToggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrimaryAction, toggleGhost, setGameSpeed]);

  // Motor principal do jogo no Canvas (60fps fixo)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animationFrameId;
    let lastTime = performance.now();
    let accumulator = 0;

    const fixedStep = GAME_CONSTANTS.FIXED_STEP;
    const dtSec = fixedStep / 1000;

    const gameLoop = (currentTime) => {
      let elapsed = currentTime - lastTime;
      if (elapsed > 100) elapsed = 100; // Proteção contra abas inativas
      lastTime = currentTime;

      accumulator += elapsed;

      const engine = engineRef.current;

      while (accumulator >= fixedStep) {
        // --- 1. ATUALIZAÇÃO DA FÍSICA ---
        const { bird, ghost, pipes, coinsList, speedMode } = engine;

        // Fator de velocidade
        let speedMult = 1.0;
        if (speedMode === 'fast') speedMult = 1.6;
        if (speedMode === 'slow') speedMult = 0.65;
        const currentSpeed = GAME_CONSTANTS.BASE_SPEED * speedMult;

        // Atualização do Pássaro
        if (engine.gameState === 'START') {
          bird.floatOffset += 0.05;
          bird.y = 280 + Math.sin(bird.floatOffset) * 10;
          bird.rotation = 0;
          bird.wingPhase += 0.1;
        } else if (engine.gameState === 'PLAYING') {
          bird.vy += GAME_CONSTANTS.GRAVITY;
          bird.y += bird.vy;

          if (bird.vy < 0) {
            bird.rotation = Math.max(-0.45, bird.vy * 0.06);
          } else {
            bird.rotation = Math.min(1.2, bird.vy * 0.08);
          }

          bird.wingPhase += bird.wingSpeed;
          if (bird.wingSpeed > 0.15) bird.wingSpeed *= 0.96;

          // Colisão com o teto
          if (bird.y < 0) {
            bird.y = 0;
            bird.vy = 0;
          }

          // Colisão com o chão
          const groundY = GAME_CONSTANTS.CANVAS_HEIGHT - GAME_CONSTANTS.GROUND_HEIGHT - bird.height;
          if (bird.y >= groundY) {
            if (ghost.active || ghost.invulnerableTimer > 0) {
              bird.y = groundY;
              bird.vy = 0;
            } else {
              bird.y = groundY;
              // Game Over
              triggerGameOver();
            }
          }

          // Rastro do modo fantasma
          if (ghost.active) {
            engine.ghostTrails.push({
              x: bird.x,
              y: bird.y,
              rotation: bird.rotation,
              alpha: 0.6,
              wingPhase: bird.wingPhase
            });
          }
        }

        // Atualização do Modo Fantasma (Energia e Timer)
        if (engine.gameState === 'PLAYING') {
          if (ghost.active) {
            ghost.energy -= GAME_CONSTANTS.GHOST_DRAIN_RATE * dtSec;
            if (ghost.energy <= 0) {
              ghost.energy = 0;
              ghost.active = false;
              ghost.invulnerableTimer = GAME_CONSTANTS.GHOST_INVULNERABLE_DURATION;
              sound.playGhostDeactivate();
              setIsGhostActive(false);
            }
          } else {
            if (ghost.energy < 100) {
              ghost.energy = Math.min(100, ghost.energy + GAME_CONSTANTS.GHOST_RECHARGE_RATE * dtSec);
            }
          }

          if (ghost.invulnerableTimer > 0) {
            ghost.invulnerableTimer = Math.max(0, ghost.invulnerableTimer - dtSec);
          }

          setGhostEnergy(ghost.energy);
        }

        // Atualização dos Canos
        if (engine.gameState === 'PLAYING') {
          engine.pipeTimer++;
          let spawnInterval = GAME_CONSTANTS.PIPE_SPAWN_INTERVAL;
          if (speedMode === 'fast') spawnInterval = Math.floor(GAME_CONSTANTS.PIPE_SPAWN_INTERVAL / 1.5);
          if (speedMode === 'slow') spawnInterval = Math.floor(GAME_CONSTANTS.PIPE_SPAWN_INTERVAL / 0.7);

          if (engine.pipeTimer >= spawnInterval) {
            engine.pipeTimer = 0;
            const minHeight = 50;
            const availableHeight = GAME_CONSTANTS.CANVAS_HEIGHT - GAME_CONSTANTS.GROUND_HEIGHT - GAME_CONSTANTS.PIPE_GAP - (minHeight * 2);
            const topHeight = minHeight + Math.random() * availableHeight;
            const bottomY = topHeight + GAME_CONSTANTS.PIPE_GAP;

            pipes.push({
              x: GAME_CONSTANTS.CANVAS_WIDTH + 15,
              width: 62,
              topHeight,
              bottomY,
              passed: false
            });

            // Gerar moeda coletável no centro do vão do cano com 60% de chance
            if (Math.random() < 0.65) {
              coinsList.push({
                x: GAME_CONSTANTS.CANVAS_WIDTH + 15 + 31,
                y: topHeight + (GAME_CONSTANTS.PIPE_GAP / 2),
                size: 10,
                collected: false,
                pulse: 0
              });
            }
          }

          // Mover e testar colisão com canos
          const isInvulnerable = ghost.active || ghost.invulnerableTimer > 0;
          const birdBox = {
            left: bird.x + 4,
            right: bird.x + bird.width - 4,
            top: bird.y + 4,
            bottom: bird.y + bird.height - 4
          };

          for (let i = pipes.length - 1; i >= 0; i--) {
            const p = pipes[i];
            p.x -= currentSpeed;

            if (!isInvulnerable) {
              if (birdBox.right > p.x && birdBox.left < p.x + p.width) {
                if (birdBox.top < p.topHeight || birdBox.bottom > p.bottomY) {
                  triggerGameOver();
                }
              }
            }

            if (!p.passed && p.x + p.width < bird.x) {
              p.passed = true;
              engine.score++;
              setScore(engine.score);
              sound.playScore();

              // Partícula de score
              engine.particles.push({
                x: bird.x,
                y: bird.y - 12,
                vx: 0,
                vy: -1.6,
                text: '+1',
                alpha: 1,
                color: '#38bdf8'
              });
            }

            if (p.x + p.width < -20) {
              pipes.splice(i, 1);
            }
          }

          // Mover e testar moedas
          for (let i = coinsList.length - 1; i >= 0; i--) {
            const c = coinsList[i];
            c.x -= currentSpeed;
            c.pulse += 0.1;

            // Colisão com moeda
            const dist = Math.hypot(bird.x + bird.width / 2 - c.x, bird.y + bird.height / 2 - c.y);
            if (dist < bird.width / 2 + c.size) {
              sound.playCoin();
              engine.coinsCollected++;
              setCoins(prev => {
                const total = prev + 1;
                localStorage.setItem('flappy_coins', total.toString());
                return total;
              });

              // Efeito de moeda
              createBurst(c.x, c.y, '#facc15', 8);
              coinsList.splice(i, 1);
              continue;
            }

            if (c.x < -20) {
              coinsList.splice(i, 1);
            }
          }
        }

        // Parallax do Cenário
        engine.groundScroll = (engine.groundScroll + currentSpeed) % 24;
        for (let cloud of engine.clouds) {
          cloud.x -= cloud.speed;
          if (cloud.x < -100) cloud.x = GAME_CONSTANTS.CANVAS_WIDTH + 60;
        }

        accumulator -= fixedStep;
      }

      // --- 2. RENDERIZAÇÃO NO CANVAS ---
      ctx.clearRect(0, 0, GAME_CONSTANTS.CANVAS_WIDTH, GAME_CONSTANTS.CANVAS_HEIGHT);
      drawScene(ctx, engine);

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    function triggerGameOver() {
      const engine = engineRef.current;
      if (engine.gameState === 'GAMEOVER') return;
      engine.gameState = 'GAMEOVER';
      engine.ghost.active = false;
      setIsGhostActive(false);
      setGameState('GAMEOVER');
      sound.playHit();

      // Confetes se bateu recorde
      if (engine.score > bestScore) {
        setBestScore(engine.score);
        localStorage.setItem('flappy_best', engine.score.toString());
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [bestScore]);

  // Função de Desenho de Alta Fidelidade
  const drawScene = (ctx, engine) => {
    const { bird, ghost, pipes, coinsList, particles, ghostTrails, clouds, groundScroll, skin } = engine;
    const isGhost = ghost.active;
    const w = GAME_CONSTANTS.CANVAS_WIDTH;
    const h = GAME_CONSTANTS.CANVAS_HEIGHT;

    // 1. Céu Dinâmico com Gradiente Espectral
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    if (isGhost) {
      skyGrad.addColorStop(0, '#022c22');
      skyGrad.addColorStop(0.4, '#0f172a');
      skyGrad.addColorStop(1, '#1e1b4b');
    } else {
      skyGrad.addColorStop(0, '#0284c7');
      skyGrad.addColorStop(0.5, '#38bdf8');
      skyGrad.addColorStop(1, '#bae6fd');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Nuvens com Parallax
    for (let c of clouds) {
      ctx.save();
      ctx.fillStyle = isGhost ? 'rgba(103, 232, 249, 0.2)' : 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(c.x, c.y, 20 * c.scale, 0, Math.PI * 2);
      ctx.arc(c.x + 16 * c.scale, c.y - 12 * c.scale, 26 * c.scale, 0, Math.PI * 2);
      ctx.arc(c.x + 42 * c.scale, c.y - 8 * c.scale, 20 * c.scale, 0, Math.PI * 2);
      ctx.arc(c.x + 58 * c.scale, c.y, 16 * c.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Vinheta espectral no Modo Fantasma
    if (isGhost) {
      const vignette = ctx.createRadialGradient(w / 2, h / 2, 70, w / 2, h / 2, h * 0.7);
      vignette.addColorStop(0, 'rgba(6, 182, 212, 0.04)');
      vignette.addColorStop(0.7, 'rgba(15, 23, 42, 0.55)');
      vignette.addColorStop(1, 'rgba(2, 44, 34, 0.9)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);
    }

    // 4. Canos Neon Modernos
    for (let p of pipes) {
      drawPipe(ctx, p.x, 0, p.width, p.topHeight, true, isGhost);
      const bottomHeight = h - GAME_CONSTANTS.GROUND_HEIGHT - p.bottomY;
      drawPipe(ctx, p.x, p.bottomY, p.width, bottomHeight, false, isGhost);
    }

    // 5. Moedas Coletáveis
    for (let c of coinsList) {
      ctx.save();
      ctx.translate(c.x, c.y + Math.sin(c.pulse) * 3);
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(0, 0, c.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 0, c.size * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ca8a04';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 0);
      ctx.restore();
    }

    // 6. Chão Texturizado com Rolamento
    const groundY = h - GAME_CONSTANTS.GROUND_HEIGHT;
    ctx.fillStyle = isGhost ? '#0d9488' : '#15803d';
    ctx.fillRect(0, groundY, w, 14);
    ctx.fillStyle = isGhost ? '#2dd4bf' : '#22c55e';
    ctx.fillRect(0, groundY, w, 4);
    ctx.fillStyle = isGhost ? '#1e293b' : '#78350f';
    ctx.fillRect(0, groundY + 14, w, GAME_CONSTANTS.GROUND_HEIGHT - 14);

    // Textura de rolamento do solo
    ctx.fillStyle = isGhost ? '#334155' : '#451a03';
    for (let x = -groundScroll; x < w + 24; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, groundY + 14);
      ctx.lineTo(x + 12, groundY + 28);
      ctx.lineTo(x + 6, groundY + 28);
      ctx.lineTo(x - 6, groundY + 14);
      ctx.fill();
    }

    // 7. Rastro Fantasma do Pássaro
    for (let i = ghostTrails.length - 1; i >= 0; i--) {
      const t = ghostTrails[i];
      t.alpha -= 0.045;
      if (t.alpha <= 0) {
        ghostTrails.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.translate(t.x + bird.width / 2, t.y + bird.height / 2);
      ctx.rotate(t.rotation);
      ctx.globalAlpha = t.alpha * 0.45;
      ctx.fillStyle = skin.trailColor;
      ctx.shadowColor = skin.ghostGlow;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.ellipse(0, 0, bird.width / 2, bird.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 8. O Pássaro Estilizado com a Skin Selecionada
    ctx.save();
    ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
    ctx.rotate(bird.rotation);

    const isInvulnerable = ghost.invulnerableTimer > 0;
    if (isInvulnerable && !isGhost) {
      if (Math.floor(Date.now() / 60) % 2 === 0) {
        ctx.globalAlpha = 0.35;
      }
    }

    if (isGhost) {
      ctx.globalAlpha = 0.6;
      ctx.shadowColor = skin.ghostGlow;
      ctx.shadowBlur = 20;
    }

    // Corpo
    ctx.fillStyle = isGhost ? skin.ghostBodyColor : skin.bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, bird.width / 2, bird.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isGhost ? '#ffffff' : '#78350f';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Barriga
    ctx.fillStyle = isGhost ? '#ffffff' : skin.bellyColor;
    ctx.beginPath();
    ctx.ellipse(-2, 3, bird.width / 2.7, bird.height / 2.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Olho
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(7, -4, 5.5, 0, Math.PI * 2);
    ctx.fill();

    // Pupila
    ctx.fillStyle = isGhost ? '#0891b2' : '#0f172a';
    ctx.beginPath();
    ctx.arc(9, -4, 2.7, 0, Math.PI * 2);
    ctx.fill();

    // Bico
    ctx.fillStyle = isGhost ? '#38bdf8' : '#f97316';
    ctx.beginPath();
    ctx.moveTo(12, -2);
    ctx.lineTo(21, 2);
    ctx.lineTo(11, 7);
    ctx.closePath();
    ctx.fill();

    // Asa
    const wingFlap = Math.sin(bird.wingPhase) * 6;
    ctx.fillStyle = isGhost ? skin.trailColor : skin.wingColor;
    ctx.beginPath();
    ctx.ellipse(-6, 1 + wingFlap * 0.4, 7, 4 + Math.abs(wingFlap) * 0.3, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 9. Partículas de Efeito
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx || 0;
      p.y += p.vy || 0;
      p.alpha -= 0.025;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = p.alpha;
      if (p.text) {
        ctx.font = "bold 20px 'Outfit', sans-serif";
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x, p.y);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  };

  const drawPipe = (ctx, x, y, width, height, isTop, isGhost) => {
    ctx.save();
    const grad = ctx.createLinearGradient(x, 0, x + width, 0);
    if (isGhost) {
      grad.addColorStop(0, '#064e3b');
      grad.addColorStop(0.3, '#10b981');
      grad.addColorStop(0.7, '#047857');
      grad.addColorStop(1, '#064e3b');
    } else {
      grad.addColorStop(0, '#15803d');
      grad.addColorStop(0.3, '#22c55e');
      grad.addColorStop(0.7, '#16a34a');
      grad.addColorStop(1, '#14532d');
    }

    ctx.fillStyle = grad;
    ctx.fillRect(x, y, width, height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(x + 5, y, 4, height);

    ctx.strokeStyle = '#052e16';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, width, height);

    // Anel de acabamento da boca do cano
    const ringHeight = 24;
    const ringOverhang = 4;
    const ringX = x - ringOverhang;
    const ringWidth = width + (ringOverhang * 2);
    const ringY = isTop ? height - ringHeight : y;

    ctx.fillStyle = grad;
    ctx.fillRect(ringX, ringY, ringWidth, ringHeight);
    ctx.strokeRect(ringX, ringY, ringWidth, ringHeight);
    ctx.restore();
  };

  return (
    <div className="relative w-screen h-screen flex flex-col items-center justify-center bg-slate-950 font-sans p-2 select-none overflow-hidden">
      {/* Container Principal Centralizado */}
      <div className="relative flex flex-col items-center max-h-[96vh]">
        {/* Barra Superior de Informações */}
        <div className="w-full max-w-[400px] flex items-center justify-between px-3 py-2 bg-slate-900/80 backdrop-blur-md rounded-t-2xl border-t border-x border-slate-800 text-sm font-semibold">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">
              <Coins className="w-4 h-4" />
              <span>{coins}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-400 text-xs">
              <Trophy className="w-3.5 h-3.5 text-yellow-500" />
              <span>Recorde: {bestScore}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowSkinSelector(prev => !prev)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition"
              title="Mudar Skin"
            >
              <Palette className="w-4 h-4" />
            </button>
            <button 
              onClick={handleToggleMute}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition"
              title={isMuted ? "Ativar Som" : "Silenciar Som"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
            <button 
              onClick={handleToggleFullscreen}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition"
              title="Tela Cheia (F)"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Canvas do Jogo */}
        <div className="relative overflow-hidden border-2 border-slate-700 rounded-b-2xl shadow-2xl bg-black">
          <canvas
            ref={canvasRef}
            width={GAME_CONSTANTS.CANVAS_WIDTH}
            height={GAME_CONSTANTS.CANVAS_HEIGHT}
            onClick={handlePrimaryAction}
            className="block cursor-pointer max-h-[68vh] w-auto aspect-[400/640]"
          />

          {/* HUD Superior no Jogo */}
          {gameState === 'PLAYING' && (
            <div className="absolute top-4 inset-x-0 flex flex-col items-center pointer-events-none">
              <span className="text-5xl font-black text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                {score}
              </span>

              {/* Barra de Energia Fantasma */}
              <div className="mt-2 w-48 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 flex flex-col items-center">
                <div className="w-full flex justify-between items-center px-1 text-[10px] font-bold tracking-wider mb-1">
                  <span className={isGhostActive ? "text-cyan-400 animate-pulse" : "text-slate-300"}>
                    {isGhostActive ? "FANTASMA ATIVO!" : ghostEnergy < GAME_CONSTANTS.GHOST_MIN_ACTIVATION ? "RECARREGANDO..." : "FANTASMA PRONTO (E)"}
                  </span>
                  <span className="text-slate-400">{Math.floor(ghostEnergy)}%</span>
                </div>
                <div className="relative w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className={`h-full transition-all duration-75 rounded-full ${
                      isGhostActive 
                        ? 'bg-gradient-to-r from-cyan-500 to-emerald-400 glow-cyan' 
                        : ghostEnergy < GAME_CONSTANTS.GHOST_MIN_ACTIVATION 
                          ? 'bg-gradient-to-r from-red-500 to-amber-500' 
                          : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                    }`}
                    style={{ width: `${ghostEnergy}%` }}
                  />
                  {/* Marcador dos 20% */}
                  <div className="absolute top-0 bottom-0 left-[20%] w-0.5 bg-white/40" />
                </div>
              </div>
            </div>
          )}

          {/* Modal / Overlay da Tela Inicial */}
          {gameState === 'START' && (
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
              <div className="animate-float flex flex-col items-center">
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/40 rounded-2xl glow-cyan mb-3">
                  <Ghost className="w-12 h-12 text-cyan-400" />
                </div>
                <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-400">
                  FLAPPY GHOST
                </h1>
                <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase mt-1">
                  Neon Ascent &bull; React Edition
                </p>
              </div>

              <button
                onClick={handlePrimaryAction}
                className="mt-8 flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold rounded-2xl shadow-lg shadow-cyan-500/30 transform hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>JOGAR AGORA</span>
              </button>

              <div className="mt-6 flex flex-col gap-1 text-slate-400 text-xs">
                <p><span className="text-cyan-400 font-bold">Espaço / Clique:</span> Pular</p>
                <p><span className="text-cyan-400 font-bold">E:</span> Modo Fantasma (atravessa canos)</p>
                <p><span className="text-cyan-400 font-bold">Q / R:</span> Acelerar / Desacelerar</p>
              </div>
            </div>
          )}

          {/* Modal / Overlay de Game Over */}
          {gameState === 'GAMEOVER' && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
              <div className="bg-slate-900/90 border border-red-500/40 p-6 rounded-3xl shadow-2xl max-w-xs w-full flex flex-col items-center">
                <h2 className="text-2xl font-black text-red-500 tracking-wide mb-4">
                  FIM DE JOGO
                </h2>

                <div className="w-full bg-slate-950 p-4 rounded-2xl border border-slate-800 flex justify-around items-center mb-5">
                  <div className="flex flex-col items-center">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Pontos</span>
                    <span className="text-3xl font-black text-white">{score}</span>
                  </div>
                  <div className="h-8 w-px bg-slate-800" />
                  <div className="flex flex-col items-center">
                    <span className="text-[11px] font-bold text-amber-400 uppercase">Recorde</span>
                    <span className="text-3xl font-black text-amber-400">{bestScore}</span>
                  </div>
                </div>

                <button
                  onClick={handlePrimaryAction}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-500/25 transition cursor-pointer"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>JOGAR NOVAMENTE</span>
                </button>
              </div>
            </div>
          )}

          {/* Gaveta de Skins */}
          {showSkinSelector && (
            <div className="absolute inset-x-0 bottom-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-700 p-4 rounded-t-3xl flex flex-col gap-3 animate-in slide-in-from-bottom duration-200">
              <div className="flex justify-between items-center px-1">
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Escolha seu Pássaro
                </span>
                <button 
                  onClick={() => setShowSkinSelector(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Fechar
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {SKINS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedSkinId(s.id);
                      setShowSkinSelector(false);
                    }}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-left transition ${
                      selectedSkinId === s.id 
                        ? 'border-cyan-400 bg-cyan-500/15 text-white' 
                        : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div 
                      className="w-6 h-6 rounded-full border border-white/40 flex-shrink-0" 
                      style={{ backgroundColor: s.bodyColor }}
                    />
                    <span className="text-xs font-bold truncate">{s.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Painel Inferior de Controles Rápidos */}
        <div className="w-full max-w-[400px] flex items-center justify-between gap-2 mt-3">
          {/* Botão Modo Fantasma */}
          <button
            onClick={toggleGhost}
            disabled={gameState !== 'PLAYING' || (!isGhostActive && ghostEnergy < GAME_CONSTANTS.GHOST_MIN_ACTIVATION)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs shadow-md transition cursor-pointer ${
              isGhostActive 
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white glow-emerald animate-pulse' 
                : ghostEnergy < GAME_CONSTANTS.GHOST_MIN_ACTIVATION
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white'
            }`}
          >
            <Ghost className="w-4 h-4" />
            <span>Fantasma</span>
            <span className="bg-black/30 text-[10px] px-1.5 py-0.5 rounded font-mono">E</span>
          </button>

          {/* Botão Acelerar */}
          <button
            onClick={() => setGameSpeed('fast')}
            className={`flex items-center gap-1 py-2.5 px-3 rounded-xl font-bold text-xs shadow-md transition cursor-pointer ${
              speedMode === 'fast' 
                ? 'bg-emerald-600 text-white' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>{speedMode === 'fast' ? 'Normalizar' : 'Acelerar'}</span>
            <span className="bg-black/30 text-[10px] px-1.5 py-0.5 rounded font-mono">Q</span>
          </button>

          {/* Botão Desacelerar */}
          <button
            onClick={() => setGameSpeed('slow')}
            className={`flex items-center gap-1 py-2.5 px-3 rounded-xl font-bold text-xs shadow-md transition cursor-pointer ${
              speedMode === 'slow' 
                ? 'bg-emerald-600 text-white' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Gauge className="w-3.5 h-3.5 text-purple-400" />
            <span>{speedMode === 'slow' ? 'Normalizar' : 'Lento'}</span>
            <span className="bg-black/30 text-[10px] px-1.5 py-0.5 rounded font-mono">R</span>
          </button>
        </div>
      </div>
    </div>
  );
}
