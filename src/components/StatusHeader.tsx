import React from 'react';
import { useGame } from '../context/GameContext';

export const StatusHeader: React.FC = () => {
  const { state, activateOverdrive, unlockOverdrive } = useGame();

  const getRateColor = (rate: number) => {
    if (rate > 0) return 'var(--color-green)';
    if (rate < 0) return 'var(--color-red)';
    return 'var(--text-secondary)';
  };

  const getRateSign = (rate: number) => {
    if (rate > 0) return `+${rate.toFixed(1)}`;
    return rate.toFixed(1);
  };

  // Calculate energy percentage and colors
  const energyPercent = Math.min((state.energy.consumption / state.energy.max) * 100, 100);
  const isOverloaded = state.energy.consumption > state.energy.max;
  const energyBarColorClass = isOverloaded
    ? 'meter-fill-pink' // red/pink alert
    : energyPercent > 80
      ? 'meter-fill-amber' // warning
      : 'meter-fill-green'; // fine

  const od = state.overdrive;
  const isOdUsable = od.unlocked && !od.active && od.cooldownLeft === 0;

  return (
    <header className="panel font-rajdhani" style={{
      borderRadius: '0',
      borderTop: 'none',
      borderLeft: 'none',
      borderRight: 'none',
      backgroundColor: 'rgba(9, 13, 24, 0.9)',
      padding: '12px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 100,
      width: '100%',
      height: '64px'
    }}>
      {/* Credits / Reserves */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>RESERVES:</span>
        <div style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: 'var(--color-cyan)',
          textShadow: '0 0 10px rgba(0, 242, 254, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span style={{ fontSize: '1rem', opacity: 0.7 }}>₵</span>
          <span>{state.credits.toLocaleString()}</span>
        </div>
      </div>

      {/* Raw Resources Rate Quickview */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        background: 'rgba(0, 0, 0, 0.25)',
        padding: '6px 16px',
        borderRadius: '6px',
        border: '1px solid rgba(255, 255, 255, 0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
          <span style={{ opacity: 0.8 }}>⛏️ Ore:</span>
          <span style={{ fontWeight: 600 }}>{Math.floor(state.resources.ironOre.amount)}</span>
          <span style={{ fontSize: '0.75rem', color: getRateColor(state.resources.ironOre.perSecond), fontWeight: 700 }}>
            ({getRateSign(state.resources.ironOre.perSecond)}/s)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
          <span style={{ opacity: 0.8 }}>💨 Gas:</span>
          <span style={{ fontWeight: 600 }}>{Math.floor(state.resources.heliumGas.amount)}</span>
          <span style={{ fontSize: '0.75rem', color: getRateColor(state.resources.heliumGas.perSecond), fontWeight: 700 }}>
            ({getRateSign(state.resources.heliumGas.perSecond)}/s)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
          <span style={{ opacity: 0.8 }}>💎 Plasma:</span>
          <span style={{ fontWeight: 600 }}>{Math.floor(state.resources.plasmaCrystals.amount)}</span>
          <span style={{ fontSize: '0.75rem', color: getRateColor(state.resources.plasmaCrystals.perSecond), fontWeight: 700 }}>
            ({getRateSign(state.resources.plasmaCrystals.perSecond)}/s)
          </span>
        </div>
      </div>

      {/* Energy Grid Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '200px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
            <span style={{ color: isOverloaded ? 'var(--color-pink)' : 'var(--text-secondary)' }}>
              ⚡ {isOverloaded ? 'GRID OVERLOAD' : 'POWER GRID'}
            </span>
            <span>{state.energy.consumption.toFixed(1)}/{state.energy.max}MW</span>
          </div>
          <div className="meter-bar" style={{ height: '4px' }}>
            <div className={`meter-fill ${energyBarColorClass}`} style={{ width: `${energyPercent}%` }} />
          </div>
        </div>
      </div>

      {/* Reactor / Overdrive Core */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '0 16px',
        height: '100%',
        justifyContent: 'center'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1px' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.5px' }}>REACTOR</span>
          <span className="badge" style={{
            fontSize: '0.65rem',
            padding: '1px 4px',
            borderColor: od.unlocked ? (od.active ? 'var(--border-pink-bright)' : 'var(--border-cyan-bright)') : 'rgba(255,255,255,0.15)',
            color: od.unlocked ? (od.active ? 'var(--color-pink)' : 'var(--color-cyan)') : 'var(--text-muted)',
            background: 'transparent'
          }}>
            {od.unlocked ? (od.active ? 'ACTIVE' : 'READY') : 'LOCKED'}
          </span>
        </div>

        {od.unlocked ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={activateOverdrive}
              disabled={!isOdUsable}
              className="btn btn-pink"
              style={{
                fontSize: '0.75rem',
                padding: '4px 10px',
                height: '28px',
                minWidth: '95px',
                justifyContent: 'center',
                animation: isOdUsable ? 'pulse-cyan 2s infinite' : 'none'
              }}
            >
              ⚡ OVERDRIVE
            </button>
            {od.active && (
              <div style={{ display: 'flex', flexDirection: 'column', width: '55px', gap: '2px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-pink)', textAlign: 'right', fontWeight: 600 }}>{od.timeLeft}s</span>
                <div className="meter-bar" style={{ height: '3px', width: '100%', border: 'none' }}>
                  <div className="meter-fill meter-fill-pink" style={{ width: `${(od.timeLeft / od.duration) * 100}%` }} />
                </div>
              </div>
            )}
            {!od.active && od.cooldownLeft > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', width: '55px', gap: '2px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-amber)', textAlign: 'right', fontWeight: 600 }}>{od.cooldownLeft}s</span>
                <div className="meter-bar" style={{ height: '3px', width: '100%', border: 'none' }}>
                  <div className="meter-fill meter-fill-amber" style={{ width: `${(od.cooldownLeft / od.cooldown) * 100}%` }} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={unlockOverdrive}
            disabled={state.credits < 1000}
            className="btn btn-amber"
            style={{
              fontSize: '0.75rem',
              padding: '4px 10px',
              height: '28px',
              whiteSpace: 'nowrap'
            }}
          >
            🔓 UNLOCK ₵1K
          </button>
        )}
      </div>

      {/* Save indicator & system health */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.75rem' }}>
          <span style={{ color: 'var(--color-green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{
              width: '6px',
              height: '6px',
              backgroundColor: 'var(--color-green)',
              borderRadius: '50%',
              display: 'inline-block',
              boxShadow: 'var(--shadow-glow-green)',
              animation: 'pulse-cyan 1.5s infinite'
            }} />
            SYSTEMS LINKED
          </span>
          <span style={{ color: 'var(--text-muted)' }}>AUTO-SAVE PERSISTENT</span>
        </div>
      </div>
    </header>
  );
};
