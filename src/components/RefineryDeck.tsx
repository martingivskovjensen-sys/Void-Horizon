import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import type { ResourceType } from '../types';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  alpha: number;
  life: number;
}

export const RefineryDeck: React.FC = () => {
  const { state, mineManually, purchaseDrone, purchaseRefinery, toggleRefinery } = useGame();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const angleRef = useRef(0);

  // Core visual parameters
  const [currentMineType, setCurrentMineType] = useState<ResourceType>('ironOre');

  // Automatically reset to ironOre if current mine type gets locked due to laser upgrades levels
  const laserLevel = state.upgrades.laserPower.level;
  useEffect(() => {
    if (currentMineType === 'heliumGas' && laserLevel < 3) {
      setCurrentMineType('ironOre');
    } else if (currentMineType === 'plasmaCrystals' && laserLevel < 6) {
      setCurrentMineType('ironOre');
    }
  }, [laserLevel, currentMineType]);

  // Handle active Canvas drawing loops for manual mining visuals
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      // Clear Canvas with alpha trail
      ctx.fillStyle = 'rgba(6, 7, 13, 0.25)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // 1. Draw glowing grid backdrop
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.03)';
      ctx.lineWidth = 1;
      const step = 20;
      for (let x = 0; x < canvas.width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // 2. Draw Asteroid Core
      angleRef.current += 0.005;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angleRef.current);

      // Color select based on current mine focus
      let coreColor = 'rgba(0, 242, 254, 0.8)';
      let glowColor = 'rgba(0, 242, 254, 0.35)';
      if (currentMineType === 'heliumGas') {
        coreColor = 'rgba(255, 184, 0, 0.8)';
        glowColor = 'rgba(255, 184, 0, 0.35)';
      } else if (currentMineType === 'plasmaCrystals') {
        coreColor = 'rgba(255, 0, 127, 0.8)';
        glowColor = 'rgba(255, 0, 127, 0.35)';
      }

      // Draw asteroid outer glow
      ctx.shadowBlur = 25;
      ctx.shadowColor = glowColor;

      // Draw crystalline asteroid nodes
      ctx.beginPath();
      const numPoints = 8;
      const radius = 65;
      for (let i = 0; i < numPoints; i++) {
        const angle = (i * 2 * Math.PI) / numPoints;
        // procedural roughness
        const offset = Math.sin(angle * 3 + angleRef.current * 2) * 8;
        const x = Math.cos(angle) * (radius + offset);
        const y = Math.sin(angle) * (radius + offset);
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      
      const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, 80);
      grad.addColorStop(0, '#fff');
      grad.addColorStop(0.3, coreColor);
      grad.addColorStop(1, '#0e111a');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();

      // 3. Draw Particles (sparks on click)
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // slight gravity
        p.life -= 1;
        p.alpha = p.life / 50;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
      });

      // Filter dead particles
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);

      // 4. Draw Floating Text (+1 indicators)
      floatingTextsRef.current.forEach((t) => {
        t.y -= 1.2; // float up
        t.life -= 1;
        t.alpha = t.life / 40;

        ctx.save();
        ctx.globalAlpha = t.alpha;
        ctx.fillStyle = '#fff';
        ctx.font = '700 16px "Orbitron"';
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'var(--color-cyan)';
        ctx.fillText(t.text, t.x, t.y);
        ctx.restore();
      });

      floatingTextsRef.current = floatingTextsRef.current.filter(t => t.life > 0);

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, [currentMineType]);

  // Click handler on Canvas - with proper coordinate scaling
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Scale mouse coordinates to canvas internal coordinates
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Check if within bounds of asteroid (radius ~ 85)
    const dist = Math.sqrt((clickX - centerX) ** 2 + (clickY - centerY) ** 2);
    if (dist <= 120) {
      // Trigger game state mine
      mineManually(currentMineType);

      // Draw glowing laser beam from click to center
      const ctx = canvas.getContext('2d');
      if (ctx) {
        let beamColor = '#00f2fe';
        if (currentMineType === 'heliumGas') beamColor = '#ffb800';
        else if (currentMineType === 'plasmaCrystals') beamColor = '#ff007f';

        ctx.save();
        ctx.strokeStyle = beamColor;
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 15;
        ctx.shadowColor = beamColor;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.moveTo(clickX, clickY);
        ctx.lineTo(centerX, centerY);
        ctx.stroke();
        ctx.restore();
      }

      // Create spark particles
      let sparksColor = '#00f2fe';
      let text = '+1 Iron Ore';
      const mineUpgrade = state.upgrades.laserPower.level;
      if (currentMineType === 'ironOre') {
        text = `+${1 + mineUpgrade} Iron Ore`;
      } else if (currentMineType === 'heliumGas') {
        text = '+1 Helium Gas';
        sparksColor = '#ffb800';
      } else if (currentMineType === 'plasmaCrystals') {
        text = '+1 Plasma Crystal';
        sparksColor = '#ff007f';
      }

      for (let i = 0; i < 12; i++) {
        const speed = Math.random() * 4 + 1.5;
        const angle = Math.random() * Math.PI * 2;
        particlesRef.current.push({
          x: centerX + (Math.random() - 0.5) * 20,
          y: centerY + (Math.random() - 0.5) * 20,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 3 + 1.5,
          color: sparksColor,
          alpha: 1.0,
          life: Math.floor(Math.random() * 20) + 30
        });
      }

      // Spawn floating numbers
      floatingTextsRef.current.push({
        x: centerX - 30,
        y: centerY - 20,
        text,
        alpha: 1.0,
        life: 40
      });
    }
  };

  return (
    <div className="font-rajdhani" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 2-Column Split: Active Canvas Mining & Automation Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* Active Laser Excavator Card */}
        <section className="panel" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '20px',
          background: 'rgba(9, 13, 24, 0.5)',
          position: 'relative'
        }}>
          <div className="scanline-overlay" />
          
          <h2 className="font-orbitron" style={{
            fontSize: '1.25rem',
            color: 'var(--color-cyan)',
            textShadow: '0 0 8px rgba(0, 242, 254, 0.4)',
            marginBottom: '4px',
            alignSelf: 'flex-start'
          }}>
            BEAM EXCAVATOR LOCK
          </h2>
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            marginBottom: '16px',
            alignSelf: 'flex-start'
          }}>
            Aim the manual thermal containment beam to extract crystals and compounds.
          </p>

          {/* Click Target canvas */}
          <canvas
            ref={canvasRef}
            width={420}
            height={260}
            onClick={handleCanvasClick}
            style={{
              background: '#06070d',
              border: '1px solid var(--border-cyan)',
              borderRadius: '6px',
              cursor: 'crosshair',
              boxShadow: 'inset 0 0 15px rgba(0,242,254,0.1)',
              width: '100%'
            }}
          />

          {/* Focus selectors */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '10px',
            width: '100%',
            marginTop: '16px'
          }}>
            <button
              onClick={() => setCurrentMineType('ironOre')}
              className={`btn ${currentMineType === 'ironOre' ? '' : 'btn-amber'}`}
              style={{
                fontSize: '0.85rem',
                justifyContent: 'center',
                borderColor: currentMineType === 'ironOre' ? 'var(--color-cyan)' : 'transparent',
                background: currentMineType === 'ironOre' ? 'rgba(0, 242, 254, 0.15)' : ''
              }}
            >
              ⛏️ Mine Ore
            </button>
            <button
              onClick={() => setCurrentMineType('heliumGas')}
              disabled={laserLevel < 3}
              className={`btn btn-amber`}
              style={{
                fontSize: '0.85rem',
                justifyContent: 'center',
                borderColor: currentMineType === 'heliumGas' ? 'var(--color-amber)' : 'transparent',
                background: currentMineType === 'heliumGas' ? 'rgba(255, 184, 0, 0.15)' : '',
                opacity: laserLevel < 3 ? 0.5 : 1,
                cursor: laserLevel < 3 ? 'not-allowed' : 'pointer'
              }}
            >
              {laserLevel < 3 ? '🔒 Gas (Lvl 3 Laser)' : '💨 Gas Siphon'}
            </button>
            <button
              onClick={() => setCurrentMineType('plasmaCrystals')}
              disabled={laserLevel < 6}
              className={`btn btn-pink`}
              style={{
                fontSize: '0.85rem',
                justifyContent: 'center',
                borderColor: currentMineType === 'plasmaCrystals' ? 'var(--color-pink)' : 'transparent',
                background: currentMineType === 'plasmaCrystals' ? 'rgba(255, 0, 127, 0.15)' : '',
                opacity: laserLevel < 6 ? 0.5 : 1,
                cursor: laserLevel < 6 ? 'not-allowed' : 'pointer'
              }}
            >
              {laserLevel < 6 ? '🔒 Plasma (Lvl 6 Laser)' : '💎 Gather Plasma'}
            </button>
          </div>
        </section>

        {/* Drone Automation Hub */}
        <section className="panel" style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
          background: 'rgba(9, 13, 24, 0.5)'
        }}>
          <h2 className="font-orbitron" style={{
            fontSize: '1.25rem',
            color: 'var(--color-cyan)',
            textShadow: '0 0 8px rgba(0, 242, 254, 0.4)',
            marginBottom: '4px'
          }}>
            AUTOMATED DRONE CONTROL
          </h2>
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            marginBottom: '16px'
          }}>
            Purchase sub-orbital drone extraction units to generate passive resource flow.
          </p>

          {/* Drones list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexGrow: 1 }}>
            {(['mining', 'gas', 'plasma'] as const).map(droneId => {
              const drone = state.drones[droneId];
              const cargoCapLevel = state.upgrades.cargoCapacity.level;
              const actualYield = drone.efficiency * (1 + cargoCapLevel * 0.25);
              const droneYieldTotal = actualYield * drone.count;

              return (
                <div key={droneId} style={{
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  padding: '12px 16px',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>{drone.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Owned: <span style={{ color: '#fff', fontWeight: 700 }}>{drone.count}</span> | 
                      Yield: <span style={{ color: 'var(--color-green)' }}>+{droneYieldTotal.toFixed(1)}/s</span>
                      <span style={{ fontSize: '0.7rem', opacity: 0.6 }}> (+{actualYield.toFixed(2)} ea)</span>
                    </div>
                  </div>
                  <button
                    onClick={() => purchaseDrone(droneId)}
                    disabled={state.credits < drone.cost}
                    className="btn btn-amber"
                    style={{ fontSize: '0.9rem', padding: '6px 12px' }}
                  >
                    Buy ₵{drone.cost}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Refinery Blocks section */}
      <section className="panel" style={{
        padding: '20px',
        background: 'rgba(9, 13, 24, 0.5)'
      }}>
        <h2 className="font-orbitron" style={{
          fontSize: '1.25rem',
          color: 'var(--color-cyan)',
          textShadow: '0 0 8px rgba(0, 242, 254, 0.4)',
          marginBottom: '4px'
        }}>
          ORBITAL REFINERIES
        </h2>
        <p style={{
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          marginBottom: '20px'
        }}>
          Refine raw resource stockpiles into highly valuable sub-assemblies. Draws energy grid power.
        </p>

        {/* Refineries grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '20px'
        }}>
          {(['steel', 'fuel', 'plasma'] as const).map(refId => {
            const ref = state.refineries[refId];

            return (
              <div key={refId} style={{
                background: ref.active ? 'rgba(0, 242, 254, 0.03)' : 'rgba(0,0,0,0.25)',
                border: '1px solid',
                borderColor: ref.active ? 'rgba(0, 242, 254, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                padding: '16px',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'all 0.3s ease',
                position: 'relative'
              }}>
                {/* Visual Gears / Reactor Graphic when active */}
                {ref.active && ref.count > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: '2px dashed var(--color-green)',
                    animation: 'sweep 3s linear infinite',
                    boxShadow: 'var(--shadow-glow-green)'
                  }} />
                )}

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{ref.name}</span>
                    <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>Owned: {ref.count}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.3' }}>
                    Consumes: {ref.inputRatio} raw /s <br />
                    Produces: {ref.outputRatio} refined /s <br />
                    Grid Load: <span style={{ color: 'var(--color-pink)' }}>{ref.count * ref.energyConsumption} MW</span>
                  </div>
                </div>

                {/* Operations Toggle */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button
                    onClick={() => toggleRefinery(refId)}
                    disabled={ref.count === 0}
                    className={`btn ${ref.active ? 'btn-pink' : ''}`}
                    style={{
                      flexGrow: 1,
                      padding: '6px 0',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      borderColor: ref.active ? 'var(--color-pink)' : 'var(--border-cyan)'
                    }}
                  >
                    {ref.active ? 'Shut Down' : 'Boot Core'}
                  </button>

                  <button
                    onClick={() => purchaseRefinery(refId)}
                    disabled={state.credits < ref.cost}
                    className="btn btn-amber"
                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                  >
                    Build ₵{ref.cost}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
};
