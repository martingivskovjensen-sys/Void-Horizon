import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';

export const CoopStatusPanel: React.FC = () => {
  const { state, sendChatMessage, leaveLobby } = useGame();
  const [isOpen, setIsOpen] = useState(false);
  const [chatText, setChatText] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.multiplayer.chatMessages, isOpen]);

  // If multiplayer is not active, don't show the panel at all
  if (!state.multiplayer.active) {
    return null;
  }

  const handleSendChat = () => {
    if (!chatText.trim()) return;
    sendChatMessage(chatText.trim());
    setChatText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendChat();
    }
  };

  // Sort players for leaderboard: highest credits first
  const sortedPlayers = [...state.multiplayer.players].sort((a, b) => {
    const credA = a.credits ?? 0;
    const credB = b.credits ?? 0;
    return credB - credA;
  });

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-pink pulse-glow-pink"
        style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          zIndex: 99,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '0.85rem',
          boxShadow: '0 4px 15px rgba(255, 0, 127, 0.25)'
        }}
      >
        <span>🏆</span>
        <strong>RANKINGS ({state.multiplayer.players.length})</strong>
      </button>

      {/* Slide-out Panel Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(3px)',
            zIndex: 1000
          }}
        />
      )}

      <div
        className="panel font-rajdhani"
        style={{
          position: 'fixed',
          top: '0',
          right: '0',
          width: '340px',
          height: '100vh',
          zIndex: 1001,
          background: 'rgba(12, 8, 6, 0.96)',
          borderLeft: '2px solid #b87333', // Copper border
          borderTop: 'none',
          borderRight: 'none',
          borderBottom: 'none',
          borderRadius: '0',
          padding: '24px 20px',
          boxShadow: '-10px 0 35px rgba(0,0,0,0.8)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: 'auto'
        }}
      >
        {/* Top/Body wrapper */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flexGrow: 1, overflowY: 'auto', paddingRight: '4px' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(184, 115, 51, 0.3)', paddingBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#ffb800', fontWeight: 800, letterSpacing: '1.5px', fontFamily: "'Orbitron', monospace" }}>COMPETITIVE SECTOR GRID</div>
              <h3 className="font-orbitron" style={{ fontSize: '1.1rem', color: '#fff', margin: '2px 0 0 0', textShadow: '0 0 8px rgba(184,115,51,0.4)' }}>
                SECTOR CODE: {state.multiplayer.roomCode}
              </h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="btn btn-pink"
              style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: '#b87333' }}
            >
              ✕
            </button>
          </div>

          {/* Steampunk Leaderboard */}
          <div>
            <div style={{ fontSize: '0.75rem', color: '#cd9b1d', fontWeight: 800, marginBottom: '6px', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: "'Orbitron', monospace" }}>
              🏆 Competitive Leaderboard
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {sortedPlayers.map((p, index) => {
                const isSelf = p.name === state.multiplayer.playerName;
                const creditsVal = isSelf ? state.credits : (p.credits ?? 0);
                const droneCountVal = isSelf ? Object.values(state.drones).reduce((acc, d) => acc + d.count, 0) : (p.dronesCount ?? 0);
                const locVal = isSelf ? (state.currentLocation || 'core') : (p.currentLocation ?? 'core');

                return (
                  <div key={p.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: isSelf ? 'rgba(184, 115, 51, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${isSelf ? '#ffb800' : 'rgba(184, 115, 51, 0.2)'}`,
                    padding: '8px 10px',
                    borderRadius: '4px',
                    boxShadow: isSelf ? 'inset 0 0 8px rgba(184, 115, 51, 0.1)' : 'none'
                  }}>
                    {/* Rank, Name, Details */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      <span style={{
                        fontSize: '0.85rem',
                        fontWeight: 900,
                        color: index === 0 ? '#ffb800' : index === 1 ? '#e0e0e0' : index === 2 ? '#cd7f32' : 'rgba(255,255,255,0.4)',
                        width: '16px',
                        textAlign: 'center'
                      }}>
                        #{index + 1}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: isSelf ? '#ffb800' : '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {p.name} {isSelf && '(You)'}
                        </span>
                        <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>
                          📍 {locVal.replace('_', ' ')} • 🤖 {droneCountVal} Dr.
                        </span>
                      </div>
                    </div>
                    {/* Credits score */}
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#39ff14', fontFamily: "'Orbitron', monospace" }}>
                        ₵{creditsVal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chat Deck */}
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: '160px', background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(184, 115, 51, 0.15)' }}>
            <div style={{ fontSize: '0.72rem', color: '#cd9b1d', fontWeight: 800, marginBottom: '6px', fontFamily: "'Orbitron', monospace" }}>📻 COMMS FEED</div>
            <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', maxHeight: '180px' }}>
              {state.multiplayer.chatMessages.map(msg => (
                <div key={msg.id}>
                  <span style={{ color: msg.color, fontWeight: 700 }}>{msg.sender}:</span>{' '}
                  <span style={{ color: '#fff' }}>{msg.text}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
              <input
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Broadcast to sector..."
                style={{
                  flexGrow: 1,
                  background: '#0d0a08',
                  border: '1px solid #b87333',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '0.78rem',
                  padding: '4px 8px',
                  outline: 'none'
                }}
              />
              <button
                onClick={handleSendChat}
                className="btn btn-pink"
                style={{ fontSize: '0.72rem', padding: '4px 8px', borderColor: '#b87333' }}
              >
                Send
              </button>
            </div>
          </div>

          {/* Activity Logs */}
          <div style={{ display: 'flex', flexDirection: 'column', height: '140px', background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(184, 115, 51, 0.15)' }}>
            <div style={{ fontSize: '0.72rem', color: '#cd9b1d', fontWeight: 800, marginBottom: '6px', fontFamily: "'Orbitron', monospace" }}>📡 SECTOR ACTIVITY LOG</div>
            <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.72rem', color: 'var(--color-cyan)', opacity: 0.85 }}>
              {state.multiplayer.activityLog.map(log => (
                <div key={log.id} style={{ lineHeight: '1.3' }}>
                  {log.text}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Leave Lobby Button */}
        <button
          onClick={() => {
            if (window.confirm('Disconnect from the sector rankings? Your competitive score will be cleared.')) {
              leaveLobby();
              setIsOpen(false);
            }
          }}
          className="btn btn-pink"
          style={{ width: '100%', padding: '10px 0', justifyContent: 'center', marginTop: '14px', fontSize: '0.85rem', borderColor: '#ff5555' }}
        >
          ❌ Disconnect Competitive Feed
        </button>
      </div>
    </>
  );
};
