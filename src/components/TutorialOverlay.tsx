import React from 'react';
import { useGame } from '../context/GameContext';

export const TutorialOverlay: React.FC = () => {
  const { state, advanceTutorial, skipTutorial } = useGame();
  
  const step = state.tutorialStep;
  const isDone = state.hasCompletedTutorial || step === 0;

  if (isDone) return null;

  // Step configs
  const tutorialSteps = [
    {
      title: 'Phase 1: MANUAL EXCAVATION PROTOCOLS',
      desc: 'Commander, welcome to the Void Horizon bridge! First, let\'s manually gather minerals. Go to the Refinery Deck, click mine Ore, and click inside the rotating asteroid canvas target to manual-extract at least 5 Iron Ore.',
      condition: 'Collect 5 units of raw Iron Ore',
      isMet: state.resources.ironOre.amount >= 5,
      hint: `Current stock: ${Math.floor(state.resources.ironOre.amount)} / 5`
    },
    {
      title: 'Phase 2: AUTOMATING EXTRACTION FLIGHTS',
      desc: 'Manual labor is too slow for commercial space grids. Let\'s automate. Head to the Automated Drone Control card on the right, and acquire your first autonomous Ore Extractor Drone (₵50).',
      condition: 'Purchase 1 Ore Extractor Drone',
      isMet: state.drones.mining.count >= 1,
      hint: `Drones owned: ${state.drones.mining.count} / 1`
    },
    {
      title: 'Phase 3: CONVERGING INDUSTRY REFACTORING',
      desc: 'Refineries process raw ore into highly valuable Alloys. Expand your block by purchasing 1 Steel Alloy Foundry refinery under the Orbital Refineries grid (₵200) and click BOOT CORE to activate refinery power loops!',
      condition: 'Build and activate 1 Steel Alloy Foundry',
      isMet: state.refineries.steel.count >= 1 && state.refineries.steel.active,
      hint: `Foundry Status: ${state.refineries.steel.count} built | Core ${state.refineries.steel.active ? 'ACTIVE' : 'OFFLINE'}`
    },
    {
      title: 'Phase 4: GALACTIC SPECULATION EXCHANGE',
      desc: 'Let\'s convert our inventory into credits! Click the Galactic Exchange tab on the navigation sidebar, click on Steel Plates, and sell at least 1 plate under your trade orders panel.',
      condition: 'Complete a trade on the Exchange',
      isMet: state.stats.totalCreditsEarned > 250 || state.resources.steelPlates.amount > 0, // checks credit gain
      hint: `Revenues gathered: ₵${state.stats.totalCreditsEarned}`
    },
    {
      title: 'Phase 5: LONG-RANGE SCANNER SECTOR',
      desc: 'Final training step, Commander. Access the Scanner Room tab on your sidebar and click TRIGGER SWEEP to lock telemetry coordinates. Click on one of the glowing beacons on the radar console to lock scanner signals and resolve the choice outcome!',
      condition: 'Resolve 1 exploration sector scan beacon',
      isMet: state.stats.totalNodesExplored >= 1 || state.exploration.scannedNodes.length >= 1,
      hint: `Sectors investigated: ${state.stats.totalNodesExplored} / 1`
    }
  ];

  const current = tutorialSteps[step - 1];
  if (!current) return null;

  return (
    <div
      className="panel font-rajdhani"
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '264px', // fits perfectly next to sidebar
        right: '24px',
        background: 'rgba(9, 13, 24, 0.95)',
        border: `1.5px solid ${current.isMet ? 'var(--color-green)' : 'var(--color-cyan)'}`,
        boxShadow: current.isMet 
          ? 'var(--shadow-glow-green), 0 8px 30px rgba(0,0,0,0.6)' 
          : 'var(--shadow-glow-cyan), 0 8px 30px rgba(0,0,0,0.6)',
        zIndex: 500,
        padding: '16px 24px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px',
        animation: current.isMet ? 'none' : 'pulse-cyan 3s infinite',
        backdropFilter: 'blur(16px)'
      }}
    >
      {/* Bot Co-Pilot Avatar */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexGrow: 1 }}>
        <div style={{
          fontSize: '2.5rem',
          background: 'rgba(0, 242, 254, 0.08)',
          border: `1px solid ${current.isMet ? 'var(--color-green)' : 'var(--color-cyan)'}`,
          width: '60px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          boxShadow: current.isMet ? 'inset 0 0 12px rgba(57,255,20,0.1)' : 'inset 0 0 12px rgba(0,242,254,0.1)',
          flexShrink: 0
        }}>
          {current.isMet ? '🤖' : '👩‍✈️'}
        </div>

        <div>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: current.isMet ? 'var(--color-green)' : 'var(--color-cyan)',
            letterSpacing: '1.5px',
            textTransform: 'uppercase'
          }}>
            🛰️ CO-PILOT HUD AI: {current.title}
          </div>
          <p style={{
            fontSize: '0.92rem',
            color: '#fff',
            marginTop: '4px',
            lineHeight: '1.35',
            maxWidth: '750px'
          }}>
            {current.desc}
          </p>
          
          {/* Target indicators */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginTop: '8px',
            fontSize: '0.8rem'
          }}>
            <span style={{ color: 'var(--text-secondary)' }}>Directive Status:</span>
            <span className="badge badge-amber" style={{
              backgroundColor: current.isMet ? 'rgba(57, 255, 20, 0.1)' : 'rgba(255, 184, 0, 0.1)',
              borderColor: current.isMet ? 'var(--color-green)' : 'rgba(255, 184, 0, 0.5)',
              color: current.isMet ? 'var(--color-green)' : 'var(--color-amber)'
            }}>
              {current.condition} ({current.hint})
            </span>
          </div>
        </div>
      </div>

      {/* Control Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0, width: '150px' }}>
        <button
          onClick={advanceTutorial}
          disabled={!current.isMet}
          className={`btn ${current.isMet ? 'pulse-glow-cyan' : ''}`}
          style={{
            width: '100%',
            padding: '10px 0',
            justifyContent: 'center',
            fontSize: '0.9rem',
            borderColor: current.isMet ? 'var(--color-green)' : 'var(--text-muted)',
            background: current.isMet ? 'rgba(57, 255, 20, 0.15)' : ''
          }}
        >
          {step === 5 ? '🎓 GRADUATE' : '👉 NEXT PHASE'}
        </button>

        <button
          onClick={skipTutorial}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '0.78rem',
            cursor: 'pointer',
            textAlign: 'center',
            textDecoration: 'underline'
          }}
        >
          Skip Academy Guide
        </button>
      </div>

    </div>
  );
};
