import { useEffect } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { StatusHeader } from './components/StatusHeader';
import { ShipInterior } from './components/ShipInterior';
import { RefineryDeck } from './components/RefineryDeck';
import { MarketPanel } from './components/MarketPanel';
import { RadarCanvas } from './components/RadarCanvas';
import { TechLab } from './components/TechLab';
import { Datalogs } from './components/Datalogs';
import { Mailroom } from './components/Mailroom';
import { BridgeDeck } from './components/BridgeDeck';
import { AchievementToast } from './components/AchievementToast';
import { MainMenu } from './components/MainMenu';
import { TutorialOverlay } from './components/TutorialOverlay';
import { CoopStatusPanel } from './components/CoopStatusPanel';

function AppContent() {
  const { state, setActiveTerminal } = useGame();

  // Escape key handler to close active terminals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state.activeTerminal) {
        setActiveTerminal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.activeTerminal, setActiveTerminal]);

  const renderOverlayContent = () => {
    switch (state.activeTerminal) {
      case 'bridge':
        return <BridgeDeck />;
      case 'refinery':
        return <RefineryDeck />;
      case 'exchange':
        return <MarketPanel />;
      case 'scanner':
        return <RadarCanvas />;
      case 'techLab':
        return <TechLab />;
      case 'mail':
        return <Mailroom />;
      case 'achievements':
        return <Datalogs />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Cinematic Main Menu (shown on launch) */}
      {state.isMainMenuActive && <MainMenu />}

      {/* Real-time Status ticker header */}
      <StatusHeader />

      {/* Game Viewport Container */}
      <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
        {/* 2D Space Ship Interior Viewport */}
        <ShipInterior />

        {/* Fullscreen terminal interface overlay */}
        {state.activeTerminal && (
          <div className="panel-overlay">
            <button 
              className="btn btn-pink back-to-ship-btn" 
              onClick={() => setActiveTerminal(null)}
            >
              ← BACK TO SHIP <kbd>ESC</kbd>
            </button>
            <div style={{ width: '100%', height: '100%', marginTop: '30px' }}>
              {renderOverlayContent()}
            </div>
          </div>
        )}
      </div>

      {/* Guided Academy Tutorial Overlay */}
      {!state.isMainMenuActive && <TutorialOverlay />}

      {/* Steam achievement notifications popups */}
      <AchievementToast />

      {/* Multiplayer Co-op drawer feed */}
      <CoopStatusPanel />
    </>
  );
}

function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}

export default App;
