import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useGame } from '../context/GameContext';
import { audioSynth } from '../utils/audioSynth';

// ─── CONSTANTS ────────────────────────────────────────────────────────────

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 600;

const DECK_3_Y = 150; // Top / Command
const DECK_2_Y = 320; // Middle / Operations
const DECK_1_Y = 490; // Bottom / Engineering

const ROBOT_H = 52;
const ROBOT_SPEED = 4.0;
const CLIMB_SPEED = 3.5;
const TERMINAL_INTERACT_RANGE = 60;
const LADDER_INTERACT_RANGE = 20;

// Helper function to safely draw rounded rectangles in all browsers
const safeRoundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  const radius = Math.max(0, Math.floor(r));
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
};

// ─── ROOMS / STATIONS ─────────────────────────────────────────────────────

interface RoomDef {
  id: string;
  label: string;
  terminalId: string;
  deck: 1 | 2 | 3;
  x: number;       // room left boundary
  width: number;
  color: string;
  colorRGB: string;
  icon: string;
  terminalX: number;
}

const ROOMS: RoomDef[] = [
  // Deck 3: Command
  { id: 'cockpit', label: 'COCKPIT', terminalId: 'bridge', deck: 3, x: 260, width: 330, color: '#00f2fe', colorRGB: '0,242,254', icon: '🚀', terminalX: 380 },
  { id: 'mailroom', label: 'COMMS', terminalId: 'mail', deck: 3, x: 590, width: 350, color: '#ffe14d', colorRGB: '255,225,77', icon: '📬', terminalX: 790 },

  // Deck 2: Operations
  { id: 'scanner', label: 'SCANNER', terminalId: 'scanner', deck: 2, x: 160, width: 280, color: '#00f2fe', colorRGB: '0,242,254', icon: '📡', terminalX: 260 },
  { id: 'exchange', label: 'EXCHANGE', terminalId: 'exchange', deck: 2, x: 440, width: 320, color: '#39ff14', colorRGB: '57,255,20', icon: '📈', terminalX: 580 },
  { id: 'lab', label: 'TECH LAB', terminalId: 'techLab', deck: 2, x: 760, width: 280, color: '#bf5fff', colorRGB: '191,95,255', icon: '🧬', terminalX: 880 },

  // Deck 1: Engineering & Cargo
  { id: 'drillBay', label: 'DRILL BAY', terminalId: 'refinery', deck: 1, x: 110, width: 440, color: '#ffb800', colorRGB: '255,184,0', icon: '⛏️', terminalX: 300 },
  { id: 'archives', label: 'ARCHIVES', terminalId: 'achievements', deck: 1, x: 550, width: 540, color: '#e0e0e0', colorRGB: '224,224,224', icon: '🏆', terminalX: 860 },
];

interface LadderDef {
  x: number;
  fromDeck: 1 | 2 | 3;
  toDeck: 1 | 2 | 3;
  fromY: number;
  toY: number;
}

const LADDERS: LadderDef[] = [
  { x: 500, fromDeck: 1, toDeck: 2, fromY: DECK_1_Y, toY: DECK_2_Y },
  { x: 700, fromDeck: 2, toDeck: 3, fromY: DECK_2_Y, toY: DECK_3_Y },
];

// ─── STAR FIELD & FIRE EFFECTS ───────────────────────────────────────────

interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  speed: number;
}

function createStars(count: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * CANVAS_HEIGHT,
      size: Math.random() * 2 + 0.5,
      brightness: Math.random() * 0.6 + 0.4,
      speed: Math.random() * 0.2 + 0.05,
    });
  }
  return stars;
}

interface SmokeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────

export const ShipInterior: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state, setActiveTerminal } = useGame();

  // Robot State
  const [deck, setDeck] = useState<1 | 2 | 3>(1);
  const [isClimbing, setIsClimbing] = useState(false);

  const playerXRef = useRef(300);
  const playerYRef = useRef(DECK_1_Y);
  const climbTargetYRef = useRef(DECK_1_Y);
  const climbNextDeckRef = useRef<1 | 2 | 3>(1);

  const keysRef = useRef<Set<string>>(new Set());
  const frameRef = useRef(0);
  const starsRef = useRef<Star[]>(createStars(80));
  const smokeParticlesRef = useRef<SmokeParticle[]>([]);
  const walkFrameRef = useRef(0);
  const facingRightRef = useRef(true);
  const [nearTerminal, setNearTerminal] = useState<string | null>(null);
  const nearTerminalRef = useRef<string | null>(null);
  const animFrameId = useRef(0);

  // Get current horizontal bounds
  const getDeckBounds = (d: 1 | 2 | 3) => {
    if (d === 3) return { min: 270, max: 930 };
    if (d === 2) return { min: 170, max: 1030 };
    return { min: 120, max: 1080 };
  };

  // ─── KEYBOARD HANDLERS ──────────────────────────────────────────────

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (state.activeTerminal) return; // ignore controls when terminal is open

    const key = e.key.toLowerCase();
    keysRef.current.add(key);

    if (key === 'e' || key === 'enter') {
      if (nearTerminalRef.current) {
        audioSynth.playChirpSound();
        setActiveTerminal(nearTerminalRef.current);
      }
    }
  }, [state.activeTerminal, setActiveTerminal]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysRef.current.delete(e.key.toLowerCase());
  }, []);

  // ─── CANVAS CLICK HANDLER ──────────────────────────────────────────

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (state.activeTerminal) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Check if clicked near a terminal
    for (const room of ROOMS) {
      if (room.deck !== deck) continue;
      const tX = room.terminalX;
      const tY = playerYRef.current - 45;
      if (Math.abs(clickX - tX) < 40 && Math.abs(clickY - tY) < 50) {
        if (Math.abs(playerXRef.current - tX) < TERMINAL_INTERACT_RANGE) {
          audioSynth.playChirpSound();
          setActiveTerminal(room.terminalId);
          return;
        }
      }
    }
  }, [state.activeTerminal, deck, setActiveTerminal]);

  // ─── DRAWING FUNCTIONS ──────────────────────────────────────────────

  function drawStarfield(ctx: CanvasRenderingContext2D, f: number) {
    starsRef.current.forEach(star => {
      const flicker = 0.8 + Math.sin(f * 0.03 + star.x) * 0.2;
      ctx.globalAlpha = star.brightness * flicker;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;
  }

  function drawEngineFire(ctx: CanvasRenderingContext2D, f: number) {
    const baseMinX = 420;
    const baseMaxX = 780;

    // Draw main rocket exhaust cone
    ctx.fillStyle = '#1e1e24';
    ctx.strokeStyle = '#b87333';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(baseMinX + 80, DECK_1_Y + 70);
    ctx.lineTo(baseMinX + 110, DECK_1_Y + 95);
    ctx.lineTo(baseMaxX - 110, DECK_1_Y + 95);
    ctx.lineTo(baseMaxX - 80, DECK_1_Y + 70);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Pulse engine fire
    const fireHeight = 45 + Math.sin(f * 0.2) * 12;
    const fireGrad = ctx.createLinearGradient(0, DECK_1_Y + 95, 0, DECK_1_Y + 95 + fireHeight);
    fireGrad.addColorStop(0, 'rgba(0, 242, 254, 0.9)');  // Cyan thrumming core
    fireGrad.addColorStop(0.3, 'rgba(255, 0, 127, 0.75)'); // Steampunk magenta plasma
    fireGrad.addColorStop(0.7, 'rgba(255, 140, 0, 0.4)');  // Orange flames
    fireGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = fireGrad;
    ctx.beginPath();
    ctx.moveTo(baseMinX + 120, DECK_1_Y + 95);
    ctx.bezierCurveTo(
      600 - 80, DECK_1_Y + 120,
      600 - 40, DECK_1_Y + 95 + fireHeight,
      600, DECK_1_Y + 95 + fireHeight
    );
    ctx.bezierCurveTo(
      600 + 40, DECK_1_Y + 95 + fireHeight,
      600 + 80, DECK_1_Y + 120,
      baseMaxX - 120, DECK_1_Y + 95
    );
    ctx.closePath();
    ctx.fill();

    // Spawn engine sparks
    if (Math.random() < 0.3) {
      smokeParticlesRef.current.push({
        x: 520 + Math.random() * 160,
        y: DECK_1_Y + 95,
        vx: (Math.random() - 0.5) * 1.5,
        vy: Math.random() * 3 + 2,
        life: 0,
        maxLife: 40 + Math.random() * 30,
        size: Math.random() * 3 + 1,
        color: Math.random() < 0.6 ? '#00f2fe' : '#ff007f'
      });
    }
  }

  function drawRocketHull(ctx: CanvasRenderingContext2D, f: number) {
    const COPPER = '#b87333';
    const BRASS = '#cd9b1d';

    ctx.save();

    // Double-lined outer rocket metal shell
    ctx.strokeStyle = COPPER;
    ctx.lineWidth = 4;
    ctx.fillStyle = '#09070f'; // Dark solid background inside rocket bounds

    ctx.beginPath();
    // Start at Top Nosecone
    ctx.moveTo(600, 40);
    // Right side of rocket curving outward
    ctx.bezierCurveTo(720, 80, 950, 160, 950, DECK_3_Y + 70); // Deck 3 Command Right Wall
    ctx.lineTo(1050, DECK_2_Y + 70);                         // Deck 2 Ops Right Wall
    ctx.lineTo(1100, DECK_1_Y + 70);                         // Deck 1 Engineering Right Wall
    
    // Bottom thruster base line
    ctx.lineTo(100, DECK_1_Y + 70);
    
    // Left side of rocket climbing back up
    ctx.lineTo(150, DECK_2_Y + 70);
    ctx.lineTo(250, DECK_3_Y + 70);
    ctx.bezierCurveTo(250, 160, 480, 80, 600, 40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Rivets and outline accent
    ctx.strokeStyle = BRASS;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw thruster structural booster wings on the sides
    ctx.fillStyle = '#1e1a24';
    ctx.strokeStyle = COPPER;
    ctx.lineWidth = 2.5;

    // Left Wing
    ctx.beginPath();
    ctx.moveTo(130, DECK_1_Y);
    ctx.lineTo(40, DECK_1_Y + 80);
    ctx.lineTo(110, DECK_1_Y + 70);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right Wing
    ctx.beginPath();
    ctx.moveTo(1070, DECK_1_Y);
    ctx.lineTo(1160, DECK_1_Y + 80);
    ctx.lineTo(1090, DECK_1_Y + 70);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw bulkheads inside the rocket representing floors/decks
    ctx.strokeStyle = 'rgba(184, 115, 51, 0.4)';
    ctx.lineWidth = 3;

    // Deck 3 Floor Grid line
    ctx.beginPath();
    ctx.moveTo(250, DECK_3_Y + 2);
    ctx.lineTo(950, DECK_3_Y + 2);
    ctx.stroke();

    // Deck 2 Floor Grid line
    ctx.beginPath();
    ctx.moveTo(150, DECK_2_Y + 2);
    ctx.lineTo(1050, DECK_2_Y + 2);
    ctx.stroke();

    // Deck 1 Floor Grid line
    ctx.beginPath();
    ctx.moveTo(100, DECK_1_Y + 2);
    ctx.lineTo(1100, DECK_1_Y + 2);
    ctx.stroke();

    // Glowing core pipes running vertically in background
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.08)';
    ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.moveTo(600, 60);
    ctx.lineTo(600, DECK_1_Y + 60);
    ctx.stroke();

    ctx.restore();
  }

  function drawRoom(ctx: CanvasRenderingContext2D, room: RoomDef, f: number) {
    const rx = room.x;
    const rw = room.width;
    const ry = (room.deck === 3 ? DECK_3_Y : room.deck === 2 ? DECK_2_Y : DECK_1_Y) - 100;
    const rh = 100;

    // Room base ambient background
    const wallGlow = ctx.createLinearGradient(rx, ry, rx, ry + rh);
    wallGlow.addColorStop(0, `rgba(${room.colorRGB}, 0.01)`);
    wallGlow.addColorStop(0.5, `rgba(${room.colorRGB}, 0.04)`);
    wallGlow.addColorStop(1, `rgba(${room.colorRGB}, 0.01)`);
    ctx.fillStyle = wallGlow;
    ctx.fillRect(rx, ry, rw, rh);

    // Structural columns/pillars separating rooms
    ctx.fillStyle = '#17141f';
    ctx.fillRect(rx, ry, 6, rh);
    ctx.fillRect(rx + rw - 6, ry, 6, rh);

    // Glowing label indicators
    ctx.fillStyle = `rgba(${room.colorRGB}, 0.3)`;
    ctx.font = '8px "Orbitron", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(room.label, rx + rw / 2, ry + 18);

    // Blinking lights in compartments
    const blinkOn = Math.sin(f * 0.05 + rx * 0.02) > 0.2;
    ctx.fillStyle = blinkOn ? room.color : `rgba(${room.colorRGB}, 0.1)`;
    ctx.beginPath();
    ctx.arc(rx + 20, ry + 30, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawLadders(ctx: CanvasRenderingContext2D, f: number) {
    const COPPER = '#b87333';
    const BRASS = '#cd9b1d';

    LADDERS.forEach(ladder => {
      const lx = ladder.x;
      const startY = ladder.toY;
      const endY = ladder.fromY;

      ctx.save();
      // Draw rails
      ctx.strokeStyle = COPPER;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(lx - 12, startY);
      ctx.lineTo(lx - 12, endY);
      ctx.moveTo(lx + 12, startY);
      ctx.lineTo(lx + 12, endY);
      ctx.stroke();

      // Draw safety rungs
      ctx.strokeStyle = BRASS;
      ctx.lineWidth = 2.0;
      for (let ry = startY + 10; ry < endY; ry += 16) {
        ctx.beginPath();
        ctx.moveTo(lx - 12, ry);
        ctx.lineTo(lx + 12, ry);
        ctx.stroke();
      }

      // Pulse green arrows indicating ladder interaction is active
      const isPlayerNear = Math.abs(playerXRef.current - lx) < LADDER_INTERACT_RANGE &&
        (playerYRef.current === ladder.fromY || playerYRef.current === ladder.toY);

      if (isPlayerNear && !isClimbing) {
        const arrowBob = Math.sin(f * 0.08) * 3;
        ctx.fillStyle = '#39ff14';
        ctx.font = '10px Rajdhani, sans-serif';
        ctx.textAlign = 'center';
        
        if (playerYRef.current === ladder.fromY) {
          ctx.fillText('▲ [W] CLIMB', lx, playerYRef.current - 60 + arrowBob);
        } else {
          ctx.fillText('▼ [S] DESCEND', lx, playerYRef.current - 60 + arrowBob);
        }
      }

      ctx.restore();
    });
  }

  function drawTerminal(ctx: CanvasRenderingContext2D, room: RoomDef, f: number, isNear: boolean) {
    const tx = room.terminalX;
    const ty = (room.deck === 3 ? DECK_3_Y : room.deck === 2 ? DECK_2_Y : DECK_1_Y) - 52;

    ctx.save();

    // Terminal console metallic body
    ctx.fillStyle = '#1e1c25';
    ctx.strokeStyle = '#b87333';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(tx - 15, ty + 52);
    ctx.lineTo(tx - 12, ty + 24);
    ctx.lineTo(tx + 12, ty + 24);
    ctx.lineTo(tx + 15, ty + 52);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Floating console holographic screens
    const pulse = 0.75 + Math.sin(f * 0.04 + tx) * 0.25;
    ctx.fillStyle = `rgba(${room.colorRGB}, ${0.15 * pulse})`;
    ctx.strokeStyle = room.color;
    ctx.lineWidth = isNear ? 2 : 1;

    ctx.beginPath();
    safeRoundRect(ctx, tx - 18, ty - 18, 36, 40, 3);
    ctx.fill();
    ctx.stroke();

    // Glowing interaction box
    if (isNear) {
      ctx.shadowColor = room.color;
      ctx.shadowBlur = 10;
      ctx.strokeRect(tx - 18, ty - 18, 36, 40);
      ctx.shadowBlur = 0;

      // Floating instruction prompt
      const promptBob = Math.sin(f * 0.06) * 4;
      ctx.fillStyle = room.color;
      ctx.font = 'bold 9px "Orbitron", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('[E] ACCESS', tx, ty - 28 + promptBob);
      
      ctx.beginPath();
      ctx.arc(tx, ty - 36 + promptBob, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Floating neon icons inside screens
    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.fillText(room.icon, tx, ty + 8);

    ctx.restore();
  }

  function drawRobot(ctx: CanvasRenderingContext2D, rx: number, ry: number, f: number, walking: boolean, facingRight: boolean, climbing: boolean) {
    const sx = rx;
    const sy = ry - ROBOT_H;

    ctx.save();

    // Flip robot if facing left
    if (!facingRight && !climbing) {
      ctx.translate(sx, 0);
      ctx.scale(-1, 1);
      ctx.translate(-sx, 0);
    }

    // Robot shadow on floor
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(sx, ry + 2, 16, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main robot body vertical bounce
    const bob = climbing ? Math.sin(f * 0.25) * 1.5 : (walking ? Math.sin(f * 0.25) * 1.5 : Math.sin(f * 0.04) * 0.7);
    const bodyY = sy + bob;

    // Crawler treads / wheels
    ctx.fillStyle = '#22202a';
    if (climbing) {
      ctx.fillRect(sx - 8, bodyY + ROBOT_H - 12, 4, 12);
      ctx.fillRect(sx + 4, bodyY + ROBOT_H - 12, 4, 12);
    } else {
      const offset = walking ? Math.sin(f * 0.35) * 4 : 0;
      ctx.fillRect(sx - 10 + offset, bodyY + ROBOT_H - 12, 5, 12);
      ctx.fillRect(sx + 5 - offset, bodyY + ROBOT_H - 12, 5, 12);
    }

    // Metal chassis
    const bodyGrad = ctx.createLinearGradient(sx - 12, bodyY + 6, sx + 12, bodyY + 6);
    bodyGrad.addColorStop(0, '#433c4f');
    bodyGrad.addColorStop(0.5, '#5d556c');
    bodyGrad.addColorStop(1, '#433c4f');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    safeRoundRect(ctx, sx - 12, bodyY + 6, 24, 26, 3);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 242, 254, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Visor glowing plate
    const energy = 0.7 + Math.sin(f * 0.08) * 0.3;
    ctx.fillStyle = `rgba(0, 242, 254, ${energy})`;
    ctx.beginPath();
    safeRoundRect(ctx, sx - 7, bodyY + 10, 14, 5, 1);
    ctx.fill();

    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Blinking shoulder antenna
    ctx.strokeStyle = '#433c4f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, bodyY + 6);
    ctx.lineTo(sx, bodyY - 4);
    ctx.stroke();

    const signalOn = Math.sin(f * 0.12) > 0.4;
    ctx.fillStyle = signalOn ? '#ff007f' : 'rgba(255, 0, 127, 0.1)';
    ctx.beginPath();
    ctx.arc(sx, bodyY - 5, 2, 0, Math.PI * 2);
    ctx.fill();

    // Steampunk brass cog spinner arms
    ctx.strokeStyle = '#b87333';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx + 12, bodyY + 12);
    if (climbing) {
      ctx.lineTo(sx + 18, bodyY + 6 + Math.sin(f * 0.3) * 6);
    } else {
      ctx.lineTo(sx + 18, bodyY + 20 + (walking ? Math.sin(f * 0.3) * 6 : 0));
    }
    ctx.stroke();

    ctx.restore();
  }

  function drawSparks(ctx: CanvasRenderingContext2D) {
    smokeParticlesRef.current.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life++;

      const pct = 1.0 - (p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = pct;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * pct, 0, Math.PI * 2);
      ctx.fill();
    });
    smokeParticlesRef.current = smokeParticlesRef.current.filter(p => p.life < p.maxLife);
    ctx.globalAlpha = 1.0;
  }

  // ─── MAIN SIMULATION LOOP ───────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Rescale Dpr Helper based on parent dimensions to prevent squishing
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const run = () => {
      if (state.activeTerminal) {
        animFrameId.current = requestAnimationFrame(run);
        return;
      }

      const parent = canvas.parentElement;
      if (!parent) {
        animFrameId.current = requestAnimationFrame(run);
        return;
      }

      const w = parent.clientWidth;
      const h = parent.clientHeight;

      // Skip frame if not laid out yet to prevent canvas scaling to 0
      if (w === 0 || h === 0) {
        animFrameId.current = requestAnimationFrame(run);
        return;
      }

      const scaleFactor = Math.min(w / CANVAS_WIDTH, h / CANVAS_HEIGHT);

      frameRef.current++;
      const f = frameRef.current;

      // ─── CLIMBING & MOVEMENT LOGIC ────────────────────────────────

      const keys = keysRef.current;
      let moving = false;

      if (isClimbing) {
        walkFrameRef.current++;
        const targetY = climbTargetYRef.current;
        const diff = targetY - playerYRef.current;

        if (Math.abs(diff) < CLIMB_SPEED) {
          playerYRef.current = targetY;
          setIsClimbing(false);
          setDeck(climbNextDeckRef.current);
        } else {
          playerYRef.current += Math.sign(diff) * CLIMB_SPEED;
        }
      } else {
        const bounds = getDeckBounds(deck);

        // Horizontal movement
        if (keys.has('a') || keys.has('arrowleft')) {
          playerXRef.current = Math.max(bounds.min, playerXRef.current - ROBOT_SPEED);
          facingRightRef.current = false;
          moving = true;
        }
        if (keys.has('d') || keys.has('arrowright')) {
          playerXRef.current = Math.min(bounds.max, playerXRef.current + ROBOT_SPEED);
          facingRightRef.current = true;
          moving = true;
        }

        if (moving) {
          walkFrameRef.current++;
        }

        // Ladder vertical climbing activation
        LADDERS.forEach(ladder => {
          const isNearX = Math.abs(playerXRef.current - ladder.x) < LADDER_INTERACT_RANGE;
          
          if (isNearX) {
            // Climb Up
            if (deck === ladder.fromDeck && (keys.has('w') || keys.has('arrowup'))) {
              setIsClimbing(true);
              climbTargetYRef.current = ladder.toY;
              climbNextDeckRef.current = ladder.toDeck;
              audioSynth.playUnlockSound();
            }
            // Climb Down
            if (deck === ladder.toDeck && (keys.has('s') || keys.has('arrowdown'))) {
              setIsClimbing(true);
              climbTargetYRef.current = ladder.fromY;
              climbNextDeckRef.current = ladder.fromDeck;
              audioSynth.playUnlockSound();
            }
          }
        });
      }

      // ─── TERMINAL PROXIMITY SCANNING ───────────────────────────────────

      let near: string | null = null;
      for (const room of ROOMS) {
        if (room.deck === deck && !isClimbing) {
          if (Math.abs(playerXRef.current - room.terminalX) < TERMINAL_INTERACT_RANGE) {
            near = room.terminalId;
            break;
          }
        }
      }
      if (near !== nearTerminalRef.current) {
        nearTerminalRef.current = near;
        setNearTerminal(near);
      }

      // ─── RENDERING ───────────────────────────────────────────────────

      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Apply uniform layout scaling so the full rocket fits beautifully inside the viewport
      ctx.save();
      const offsetX = (w - CANVAS_WIDTH * scaleFactor) / 2;
      const offsetY = (h - CANVAS_HEIGHT * scaleFactor) / 2;
      ctx.translate(offsetX, offsetY);
      ctx.scale(scaleFactor, scaleFactor);

      // 1. Black Space void background
      ctx.fillStyle = '#050309';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 2. Parallax twinkling stars
      drawStarfield(ctx, f);

      // 3. Engine rocket booster fire
      drawEngineFire(ctx, f);

      // 4. Steampunk copper/brass outer rocket hulls
      drawRocketHull(ctx, f);

      // 5. Rooms interior walls
      ROOMS.forEach(room => drawRoom(ctx, room, f));

      // 6. Interactive ladders
      drawLadders(ctx, f);

      // 7. Desktop screen terminals
      ROOMS.forEach(room => {
        drawTerminal(ctx, room, f, nearTerminalRef.current === room.terminalId);
      });

      // 8. Animated floating sparks
      drawSparks(ctx);

      // 9. Robot character model
      drawRobot(
        ctx,
        playerXRef.current,
        playerYRef.current,
        walkFrameRef.current,
        moving,
        facingRightRef.current,
        isClimbing
      );

      // 10. CRT dark vignette overlay
      const radialGrad = ctx.createRadialGradient(
        CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.25,
        CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.75
      );
      radialGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      radialGrad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
      ctx.fillStyle = radialGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 11. Subtle retro scanlines
      ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
      for (let sl = 0; sl < CANVAS_HEIGHT; sl += 3) {
        ctx.fillRect(0, sl, CANVAS_WIDTH, 1);
      }

      ctx.restore();

      animFrameId.current = requestAnimationFrame(run);
    };

    animFrameId.current = requestAnimationFrame(run);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      cancelAnimationFrame(animFrameId.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [state.activeTerminal, deck, isClimbing, handleKeyDown, handleKeyUp]);

  // ─── RENDER DOM ─────────────────────────────────────────────────────

  return (
    <div className="ship-viewport">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{ width: '100%', height: '100%', display: 'block', cursor: nearTerminal ? 'pointer' : 'default' }}
      />

      {/* Floating retro controls banner */}
      <div className="ship-controls-hint" style={{
        position: 'absolute', bottom: '15px', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: '20px', background: 'rgba(15, 10, 20, 0.85)',
        border: '1px solid #b87333', padding: '6px 20px', borderRadius: '4px',
        fontFamily: "'Orbitron', monospace", fontSize: '0.75rem', color: '#f8fafc',
        boxShadow: '0 4px 12px rgba(0,0,0,0.6)', pointerEvents: 'none'
      }}>
        <span><kbd style={{ background: '#2e253c', padding: '2px 6px', border: '1px solid #5c4e72', borderRadius: '3px', margin: '0 2px' }}>A</kbd><kbd style={{ background: '#2e253c', padding: '2px 6px', border: '1px solid #5c4e72', borderRadius: '3px', margin: '0 2px' }}>D</kbd> or <kbd style={{ background: '#2e253c', padding: '2px 6px', border: '1px solid #5c4e72', borderRadius: '3px', margin: '0 2px' }}>←</kbd><kbd style={{ background: '#2e253c', padding: '2px 6px', border: '1px solid #5c4e72', borderRadius: '3px', margin: '0 2px' }}>→</kbd> Move</span>
        <span><kbd style={{ background: '#2e253c', padding: '2px 6px', border: '1px solid #5c4e72', borderRadius: '3px', margin: '0 2px' }}>W</kbd><kbd style={{ background: '#2e253c', padding: '2px 6px', border: '1px solid #5c4e72', borderRadius: '3px', margin: '0 2px' }}>S</kbd> or <kbd style={{ background: '#2e253c', padding: '2px 6px', border: '1px solid #5c4e72', borderRadius: '3px', margin: '0 2px' }}>↑</kbd><kbd style={{ background: '#2e253c', padding: '2px 6px', border: '1px solid #5c4e72', borderRadius: '3px', margin: '0 2px' }}>↓</kbd> Climb</span>
        <span><kbd style={{ background: '#2e253c', padding: '2px 6px', border: '1px solid #5c4e72', borderRadius: '3px', margin: '0 2px' }}>E</kbd> Interact</span>
      </div>
    </div>
  );
};
