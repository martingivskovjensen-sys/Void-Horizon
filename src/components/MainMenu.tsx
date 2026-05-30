import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  alpha: number;
}

export const MainMenu: React.FC = () => {
  const { 
    state, 
    setMainMenuActive, 
    toggleAudioMute, 
    exportSave, 
    importSave,
    createLobby,
    joinLobby,
    leaveLobby,
    sendChatMessage
  } = useGame();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [saveString, setSaveString] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'fail'>('idle');
  const [hasSave, setHasSave] = useState(false);

  // Check if save exists reactively when state changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('void_horizon_save_v1');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.credits !== undefined) {
            setHasSave(true);
            return;
          }
        } catch (e) {
          // ignore
        }
      }
      setHasSave(false);
    }
  }, [state]);

  // Solar system animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let angle = 0;
    
    // Rocket transit coordinates
    let rocketX = 50;
    let rocketY = canvas.height - 80;
    let rocketAngle = -Math.PI / 4;
    const rocketParticles: Particle[] = [];

    const render = () => {
      // Full opaque clear every frame to prevent ghosting
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#06070d';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // 1. Draw Star field backdrop — each star gets its own beginPath
      for (let i = 0; i < 40; i++) {
        const x = (Math.sin(i * 312) * 0.5 + 0.5) * canvas.width;
        const y = (Math.cos(i * 543) * 0.5 + 0.5) * canvas.height;
        const twinkle = Math.sin(angle * 2 + i) * 0.3 + 0.5;
        ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * 0.15})`;
        ctx.beginPath();
        ctx.arc(x, y, Math.sin(angle * 2 + i) * 0.6 + 0.8, 0, 2 * Math.PI);
        ctx.fill();
      }

      // 2. Draw Sun at center
      angle += 0.003;
      ctx.save();
      ctx.shadowBlur = 40;
      ctx.shadowColor = 'rgba(255, 184, 0, 0.6)';
      ctx.fillStyle = '#ffb800';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 30 + Math.sin(angle * 10) * 1.5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();

      // 3. Draw concentric Orbit Rings and rotating planets
      const planetData = [
        { radius: 60, speed: 0.02, size: 6, color: '#94a3b8', name: 'Refinery Alpha' },
        { radius: 95, speed: 0.012, size: 8, color: '#00f2fe', name: 'Terra Colony' },
        { radius: 140, speed: 0.007, size: 10, color: '#ffb800', name: 'Asteroid Belt Beta' },
        { radius: 190, speed: 0.004, size: 12, color: '#ff007f', name: 'Anomaly Sector' }
      ];

      planetData.forEach((planet, idx) => {
        // Draw orbit line
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.04)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, planet.radius, 0, 2 * Math.PI);
        ctx.stroke();

        // Compute coordinate
        const pAngle = angle * (planet.speed * 100) + idx * 45;
        const px = centerX + Math.cos(pAngle) * planet.radius;
        const py = centerY + Math.sin(pAngle) * planet.radius;

        // Draw planet
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = planet.color;
        ctx.fillStyle = planet.color;
        ctx.beginPath();
        ctx.arc(px, py, planet.size, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();

        // Planet text label (dim)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.font = '500 9px "Rajdhani"';
        ctx.fillText(planet.name, px + planet.size + 4, py + 3);
      });

      // 4. Update and Draw Rocket Ship cruising in orbital transit
      // Rocket flies slowly in a curved vector path across the system
      const targetX = centerX + Math.cos(angle * 1.5) * 110;
      const targetY = centerY + Math.sin(angle * 1.5) * 110;

      // Smooth interpolation towards target orbital transit
      const dx = targetX - rocketX;
      const dy = targetY - rocketY;
      rocketX += dx * 0.02;
      rocketY += dy * 0.02;
      rocketAngle = Math.atan2(dy, dx) + Math.PI / 2;

      // Spawn combustion engine plume particles
      if (Math.random() < 0.4) {
        // particles emit behind rocket
        const backAngle = rocketAngle + Math.PI;
        rocketParticles.push({
          x: rocketX + Math.sin(backAngle) * 12,
          y: rocketY - Math.cos(backAngle) * 12,
          vx: Math.sin(backAngle) * (Math.random() * 2 + 1) + (Math.random() - 0.5) * 0.5,
          vy: Math.cos(backAngle) * (Math.random() * 2 + 1) + (Math.random() - 0.5) * 0.5,
          life: 30,
          alpha: 1.0
        });
      }

      // Draw particle plume trail
      rocketParticles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1;
        p.alpha = p.life / 30;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = Math.random() < 0.6 ? '#ff007f' : '#ffb800'; // Magenta / Amber flames
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#ff007f';
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.random() * 2 + 1, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
      });

      // Filter dead plume particles
      const activeParticles = rocketParticles.filter(p => p.life > 0);
      rocketParticles.length = 0;
      rocketParticles.push(...activeParticles);

      // Draw Steamworld Heist Steampunk Boiler Rocket Ship
      ctx.save();
      ctx.translate(rocketX, rocketY);
      ctx.rotate(rocketAngle);

      // Main boiler hull (rounded rectangle copper cylinder)
      ctx.fillStyle = '#9c5a3c'; // Copper base
      ctx.strokeStyle = '#3e2010'; // Dark border
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-7, -9, 14, 19, 2);
      ctx.fill();
      ctx.stroke();

      // Brass horizontal straps/rings
      ctx.fillStyle = '#d4af37'; // Gold/Brass
      ctx.fillRect(-7.5, -4, 15, 2.5);
      ctx.fillRect(-7.5, 4, 15, 2.5);

      // Cockpit Bubble Glass Nose (Cyan bubble glass at front nose dome)
      ctx.fillStyle = 'rgba(0, 242, 254, 0.6)'; // cyan glass
      ctx.strokeStyle = '#d4af37'; // brass frame
      ctx.beginPath();
      ctx.arc(0, -9, 5, Math.PI, 0); // half circle at the nose
      ctx.fill();
      ctx.stroke();

      // Steampunk side funnel (steam vent chimney)
      ctx.fillStyle = '#4a5568'; // dark iron
      ctx.fillRect(4.5, -2, 3, 5);
      ctx.fillStyle = '#ffd700'; // gold cap
      ctx.fillRect(4, -4, 4, 2);

      // Bulky rear thruster nozzle
      ctx.fillStyle = '#5c676d'; // Iron thruster nozzle
      ctx.beginPath();
      ctx.moveTo(-4, 10);
      ctx.lineTo(-6.5, 14);
      ctx.lineTo(6.5, 14);
      ctx.lineTo(4, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Brass rivet details along the seams
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(-3.5, -1, 0.75, 0, Math.PI * 2);
      ctx.arc(3.5, -1, 0.75, 0, Math.PI * 2);
      ctx.arc(-3.5, 7, 0.75, 0, Math.PI * 2);
      ctx.arc(3.5, 7, 0.75, 0, Math.PI * 2);
      ctx.fill();

      // Steampunk solar fins / copper panels (steampunk wings)
      ctx.fillStyle = '#b25e3b'; // reddish copper
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.lineTo(-16, 6);
      ctx.lineTo(-13, 10);
      ctx.lineTo(-7, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(7, 0);
      ctx.lineTo(16, 6);
      ctx.lineTo(13, 10);
      ctx.lineTo(7, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, []);

  const handleExportSave = () => {
    const exported = exportSave();
    setSaveString(exported);
    // Auto-copy to clipboard
    navigator.clipboard.writeText(exported);
    alert('Station save-string successfully copied to your clipboard!');
  };

  const handleImportSave = () => {
    if (!saveString.trim()) return;
    const ok = importSave(saveString.trim());
    if (ok) {
      setImportStatus('success');
      setTimeout(() => {
        setImportStatus('idle');
        setMainMenuActive(false);
      }, 1000);
    } else {
      setImportStatus('fail');
      setTimeout(() => setImportStatus('idle'), 2500);
    }
  };

  const [menuMode, setMenuMode] = useState<'main' | 'multiplayer' | 'lobby'>('main');
  const [playerName, setPlayerName] = useState(() => 'Captain_' + Math.floor(Math.random() * 900 + 100));
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [chatInput, setChatInput] = useState('');

  const handleCreateLobby = () => {
    createLobby(playerName);
    setMenuMode('lobby');
  };

  const handleJoinLobby = () => {
    if (!inputRoomCode.trim()) return;
    const ok = joinLobby(inputRoomCode, playerName);
    if (ok) {
      setMenuMode('lobby');
    } else {
      alert('Invalid room code!');
    }
  };

  const handleLeaveLobby = () => {
    leaveLobby();
    setMenuMode('multiplayer');
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput.trim());
    setChatInput('');
  };

  return (
    <div className="font-rajdhani" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'radial-gradient(circle at center, #0e1224 0%, #05060b 100%)',
      zIndex: 99999,
      display: 'grid',
      gridTemplateColumns: '1fr 1.2fr',
      overflow: 'hidden'
    }}>
      
      {/* Scanline atmospheric overlay */}
      <div className="scanline-overlay" style={{ opacity: 0.15 }} />

      {/* Left Column: Captain Controls deck */}
      <section style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '50px 60px',
        borderRight: '1px solid rgba(0, 242, 254, 0.08)',
        zIndex: 20,
        height: '100%',
        overflowY: 'auto'
      }}>
        
        {/* Solo / Standard Mode Panel */}
        {menuMode === 'main' && (
          <>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-cyan" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>
                  STATION CONTROL SYSTEM v1.2
                </span>
              </div>
              
              <h1 className="font-orbitron" style={{
                fontSize: '3.6rem',
                fontWeight: 900,
                lineHeight: '1.05',
                marginTop: '16px',
                color: 'var(--color-cyan)',
                textShadow: '0 0 25px rgba(0, 242, 254, 0.45)',
                letterSpacing: '2px'
              }}>
                VOID<br />HORIZON
              </h1>
              <p style={{
                fontSize: '1.15rem',
                color: 'var(--text-secondary)',
                marginTop: '8px',
                letterSpacing: '1.5px',
                textTransform: 'uppercase'
              }}>
                Deep-Space Strategy Operations
              </p>

              <p style={{
                fontSize: '0.92rem',
                color: 'var(--text-muted)',
                marginTop: '20px',
                lineHeight: '1.4',
                maxWidth: '360px'
              }}>
                Command orbital refinery matrices, spec trade raw minerals, and sweep radars for high-stakes cosmic exploration nodes.
              </p>
            </div>

            {/* Buttons Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: '30px 0' }}>
              
              {hasSave ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    onClick={() => setMainMenuActive(false)}
                    className="btn"
                    style={{
                      padding: '14px',
                      fontSize: '1.25rem',
                      justifyContent: 'center',
                      boxShadow: 'var(--shadow-glow-cyan)',
                      borderColor: 'var(--color-cyan)',
                      animation: 'pulse-cyan 2.5s infinite'
                    }}
                  >
                    🚀 RESUME MISSION [SOLO]
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Purging your save-state deletes all credits, upgrades, and progression. Continue?')) {
                        localStorage.removeItem('void_horizon_save_v1');
                        window.location.reload(); // Hard reset to initial state
                      }
                    }}
                    className="btn btn-pink"
                    style={{
                      padding: '10px',
                      fontSize: '0.95rem',
                      justifyContent: 'center',
                      borderColor: 'rgba(255,0,127,0.4)',
                    }}
                  >
                    🆕 START NEW CAMPAIGN [WIPE]
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setMainMenuActive(false)}
                  className="btn"
                  style={{
                    padding: '14px',
                    fontSize: '1.25rem',
                    justifyContent: 'center',
                    boxShadow: 'var(--shadow-glow-cyan)',
                    borderColor: 'var(--color-cyan)',
                    animation: 'pulse-cyan 2.5s infinite'
                  }}
                >
                  🚀 BOOT STATION CORE [SOLO]
                </button>
              )}

              <button
                onClick={() => setMenuMode('multiplayer')}
                className="btn btn-pink"
                style={{
                  padding: '12px',
                  fontSize: '1.15rem',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-glow-pink)'
                }}
              >
                👥 COMPETITIVE MULTIPLAYER [LEADERBOARD]
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button
                  onClick={toggleAudioMute}
                  className={`btn ${state.audioMuted ? 'btn-pink' : 'btn-amber'}`}
                  style={{ padding: '8px 0', justifyContent: 'center', fontSize: '0.9rem' }}
                >
                  {state.audioMuted ? '🔊 Turn Sound On' : '🔇 Mute Sound'}
                </button>

                <button
                  onClick={() => {
                    alert('Academy: Control your robot using WASD or arrow keys. Approach blinking terminals and press E to configure refinery systems, speculate raw metals, scan anomalies, and fly between sectors.');
                  }}
                  className="btn btn-amber"
                  style={{ padding: '8px 0', justifyContent: 'center', fontSize: '0.9rem' }}
                >
                  🎓 Academy Info
                </button>
              </div>

            </div>

            {/* Imports & Exports terminal cards */}
            <div style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              padding: '14px',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                CAPTAIN SAVE-STATE REGISTRY
              </div>
              
              <textarea
                value={saveString}
                onChange={(e) => setSaveString(e.target.value)}
                placeholder="Paste your base64 save-string here to boot save protocols..."
                style={{
                  background: '#06070d',
                  border: '1px solid var(--border-cyan)',
                  borderRadius: '4px',
                  color: 'var(--color-cyan)',
                  fontSize: '0.78rem',
                  fontFamily: 'var(--mono)',
                  padding: '8px',
                  width: '100%',
                  height: '45px',
                  resize: 'none'
                }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  onClick={handleExportSave}
                  className="btn"
                  style={{ fontSize: '0.8rem', padding: '6px 0', justifyContent: 'center' }}
                >
                  📥 Copy Save String
                </button>

                <button
                  onClick={handleImportSave}
                  className="btn btn-amber"
                  style={{ fontSize: '0.8rem', padding: '6px 0', justifyContent: 'center' }}
                >
                  {importStatus === 'success' ? 'SUCCESS!' : importStatus === 'fail' ? 'FAILED!' : '📤 Import Save'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Multiplayer Setup Selection Panel */}
        {menuMode === 'multiplayer' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', justifyContent: 'center', height: '100%' }}>
            <div>
              <span className="badge badge-pink" style={{ fontSize: '0.75rem', letterSpacing: '1.5px' }}>
                COMPETITIVE ARENA SETUP
              </span>
              <h2 className="font-orbitron" style={{
                fontSize: '2rem',
                color: 'var(--color-pink)',
                textShadow: '0 0 15px rgba(255, 0, 127, 0.4)',
                marginTop: '12px'
              }}>
                COMPETITIVE NETWORK
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '6px' }}>
                Race against other captains! Build the ultimate drone fleet, upgrade refinery systems, and climb the real-time leaderboard.
              </p>
            </div>

            {/* Name Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>CAPTAIN IDENTITY SIGN-IN</label>
              <input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter pilot name..."
                maxLength={18}
                style={{
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid var(--border-pink)',
                  borderRadius: '4px',
                  color: 'var(--color-pink)',
                  fontSize: '0.95rem',
                  padding: '10px 14px',
                  fontFamily: 'var(--font-ui)',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '10px' }}>
              {/* Create Card */}
              <div className="panel panel-pink" style={{ padding: '16px', background: 'rgba(9, 13, 24, 0.4)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 className="font-orbitron" style={{ fontSize: '0.95rem', color: '#fff' }}>CREATE ARENA SECTOR</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', minHeight: '40px' }}>
                  Generate a unique room code and host a competitive sector arena for your friends.
                </p>
                <button
                  onClick={handleCreateLobby}
                  className="btn btn-pink"
                  style={{ width: '100%', padding: '10px 0', justifyContent: 'center' }}
                >
                  ➕ Create Link
                </button>
              </div>

              {/* Join Card */}
              <div className="panel" style={{ padding: '16px', background: 'rgba(9, 13, 24, 0.4)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 className="font-orbitron" style={{ fontSize: '0.95rem', color: 'var(--color-cyan)' }}>JOIN COMPETITIVE SECTOR</h3>
                <input
                  value={inputRoomCode}
                  onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                  placeholder="Enter Room Code (e.g. VOID-A1)"
                  style={{
                    background: '#06070d',
                    border: '1px solid var(--border-cyan)',
                    borderRadius: '4px',
                    color: 'var(--color-cyan)',
                    fontSize: '0.8rem',
                    padding: '6px 8px',
                    fontFamily: 'var(--font-ui)',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={handleJoinLobby}
                  disabled={!inputRoomCode.trim()}
                  className="btn"
                  style={{ width: '100%', padding: '10px 0', justifyContent: 'center' }}
                >
                  🔗 Join Link
                </button>
              </div>
            </div>

            <button
              onClick={() => setMenuMode('main')}
              className="btn btn-amber"
              style={{ padding: '10px 0', justifyContent: 'center', marginTop: '10px', fontSize: '0.95rem' }}
            >
              ← Back to Main Menu
            </button>
          </div>
        )}

        {/* Multiplayer Lobby Room Screen */}
        {menuMode === 'lobby' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', justifyContent: 'space-between', height: '100%' }}>
            <div>
              <span className="badge badge-pink" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>
                COMPETITIVE SECTOR LINK ACTIVE
              </span>
              <h2 className="font-orbitron" style={{
                fontSize: '2.4rem',
                color: 'var(--color-pink)',
                textShadow: '0 0 15px rgba(255, 0, 127, 0.45)',
                marginTop: '8px'
              }}>
                SECTOR: {state.multiplayer.roomCode}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Share this sector code with friends to compete. Tracks all credits, active locations, and drone statistics in real-time.
              </p>
            </div>

            {/* Players list */}
            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.5px' }}>
                CONNECTED CAPTAINS ({state.multiplayer.players.length}/4)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {state.multiplayer.players.map(player => (
                  <div key={player.id} style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: player.color,
                      boxShadow: `0 0 8px ${player.color}`,
                      display: 'inline-block'
                    }} />
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {player.name} {player.name === state.multiplayer.playerName && '(You)'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat and logs */}
            <div style={{ display: 'grid', gridTemplateRows: '1.2fr 1fr', gap: '14px', flexGrow: 1, minHeight: '280px', margin: '10px 0' }}>
              {/* Chat Feed */}
              <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)', padding: '10px', height: '180px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>COMMS DECK CHAT</div>
                <div style={{ flexGrow: 1, overflowY: 'auto', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '4px' }}>
                  {state.multiplayer.chatMessages.map(msg => (
                    <div key={msg.id}>
                      <span style={{ color: msg.color, fontWeight: 700 }}>{msg.sender}:</span>{' '}
                      <span style={{ color: '#fff' }}>{msg.text}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat(); }}
                    placeholder="Type a transmission..."
                    style={{
                      flexGrow: 1,
                      background: '#06070d',
                      border: '1px solid var(--border-pink)',
                      borderRadius: '4px',
                      color: '#fff',
                      fontSize: '0.8rem',
                      padding: '4px 8px',
                      outline: 'none'
                    }}
                  />
                  <button onClick={handleSendChat} className="btn btn-pink" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                    Send
                  </button>
                </div>
              </div>

              {/* Log Feed */}
              <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)', padding: '10px', height: '120px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>SECTOR ACTIVITY LOG</div>
                <div style={{ flexGrow: 1, overflowY: 'auto', fontSize: '0.75rem', color: 'var(--color-cyan)', display: 'flex', flexDirection: 'column', gap: '3px', paddingRight: '4px' }}>
                  {state.multiplayer.activityLog.map(log => (
                    <div key={log.id} style={{ opacity: 0.85 }}>
                      {log.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Launch / Cancel buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setMainMenuActive(false)}
                className="btn"
                style={{
                  flexGrow: 1,
                  padding: '12px',
                  fontSize: '1.2rem',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-glow-cyan)',
                  borderColor: 'var(--color-cyan)',
                  animation: 'pulse-cyan 2.5s infinite'
                }}
              >
                🚀 LAUNCH COMPETITIVE RIVALRY
              </button>
              <button
                onClick={handleLeaveLobby}
                className="btn btn-pink"
                style={{ fontSize: '1rem', padding: '12px 20px', justifyContent: 'center' }}
              >
                Leave
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Right Column: Dynamic Solar System Canvas */}
      <section style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#040509'
      }}>
        {/* Glowing planetary telemetry radar Canvas */}
        <canvas
          ref={canvasRef}
          width={520}
          height={520}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            borderRadius: '50%',
            border: '2px solid rgba(0, 242, 254, 0.03)',
            boxShadow: '0 0 100px rgba(0, 242, 254, 0.02)'
          }}
        />

        {/* Ambient watermark details */}
        <div style={{
          position: 'absolute',
          bottom: '24px',
          right: '24px',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          letterSpacing: '1px'
        }}>
          ORBITAL TRANSIT RADAR SCAN ACTIVE // LY-404
        </div>
      </section>

    </div>
  );
};
