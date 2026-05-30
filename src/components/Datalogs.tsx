import React from 'react';
import { useGame } from '../context/GameContext';

export const Datalogs: React.FC = () => {
  const { state, resetGame } = useGame();

  const formatPlaytime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    if (mins === 0) return `${remainingSecs}s`;
    return `${mins}m ${remainingSecs}s`;
  };

  return (
    <div className="font-rajdhani" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 2-Column Split: Lifetime Stats & Achievements logs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px' }}>
        
        {/* Lifetime Telemetry Stats Card */}
        <section className="panel" style={{
          padding: '20px',
          background: 'rgba(9, 13, 24, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 className="font-orbitron" style={{
              fontSize: '1.25rem',
              color: 'var(--color-cyan)',
              textShadow: '0 0 8px rgba(0, 242, 254, 0.4)',
              marginBottom: '16px'
            }}>
              CAPTAIN DATALOG STATS
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Station Lifetime:</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{formatPlaytime(state.stats.playtime)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Ore Excavated:</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{Math.round(state.stats.totalOreMined).toLocaleString()} units</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Alloys/Cells Refined:</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{Math.round(state.stats.totalRefinedProduced).toLocaleString()} units</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Sectors Swept & Explored:</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{state.stats.totalNodesExplored} nodes</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Contracts Fulfilled:</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{state.stats.totalContractsCompleted} deals</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Gross Station Revenues:</span>
                <span style={{ color: 'var(--color-cyan)', fontWeight: 700 }}>₵{state.stats.totalCreditsEarned.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Reset button inside stats card */}
          <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255,0,127,0.15)', paddingTop: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', lineHeight: '1.3' }}>
              Warning: Resetting core operations deletes all save-state registries from your local terminal.
            </div>
            <button
              onClick={resetGame}
              className="btn btn-pink"
              style={{ width: '100%', padding: '8px 0', justifyContent: 'center', fontSize: '0.85rem' }}
            >
              ☢️ Purge Station Data
            </button>
          </div>
        </section>

        {/* Station Datalogs (Achievements) Card */}
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
            SYSTEM SECURITY DECK ACHIEVEMENTS
          </h2>
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            marginBottom: '16px'
          }}>
            Establish critical thresholds to verify command status. Popups display upon achievement locks.
          </p>

          {/* Achievements list */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            overflowY: 'auto',
            maxHeight: '380px'
          }}>
            {state.achievements.map(ach => (
              <div
                key={ach.id}
                style={{
                  background: ach.unlocked ? 'rgba(0, 242, 254, 0.03)' : 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid',
                  borderColor: ach.unlocked ? 'var(--border-cyan-bright)' : 'rgba(255, 255, 255, 0.04)',
                  padding: '12px 16px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  opacity: ach.unlocked ? 1.0 : 0.4,
                  transition: 'all 0.3s ease'
                }}
              >
                {/* Icon box */}
                <div style={{
                  fontSize: '1.8rem',
                  background: ach.unlocked ? 'rgba(0, 242, 254, 0.08)' : 'rgba(0,0,0,0.2)',
                  border: '1px solid',
                  borderColor: ach.unlocked ? 'var(--color-cyan)' : 'transparent',
                  width: '45px',
                  height: '45px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  boxShadow: ach.unlocked ? 'var(--shadow-glow-cyan)' : 'none'
                }}>
                  {ach.icon}
                </div>

                {/* Details */}
                <div style={{ flexGrow: 1 }}>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: ach.unlocked ? '#fff' : 'var(--text-secondary)'
                  }}>
                    {ach.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {ach.description}
                  </div>
                </div>

                {/* Status indicator */}
                <div>
                  <span className={`badge ${ach.unlocked ? 'badge-cyan' : 'badge-amber'}`} style={{ fontSize: '0.68rem' }}>
                    {ach.unlocked ? 'UNLOCKED' : 'LOCKED'}
                  </span>
                </div>

              </div>
            ))}
          </div>
        </section>

      </div>

    </div>
  );
};
