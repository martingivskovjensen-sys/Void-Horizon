import React from 'react';
import { useGame } from '../context/GameContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { state, activateOverdrive, unlockOverdrive } = useGame();
  
  const menuItems = [
    { id: 'bridge', label: '🚀 Ship\'s Bridge', desc: 'Central cockpit & helm consoles' },
    { id: 'refinery', label: '🏭 Refinery Deck', desc: 'Drone mining & refinery systems' },
    { id: 'exchange', label: '📈 Galactic Exchange', desc: 'Trade resources & fulfill contracts' },
    { id: 'scanner', label: '📡 Scanner Room', desc: 'Scan sectors for cosmic exploration' },
    { id: 'techLab', label: '🧬 Tech Lab', desc: 'Passive research & power grids' },
    { id: 'mail', label: '📬 Hyperwave Mail', desc: 'Read mails & hire market NPCs' },
    { id: 'achievements', label: '🏆 Station Datalogs', desc: 'Achievements & captain records' }
  ];

  const od = state.overdrive;
  const isOdUsable = od.unlocked && !od.active && od.cooldownLeft === 0;

  return (
    <aside className="panel font-rajdhani" style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      height: '100%',
      borderRadius: '0',
      borderLeft: 'none',
      borderTop: 'none',
      borderBottom: 'none',
      width: '100%',
      backgroundColor: 'rgba(7, 10, 20, 0.85)'
    }}>
      <div>
        {/* Station logo */}
        <div style={{
          padding: '24px 16px',
          borderBottom: '1px solid var(--border-cyan)',
          textAlign: 'center',
          position: 'relative'
        }}>
          <h2 className="font-orbitron" style={{
            fontSize: '1.4rem',
            fontWeight: 800,
            color: 'var(--color-cyan)',
            textShadow: '0 0 10px rgba(0, 242, 254, 0.5)',
            marginBottom: '4px'
          }}>
            VOID HORIZON
          </h2>
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            letterSpacing: '2px',
            textTransform: 'uppercase'
          }}>
            Refinery Station
          </div>
          <div style={{
            position: 'absolute',
            bottom: '0',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '40px',
            height: '2px',
            background: 'var(--color-cyan)',
            boxShadow: 'var(--shadow-glow-cyan)'
          }} />
        </div>

        {/* Navigation list */}
        <nav style={{ padding: '16px 8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {menuItems.map(item => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  width: '100%',
                  background: active ? 'rgba(0, 242, 254, 0.08)' : 'transparent',
                  border: '1px solid',
                  borderColor: active ? 'var(--color-cyan)' : 'transparent',
                  borderRadius: '6px',
                  padding: '12px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: active ? '#fff' : 'var(--text-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  transition: 'all 0.2s ease',
                  boxShadow: active ? 'inset 0 0 8px rgba(0, 242, 254, 0.05)' : 'none'
                }}
              >
                <div style={{
                  fontSize: '1.05rem',
                  fontWeight: 600,
                  color: active ? 'var(--color-cyan)' : 'inherit',
                  textShadow: active ? '0 0 8px rgba(0, 242, 254, 0.3)' : 'none'
                }}>
                  {item.label}
                </div>
                <div style={{
                  fontSize: '0.72rem',
                  color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {item.desc}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Reactor / Overdrive core */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid var(--border-cyan)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        backgroundColor: 'rgba(4, 7, 14, 0.5)'
      }}>
        <div style={{
          textAlign: 'center',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>REACTOR CORE</span>
          <span className="badge badge-cyan" style={{
            borderColor: od.unlocked ? 'var(--border-cyan-bright)' : 'var(--border-pink-bright)',
            color: od.unlocked ? 'var(--color-cyan)' : 'var(--color-pink)'
          }}>
            {od.unlocked ? (od.active ? 'ACTIVE' : 'READY') : 'LOCKED'}
          </span>
        </div>

        {od.unlocked ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={activateOverdrive}
              disabled={!isOdUsable}
              className="btn btn-pink"
              style={{
                width: '100%',
                padding: '10px 0',
                justifyContent: 'center',
                animation: isOdUsable ? 'pulse-cyan 2s infinite' : 'none'
              }}
            >
              ⚡ OVERDRIVE ⚡
            </button>
            
            {/* Action displays */}
            {od.active && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--color-pink)' }}>BURNING FUSION</span>
                  <span>{od.timeLeft}s</span>
                </div>
                <div className="meter-bar">
                  <div className="meter-fill meter-fill-pink" style={{ width: `${(od.timeLeft / od.duration) * 100}%` }} />
                </div>
              </div>
            )}

            {!od.active && od.cooldownLeft > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>COOLING CORE</span>
                  <span>{od.cooldownLeft}s</span>
                </div>
                <div className="meter-bar">
                  <div className="meter-fill meter-fill-amber" style={{ width: `${(od.cooldownLeft / od.cooldown) * 100}%` }} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Boost production +150% for 15s. Requires 1,000 credits.
            </div>
            <button
              onClick={unlockOverdrive}
              disabled={state.credits < 1000}
              className="btn btn-amber"
              style={{ width: '100%', padding: '8px 0', justifyContent: 'center' }}
            >
              Unlock Reactor
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
