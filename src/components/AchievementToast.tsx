import React from 'react';
import { useGame } from '../context/GameContext';

export const AchievementToast: React.FC = () => {
  const { activeToast } = useGame();

  if (!activeToast) return null;

  return (
    <div
      className="panel font-rajdhani"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '320px',
        background: 'rgba(9, 13, 24, 0.95)',
        border: '1.5px solid var(--color-cyan)',
        boxShadow: 'var(--shadow-glow-cyan), 0 10px 40px rgba(0,0,0,0.8)',
        zIndex: 9999,
        padding: '12px 16px',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        animation: 'pulse-cyan 3s infinite',
        transform: 'translateY(0)',
        transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}
    >
      {/* Visual glowing particle ring overlay */}
      <div style={{
        position: 'absolute',
        top: '-1px',
        left: '20px',
        width: '60px',
        height: '2px',
        background: 'var(--color-cyan)',
        boxShadow: 'var(--shadow-glow-cyan)'
      }} />

      {/* Trophy Emoji Icon */}
      <div style={{
        fontSize: '2.2rem',
        background: 'rgba(0, 242, 254, 0.08)',
        border: '1px solid rgba(0, 242, 254, 0.3)',
        width: '50px',
        height: '50px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '4px',
        boxShadow: 'inset 0 0 10px rgba(0,242,254,0.1)'
      }}>
        {activeToast.icon}
      </div>

      <div style={{ flexGrow: 1 }}>
        <div style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          color: 'var(--color-cyan)',
          letterSpacing: '1.5px',
          textTransform: 'uppercase'
        }}>
          🏆 ACHIEVEMENT UNLOCKED!
        </div>
        <div style={{
          fontSize: '1rem',
          fontWeight: 700,
          color: '#fff',
          marginTop: '2px'
        }}>
          {activeToast.name}
        </div>
        <div style={{
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
          marginTop: '1px',
          lineHeight: '1.2'
        }}>
          {activeToast.desc}
        </div>
      </div>
    </div>
  );
};
