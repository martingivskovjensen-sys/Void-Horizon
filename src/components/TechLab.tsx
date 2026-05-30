import React from 'react';
import { useGame } from '../context/GameContext';

export const TechLab: React.FC = () => {
  const { state, purchaseUpgrade } = useGame();

  const upgradeKeys = Object.keys(state.upgrades);

  const getUpgradeIcon = (id: string) => {
    switch (id) {
      case 'laserPower': return '⛏️';
      case 'cargoCapacity': return '🎒';
      case 'radarPower': return '📡';
      case 'energyOutput': return '⚡';
      default: return '🧬';
    }
  };

  return (
    <div className="font-rajdhani" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Upgrades grid */}
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
          STATION UPGRADE LAB
        </h2>
        <p style={{
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          marginBottom: '20px'
        }}>
          Fund technical upgrades to enhance excavation speeds, automated drone yields, and fusion power grids.
        </p>

        {/* Upgrades grid layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px'
        }}>
          {upgradeKeys.map(key => {
            const up = state.upgrades[key];
            const isMax = up.level >= up.maxLevel;
            const canAfford = state.credits >= up.cost;

            return (
              <div key={key} style={{
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                padding: '16px',
                borderRadius: '8px',
                display: 'flex',
                gap: '16px',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                
                {/* Left side: details */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{
                    fontSize: '2.2rem',
                    background: 'rgba(0, 242, 254, 0.05)',
                    border: '1px solid var(--border-cyan)',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    boxShadow: 'inset 0 0 10px rgba(0,242,254,0.1)'
                  }}>
                    {getUpgradeIcon(key)}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.15rem', fontWeight: 700 }}>{up.name}</span>
                      <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                        Lv: {up.level} (Infinite)
                      </span>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '280px', lineHeight: '1.3' }}>
                      {up.description}
                    </p>

                    {/* Level bar blocks (Rolling cycle indicator) */}
                    <div style={{ display: 'flex', gap: '3px', marginTop: '8px' }}>
                      {Array.from({ length: 10 }).map((_, idx) => {
                        const levelMod = up.level % 10;
                        const fill = levelMod === 0 && up.level > 0 ? true : idx < levelMod;
                        return (
                          <div
                            key={idx}
                            style={{
                              width: '12px',
                              height: '5px',
                              borderRadius: '1px',
                              background: fill 
                                ? 'var(--color-cyan)' 
                                : 'rgba(255,255,255,0.05)',
                              boxShadow: fill ? 'var(--shadow-glow-cyan)' : 'none'
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right side: buy buttons */}
                <div>
                  <button
                    onClick={() => purchaseUpgrade(key)}
                    disabled={isMax || !canAfford}
                    className="btn btn-amber"
                    style={{
                      padding: '10px 16px',
                      fontSize: '0.9rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                      width: '110px'
                    }}
                  >
                    {isMax ? (
                      <span style={{ fontWeight: 700 }}>MAX TIER</span>
                    ) : (
                      <>
                        <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>RESEARCH</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>₵{up.cost}</span>
                      </>
                    )}
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      </section>

      {/* Tech support specs panel */}
      <section className="panel" style={{
        padding: '20px',
        background: 'rgba(9, 13, 24, 0.5)'
      }}>
        <h3 className="font-orbitron" style={{ fontSize: '1rem', color: 'var(--color-cyan)', marginBottom: '8px' }}>
          STATION DIAGNOSTICS & SYSTEM FORMULAS
        </h3>
        <ul style={{
          fontSize: '0.88rem',
          color: 'var(--text-secondary)',
          lineHeight: '1.6',
          paddingLeft: '16px'
        }}>
          <li>⛏️ <strong style={{ color: '#fff' }}>Beam Excavator Output:</strong> Active manual extraction yields: <span style={{ color: 'var(--color-cyan)' }}>{1 + state.upgrades.laserPower.level} ore</span> per trigger pulse.</li>
          <li>🎒 <strong style={{ color: '#fff' }}>Drone Cargo Capacity:</strong> Autonomous drone passive harvests scaled by: <span style={{ color: 'var(--color-cyan)' }}>+{(state.upgrades.cargoCapacity.level * 25)}%</span> total yield.</li>
          <li>📡 <strong style={{ color: '#fff' }}>Deep Sensor Sweep Frequency:</strong> Long range radar scanning velocities scaled by: <span style={{ color: 'var(--color-cyan)' }}>+{(state.upgrades.radarPower.level * 40)}%</span> scan rate.</li>
          <li>⚡ <strong style={{ color: '#fff' }}>Reactor Power Containment:</strong> Station generator maximum energy threshold: <span style={{ color: 'var(--color-cyan)' }}>{10 + (state.upgrades.energyOutput.level * 5)} MW</span> power bounds.</li>
        </ul>
      </section>

    </div>
  );
};
