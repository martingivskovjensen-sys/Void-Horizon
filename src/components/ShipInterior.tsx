import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useGame } from '../context/GameContext';
import { audioSynth } from '../utils/audioSynth';

// ─── CONSTANTS ────────────────────────────────────────────────────────────

const SHIP_WIDTH = 3200;
const SHIP_HEIGHT = 520;
const FLOOR_Y = 380;
const CEILING_Y = 60;
const ROBOT_H = 52;
const ROBOT_SPEED = 3.5;
const CAMERA_LERP = 0.08;
const TERMINAL_INTERACT_RANGE = 70;

// ─── ROOM DEFINITIONS ────────────────────────────────────────────────────

interface RoomDef {
  id: string;
  label: string;
  terminalId: string;
  x: number;        // room left edge in world coords
  width: number;
  color: string;     // neon accent color
  colorRGB: string;  // for rgba usage
  icon: string;
  terminalX: number; // terminal center X in world coords
}

const ROOMS: RoomDef[] = [
  { id: 'cockpit', label: 'COCKPIT', terminalId: 'bridge', x: 0, width: 420, color: '#00f2fe', colorRGB: '0,242,254', icon: '🚀', terminalX: 210 },
  { id: 'drillBay', label: 'DRILL BAY', terminalId: 'refinery', x: 420, width: 420, color: '#ffb800', colorRGB: '255,184,0', icon: '⛏️', terminalX: 630 },
  { id: 'exchange', label: 'EXCHANGE', terminalId: 'exchange', x: 840, width: 420, color: '#39ff14', colorRGB: '57,255,20', icon: '📈', terminalX: 1050 },
  { id: 'scanner', label: 'SCANNER', terminalId: 'scanner', x: 1260, width: 420, color: '#00f2fe', colorRGB: '0,242,254', icon: '📡', terminalX: 1470 },
  { id: 'lab', label: 'TECH LAB', terminalId: 'techLab', x: 1680, width: 420, color: '#bf5fff', colorRGB: '191,95,255', icon: '🧬', terminalX: 1890 },
  { id: 'mailroom', label: 'COMMS', terminalId: 'mail', x: 2100, width: 420, color: '#ffe14d', colorRGB: '255,225,77', icon: '📬', terminalX: 2310 },
  { id: 'archives', label: 'ARCHIVES', terminalId: 'achievements', x: 2520, width: 480, color: '#e0e0e0', colorRGB: '224,224,224', icon: '🏆', terminalX: 2760 },
];

// ─── STAR FIELD (parallax background) ────────────────────────────────────

interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  speed: number; // parallax factor
}

function createStars(count: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * SHIP_WIDTH * 1.5,
      y: Math.random() * SHIP_HEIGHT,
      size: Math.random() * 2 + 0.5,
      brightness: Math.random() * 0.6 + 0.4,
      speed: Math.random() * 0.3 + 0.1,
    });
  }
  return stars;
}

// ─── DUST PARTICLES ──────────────────────────────────────────────────────

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

function spawnParticle(cameraX: number, viewW: number): Particle {
  return {
    x: cameraX + Math.random() * viewW,
    y: CEILING_Y + Math.random() * (FLOOR_Y - CEILING_Y),
    vx: (Math.random() - 0.5) * 0.3,
    vy: Math.random() * 0.15 + 0.05,
    life: 0,
    maxLife: 180 + Math.random() * 200,
    size: Math.random() * 1.5 + 0.5,
  };
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────

export const ShipInterior: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state, setActiveTerminal } = useGame();
  
  // Mutable refs for animation loop (no re-renders needed)
  const playerXRef = useRef(state.playerX);
  const cameraXRef = useRef(0);
  const keysRef = useRef<Set<string>>(new Set());
  const frameRef = useRef(0);
  const starsRef = useRef<Star[]>(createStars(120));
  const particlesRef = useRef<Particle[]>([]);
  const nearTerminalRef = useRef<string | null>(null);
  const walkFrameRef = useRef(0);
  const facingRightRef = useRef(true);
  const [nearTerminal, setNearTerminal] = useState<string | null>(null);
  const animFrameId = useRef(0);

  // Sync playerX back to context periodically
  const lastSyncRef = useRef(0);

  // ─── KEYBOARD HANDLERS ──────────────────────────────────────────────

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (state.activeTerminal) return; // ignore movement when panel is open

    const key = e.key.toLowerCase();
    keysRef.current.add(key);

    if (key === 'e' || key === 'enter') {
      // Interact with terminal
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
    const clickX = (e.clientX - rect.left) * scaleX + cameraXRef.current;
    const clickY = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    // Check if clicked on a terminal
    for (const room of ROOMS) {
      const tX = room.terminalX;
      const tY = FLOOR_Y - 80;
      if (Math.abs(clickX - tX) < 40 && clickY > tY - 60 && clickY < tY + 30) {
        // If close enough, interact directly
        if (Math.abs(playerXRef.current - tX) < TERMINAL_INTERACT_RANGE) {
          audioSynth.playChirpSound();
          setActiveTerminal(room.terminalId);
          return;
        }
      }
    }
  }, [state.activeTerminal, setActiveTerminal]);

  // ─── DRAWING FUNCTIONS ──────────────────────────────────────────────

  function drawStarfield(ctx: CanvasRenderingContext2D, camX: number, viewW: number) {
    const stars = starsRef.current;
    for (const star of stars) {
      const sx = ((star.x - camX * star.speed) % (SHIP_WIDTH * 1.5) + SHIP_WIDTH * 1.5) % (SHIP_WIDTH * 1.5);
      if (sx < -10 || sx > viewW + 10) continue;
      const flicker = 0.85 + Math.sin(frameRef.current * 0.02 + star.x) * 0.15;
      ctx.globalAlpha = star.brightness * flicker;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(sx, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawShipHull(ctx: CanvasRenderingContext2D, camX: number, viewW: number, viewH: number) {
    // Ceiling
    const ceilGrad = ctx.createLinearGradient(0, 0, 0, CEILING_Y);
    ceilGrad.addColorStop(0, '#0a0e1a');
    ceilGrad.addColorStop(1, '#111827');
    ctx.fillStyle = ceilGrad;
    ctx.fillRect(0 - camX, 0, SHIP_WIDTH, CEILING_Y);

    // Ceiling detail line
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0 - camX, CEILING_Y);
    ctx.lineTo(SHIP_WIDTH - camX, CEILING_Y);
    ctx.stroke();

    // Floor
    const floorGrad = ctx.createLinearGradient(0, FLOOR_Y, 0, viewH);
    floorGrad.addColorStop(0, '#1a1f2e');
    floorGrad.addColorStop(0.3, '#0f1320');
    floorGrad.addColorStop(1, '#060810');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0 - camX, FLOOR_Y, SHIP_WIDTH, viewH - FLOOR_Y);

    // Floor detail line
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0 - camX, FLOOR_Y);
    ctx.lineTo(SHIP_WIDTH - camX, FLOOR_Y);
    ctx.stroke();

    // Floor grid lines (subtle)
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.04)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx < SHIP_WIDTH; gx += 60) {
      const sx = gx - camX;
      if (sx < -60 || sx > viewW + 60) continue;
      ctx.beginPath();
      ctx.moveTo(sx, FLOOR_Y + 2);
      ctx.lineTo(sx, viewH);
      ctx.stroke();
    }

    // Floor glow strips (glowing panels on the floor)
    for (let gx = 30; gx < SHIP_WIDTH; gx += 120) {
      const sx = gx - camX;
      if (sx < -40 || sx > viewW + 40) continue;
      const pulse = 0.03 + Math.sin(frameRef.current * 0.015 + gx * 0.01) * 0.015;
      ctx.fillStyle = `rgba(0, 242, 254, ${pulse})`;
      ctx.fillRect(sx - 20, FLOOR_Y + 4, 40, 3);
    }
  }

  function drawBulkheadDoor(ctx: CanvasRenderingContext2D, worldX: number, camX: number, _colorRGB: string) {
    const sx = worldX - camX;
    const doorW = 8;
    
    // Door frame
    ctx.fillStyle = '#1a2030';
    ctx.fillRect(sx - doorW / 2, CEILING_Y, doorW, FLOOR_Y - CEILING_Y);
    
    // Door edge glow
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx, CEILING_Y);
    ctx.lineTo(sx, FLOOR_Y);
    ctx.stroke();

    // Door rivets
    for (let ry = CEILING_Y + 30; ry < FLOOR_Y - 10; ry += 50) {
      ctx.fillStyle = 'rgba(0, 242, 254, 0.2)';
      ctx.beginPath();
      ctx.arc(sx - 2, ry, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sx + 2, ry, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawRoom(ctx: CanvasRenderingContext2D, room: RoomDef, camX: number, viewW: number) {
    const rx = room.x - camX;
    const rw = room.width;
    
    // Skip if off-screen
    if (rx + rw < -50 || rx > viewW + 50) return;

    // Room ambient glow on walls
    const wallGlow = ctx.createLinearGradient(rx, CEILING_Y, rx, FLOOR_Y);
    wallGlow.addColorStop(0, `rgba(${room.colorRGB}, 0.03)`);
    wallGlow.addColorStop(0.5, `rgba(${room.colorRGB}, 0.06)`);
    wallGlow.addColorStop(1, `rgba(${room.colorRGB}, 0.02)`);
    ctx.fillStyle = wallGlow;
    ctx.fillRect(rx, CEILING_Y, rw, FLOOR_Y - CEILING_Y);

    // Room label on ceiling
    ctx.fillStyle = `rgba(${room.colorRGB}, 0.35)`;
    ctx.font = '11px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(room.label, rx + rw / 2, CEILING_Y + 18);

    // Viewport windows (space windows in the upper wall)
    const windowY = CEILING_Y + 35;
    const windowH = 55;
    const windowW = 80;
    const windowX = rx + rw / 2 - windowW / 2;
    
    // Window frame
    ctx.strokeStyle = 'rgba(100, 120, 160, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(windowX, windowY, windowW, windowH);
    
    // Window interior (dark space)
    ctx.fillStyle = '#020308';
    ctx.fillRect(windowX + 2, windowY + 2, windowW - 4, windowH - 4);
    
    // Window glare
    ctx.fillStyle = 'rgba(100, 140, 200, 0.05)';
    ctx.fillRect(windowX + 4, windowY + 4, windowW * 0.3, windowH - 8);

    // Wall panel details
    const panelY = CEILING_Y + 110;
    ctx.strokeStyle = `rgba(${room.colorRGB}, 0.1)`;
    ctx.lineWidth = 1;
    ctx.strokeRect(rx + 20, panelY, rw - 40, 60);
    
    // Small blinking light on the wall
    const blinkOn = Math.sin(frameRef.current * 0.05 + room.x * 0.01) > 0.3;
    ctx.fillStyle = blinkOn ? room.color : `rgba(${room.colorRGB}, 0.1)`;
    ctx.beginPath();
    ctx.arc(rx + 30, panelY + 10, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawTerminal(ctx: CanvasRenderingContext2D, room: RoomDef, camX: number, isNear: boolean) {
    const tx = room.terminalX - camX;
    const ty = FLOOR_Y - 80;
    
    // Terminal base (pedestal)
    ctx.fillStyle = '#1a2030';
    ctx.fillRect(tx - 16, ty + 30, 32, 50);
    
    // Terminal screen body
    const glow = 0.6 + Math.sin(frameRef.current * 0.03 + room.x * 0.01) * 0.2;
    ctx.fillStyle = `rgba(${room.colorRGB}, ${0.15 * glow})`;
    ctx.strokeStyle = room.color;
    ctx.lineWidth = isNear ? 2 : 1;
    
    // Screen shape
    ctx.beginPath();
    ctx.roundRect(tx - 22, ty - 20, 44, 50, 4);
    ctx.fill();
    ctx.stroke();
    
    // Screen inner glow
    if (isNear) {
      ctx.shadowColor = room.color;
      ctx.shadowBlur = 15;
      ctx.strokeRect(tx - 22, ty - 20, 44, 50);
      ctx.shadowBlur = 0;
    }
    
    // Terminal icon
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.fillText(room.icon, tx, ty + 10);
    
    // Interaction prompt
    if (isNear) {
      const bobY = Math.sin(frameRef.current * 0.06) * 4;
      ctx.fillStyle = room.color;
      ctx.font = 'bold 11px Rajdhani, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('[E] INTERACT', tx, ty - 35 + bobY);
      
      // Glowing indicator circle
      ctx.beginPath();
      ctx.arc(tx, ty - 45 + bobY, 3, 0, Math.PI * 2);
      ctx.fillStyle = room.color;
      ctx.fill();
    }
    
    // Terminal label
    ctx.fillStyle = `rgba(${room.colorRGB}, 0.5)`;
    ctx.font = '9px Rajdhani, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(room.label, tx, FLOOR_Y + 18);
  }

  function drawRobot(ctx: CanvasRenderingContext2D, worldX: number, camX: number, frame: number, walking: boolean, facingRight: boolean) {
    const sx = worldX - camX;
    const sy = FLOOR_Y - ROBOT_H;
    
    ctx.save();
    
    // Flip if facing left
    if (!facingRight) {
      ctx.translate(sx, 0);
      ctx.scale(-1, 1);
      ctx.translate(-sx, 0);
    }
    
    // Robot shadow on floor
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(sx, FLOOR_Y + 2, 18, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Body (main chassis)
    const bodyBob = walking ? Math.sin(frame * 0.3) * 1.5 : Math.sin(frame * 0.04) * 0.8;
    const bodyY = sy + bodyBob;
    
    // Legs / wheels
    const legOffset = walking ? Math.sin(frame * 0.3) * 6 : 0;
    ctx.fillStyle = '#2a3040';
    // Left leg
    ctx.fillRect(sx - 10 + legOffset * 0.5, bodyY + ROBOT_H - 14, 6, 14);
    // Right leg  
    ctx.fillRect(sx + 4 - legOffset * 0.5, bodyY + ROBOT_H - 14, 6, 14);
    
    // Feet / treads
    ctx.fillStyle = '#3a4560';
    ctx.fillRect(sx - 12 + legOffset * 0.5, bodyY + ROBOT_H - 4, 10, 4);
    ctx.fillRect(sx + 2 - legOffset * 0.5, bodyY + ROBOT_H - 4, 10, 4);
    
    // Main body rectangle
    const bodyGrad = ctx.createLinearGradient(sx - 14, bodyY + 8, sx + 14, bodyY + 8);
    bodyGrad.addColorStop(0, '#3a4a65');
    bodyGrad.addColorStop(0.5, '#4a5a78');
    bodyGrad.addColorStop(1, '#3a4a65');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.roundRect(sx - 14, bodyY + 8, 28, 30, 4);
    ctx.fill();
    
    // Body outline
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(sx - 14, bodyY + 8, 28, 30, 4);
    ctx.stroke();
    
    // Chest light
    const chestPulse = 0.5 + Math.sin(frame * 0.05) * 0.3;
    ctx.fillStyle = `rgba(0, 242, 254, ${chestPulse})`;
    ctx.beginPath();
    ctx.arc(sx, bodyY + 22, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Head
    const headGrad = ctx.createLinearGradient(sx - 10, bodyY, sx + 10, bodyY);
    headGrad.addColorStop(0, '#4a5a78');
    headGrad.addColorStop(0.5, '#5a6a88');
    headGrad.addColorStop(1, '#4a5a78');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.roundRect(sx - 10, bodyY - 2, 20, 14, 3);
    ctx.fill();
    
    // Head outline
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(sx - 10, bodyY - 2, 20, 14, 3);
    ctx.stroke();
    
    // Eye visor
    const eyeGlow = walking ? 1.0 : 0.7 + Math.sin(frame * 0.08) * 0.3;
    ctx.fillStyle = `rgba(0, 242, 254, ${eyeGlow})`;
    ctx.beginPath();
    ctx.roundRect(sx - 7, bodyY + 2, 14, 5, 2);
    ctx.fill();
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Antenna
    ctx.strokeStyle = '#5a6a88';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, bodyY - 2);
    ctx.lineTo(sx, bodyY - 12);
    ctx.stroke();
    
    // Antenna tip (blinks)
    const antennaBlink = Math.sin(frame * 0.1) > 0.5;
    ctx.fillStyle = antennaBlink ? '#ff007f' : 'rgba(255, 0, 127, 0.2)';
    ctx.beginPath();
    ctx.arc(sx, bodyY - 13, 2.5, 0, Math.PI * 2);
    ctx.fill();
    if (antennaBlink) {
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    
    // Arm(s)
    const armSwing = walking ? Math.sin(frame * 0.3 + Math.PI) * 8 : 0;
    ctx.strokeStyle = '#3a4a65';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx + 14, bodyY + 14);
    ctx.lineTo(sx + 20, bodyY + 24 + armSwing);
    ctx.stroke();
    
    ctx.restore();
  }

  function drawParticles(ctx: CanvasRenderingContext2D, camX: number) {
    const particles = particlesRef.current;
    for (const p of particles) {
      const sx = p.x - camX;
      const alpha = Math.sin((p.life / p.maxLife) * Math.PI) * 0.25;
      ctx.fillStyle = `rgba(180, 200, 230, ${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ─── MAIN ANIMATION LOOP ───────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize handler
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(dpr, dpr);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const gameLoop = () => {
      if (state.activeTerminal) {
        // Still render but don't process movement
        animFrameId.current = requestAnimationFrame(gameLoop);
        return;
      }

      const viewW = canvas.clientWidth;
      const viewH = canvas.clientHeight;

      // ── Movement ──
      const keys = keysRef.current;
      let moving = false;

      if (keys.has('a') || keys.has('arrowleft')) {
        playerXRef.current = Math.max(40, playerXRef.current - ROBOT_SPEED);
        facingRightRef.current = false;
        moving = true;
      }
      if (keys.has('d') || keys.has('arrowright')) {
        playerXRef.current = Math.min(SHIP_WIDTH - 40, playerXRef.current + ROBOT_SPEED);
        facingRightRef.current = true;
        moving = true;
      }

      if (moving) {
        walkFrameRef.current++;
      }

      // ── Camera follow ──
      const targetCamX = playerXRef.current - viewW / 2;
      const clampedTarget = Math.max(0, Math.min(SHIP_WIDTH - viewW, targetCamX));
      cameraXRef.current += (clampedTarget - cameraXRef.current) * CAMERA_LERP;

      // ── Check terminal proximity ──
      let nearest: string | null = null;
      for (const room of ROOMS) {
        if (Math.abs(playerXRef.current - room.terminalX) < TERMINAL_INTERACT_RANGE) {
          nearest = room.terminalId;
          break;
        }
      }
      if (nearest !== nearTerminalRef.current) {
        nearTerminalRef.current = nearest;
        setNearTerminal(nearest);
      }

      // ── Particles ──
      if (Math.random() < 0.12) {
        particlesRef.current.push(spawnParticle(cameraXRef.current, viewW));
      }
      particlesRef.current = particlesRef.current
        .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life + 1 }))
        .filter(p => p.life < p.maxLife);

      // ── Sync playerX to game state (throttled) ──
      frameRef.current++;
      if (frameRef.current - lastSyncRef.current > 60) {
        lastSyncRef.current = frameRef.current;
        // We don't sync to context every frame — just store locally
      }

      // ── RENDER ──
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, viewW, viewH);

      const camX = cameraXRef.current;

      // 1) Background (deep space)
      ctx.fillStyle = '#030510';
      ctx.fillRect(0, 0, viewW, viewH);

      // 2) Starfield parallax
      drawStarfield(ctx, camX, viewW);

      // 3) Ship hull (ceiling + floor)
      drawShipHull(ctx, camX, viewW, viewH);

      // 4) Rooms
      for (const room of ROOMS) {
        drawRoom(ctx, room, camX, viewW);
      }

      // 5) Bulkhead doors between rooms
      for (let i = 1; i < ROOMS.length; i++) {
        drawBulkheadDoor(ctx, ROOMS[i].x, camX, ROOMS[i].colorRGB);
      }

      // 6) Terminals
      for (const room of ROOMS) {
        drawTerminal(ctx, room, camX, nearTerminalRef.current === room.terminalId);
      }

      // 7) Dust particles
      drawParticles(ctx, camX);

      // 8) Robot character
      drawRobot(ctx, playerXRef.current, camX, walkFrameRef.current, moving, facingRightRef.current);

      // 9) Vignette overlay
      const vigGrad = ctx.createRadialGradient(viewW / 2, viewH / 2, viewW * 0.3, viewW / 2, viewH / 2, viewW * 0.8);
      vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vigGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, viewW, viewH);

      // 10) CRT scanlines
      ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
      for (let sl = 0; sl < viewH; sl += 3) {
        ctx.fillRect(0, sl, viewW, 1);
      }

      animFrameId.current = requestAnimationFrame(gameLoop);
    };

    animFrameId.current = requestAnimationFrame(gameLoop);

    // Keyboard listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      cancelAnimationFrame(animFrameId.current);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [state.activeTerminal, handleKeyDown, handleKeyUp]);

  // ─── RENDER ─────────────────────────────────────────────────────────

  return (
    <div className="ship-viewport">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{ width: '100%', height: '100%', display: 'block', cursor: nearTerminal ? 'pointer' : 'default' }}
      />
      
      {/* Control hints at bottom */}
      <div className="ship-controls-hint">
        <span><kbd>A</kbd><kbd>D</kbd> or <kbd>←</kbd><kbd>→</kbd> Move</span>
        <span><kbd>E</kbd> Interact</span>
        {nearTerminal && (
          <span className="ship-hint-active">
            ● Terminal Nearby
          </span>
        )}
      </div>
    </div>
  );
};
