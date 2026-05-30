import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import type { ExplorationNode, ResourceType } from '../types';

export const RadarCanvas: React.FC = () => {
  const { state, startScanning, selectNode, resolveNodeChoice, closeOutcome } = useGame();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredNode, setHoveredNode] = useState<ExplorationNode | null>(null);

  const { scanning, scanProgress, scannedNodes, activeNode, currentOutcome } = state.exploration;

  // Radar drawing logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let sweepAngle = 0;

    const render = () => {
      // Clear with fading trails
      ctx.fillStyle = 'rgba(6, 7, 13, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const maxRadius = Math.min(centerX, centerY) - 20;

      // 1. Draw concentric radar grids
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.12)';
      ctx.lineWidth = 1;
      
      for (let r = maxRadius / 4; r <= maxRadius; r += maxRadius / 4) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, 2 * Math.PI);
        ctx.stroke();
      }

      // 2. Draw radar crosshairs (axes)
      ctx.beginPath();
      ctx.moveTo(centerX - maxRadius, centerY);
      ctx.lineTo(centerX + maxRadius, centerY);
      ctx.moveTo(centerX, centerY - maxRadius);
      ctx.lineTo(centerX, centerY + maxRadius);
      ctx.stroke();

      // 3. Draw Rotating Sweep Line
      sweepAngle += 0.015;
      if (scanning) {
        // speed up sweep when scanning
        sweepAngle += 0.045;
      }
      
      const sweepX = centerX + Math.cos(sweepAngle) * maxRadius;
      const sweepY = centerY + Math.sin(sweepAngle) * maxRadius;

      // Sweep gradient wedge
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, maxRadius, sweepAngle - 0.25, sweepAngle);
      ctx.closePath();
      
      const sweepGrad = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, maxRadius);
      sweepGrad.addColorStop(0, 'rgba(0, 242, 254, 0.02)');
      sweepGrad.addColorStop(1, 'rgba(0, 242, 254, 0.15)');
      ctx.fillStyle = sweepGrad;
      ctx.fill();
      ctx.restore();

      // Leading sweeping line
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(sweepX, sweepY);
      ctx.stroke();

      // 4. Draw Scanned Node dots
      scannedNodes.forEach(node => {
        // Compute static polar coordinates from node distance and ID hash
        const hash = node.id.charCodeAt(5) || 5;
        const angle = hash * 45 * (Math.PI / 180);
        const radius = (node.distance / 60) * maxRadius; // scale distance into bounds

        const nodeX = centerX + Math.cos(angle) * radius;
        const nodeY = centerY + Math.sin(angle) * radius;

        // Set colors based on node type
        let dotColor = 'rgba(0, 242, 254, 0.8)'; // default
        let glowColor = 'rgba(0, 242, 254, 0.4)';
        if (node.type === 'anomaly') {
          dotColor = '#ff007f'; // Pink
          glowColor = 'rgba(255, 0, 127, 0.5)';
        } else if (node.type === 'asteroid') {
          dotColor = '#ffb800'; // Amber
          glowColor = 'rgba(255, 184, 0, 0.5)';
        } else if (node.type === 'outpost') {
          dotColor = '#39ff14'; // Green
          glowColor = 'rgba(57, 255, 20, 0.5)';
        }

        // Pulse size if hovered or active
        const isActive = activeNode?.id === node.id;
        const isHovered = hoveredNode?.id === node.id;
        const baseSize = isActive ? 8 : isHovered ? 7 : 5;
        const finalSize = baseSize + Math.sin(Date.now() / 150) * 1.5;

        ctx.save();
        ctx.shadowBlur = isHovered || isActive ? 15 : 6;
        ctx.shadowColor = glowColor;
        ctx.fillStyle = dotColor;

        if (node.explored) {
          // Explored nodes look dim
          ctx.globalAlpha = 0.25;
          ctx.beginPath();
          ctx.arc(nodeX, nodeY, 4, 0, 2 * Math.PI);
          ctx.fill();
        } else {
          // Unexplored glowing nodes
          ctx.beginPath();
          ctx.arc(nodeX, nodeY, finalSize, 0, 2 * Math.PI);
          ctx.fill();

          // Outer ring overlay for hovered / active
          if (isHovered || isActive) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(nodeX, nodeY, finalSize + 4, 0, 2 * Math.PI);
            ctx.stroke();
          }
        }
        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [scannedNodes, scanning, activeNode, hoveredNode]);

  // Click / Hover handlers mapping canvas click to node items
  const handleCanvasInteraction = (e: React.MouseEvent<HTMLCanvasElement>, type: 'click' | 'move') => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.min(centerX, centerY) - 20;

    let foundNode: ExplorationNode | null = null;

    // Search nodes
    scannedNodes.forEach(node => {
      const hash = node.id.charCodeAt(5) || 5;
      const angle = hash * 45 * (Math.PI / 180);
      const radius = (node.distance / 60) * maxRadius;

      const nodeX = centerX + Math.cos(angle) * radius;
      const nodeY = centerY + Math.sin(angle) * radius;

      const dist = Math.sqrt((x - nodeX) ** 2 + (y - nodeY) ** 2);
      if (dist <= 15) { // Slightly larger radius for easy clicking/hovering
        foundNode = node;
      }
    });

    if (type === 'move') {
      setHoveredNode(foundNode);
    } else if (type === 'click' && foundNode) {
      selectNode(foundNode);
    }
  };

  return (
    <div className="font-rajdhani" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 2-Column Split: Sensor Sweep Radar & Encounter details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        
        {/* Radar Terminal Card */}
        <section className="panel" style={{
          padding: '20px',
          background: 'rgba(9, 13, 24, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative'
        }}>
          <div className="scanline-overlay" />
          
          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 className="font-orbitron" style={{
                fontSize: '1.25rem',
                color: 'var(--color-cyan)',
                textShadow: '0 0 8px rgba(0, 242, 254, 0.4)',
                marginBottom: '4px'
              }}>
                SECTOR TELEMETRY RADAR
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Boot active long-range sweeps to identify asteroid drifts, ship wreckages, and outposts.
              </p>
            </div>
            
            <button
              onClick={startScanning}
              disabled={scanning || !!activeNode}
              className="btn btn-amber"
              style={{ fontSize: '0.85rem' }}
            >
              {scanning ? 'SCANNING...' : 'TRIGGER SWEEP'}
            </button>
          </div>

          {/* Interactive Radar canvas */}
          <canvas
            ref={canvasRef}
            width={400}
            height={320}
            onMouseMove={(e) => handleCanvasInteraction(e, 'move')}
            onClick={(e) => handleCanvasInteraction(e, 'click')}
            style={{
              background: '#06070d',
              border: '1px solid var(--border-cyan)',
              borderRadius: '6px',
              cursor: hoveredNode ? 'pointer' : 'default',
              boxShadow: 'inset 0 0 20px rgba(0, 242, 254, 0.08)',
              width: '100%'
            }}
          />

          {/* Hover Status Readout inside card */}
          <div style={{
            marginTop: '12px',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            height: '20px',
            textAlign: 'center',
            fontWeight: 600
          }}>
            {hoveredNode ? (
              <span>
                LOCK ON: <span style={{ color: '#fff' }}>{hoveredNode.name}</span> | Type: 
                <span style={{
                  color: hoveredNode.type === 'anomaly' ? 'var(--color-pink)' : 
                         hoveredNode.type === 'asteroid' ? 'var(--color-amber)' : 'var(--color-green)'
                }}> {hoveredNode.type.toUpperCase()}</span> | Distance: {hoveredNode.distance} LY
              </span>
            ) : scanning ? (
              <span className="pulse-glow-cyan" style={{ color: 'var(--color-cyan)' }}>
                SCAN TENSOR EMISSION ACTIVE ({scanProgress.toFixed(0)}%)
              </span>
            ) : (
              <span>STANDING BY - CLICK ANY RADAR BEACON TO TARGET SECTOR</span>
            )}
          </div>

          {/* Scan Progress Bar */}
          {scanning && (
            <div style={{ width: '100%', marginTop: '12px' }}>
              <div className="meter-bar">
                <div className="meter-fill" style={{ width: `${scanProgress}%` }} />
              </div>
            </div>
          )}
        </section>

        {/* Selected Sector Node Dialog view */}
        <section className="panel" style={{
          padding: '20px',
          background: 'rgba(9, 13, 24, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '414px',
          justifyContent: 'space-between'
        }}>
          {activeNode ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', gap: '16px' }}>
              
              {/* Encounter Header */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 className="font-orbitron" style={{ fontSize: '1.15rem', color: 'var(--color-cyan)' }}>
                    {activeNode.name.toUpperCase()}
                  </h3>
                  <span className={`badge ${
                    activeNode.type === 'anomaly' ? 'badge-pink' :
                    activeNode.type === 'asteroid' ? 'badge-amber' : 'badge-cyan'
                  }`} style={{ fontSize: '0.7rem' }}>
                    {activeNode.type}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Coordinates: LY-{activeNode.distance} // STATUS: {activeNode.explored ? 'EXPLORED' : 'BEACON SECURED'}
                </div>

                {/* Atmospheric Description */}
                <div style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.03)',
                  padding: '12px',
                  borderRadius: '6px',
                  marginTop: '16px',
                  fontSize: '0.9rem',
                  lineHeight: '1.4',
                  color: 'var(--text-primary)'
                }}>
                  {activeNode.description}
                </div>
              </div>

              {/* Choices / Outcome Blocks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                {/* 1. If choices are available and node is not explored yet */}
                {!activeNode.explored && !currentOutcome && (
                  <>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                      SELECT COMMAND INSTRUCTION:
                    </div>
                    {activeNode.options.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => resolveNodeChoice(idx)}
                        className="btn btn-amber"
                        style={{
                          width: '100%',
                          fontSize: '0.85rem',
                          textAlign: 'left',
                          padding: '10px 14px',
                          alignItems: 'flex-start',
                          flexDirection: 'column',
                          lineHeight: '1.3'
                        }}
                      >
                        <span style={{ fontWeight: 700, color: '#fff' }}>{opt.text}</span>
                        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                          Sensor success probability: {(opt.successRate * 100).toFixed(0)}%
                        </span>
                      </button>
                    ))}
                  </>
                )}

                {/* 2. Display Encounter Outcomes */}
                {currentOutcome && (
                  <div style={{
                    border: '1px solid var(--border-cyan-bright)',
                    background: 'rgba(0, 242, 254, 0.05)',
                    padding: '16px',
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <h4 className="font-orbitron" style={{ fontSize: '0.95rem', color: '#fff' }}>
                      TRANSMISSION RECEIVED:
                    </h4>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                      {currentOutcome.message}
                    </p>

                    {/* Reward values grid */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '4px' }}>
                      {currentOutcome.credits !== 0 && (
                        <span className="badge badge-cyan" style={{ fontSize: '0.78rem' }}>
                          Credits: {currentOutcome.credits > 0 ? '+' : ''}{currentOutcome.credits}
                        </span>
                      )}
                      {Object.keys(currentOutcome.resources).map((resKey) => {
                        const amount = currentOutcome.resources[resKey as ResourceType];
                        if (!amount) return null;
                        return (
                          <span key={resKey} className="badge badge-amber" style={{ fontSize: '0.78rem' }}>
                            {resKey.replace(/([A-Z])/g, ' $1')}: +{amount}
                          </span>
                        );
                      })}
                    </div>

                    <button
                      onClick={closeOutcome}
                      className="btn"
                      style={{ fontSize: '0.85rem', padding: '6px 0', justifyContent: 'center', marginTop: '6px' }}
                    >
                      Close Beacon Link
                    </button>
                  </div>
                )}

                {/* 3. Explored empty states */}
                {activeNode.explored && !currentOutcome && (
                  <div style={{
                    textAlign: 'center',
                    padding: '30px 0',
                    color: 'var(--text-muted)'
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🛰️</div>
                    <div style={{ fontSize: '0.9rem' }}>SECTOR COMPLETED</div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Sensors show no remaining anomalies here. Boot another sector sweep from the radar console.
                    </p>
                    <button
                      onClick={closeOutcome}
                      className="btn"
                      style={{ fontSize: '0.8rem', padding: '6px 16px', marginTop: '12px' }}
                    >
                      Back to Telemetry
                    </button>
                  </div>
                )}

              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center',
              color: 'var(--text-muted)',
              padding: '20px'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📡</div>
              <div className="font-orbitron" style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                NO SECTOR LOCKED
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px', maxWidth: '280px' }}>
                Launch a sector sweep or click on one of the flashing beacons on the radar console to lock scanner signals.
              </p>
            </div>
          )}
        </section>

      </div>

    </div>
  );
};
