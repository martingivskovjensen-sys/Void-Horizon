import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import type { ResourceType, TravelLocation } from '../types';

/* ═══════════════════════════════════════════════════════════════════════════
   STEAMWORLD HEIST-STYLE BRIDGE DECK
   Left panel  = DEEPSPACE MAP (node graph + legend + ship stats)
   Right panel = THE IRON SALAMANDER (cross-section ship with clickable rooms)
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── MAP NODE DEFINITIONS ────────────────────────────────────────────────

interface MapNode {
  id: TravelLocation;
  name: string;
  desc: string;
  x: number;   // % based (0-100) for responsive layout
  y: number;
  connections: TravelLocation[];
  stars: number; // difficulty 1-5
  status: 'visited' | 'unknown' | 'danger';
  icon: string;
}

const MAP_NODES: MapNode[] = [
  { id: 'core',        name: 'The Rustwald',         desc: 'Main mining station and refinery anchor.',            x: 35, y: 18, connections: ['nebula_pass', 'dark_rift'], stars: 2, status: 'visited', icon: '⚙' },
  { id: 'nebula_pass', name: 'Scrap Reef',           desc: 'General commerce outpost. Sell raw cargo batches.',   x: 60, y: 8,  connections: ['core', 'fuel_depot'],        stars: 2, status: 'unknown', icon: '🌌' },
  { id: 'fuel_depot',  name: 'Dustwater Station',    desc: 'Condensation depot. Weyland H3 discount cells.',      x: 30, y: 48, connections: ['nebula_pass', 'smuggler', 'apex'], stars: 3, status: 'visited', icon: '⛽' },
  { id: 'smuggler',    name: 'Marauder Hideout',     desc: "Cole's black-market catalog. Reset overdrives.",      x: 38, y: 72, connections: ['fuel_depot', 'weyland'],     stars: 4, status: 'danger',  icon: '💀' },
  { id: 'weyland',     name: 'The Asteroid Belt',    desc: 'Corporate foundry complexes. Alloy sheets.',          x: 60, y: 88, connections: ['smuggler', 'apex'],           stars: 1, status: 'unknown', icon: '☄' },
  { id: 'apex',        name: 'Nomi Research Lab',    desc: "Alien labs. Study and trade exotic dark matter.",      x: 72, y: 38, connections: ['weyland', 'fuel_depot', 'dark_rift'], stars: 5, status: 'unknown', icon: '🔮' },
  { id: 'dark_rift',   name: 'Void Rift Anomaly',    desc: 'Active spatial tear. Discount rift energy.',          x: 15, y: 85, connections: ['apex', 'core'],              stars: 5, status: 'danger',  icon: '🕳️' },
];

// ─── SHIP ROOM DEFINITIONS (for cross-section) ──────────────────────────

interface ShipRoom {
  id: string;
  label: string;
  terminalId: string;
  icon: string;
  row: number; // 0=top, 1=mid, 2=bottom
  col: number; // 0=left, 1=mid, 2=right
  accent: string;
}

const SHIP_ROOMS: ShipRoom[] = [
  { id: 'cockpit',  label: 'Cockpit',  terminalId: 'bridge',       icon: '🚀', row: 0, col: 0, accent: '#00f2fe' },
  { id: 'comms',    label: 'Comms',    terminalId: 'mail',         icon: '📡', row: 0, col: 1, accent: '#ffe14d' },
  { id: 'drillbay', label: 'Drillbay', terminalId: 'refinery',     icon: '⛏️', row: 1, col: 0, accent: '#ffb800' },
  { id: 'exchange', label: 'Exchange', terminalId: 'exchange',     icon: '📈', row: 1, col: 1, accent: '#39ff14' },
  { id: 'scanner',  label: 'Scanner',  terminalId: 'scanner',      icon: '📡', row: 1, col: 2, accent: '#00f2fe' },
  { id: 'techlab',  label: 'Techlab',  terminalId: 'techLab',      icon: '🧬', row: 2, col: 0, accent: '#bf5fff' },
  { id: 'archive',  label: 'Archive',  terminalId: 'achievements', icon: '🏆', row: 2, col: 1, accent: '#e0e0e0' },
];

// ─── STYLE CONSTANTS ─────────────────────────────────────────────────────

const COPPER = '#b87333';
const BRASS  = '#cd9b1d';
const RIVETS = '#8b6914';
const PANEL_BG = 'rgba(12, 8, 6, 0.85)';
const GLASS_TEAL = 'rgba(0, 180, 200, 0.18)';

// ─── HELPER: Steampunk Panel Wrapper ─────────────────────────────────────

const SteamPanel: React.FC<{
  title?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  titleColor?: string;
  compact?: boolean;
}> = ({ title, children, style, titleColor = BRASS, compact }) => (
  <div style={{
    background: PANEL_BG,
    border: `2px solid ${COPPER}`,
    borderRadius: '6px',
    position: 'relative',
    boxShadow: `inset 0 0 20px rgba(184, 115, 51, 0.08), 0 4px 16px rgba(0,0,0,0.5)`,
    ...style
  }}>
    {/* Corner rivets */}
    {[{ top: 4, left: 4 }, { top: 4, right: 4 }, { bottom: 4, left: 4 }, { bottom: 4, right: 4 }].map((pos, i) => (
      <div key={i} style={{
        position: 'absolute', ...pos,
        width: 8, height: 8,
        borderRadius: '50%',
        background: `radial-gradient(circle at 35% 35%, ${BRASS}, ${RIVETS})`,
        boxShadow: `0 1px 2px rgba(0,0,0,0.5)`,
        zIndex: 2
      }} />
    ))}
    {title && (
      <div style={{
        background: `linear-gradient(to right, ${COPPER}22, ${COPPER}44, ${COPPER}22)`,
        borderBottom: `1px solid ${COPPER}`,
        padding: compact ? '4px 16px' : '6px 20px',
        display: 'flex', alignItems: 'center', gap: '8px',
        borderRadius: '4px 4px 0 0'
      }}>
        <span style={{ color: titleColor, fontFamily: "'Orbitron', monospace", fontSize: compact ? '0.7rem' : '0.85rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', textShadow: `0 0 8px ${titleColor}55` }}>{title}</span>
      </div>
    )}
    <div style={{ padding: compact ? '6px 10px' : '10px 16px' }}>
      {children}
    </div>
  </div>
);

// ─── HELPER: Star Rating ─────────────────────────────────────────────────

const StarRating: React.FC<{ stars: number; max?: number }> = ({ stars, max = 5 }) => (
  <span style={{ fontSize: '0.65rem', letterSpacing: '1px' }}>
    {Array.from({ length: max }, (_, i) => (
      <span key={i} style={{ color: i < stars ? '#ffb800' : 'rgba(255,255,255,0.15)' }}>★</span>
    ))}
  </span>
);

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const BridgeDeck: React.FC = () => {
  const { state, travelTo, buyItemFromShop, sellDarkMatterToApex, buyResource, sellResource, setActiveTerminal } = useGame();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredNode, setHoveredNode] = useState<MapNode | null>(null);
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const [selectedShop, setSelectedShop] = useState<TravelLocation | null>(null);

  const currentLoc = state.currentLocation || 'core';
  const traveling = state.traveling || false;
  const timeLeft = state.travelTimeLeft || 0;
  const targetLoc = state.travelTarget || 'core';

  // Mark visited nodes dynamically
  const [visited, setVisited] = useState<Set<TravelLocation>>(new Set(['core']));
  useEffect(() => {
    setVisited(prev => {
      const next = new Set(prev);
      next.add(currentLoc);
      return next;
    });
  }, [currentLoc]);

  // Ship position interpolation
  const shipXRef = useRef(35);
  const shipYRef = useRef(18);
  const starsRef = useRef<Array<{ x: number; y: number; s: number; a: number }>>([]);
  const frameRef = useRef(0);

  useEffect(() => {
    if (starsRef.current.length === 0) {
      const stars = [];
      for (let i = 0; i < 60; i++) {
        stars.push({ x: Math.random() * 100, y: Math.random() * 100, s: Math.random() * 1.5 + 0.5, a: Math.random() * 0.5 + 0.2 });
      }
      starsRef.current = stars;
    }
    const startNode = MAP_NODES.find(n => n.id === currentLoc);
    if (startNode) { shipXRef.current = startNode.x; shipYRef.current = startNode.y; }
  }, []);

  // ─── CANVAS: DEEPSPACE MAP ──────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const W = canvas.width;
    const H = canvas.height;

    const toX = (pct: number) => pct / 100 * W;
    const toY = (pct: number) => pct / 100 * H;

    const draw = () => {
      frameRef.current++;
      const f = frameRef.current;
      ctx.clearRect(0, 0, W, H);

      // Deep space background
      const bgGrad = ctx.createRadialGradient(W * 0.3, H * 0.4, 20, W * 0.5, H * 0.5, W * 0.8);
      bgGrad.addColorStop(0, '#120820');
      bgGrad.addColorStop(0.5, '#0a0515');
      bgGrad.addColorStop(1, '#06030e');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Nebula haze
      const nebulaGrad = ctx.createRadialGradient(W * 0.7, H * 0.3, 10, W * 0.7, H * 0.3, W * 0.5);
      nebulaGrad.addColorStop(0, 'rgba(100, 30, 160, 0.08)');
      nebulaGrad.addColorStop(0.5, 'rgba(40, 10, 80, 0.04)');
      nebulaGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = nebulaGrad;
      ctx.fillRect(0, 0, W, H);

      // Stars
      starsRef.current.forEach(star => {
        const tw = Math.sin(f * 0.04 + star.x * 2) * 0.15;
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, star.a + tw)})`;
        ctx.beginPath();
        ctx.arc(toX(star.x), toY(star.y), star.s, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw connections as green dotted lines
      const drawnLinks = new Set<string>();
      MAP_NODES.forEach(node => {
        node.connections.forEach(connId => {
          const target = MAP_NODES.find(n => n.id === connId);
          if (!target) return;
          const linkKey = [node.id, connId].sort().join('-');
          if (drawnLinks.has(linkKey)) return;
          drawnLinks.add(linkKey);

          const isActiveTravel = traveling && (
            (currentLoc === node.id && targetLoc === connId) ||
            (currentLoc === connId && targetLoc === node.id)
          );

          ctx.save();
          ctx.lineWidth = 2;

          if (isActiveTravel) {
            ctx.strokeStyle = '#ff007f';
            ctx.shadowColor = '#ff007f';
            ctx.shadowBlur = 6;
            ctx.setLineDash([8, 6]);
            ctx.lineDashOffset = -f * 0.8;
          } else {
            ctx.strokeStyle = '#39ff14';
            ctx.shadowColor = '#39ff14';
            ctx.shadowBlur = 2;
            ctx.setLineDash([4, 8]);
          }

          ctx.beginPath();
          ctx.moveTo(toX(node.x), toY(node.y));
          ctx.lineTo(toX(target.x), toY(target.y));
          ctx.stroke();
          ctx.restore();
        });
      });

      // Draw Nodes
      MAP_NODES.forEach(node => {
        const isCurrent = currentLoc === node.id;
        const isReachable = MAP_NODES.find(n => n.id === currentLoc)?.connections.includes(node.id);
        const isVisited = visited.has(node.id);
        const nx = toX(node.x);
        const ny = toY(node.y);

        ctx.save();

        // Node circle fill
        if (isCurrent) {
          ctx.fillStyle = '#ffb800';
          ctx.shadowColor = '#ffb800';
          ctx.shadowBlur = 12;
        } else if (node.status === 'danger' || (!isVisited && node.stars >= 4)) {
          ctx.fillStyle = '#ff3333';
          ctx.shadowColor = '#ff3333';
          ctx.shadowBlur = 6;
        } else if (isVisited) {
          ctx.fillStyle = '#ffb800';
          ctx.shadowColor = '#ffb800';
          ctx.shadowBlur = 4;
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 2;
        }

        ctx.beginPath();
        ctx.arc(nx, ny, isCurrent ? 8 : 6, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing ring for current
        if (isCurrent) {
          const pulseR = 10 + Math.sin(f * 0.08) * 3;
          ctx.strokeStyle = '#ffb800';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(nx, ny, pulseR, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Reachable indicator
        if (isReachable && !isCurrent && !traveling) {
          const pr = 9 + Math.sin(f * 0.06) * 2;
          ctx.strokeStyle = 'rgba(57, 255, 20, 0.5)';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.arc(nx, ny, pr, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.restore();

        // Node name label
        ctx.save();
        ctx.font = 'bold 9px "Orbitron", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = isCurrent ? '#ffb800' : (isReachable && !traveling ? '#39ff14' : 'rgba(255,255,255,0.6)');
        ctx.fillText(node.name, nx, ny - 14);
        ctx.restore();
      });

      // Ship interpolation
      const targetNode = MAP_NODES.find(n => n.id === (traveling ? targetLoc : currentLoc));
      if (targetNode) {
        const dx = targetNode.x - shipXRef.current;
        const dy = targetNode.y - shipYRef.current;
        shipXRef.current += dx * 0.05;
        shipYRef.current += dy * 0.05;

        const sx = toX(shipXRef.current);
        const sy = toY(shipYRef.current);
        const isMoving = Math.hypot(dx, dy) > 0.5;

        ctx.save();
        ctx.translate(sx, sy);

        if (isMoving) {
          const angle = Math.atan2(dy, dx);
          ctx.rotate(angle + Math.PI / 2);
          // Thruster
          ctx.fillStyle = f % 3 === 0 ? '#ff007f' : '#ffb800';
          ctx.beginPath();
          ctx.moveTo(-3, 8);
          ctx.lineTo(0, 16 + Math.random() * 4);
          ctx.lineTo(3, 8);
          ctx.fill();
        }

        // Tiny ship triangle
        ctx.fillStyle = COPPER;
        ctx.strokeStyle = BRASS;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(6, 5);
        ctx.lineTo(-6, 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [currentLoc, targetLoc, traveling, timeLeft, visited]);

  // ─── CLICK / HOVER HANDLERS FOR MAP CANVAS ─────────────────────────────

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width * 100;
    const clickY = (e.clientY - rect.top) / rect.height * 100;

    for (const node of MAP_NODES) {
      const dist = Math.hypot(clickX - node.x, clickY - node.y);
      if (dist < 6) {
        const isActive = currentLoc === node.id;
        const isConnected = MAP_NODES.find(n => n.id === currentLoc)?.connections.includes(node.id);
        if (!isActive && isConnected && !traveling) {
          travelTo(node.id);
        }
        if (isActive) {
          setSelectedShop(node.id);
        }
        break;
      }
    }
  }, [currentLoc, traveling, travelTo]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mX = (e.clientX - rect.left) / rect.width * 100;
    const mY = (e.clientY - rect.top) / rect.height * 100;

    let found: MapNode | null = null;
    for (const node of MAP_NODES) {
      if (Math.hypot(mX - node.x, mY - node.y) < 6) {
        found = node;
        break;
      }
    }
    setHoveredNode(found);
  }, []);

  // ─── ROOM CLICK (opens terminal overlay in ship interior) ──────────────

  const handleRoomClick = (room: ShipRoom) => {
    setActiveTerminal(room.terminalId);
  };

  // ─── CURRENT NODE for stats ────────────────────────────────────────────

  const currentNode = MAP_NODES.find(n => n.id === currentLoc);

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1.3fr',
      gap: '16px',
      height: '100%',
      fontFamily: "'Rajdhani', 'Orbitron', monospace",
      position: 'relative',
      minHeight: '600px'
    }}>

      {/* ════════════════════ WARP OVERLAY ═══════════════════════════════ */}
      {traveling && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(4, 2, 8, 0.92)', zIndex: 50,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          borderRadius: '8px', border: `2px solid ${COPPER}`,
        }}>
          {/* Warp lines */}
          <div style={{ position: 'absolute', width: '100%', height: '100%', overflow: 'hidden', opacity: 0.7 }}>
            {Array.from({ length: 40 }).map((_, idx) => (
              <div key={idx} style={{
                position: 'absolute',
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                width: `${Math.random() * 80 + 40}px`,
                height: '1.5px',
                background: `linear-gradient(to right, transparent 0%, ${BRASS}88 50%, transparent 100%)`,
                animation: `warp-flow ${Math.random() * 1.5 + 0.5}s linear infinite`,
                animationDelay: `${Math.random() * 2}s`
              }} />
            ))}
          </div>
          <div style={{ zIndex: 10, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', animation: 'bounce 1s infinite' }}>🚀</div>
            <h2 style={{ fontFamily: "'Orbitron', monospace", color: BRASS, fontSize: '1.6rem', marginTop: '10px', textShadow: `0 0 12px ${COPPER}` }}>
              ENGAGING WARP DRIVE
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginTop: '4px', letterSpacing: '1px' }}>
              FLYING TO: {MAP_NODES.find(l => l.id === targetLoc)?.name.toUpperCase()}
            </p>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', marginTop: '16px', fontFamily: 'monospace' }}>
              00:0{timeLeft}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ LEFT: DEEPSPACE MAP ═══════════════════════ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Title */}
        <SteamPanel title="⚙ Deepspace Map">
          {/* Canvas Map */}
          <div style={{ position: 'relative', width: '100%', aspectRatio: '4/5', border: `1px solid ${COPPER}44`, borderRadius: '4px', overflow: 'hidden' }}>
            <canvas
              ref={canvasRef}
              width={400}
              height={500}
              onClick={handleCanvasClick}
              onMouseMove={handleMouseMove}
              style={{ width: '100%', height: '100%', display: 'block', cursor: hoveredNode ? 'pointer' : 'default' }}
            />

            {/* Tooltip on hover */}
            {hoveredNode && (
              <div style={{
                position: 'absolute', bottom: '8px', left: '8px', right: '8px',
                background: 'rgba(5, 3, 10, 0.95)', border: `1px solid ${COPPER}`,
                borderRadius: '4px', padding: '8px 12px', pointerEvents: 'none',
                boxShadow: `0 4px 16px rgba(0,0,0,0.6)`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ color: visited.has(hoveredNode.id) ? '#ffb800' : '#fff', fontSize: '0.82rem' }}>
                    {hoveredNode.icon} {hoveredNode.name}
                  </strong>
                  <StarRating stars={hoveredNode.stars} />
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', marginTop: '2px', fontSize: '0.7rem' }}>{hoveredNode.desc}</div>
              </div>
            )}
          </div>
        </SteamPanel>

        {/* Current Objective */}
        <SteamPanel title="Current Objective" compact titleColor="#39ff14">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#ffb800', fontSize: '0.85rem' }}>★</span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem' }}>
              {currentLoc === 'core' ? 'Explore the sector map' : `Arrived at ${currentNode?.name || 'Unknown'}`}
            </span>
          </div>
        </SteamPanel>

        {/* Legend */}
        <SteamPanel title="Legend" compact titleColor={COPPER}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.72rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#39ff14', letterSpacing: '2px' }}>● ● ●</span>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>Travel Route</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#ffb800', fontSize: '0.9rem' }}>●</span>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>Visited</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#fff', fontSize: '0.9rem' }}>○</span>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>Unknown</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#ff3333', fontSize: '0.9rem' }}>●</span>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>Danger</span>
            </div>
          </div>
        </SteamPanel>

        {/* Ship Stats */}
        <SteamPanel title="The Iron Salamander" titleColor={BRASS}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.78rem' }}>
            {[
              { icon: '👥', label: 'Crew',  value: `${state.multiplayer.players.length}/${state.multiplayer.active ? '8' : '1'}` },
              { icon: '⛽', label: 'Fuel',  value: `${Math.floor(state.resources.fuelCells?.amount || 0)}` },
              { icon: '💰', label: 'Scrap', value: `₵${state.credits.toLocaleString()}` },
              { icon: '⚙', label: 'Rank',  value: state.credits > 5000 ? 'ADMIRAL' : state.credits > 2000 ? 'CAPTAIN' : state.credits > 500 ? 'FIRST MATE' : 'CADET' },
            ].map((stat, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: i < 3 ? `1px solid ${COPPER}22` : 'none', paddingBottom: '3px' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>{stat.icon} {stat.label}</span>
                <span style={{ color: '#fff', fontWeight: 700, fontFamily: "'Orbitron', monospace", fontSize: '0.75rem' }}>{stat.value}</span>
              </div>
            ))}
          </div>
        </SteamPanel>
      </div>

      {/* ════════════════════ RIGHT: SHIP CROSS-SECTION ═════════════════ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

        {/* Ship Title */}
        <div style={{
          background: `linear-gradient(to right, ${COPPER}22, ${COPPER}55, ${COPPER}22)`,
          border: `2px solid ${COPPER}`,
          borderBottom: 'none',
          borderRadius: '8px 8px 0 0',
          padding: '8px 20px',
          textAlign: 'center',
        }}>
          <span style={{
            fontFamily: "'Orbitron', monospace", fontSize: '1rem', fontWeight: 800,
            color: BRASS, letterSpacing: '3px', textTransform: 'uppercase',
            textShadow: `0 0 10px ${COPPER}66`
          }}>
            ⚙ The Iron Salamander ⚙
          </span>
        </div>

        {/* Ship Body */}
        <div style={{
          border: `2px solid ${COPPER}`,
          borderRadius: '0 0 12px 12px',
          background: `linear-gradient(135deg, #0d0a08 0%, #1a1510 30%, #0d0a08 60%, #151210 100%)`,
          padding: '16px',
          position: 'relative',
          overflow: 'hidden',
          flex: 1,
          boxShadow: `inset 0 0 40px rgba(184, 115, 51, 0.06), 0 8px 32px rgba(0,0,0,0.5)`,
        }}>
          {/* Background hull texture - vertical rivet lines */}
          {[0.25, 0.5, 0.75].map((pos, i) => (
            <div key={i} style={{
              position: 'absolute', top: 0, left: `${pos * 100}%`,
              width: '2px', height: '100%',
              background: `linear-gradient(to bottom, transparent, ${COPPER}22, ${COPPER}33, ${COPPER}22, transparent)`,
              zIndex: 0,
            }} />
          ))}
          {/* Horizontal hull seam */}
          {[0.33, 0.66].map((pos, i) => (
            <div key={i} style={{
              position: 'absolute', left: 0, top: `${pos * 100}%`,
              height: '2px', width: '100%',
              background: `linear-gradient(to right, transparent, ${COPPER}22, ${COPPER}33, ${COPPER}22, transparent)`,
              zIndex: 0,
            }} />
          ))}

          {/* Room Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'repeat(3, 1fr)',
            gap: '10px',
            height: '100%',
            position: 'relative',
            zIndex: 1,
            minHeight: '400px',
          }}>
            {SHIP_ROOMS.map(room => {
              const isHovered = hoveredRoom === room.id;
              const colSpan = (room.row === 0 || room.row === 2) && room.col === 1 && SHIP_ROOMS.filter(r => r.row === room.row).length === 2 ? 2 : 1;

              return (
                <div
                  key={room.id}
                  onClick={() => handleRoomClick(room)}
                  onMouseEnter={() => setHoveredRoom(room.id)}
                  onMouseLeave={() => setHoveredRoom(null)}
                  style={{
                    gridColumn: colSpan > 1 ? `${room.col + 1} / span ${colSpan}` : undefined,
                    gridRow: `${room.row + 1}`,
                    background: isHovered
                      ? `linear-gradient(135deg, rgba(${hexToRgb(room.accent)}, 0.15), rgba(${hexToRgb(room.accent)}, 0.05))`
                      : GLASS_TEAL,
                    border: `2px solid ${isHovered ? room.accent : COPPER}88`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    boxShadow: isHovered
                      ? `0 0 20px rgba(${hexToRgb(room.accent)}, 0.2), inset 0 0 30px rgba(${hexToRgb(room.accent)}, 0.08)`
                      : `inset 0 0 15px rgba(0,0,0,0.3)`,
                    transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Room icon background glow */}
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '60px', height: '60px',
                    borderRadius: '50%',
                    background: `radial-gradient(circle, rgba(${hexToRgb(room.accent)}, ${isHovered ? 0.12 : 0.05}) 0%, transparent 70%)`,
                  }} />

                  {/* Room inner frame (steampunk border) */}
                  <div style={{
                    position: 'absolute', inset: '4px',
                    border: `1px solid ${COPPER}33`,
                    borderRadius: '6px',
                    pointerEvents: 'none',
                  }} />

                  {/* Corner rivets */}
                  {[{ top: 6, left: 6 }, { top: 6, right: 6 }, { bottom: 6, left: 6 }, { bottom: 6, right: 6 }].map((pos, i) => (
                    <div key={i} style={{
                      position: 'absolute', ...pos,
                      width: 5, height: 5,
                      borderRadius: '50%',
                      background: `radial-gradient(circle at 35% 35%, ${BRASS}88, ${RIVETS}66)`,
                    }} />
                  ))}

                  {/* Icon */}
                  <div style={{
                    fontSize: '1.8rem',
                    filter: isHovered ? 'brightness(1.3)' : 'brightness(0.9)',
                    transition: 'filter 0.2s',
                    position: 'relative', zIndex: 1,
                  }}>
                    {room.icon}
                  </div>

                  {/* Label */}
                  <div style={{
                    position: 'relative', zIndex: 1,
                    background: isHovered ? `${room.accent}22` : `${COPPER}22`,
                    border: `1px solid ${isHovered ? room.accent : COPPER}44`,
                    borderRadius: '3px',
                    padding: '2px 12px',
                    fontFamily: "'Orbitron', monospace",
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: isHovered ? room.accent : 'rgba(255,255,255,0.7)',
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    textShadow: isHovered ? `0 0 6px ${room.accent}44` : 'none',
                    transition: 'all 0.2s',
                  }}>
                    {room.label}
                  </div>

                  {/* Tiny robot silhouette */}
                  <div style={{
                    position: 'absolute', bottom: '8px', right: '10px',
                    fontSize: '0.9rem', opacity: isHovered ? 0.6 : 0.2,
                    transition: 'opacity 0.3s',
                  }}>
                    🤖
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ════════════════════ SHOP OVERLAY (when clicking current node) ══ */}
      {selectedShop && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(4, 2, 8, 0.95)', zIndex: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '8px',
        }}>
          <SteamPanel title={`🏬 ${currentNode?.name || 'Unknown'} — Local Commerce`} style={{ width: '90%', maxWidth: '500px', maxHeight: '80%', overflow: 'auto' }}>
            <button
              onClick={() => setSelectedShop(null)}
              style={{
                position: 'absolute', top: '8px', right: '14px',
                background: 'none', border: 'none', color: '#ff5555', cursor: 'pointer',
                fontSize: '1.2rem', fontWeight: 900, zIndex: 10,
              }}
            >✕</button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              {renderShopContent(selectedShop, state, { buyResource, sellResource, buyItemFromShop, sellDarkMatterToApex })}
            </div>
          </SteamPanel>
        </div>
      )}

    </div>
  );
};

// ─── HEX TO RGB HELPER ──────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255,255,255';
}

// ─── SHOP CONTENT RENDERER ──────────────────────────────────────────────

function renderShopContent(
  loc: TravelLocation,
  state: ReturnType<typeof import('../context/GameContext').useGame>['state'],
  actions: {
    buyResource: (r: ResourceType, qty: number) => void;
    sellResource: (r: ResourceType, qty: number) => void;
    buyItemFromShop: (item: string, cost: number) => void;
    sellDarkMatterToApex: () => void;
  }
) {
  const shopBtn = (label: string, onClick: () => void, disabled: boolean, color = BRASS) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg, ${color}33, ${color}11)`,
        border: `1px solid ${disabled ? 'rgba(255,255,255,0.1)' : color}`,
        borderRadius: '4px', padding: '4px 10px', color: disabled ? 'rgba(255,255,255,0.3)' : '#fff',
        cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '0.75rem', fontWeight: 600,
        fontFamily: "'Rajdhani', sans-serif",
      }}
    >
      {label}
    </button>
  );

  const shopRow = (title: string, desc: string, btn: React.ReactNode) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '4px',
      border: `1px solid ${COPPER}22`,
    }}>
      <div>
        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff' }}>{title}</div>
        <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)' }}>{desc}</div>
      </div>
      {btn}
    </div>
  );

  switch (loc) {
    case 'core':
      return (
        <div style={{ textAlign: 'center', padding: '30px 16px', color: 'rgba(255,255,255,0.4)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⚙</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>STATION CORE</div>
          <p style={{ fontSize: '0.72rem', marginTop: '8px', lineHeight: '1.4' }}>
            Anchor station has no commerce docks. Jump to other sectors to trade goods.
          </p>
        </div>
      );

    case 'nebula_pass':
      return <>
        {shopRow('Sell 50 Iron Ore', `Cargo dump. (Owned: ${Math.floor(state.resources.ironOre.amount)})`,
          shopBtn(`Sell +₵${Math.round(state.market.ironOre.currentPrice * 50)}`, () => actions.sellResource('ironOre', 50), state.resources.ironOre.amount < 50, '#39ff14')
        )}
        {shopRow('Sell 20 Helium Gas', `Atmosphere dump. (Owned: ${Math.floor(state.resources.heliumGas.amount)})`,
          shopBtn(`Sell +₵${Math.round(state.market.heliumGas.currentPrice * 20)}`, () => actions.sellResource('heliumGas', 20), state.resources.heliumGas.amount < 20, '#39ff14')
        )}
      </>;

    case 'fuel_depot':
      return shopRow('Buy 5 Fuel Cells', `Spec-rate deal. (Reserves: ${Math.floor(state.resources.fuelCells.amount)})`,
        shopBtn(`Buy ₵${Math.round(state.market.fuelCells.currentPrice * 5)}`, () => actions.buyResource('fuelCells', 5), state.credits < Math.round(state.market.fuelCells.currentPrice * 5))
      );

    case 'smuggler':
      return <>
        {shopRow('Overdrive Catalyst', 'Instantly resets reactor cooldown.',
          shopBtn('Buy ₵300', () => actions.buyItemFromShop('overdrive_catalyst', 300), state.credits < 300, '#ff007f')
        )}
        {shopRow('Dark Matter Probe', 'Locates a dark matter anomaly node.',
          shopBtn('Buy ₵500', () => actions.buyItemFromShop('dark_matter_locator', 500), state.credits < 500, '#ff007f')
        )}
      </>;

    case 'weyland':
      return shopRow('Buy 10 Steel Plates', 'Bulk alloy block discount.',
        shopBtn(`Buy ₵${Math.round(state.market.steelPlates.currentPrice * 10)}`, () => actions.buyResource('steelPlates', 10), state.credits < Math.round(state.market.steelPlates.currentPrice * 10))
      );

    case 'apex':
      return <>
        {shopRow('Sell 1 Dark Matter', `Trade to researchers. (Owned: ${state.resources.darkMatter.amount})`,
          shopBtn('Sell +₵1000', () => actions.sellDarkMatterToApex(), state.resources.darkMatter.amount < 1, '#bf5fff')
        )}
        {shopRow('Alien Fusion Core', 'Boosts Reactor Max Energy by +15 MW.',
          shopBtn('Buy ₵1500', () => actions.buyItemFromShop('alien_fusion_core', 1500), state.credits < 1500, '#bf5fff')
        )}
      </>;

    case 'dark_rift':
      return <>
        {shopRow('Anomaly Probe (Discount)', 'Dark matter locator at ₵400 (norm ₵500).',
          shopBtn('Buy ₵400', () => actions.buyItemFromShop('dark_matter_locator', 400), state.credits < 400, '#ff007f')
        )}
        {shopRow('Reactor Catalyst (Discount)', 'Overdrive catalyst at ₵250 (norm ₵300).',
          shopBtn('Buy ₵250', () => actions.buyItemFromShop('overdrive_catalyst', 250), state.credits < 250, '#ff007f')
        )}
      </>;

    default:
      return <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '20px' }}>No shop available here.</div>;
  }
}
