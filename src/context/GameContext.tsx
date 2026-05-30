import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { GameState, ResourceType, ResourceMarket, DroneData, RefineryData, UpgradeData, Achievement, ExplorationNode, MarketContract, AutoTradeConfig, MailMessage, ActivePriceModification, TravelLocation } from '../types';
import { audioSynth } from '../utils/audioSynth';
import Paho from 'paho-mqtt';

const SAVE_KEY = 'void_horizon_save_v1';

// Initial state structures
const createInitialState = (): GameState => {
  const baseMarket = (name: string, basePrice: number, volatility: number, category: 'raw' | 'refined' | 'exotic'): ResourceMarket => ({
    name,
    basePrice,
    currentPrice: basePrice,
    volatility,
    category,
    history: Array(15).fill(basePrice)
  });

  const baseDrone = (name: string, resourceProduced: ResourceType, cost: number, efficiency: number): DroneData => ({
    name,
    resourceProduced,
    count: 0,
    cost,
    efficiency
  });

  const baseRefinery = (name: string, input: ResourceType, output: ResourceType, inputRatio: number, outputRatio: number, energy: number, cost: number): RefineryData => ({
    name,
    count: 0,
    cost,
    active: false,
    efficiency: 1.0,
    inputResource: input,
    outputResource: output,
    inputRatio,
    outputRatio,
    energyConsumption: energy
  });

  const baseUpgrade = (id: string, name: string, description: string, cost: number, maxLevel: number, category: UpgradeData['category']): UpgradeData => ({
    id,
    name,
    description,
    cost,
    level: 0,
    maxLevel,
    multiplier: 1.25,
    category
  });

  const achievementsList: Achievement[] = [
    { id: 'first_mine', name: 'Manual Labor', description: 'Mine your first piece of raw ore manually.', unlocked: false, icon: '⛏️' },
    { id: 'buy_drone', name: 'Automation Era', description: 'Acquire your first autonomous mining drone.', unlocked: false, icon: '🤖' },
    { id: 'build_refinery', name: 'Industrialist', description: 'Establish your first refinery block.', unlocked: false, icon: '🏭' },
    { id: 'market_deal', name: 'Capitalist', description: 'Complete a trading transaction on the exchange.', unlocked: false, icon: '📈' },
    { id: 'first_exploration', name: 'Cosmic Explorer', description: 'Successfully complete a sector scan encounter.', unlocked: false, icon: '🚀' },
    { id: 'rich_miner', name: 'Station Tycoon', description: 'Amass 10,000 credits in your reserve.', unlocked: false, icon: '💰' },
    { id: 'warp_overdrive', name: 'Tactical Shift', description: 'Activate Overdrive capabilities.', unlocked: false, icon: '⚡' },
    { id: 'dark_matter_finder', name: 'Abyssal Harvester', description: 'Obtain Dark Matter from an anomaly.', unlocked: false, icon: '🔮' }
  ];

  return {
    credits: 250,
    energy: {
      max: 10,
      production: 10,
      consumption: 0
    },
    resources: {
      ironOre: { amount: 0, perSecond: 0 },
      heliumGas: { amount: 0, perSecond: 0 },
      plasmaCrystals: { amount: 0, perSecond: 0 },
      steelPlates: { amount: 0, perSecond: 0 },
      fuelCells: { amount: 0, perSecond: 0 },
      hyperPlasma: { amount: 0, perSecond: 0 },
      darkMatter: { amount: 0, perSecond: 0 }
    },
    drones: {
      mining: baseDrone('Ore Extractor Drone', 'ironOre', 50, 0.2),
      gas: baseDrone('Siphon Gas Drone', 'heliumGas', 150, 0.1),
      plasma: baseDrone('Charged Plasma Drone', 'plasmaCrystals', 500, 0.05)
    },
    refineries: {
      steel: baseRefinery('Steel Alloy Foundry', 'ironOre', 'steelPlates', 2, 1, 1, 200),
      fuel: baseRefinery('H3 Condensation Matrix', 'heliumGas', 'fuelCells', 2, 1, 2, 500),
      plasma: baseRefinery('Hyper-Plasma Reactor', 'plasmaCrystals', 'hyperPlasma', 2, 1, 4, 1200)
    },
    upgrades: {
      laserPower: baseUpgrade('laserPower', 'Excavation Beam', 'Increases active manual mining yield by +1 per click', 100, 999999, 'mining'),
      cargoCapacity: baseUpgrade('cargoCapacity', 'Cargo Expansion', 'Increases drone passive collection rate by +25%', 150, 999999, 'cargo'),
      radarPower: baseUpgrade('radarPower', 'Deep Sensor Grid', 'Increases sector scanning sweep speed by +40%', 250, 999999, 'radar'),
      energyOutput: baseUpgrade('energyOutput', 'Fusion Grid Injectors', 'Increases reactor power capacity by +5 max energy', 300, 999999, 'special')
    },
    market: {
      ironOre: baseMarket('Iron Ore', 3, 0.06, 'raw'),
      heliumGas: baseMarket('Helium-3 Gas', 8, 0.09, 'raw'),
      plasmaCrystals: baseMarket('Plasma Crystals', 20, 0.14, 'raw'),
      steelPlates: baseMarket('Steel Plates', 12, 0.05, 'refined'),
      fuelCells: baseMarket('Helium Fuel Cells', 32, 0.07, 'refined'),
      hyperPlasma: baseMarket('Hyper-Plasma', 85, 0.11, 'refined'),
      darkMatter: baseMarket('Dark Matter', 450, 0.20, 'exotic')
    },
    contracts: [],
    exploration: {
      scanning: false,
      scanProgress: 0,
      scannedNodes: [],
      activeNode: null,
      currentOutcome: null
    },
    achievements: achievementsList,
    overdrive: {
      unlocked: false,
      active: false,
      timeLeft: 0,
      cooldownLeft: 0,
      duration: 15,
      cooldown: 60
    },
    stats: {
      totalCreditsEarned: 250,
      totalOreMined: 0,
      totalRefinedProduced: 0,
      totalContractsCompleted: 0,
      totalNodesExplored: 0,
      playtime: 0
    },
    lastSaved: Date.now(),
    isMainMenuActive: true,
    tutorialStep: 1,
    hasCompletedTutorial: false,
    audioMuted: false,
    autoTrades: {
      ironOre: { buyActive: false, buyThreshold: 2, buyAmount: 10, sellActive: false, sellThreshold: 6, sellAmount: 10 },
      heliumGas: { buyActive: false, buyThreshold: 5, buyAmount: 5, sellActive: false, sellThreshold: 14, sellAmount: 5 },
      plasmaCrystals: { buyActive: false, buyThreshold: 12, buyAmount: 2, sellActive: false, sellThreshold: 32, sellAmount: 2 },
      steelPlates: { buyActive: false, buyThreshold: 8, buyAmount: 5, sellActive: false, sellThreshold: 20, sellAmount: 5 },
      fuelCells: { buyActive: false, buyThreshold: 20, buyAmount: 3, sellActive: false, sellThreshold: 50, sellAmount: 3 },
      hyperPlasma: { buyActive: false, buyThreshold: 50, buyAmount: 2, sellActive: false, sellThreshold: 120, sellAmount: 2 },
      darkMatter: { buyActive: false, buyThreshold: 300, buyAmount: 1, sellActive: false, sellThreshold: 750, sellAmount: 1 }
    },
    mail: [
      {
        id: 'mail_welcome',
        sender: 'Station AI Command',
        subject: 'Operational Directives',
        body: 'Welcome to your deep-space operations command deck, Captain. Build drones, mine asteroids, trade on the exchange, and use this terminal to contact interstellar entities for price adjustments.',
        timeReceived: 0,
        read: false,
        type: 'neutral'
      }
    ],
    activePriceModifications: [],
    currentLocation: 'core',
    traveling: false,
    travelTimeLeft: 0,
    playerX: 400,
    activeTerminal: null,
    multiplayer: {
      active: false,
      roomCode: null,
      playerName: '',
      players: [],
      activityLog: [],
      chatMessages: []
    }
  };
};

/** Merge a parsed save onto defaults so older/partial saves cannot crash the UI. */
const mergeSaveWithDefaults = (saved: Partial<GameState>): GameState => {
  const defaults = createInitialState();
  return {
    ...defaults,
    ...saved,
    energy: { ...defaults.energy, ...saved.energy },
    resources: { ...defaults.resources, ...saved.resources },
    drones: { ...defaults.drones, ...saved.drones },
    refineries: { ...defaults.refineries, ...saved.refineries },
    upgrades: { ...defaults.upgrades, ...saved.upgrades },
    market: { ...defaults.market, ...saved.market },
    exploration: { ...defaults.exploration, ...saved.exploration },
    overdrive: { ...defaults.overdrive, ...saved.overdrive },
    stats: { ...defaults.stats, ...saved.stats },
    achievements: saved.achievements?.length ? saved.achievements : defaults.achievements,
    autoTrades: saved.autoTrades ?? defaults.autoTrades,
    mail: saved.mail?.length ? saved.mail : defaults.mail,
    activePriceModifications: saved.activePriceModifications ?? defaults.activePriceModifications,
    multiplayer: defaults.multiplayer,
    isMainMenuActive: true,
    activeTerminal: null,
  };
};

interface GameContextType {
  state: GameState;
  mineManually: (type: ResourceType) => void;
  purchaseDrone: (type: keyof GameState['drones']) => void;
  purchaseRefinery: (type: keyof GameState['refineries']) => void;
  toggleRefinery: (type: keyof GameState['refineries']) => void;
  purchaseUpgrade: (upgradeId: string) => void;
  buyResource: (type: ResourceType, amount: number) => void;
  sellResource: (type: ResourceType, amount: number) => void;
  fulfillContract: (contractId: string) => void;
  startScanning: () => void;
  selectNode: (node: ExplorationNode) => void;
  resolveNodeChoice: (optionIndex: number) => void;
  closeOutcome: () => void;
  activateOverdrive: () => void;
  unlockOverdrive: () => void;
  resetGame: () => void;
  triggerAchievementToast: (name: string, desc: string, icon: string) => void;
  activeToast: { name: string; desc: string; icon: string } | null;
  setMainMenuActive: (active: boolean) => void;
  toggleAudioMute: () => void;
  advanceTutorial: () => void;
  skipTutorial: () => void;
  exportSave: () => string;
  importSave: (saveStr: string) => boolean;
  configureAutoTrade: (type: ResourceType, config: Partial<AutoTradeConfig>) => void;
  readMail: (mailId: string) => void;
  hireNPC: (mailId: string) => void;
  deleteMail: (mailId: string) => void;
  travelTo: (location: TravelLocation) => void;
  buyItemFromShop: (itemId: string, cost: number) => void;
  sellDarkMatterToApex: () => void;
  setActiveTerminal: (terminal: string | null) => void;
  createLobby: (playerName: string) => void;
  joinLobby: (roomCode: string, playerName: string) => boolean;
  leaveLobby: () => void;
  sendChatMessage: (text: string) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<GameState>(createInitialState());
  const [activeToast, setActiveToast] = useState<{ name: string; desc: string; icon: string } | null>(null);

  // We need a ref to access latest state in interval
  const stateRef = useRef(state);
  stateRef.current = state;

  const channelRef = useRef<BroadcastChannel | null>(null);
  const mqttClientRef = useRef<Paho.Client | null>(null);
  const mqttConnectedRef = useRef(false);
  const mqttClientIdRef = useRef('vh_' + Math.random().toString(36).substr(2, 8));

  // Helper to send messages over both Local BroadcastChannel and remote MQTT
  const broadcastMessage = useCallback((msg: { type: string; roomCode: string; payload: any }) => {
    // 1. Local tabs
    if (channelRef.current) {
      channelRef.current.postMessage(msg);
    }
    // 2. Remote players via MQTT
    if (mqttClientRef.current && mqttConnectedRef.current) {
      const topic = `void_horizon/rooms/${msg.roomCode}/events`;
      const mqttMsg = new Paho.Message(JSON.stringify({
        ...msg,
        _senderId: mqttClientIdRef.current  // Prevent echo
      }));
      mqttMsg.destinationName = topic;
      try {
        mqttClientRef.current.send(mqttMsg);
      } catch (err) {
        console.warn('MQTT send failed:', err);
      }
    }
  }, []);

  const logTransactionShared = (text: string, currentCredits: number) => {
    const logEntry = {
      id: 'log_' + Date.now() + Math.random().toString(36).substr(2, 4),
      text,
      time: Date.now()
    };
    setState(prev => {
      if (!prev.multiplayer.active) return prev;
      return {
        ...prev,
        multiplayer: {
          ...prev.multiplayer,
          activityLog: [logEntry, ...prev.multiplayer.activityLog].slice(0, 50)
        }
      };
    });
    const s = stateRef.current;
    if (s.multiplayer.active && s.multiplayer.roomCode) {
      broadcastMessage({
        type: 'TRANSACTION',
        roomCode: s.multiplayer.roomCode,
        payload: { text, credits: currentCredits }
      });
    }
  };

  // Centralized message handler for both Local and Remote networks
  const handleIncomingMessage = useCallback((eventData: { type: string; roomCode: string; payload: any }) => {
    const { type, roomCode, payload } = eventData;
    const currentSession = stateRef.current.multiplayer;
    
    if (!currentSession.active || currentSession.roomCode !== roomCode) {
      return;
    }

    switch (type) {
      case 'PLAYER_JOIN': {
        setState(prev => {
          const exists = prev.multiplayer.players.some(p => p.id === payload.id);
          
          const newPlayer = {
            ...payload,
            credits: payload.credits ?? 0,
            dronesCount: payload.dronesCount ?? 0,
            currentLocation: payload.currentLocation ?? 'core'
          };

          const updatedPlayers = exists 
            ? prev.multiplayer.players.map(p => p.id === payload.id ? { ...p, ...newPlayer } : p)
            : [...prev.multiplayer.players, newPlayer];
            
          const logEntry = {
            id: 'log_' + Date.now() + Math.random().toString(36).substr(2, 4),
            text: `🛰️ Captain ${payload.name} entered the competitive grid.`,
            time: Date.now()
          };

          // Send heartbeat back to let the joiner know we exist and send them our current details
          const myId = prev.multiplayer.players.find(p => p.name === prev.multiplayer.playerName)?.id || 'player_host';
          const mySelf = {
            id: myId,
            name: prev.multiplayer.playerName,
            isBot: false,
            color: prev.multiplayer.players.find(p => p.id === myId)?.color || '#00f2fe',
            credits: prev.credits,
            dronesCount: Object.values(prev.drones).reduce((acc, d) => acc + d.count, 0),
            currentLocation: prev.currentLocation || 'core'
          };

          broadcastMessage({
            type: 'HEARTBEAT',
            roomCode,
            payload: {
              players: [mySelf]
            }
          });

          return {
            ...prev,
            multiplayer: {
              ...prev.multiplayer,
              players: updatedPlayers,
              activityLog: exists ? prev.multiplayer.activityLog : [logEntry, ...prev.multiplayer.activityLog].slice(0, 50)
            }
          };
        });
        break;
      }

      case 'HEARTBEAT': {
        setState(prev => {
          const mergedPlayers = [...prev.multiplayer.players];
          payload.players.forEach((p: any) => {
            const idx = mergedPlayers.findIndex(mp => mp.id === p.id);
            if (idx !== -1) {
              mergedPlayers[idx] = { ...mergedPlayers[idx], ...p };
            } else {
              mergedPlayers.push({
                ...p,
                credits: p.credits ?? 0,
                dronesCount: p.dronesCount ?? 0,
                currentLocation: p.currentLocation ?? 'core'
              });
            }
          });

          return {
            ...prev,
            multiplayer: {
              ...prev.multiplayer,
              players: mergedPlayers
            }
          };
        });
        break;
      }

      case 'PLAYER_STATS_UPDATE': {
        setState(prev => {
          const mergedPlayers = prev.multiplayer.players.map(p => {
            if (p.id === payload.id) {
              return {
                ...p,
                credits: payload.credits,
                dronesCount: payload.dronesCount,
                currentLocation: payload.currentLocation
              };
            }
            return p;
          });

          if (!mergedPlayers.some(p => p.id === payload.id)) {
            mergedPlayers.push({
              id: payload.id,
              name: payload.name,
              isBot: false,
              color: payload.color,
              credits: payload.credits,
              dronesCount: payload.dronesCount,
              currentLocation: payload.currentLocation
            });
          }

          return {
            ...prev,
            multiplayer: {
              ...prev.multiplayer,
              players: mergedPlayers
            }
          };
        });
        break;
      }

      case 'TRANSACTION': {
        setState(prev => {
          const logEntry = {
            id: 'log_' + Date.now() + Math.random().toString(36).substr(2, 4),
            text: payload.text,
            time: Date.now()
          };
          return {
            ...prev,
            multiplayer: {
              ...prev.multiplayer,
              activityLog: [logEntry, ...prev.multiplayer.activityLog].slice(0, 50)
            }
          };
        });
        break;
      }

      case 'CHAT_MSG': {
        setState(prev => {
          const chatMsg = {
            id: 'chat_' + Date.now() + Math.random().toString(36).substr(2, 4),
            sender: payload.sender,
            text: payload.text,
            time: Date.now(),
            color: payload.color
          };
          return {
            ...prev,
            multiplayer: {
              ...prev.multiplayer,
              chatMessages: [...prev.multiplayer.chatMessages, chatMsg].slice(-100)
            }
          };
        });
        break;
      }

      case 'PLAYER_LEAVE': {
        setState(prev => {
          const logEntry = {
            id: 'log_' + Date.now() + Math.random().toString(36).substr(2, 4),
            text: `⚠️ Captain ${payload.name} has left the competitive grid.`,
            time: Date.now()
          };
          return {
            ...prev,
            multiplayer: {
              ...prev.multiplayer,
              players: prev.multiplayer.players.filter(p => p.id !== payload.id),
              activityLog: [logEntry, ...prev.multiplayer.activityLog].slice(0, 50)
            }
          };
        });
        break;
      }
    }
  }, [broadcastMessage]);

  // 1. BroadcastChannel Communication Setup
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('void_horizon_coop');
      channelRef.current = channel;

      channel.onmessage = (event) => {
        handleIncomingMessage(event.data);
      };

      return () => {
        channel.close();
      };
    }
  }, [handleIncomingMessage]);

  // 2. MQTT Broker Signaling (HiveMQ free public broker — works cross-device on static hosting!)
  useEffect(() => {
    const mp = stateRef.current.multiplayer;
    if (!mp.active || !mp.roomCode) {
      // Disconnect existing client if lobby is left
      if (mqttClientRef.current && mqttConnectedRef.current) {
        try {
          mqttClientRef.current.disconnect();
        } catch (_) { /* ignore */ }
        mqttClientRef.current = null;
        mqttConnectedRef.current = false;
      }
      return;
    }

    const roomCode = mp.roomCode;
    const topic = `void_horizon/rooms/${roomCode}/events`;
    const clientId = mqttClientIdRef.current;

    // Create Paho MQTT client pointing to HiveMQ's free public secure WebSocket broker
    const client = new Paho.Client(
      'broker.hivemq.com',  // Host
      8884,                 // Port (secure WebSockets / wss)
      '/mqtt',              // Path
      clientId              // Unique Client ID
    );

    mqttClientRef.current = client;

    client.onConnectionLost = (responseObject) => {
      mqttConnectedRef.current = false;
      console.log('MQTT disconnected:', responseObject.errorMessage);
      // Auto-reconnect after 3 seconds if still in a lobby
      setTimeout(() => {
        const currentMp = stateRef.current.multiplayer;
        if (currentMp.active && currentMp.roomCode === roomCode && !mqttConnectedRef.current) {
          try {
            client.connect({
              onSuccess: onConnect,
              onFailure: onFailure,
              useSSL: true,
              timeout: 10,
              keepAliveInterval: 30
            });
          } catch (_) { /* ignore */ }
        }
      }, 3000);
    };

    client.onMessageArrived = (message: Paho.Message) => {
      try {
        const data = JSON.parse(message.payloadString);
        // Ignore our own messages (echo prevention)
        if (data._senderId === clientId) return;
        handleIncomingMessage(data);
      } catch (err) {
        console.error('MQTT message parse error:', err);
      }
    };

    const onConnect = () => {
      mqttConnectedRef.current = true;
      console.log(`Connected to MQTT broker for room ${roomCode}!`);
      
      // Subscribe to the room topic
      client.subscribe(topic);

      // Announce our join to all remote peers
      const s = stateRef.current;
      const myId = s.multiplayer.players[0]?.id || 'player_host';
      const mySelf = {
        id: myId,
        name: s.multiplayer.playerName,
        isBot: false,
        color: s.multiplayer.players[0]?.color || '#00f2fe',
        credits: s.credits,
        dronesCount: Object.values(s.drones).reduce((acc, d) => acc + d.count, 0),
        currentLocation: s.currentLocation || 'core'
      };

      const joinMsg = new Paho.Message(JSON.stringify({
        type: 'PLAYER_JOIN',
        roomCode,
        payload: mySelf,
        _senderId: clientId
      }));
      joinMsg.destinationName = topic;
      client.send(joinMsg);
    };

    const onFailure = (err: any) => {
      console.error('MQTT connection failed:', err);
      mqttConnectedRef.current = false;
    };

    client.connect({
      onSuccess: onConnect,
      onFailure: onFailure,
      useSSL: true,
      timeout: 10,
      keepAliveInterval: 30
    });

    return () => {
      try {
        if (mqttConnectedRef.current) {
          client.unsubscribe(topic);
          client.disconnect();
        }
      } catch (_) { /* ignore */ }
      mqttClientRef.current = null;
      mqttConnectedRef.current = false;
    };
  }, [state.multiplayer.active, state.multiplayer.roomCode, handleIncomingMessage]);

  // 3. Competitive stats periodic broadcast
  useEffect(() => {
    const mp = state.multiplayer;
    if (!mp.active || !mp.roomCode) return;

    const interval = setInterval(() => {
      const s = stateRef.current;
      const myId = s.multiplayer.players.find(p => p.name === s.multiplayer.playerName)?.id || 'player_host';
      const myPlayer = s.multiplayer.players.find(p => p.id === myId);

      broadcastMessage({
        type: 'PLAYER_STATS_UPDATE',
        roomCode: mp.roomCode!,
        payload: {
          id: myId,
          name: mp.playerName,
          color: myPlayer?.color || '#00f2fe',
          credits: s.credits,
          dronesCount: Object.values(s.drones).reduce((acc, d) => acc + d.count, 0),
          currentLocation: s.currentLocation || 'core'
        }
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [state.multiplayer.active, state.multiplayer.roomCode, broadcastMessage]);

  // Custom visual toast launcher
  const triggerAchievementToast = (name: string, desc: string, icon: string) => {
    setActiveToast({ name, desc, icon });
    // Sound FX or vibration could trigger here
    setTimeout(() => {
      setActiveToast(null);
    }, 4500);
  };

  // Helper to check achievements
  const checkAchievements = (s: GameState, updater: React.Dispatch<React.SetStateAction<GameState>>) => {
    let changed = false;
    const updatedAchievements = s.achievements.map(ach => {
      if (ach.unlocked) return ach;
      
      let unlock = false;
      if (ach.id === 'first_mine' && s.stats.totalOreMined >= 1) unlock = true;
      if (ach.id === 'buy_drone' && (s.drones.mining.count + s.drones.gas.count + s.drones.plasma.count) >= 1) unlock = true;
      if (ach.id === 'build_refinery' && (s.refineries.steel.count + s.refineries.fuel.count + s.refineries.plasma.count) >= 1) unlock = true;
      if (ach.id === 'rich_miner' && s.credits >= 10000) unlock = true;
      if (ach.id === 'warp_overdrive' && s.overdrive.unlocked) unlock = true;
      if (ach.id === 'first_exploration' && s.stats.totalNodesExplored >= 1) unlock = true;
      if (ach.id === 'dark_matter_finder' && s.resources.darkMatter.amount >= 1) unlock = true;
      if (ach.id === 'market_deal' && s.stats.totalCreditsEarned > 250) unlock = true;

      if (unlock) {
        changed = true;
        triggerAchievementToast(ach.name, ach.description, ach.icon);
        audioSynth.playUnlockSound();
        return { ...ach, unlocked: true };
      }
      return ach;
    });

    if (changed) {
      updater(prev => ({
        ...prev,
        achievements: updatedAchievements
      }));
    }
  };

  // 1. Manual Mining Click Handler
  const mineManually = (type: ResourceType) => {
    if (type === 'heliumGas' && state.upgrades.laserPower.level < 3) return;
    if (type === 'plasmaCrystals' && state.upgrades.laserPower.level < 6) return;

    audioSynth.playLaserSound();
    setState(prev => {
      if (type === 'heliumGas' && prev.upgrades.laserPower.level < 3) return prev;
      if (type === 'plasmaCrystals' && prev.upgrades.laserPower.level < 6) return prev;

      const upgradeMultiplier = 1 + (prev.upgrades.laserPower.level);
      const yieldAmount = type === 'ironOre' ? upgradeMultiplier : 1;

      const updatedRes = { ...prev.resources };
      updatedRes[type] = {
        ...updatedRes[type],
        amount: updatedRes[type].amount + yieldAmount
      };

      const updatedStats = {
        ...prev.stats,
        totalOreMined: prev.stats.totalOreMined + yieldAmount
      };

      const nextState = {
        ...prev,
        resources: updatedRes,
        stats: updatedStats
      };

      setTimeout(() => checkAchievements(nextState, setState), 10);
      return nextState;
    });
  };

  // 2. Buy Drone Handler
  const purchaseDrone = (type: keyof GameState['drones']) => {
    setState(prev => {
      const drone = prev.drones[type];
      if (prev.credits < drone.cost) return prev;

      audioSynth.playChirpSound();

      const updatedDrones = { ...prev.drones };
      updatedDrones[type] = {
        ...drone,
        count: drone.count + 1,
        cost: Math.round(drone.cost * 1.15)
      };

      const nextState = {
        ...prev,
        credits: prev.credits - drone.cost,
        drones: updatedDrones
      };

      setTimeout(() => checkAchievements(nextState, setState), 10);
      if (prev.multiplayer.active) {
        setTimeout(() => {
          logTransactionShared(`${prev.multiplayer.playerName} purchased ${drone.name} for ₵${drone.cost}.`, nextState.credits);
        }, 20);
      }
      return nextState;
    });
  };

  // 3. Buy Refinery Handler
  const purchaseRefinery = (type: keyof GameState['refineries']) => {
    setState(prev => {
      const refinery = prev.refineries[type];
      if (prev.credits < refinery.cost) return prev;

      audioSynth.playChirpSound();

      const updatedRefineries = { ...prev.refineries };
      updatedRefineries[type] = {
        ...refinery,
        count: refinery.count + 1,
        cost: Math.round(refinery.cost * 1.25)
      };

      const nextState = {
        ...prev,
        credits: prev.credits - refinery.cost,
        refineries: updatedRefineries
      };

      setTimeout(() => checkAchievements(nextState, setState), 10);
      if (prev.multiplayer.active) {
        setTimeout(() => {
          logTransactionShared(`${prev.multiplayer.playerName} constructed a ${refinery.name} for ₵${refinery.cost}.`, nextState.credits);
        }, 20);
      }
      return nextState;
    });
  };

  // 4. Toggle Refinery
  const toggleRefinery = (type: keyof GameState['refineries']) => {
    setState(prev => {
      const updatedRefineries = { ...prev.refineries };
      updatedRefineries[type] = {
        ...updatedRefineries[type],
        active: !updatedRefineries[type].active
      };
      return {
        ...prev,
        refineries: updatedRefineries
      };
    });
  };

  // 5. Purchase Tech Upgrade
  const purchaseUpgrade = (upgradeId: string) => {
    setState(prev => {
      const upgrade = prev.upgrades[upgradeId];
      if (!upgrade || prev.credits < upgrade.cost || upgrade.level >= upgrade.maxLevel) return prev;

      audioSynth.playChirpSound();

      const updatedUpgrades = { ...prev.upgrades };
      updatedUpgrades[upgradeId] = {
        ...upgrade,
        level: upgrade.level + 1,
        cost: Math.round(upgrade.cost * upgrade.multiplier)
      };

      let updatedEnergyMax = prev.energy.max;
      if (upgradeId === 'energyOutput') {
        updatedEnergyMax = 10 + (updatedUpgrades[upgradeId].level * 5);
      }

      const nextState = {
        ...prev,
        credits: prev.credits - upgrade.cost,
        upgrades: updatedUpgrades,
        energy: {
          ...prev.energy,
          max: updatedEnergyMax
        }
      };

      setTimeout(() => checkAchievements(nextState, setState), 10);
      if (prev.multiplayer.active) {
        setTimeout(() => {
          logTransactionShared(`${prev.multiplayer.playerName} upgraded "${upgrade.name}" to Level ${upgrade.level + 1} for ₵${upgrade.cost}.`, nextState.credits);
        }, 20);
      }
      return nextState;
    });
  };

  // 6. Buy raw/refined resources on Market
  const buyResource = (type: ResourceType, amount: number) => {
    setState(prev => {
      const marketItem = prev.market[type];
      const totalCost = Math.round(marketItem.currentPrice * amount);
      if (prev.credits < totalCost) return prev;

      audioSynth.playChirpSound();

      const updatedResources = { ...prev.resources };
      updatedResources[type] = {
        ...updatedResources[type],
        amount: updatedResources[type].amount + amount
      };

      const nextState = {
        ...prev,
        credits: prev.credits - totalCost,
        resources: updatedResources
      };

      setTimeout(() => checkAchievements(nextState, setState), 10);
      if (prev.multiplayer.active) {
        setTimeout(() => {
          logTransactionShared(`${prev.multiplayer.playerName} bought ${amount} ${prev.market[type].name} for ₵${totalCost}.`, nextState.credits);
        }, 20);
      }
      return nextState;
    });
  };

  // 7. Sell resources on Market
  const sellResource = (type: ResourceType, amount: number) => {
    setState(prev => {
      const currentAmount = prev.resources[type].amount;
      if (currentAmount < amount) return prev;

      audioSynth.playChirpSound();

      const marketItem = prev.market[type];
      const earnings = Math.round(marketItem.currentPrice * amount);

      const updatedResources = { ...prev.resources };
      updatedResources[type] = {
        ...updatedResources[type],
        amount: currentAmount - amount
      };

      const nextState = {
        ...prev,
        credits: prev.credits + earnings,
        resources: updatedResources,
        stats: {
          ...prev.stats,
          totalCreditsEarned: prev.stats.totalCreditsEarned + earnings
        }
      };

      setTimeout(() => checkAchievements(nextState, setState), 10);
      if (prev.multiplayer.active) {
        setTimeout(() => {
          logTransactionShared(`${prev.multiplayer.playerName} sold ${amount} ${prev.market[type].name} for ₵${earnings}.`, nextState.credits);
        }, 20);
      }
      return nextState;
    });
  };

  // 8. Fulfill Contract
  const fulfillContract = (contractId: string) => {
    setState(prev => {
      const contract = prev.contracts.find(c => c.id === contractId);
      if (!contract) return prev;

      const resAmount = prev.resources[contract.resourceType].amount;
      if (resAmount < contract.requiredAmount) return prev;

      audioSynth.playChirpSound();

      const updatedResources = { ...prev.resources };
      updatedResources[contract.resourceType] = {
        ...updatedResources[contract.resourceType],
        amount: resAmount - contract.requiredAmount
      };

      const earnings = contract.rewardCredits;
      const nextState = {
        ...prev,
        credits: prev.credits + earnings,
        resources: updatedResources,
        contracts: prev.contracts.filter(c => c.id !== contractId),
        stats: {
          ...prev.stats,
          totalCreditsEarned: prev.stats.totalCreditsEarned + earnings,
          totalContractsCompleted: prev.stats.totalContractsCompleted + 1
        }
      };

      setTimeout(() => checkAchievements(nextState, setState), 10);
      if (prev.multiplayer.active) {
        setTimeout(() => {
          logTransactionShared(`${prev.multiplayer.playerName} fulfilled a ${contract.faction} contract: +₵${earnings}.`, nextState.credits);
        }, 20);
      }
      return nextState;
    });
  };

  // 9. Scan for anomalies
  const startScanning = () => {
    audioSynth.playSonarSound();
    setState(prev => {
      if (prev.exploration.scanning || prev.exploration.activeNode) return prev;
      return {
        ...prev,
        exploration: {
          ...prev.exploration,
          scanning: true,
          scanProgress: 0
        }
      };
    });
  };

  // Select Node from Map
  const selectNode = (node: ExplorationNode) => {
    setState(prev => ({
      ...prev,
      exploration: {
        ...prev.exploration,
        activeNode: node,
        currentOutcome: null
      }
    }));
  };

  // Proceed Encounter Choice
  const resolveNodeChoice = (optionIndex: number) => {
    setState(prev => {
      const { activeNode } = prev.exploration;
      if (!activeNode) return prev;

      const option = activeNode.options[optionIndex];
      const isSuccess = Math.random() < option.successRate;
      const outcome = isSuccess ? option.successOutcome : option.failOutcome;

      // Apply outcome rewards
      const updatedRes = { ...prev.resources };
      Object.keys(outcome.resources).forEach((key) => {
        const rType = key as ResourceType;
        const rewardQty = outcome.resources[rType] || 0;
        updatedRes[rType] = {
          ...updatedRes[rType],
          amount: updatedRes[rType].amount + rewardQty
        };
      });

      const updatedScanned = prev.exploration.scannedNodes.map(n => 
        n.id === activeNode.id ? { ...n, explored: true } : n
      );

      const nextState = {
        ...prev,
        credits: prev.credits + outcome.credits,
        resources: updatedRes,
        exploration: {
          ...prev.exploration,
          scannedNodes: updatedScanned,
          currentOutcome: outcome
        },
        stats: {
          ...prev.stats,
          totalCreditsEarned: prev.stats.totalCreditsEarned + (outcome.credits > 0 ? outcome.credits : 0),
          totalNodesExplored: prev.stats.totalNodesExplored + 1
        }
      };

      setTimeout(() => checkAchievements(nextState, setState), 10);
      return nextState;
    });
  };

  // Close exploration view
  const closeOutcome = () => {
    setState(prev => ({
      ...prev,
      exploration: {
        ...prev.exploration,
        activeNode: null,
        currentOutcome: null
      }
    }));
  };

  // 10. Overdrive Mechanics
  const unlockOverdrive = () => {
    setState(prev => {
      if (prev.overdrive.unlocked || prev.credits < 1000) return prev;
      return {
        ...prev,
        credits: prev.credits - 1000,
        overdrive: {
          ...prev.overdrive,
          unlocked: true
        }
      };
    });
  };

  const activateOverdrive = () => {
    setState(prev => {
      if (!prev.overdrive.unlocked || prev.overdrive.active || prev.overdrive.cooldownLeft > 0) return prev;
      return {
        ...prev,
        overdrive: {
          ...prev.overdrive,
          active: true,
          timeLeft: prev.overdrive.duration
        }
      };
    });
  };

  const resetGame = () => {
    if (window.confirm('Are you sure you want to reset all game progress? This cannot be undone.')) {
      localStorage.removeItem(SAVE_KEY);
      setState(createInitialState());
    }
  };

  // Core Game Loop & Math tick triggers
  useEffect(() => {
    // 1. Initial save-state loading & offline progression calculations
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      try {
        const raw = JSON.parse(saved) as Partial<GameState>;
        if (raw.credits === undefined || !raw.resources || !raw.drones || !raw.energy) {
          throw new Error('Invalid save format');
        }
        const parsed = mergeSaveWithDefaults(raw);
        
        audioSynth.setMute(parsed.audioMuted || false);
        if (!parsed.audioMuted && !parsed.isMainMenuActive) {
          audioSynth.playAmbientHum();
        }
        
        // Calculate Offline Progress
        const elapsedSeconds = Math.floor((Date.now() - parsed.lastSaved) / 1000);
        if (elapsedSeconds > 5) {
          // Calculate raw extraction during offline time
          const cargoCapUpgrade = parsed.upgrades.cargoCapacity.level;
          const cargoMult = 1 + (cargoCapUpgrade * 0.25);
          
          const rawMined = {
            ironOre: parsed.drones.mining.count * parsed.drones.mining.efficiency * elapsedSeconds * cargoMult,
            heliumGas: parsed.drones.gas.count * parsed.drones.gas.efficiency * elapsedSeconds * cargoMult,
            plasmaCrystals: parsed.drones.plasma.count * parsed.drones.plasma.efficiency * elapsedSeconds * cargoMult
          };

          // Apply Offline yields with caps to prevent overflowing
          const newRes = { ...parsed.resources };
          newRes.ironOre.amount += Math.round(rawMined.ironOre);
          newRes.heliumGas.amount += Math.round(rawMined.heliumGas);
          newRes.plasmaCrystals.amount += Math.round(rawMined.plasmaCrystals);

          // Update stats
          const totalOre = Math.round(rawMined.ironOre + rawMined.heliumGas + rawMined.plasmaCrystals);
          parsed.stats.totalOreMined += totalOre;
          parsed.resources = newRes;

          alert(`Welcome Back, Commander!\nWhile you were away for ${Math.round(elapsedSeconds / 60)} minutes, your automated drone mining fleet collected:\n- Iron Ore: +${Math.round(rawMined.ironOre)}\n- Helium Gas: +${Math.round(rawMined.heliumGas)}\n- Plasma Crystals: +${Math.round(rawMined.plasmaCrystals)}`);
        }
        
        setState(parsed);
      } catch (err) {
        console.error('Failed to parse save game data', err);
      }
    }

    // 2. Real-time Ticking (every 1 second)
    const tickInterval = setInterval(() => {
      const s = stateRef.current;
      
      // Calculate active modifiers
      const speedMult = s.overdrive.active ? 2.5 : 1.0;
      const cargoMult = 1 + (s.upgrades.cargoCapacity.level * 0.25);

      // --- Passive Drone Resource Gathering ---
      const droneGains = {
        ironOre: s.drones.mining.count * s.drones.mining.efficiency * cargoMult * speedMult,
        heliumGas: s.drones.gas.count * s.drones.gas.efficiency * cargoMult * speedMult,
        plasmaCrystals: s.drones.plasma.count * s.drones.plasma.efficiency * cargoMult * speedMult
      };

      // --- Refinery Calculations & Input/Output balancing ---
      // We need to calculate how much active energy refineries demand
      const steelRefineryDemands = s.refineries.steel.active ? s.refineries.steel.count * s.refineries.steel.energyConsumption : 0;
      const fuelRefineryDemands = s.refineries.fuel.active ? s.refineries.fuel.count * s.refineries.fuel.energyConsumption : 0;
      const plasmaRefineryDemands = s.refineries.plasma.active ? s.refineries.plasma.count * s.refineries.plasma.energyConsumption : 0;
      
      const totalRefineryEnergyDemand = steelRefineryDemands + fuelRefineryDemands + plasmaRefineryDemands;
      const isGridOverloaded = totalRefineryEnergyDemand > s.energy.max;

      // Actual operating capacity under energy grid
      let energyScale = 1.0;
      if (isGridOverloaded) {
        energyScale = s.energy.max / totalRefineryEnergyDemand;
      }

      // Check input levels & process refined cycles
      const currentRes = { ...s.resources };
      
      const steelYield = s.refineries.steel.active 
        ? Math.min(
            s.refineries.steel.count * s.refineries.steel.efficiency * energyScale * speedMult,
            currentRes.ironOre.amount / s.refineries.steel.inputRatio
          )
        : 0;

      const fuelYield = s.refineries.fuel.active 
        ? Math.min(
            s.refineries.fuel.count * s.refineries.fuel.efficiency * energyScale * speedMult,
            currentRes.heliumGas.amount / s.refineries.fuel.inputRatio
          )
        : 0;

      const plasmaYield = s.refineries.plasma.active 
        ? Math.min(
            s.refineries.plasma.count * s.refineries.plasma.efficiency * energyScale * speedMult,
            currentRes.plasmaCrystals.amount / s.refineries.plasma.inputRatio
          )
        : 0;

      // Apply refinery balances
      if (steelYield > 0) {
        currentRes.ironOre.amount -= steelYield * s.refineries.steel.inputRatio;
        currentRes.steelPlates.amount += steelYield * s.refineries.steel.outputRatio;
      }
      if (fuelYield > 0) {
        currentRes.heliumGas.amount -= fuelYield * s.refineries.fuel.inputRatio;
        currentRes.fuelCells.amount += fuelYield * s.refineries.fuel.outputRatio;
      }
      if (plasmaYield > 0) {
        currentRes.plasmaCrystals.amount -= plasmaYield * s.refineries.plasma.inputRatio;
        currentRes.hyperPlasma.amount += plasmaYield * s.refineries.plasma.outputRatio;
      }

      // Apply passive drone gains
      currentRes.ironOre.amount += droneGains.ironOre;
      currentRes.heliumGas.amount += droneGains.heliumGas;
      currentRes.plasmaCrystals.amount += droneGains.plasmaCrystals;

      // Capture rates per second for tickers
      currentRes.ironOre.perSecond = droneGains.ironOre - (steelYield * s.refineries.steel.inputRatio);
      currentRes.heliumGas.perSecond = droneGains.heliumGas - (fuelYield * s.refineries.fuel.inputRatio);
      currentRes.plasmaCrystals.perSecond = droneGains.plasmaCrystals - (plasmaYield * s.refineries.plasma.inputRatio);
      currentRes.steelPlates.perSecond = steelYield * s.refineries.steel.outputRatio;
      currentRes.fuelCells.perSecond = fuelYield * s.refineries.fuel.outputRatio;
      currentRes.hyperPlasma.perSecond = plasmaYield * s.refineries.plasma.outputRatio;
      currentRes.darkMatter.perSecond = 0;

      // --- Radar scanning ticks ---
      let nextScan = { ...s.exploration };
      if (s.exploration.scanning) {
        const scanSpeed = 2.5 + (s.upgrades.radarPower.level * 1.5);
        const nextProgress = s.exploration.scanProgress + scanSpeed;

        if (nextProgress >= 100) {
          // Scanning finished, generate procedural exploration node!
          const nodeTypes: ExplorationNode['type'][] = ['asteroid', 'anomaly', 'derelict', 'outpost'];
          const nodeNames = {
            asteroid: ['Nebula C-40 Belt', 'Crystalline Core Delta', 'Asteroid Belt 404', 'Titanium Shard Fields'],
            anomaly: ['Quantum Flare Cluster', 'Gravitational Rift V-2', 'Chrono-Flux Bubble', 'Dark Energy Singularity'],
            derelict: ['S.S. Nostromo Wreckage', 'Ancient Drone Carrier', 'Cargo Container Ark', 'Forgotten Station Husk'],
            outpost: ['Independent Mining Hub', 'Black-Market Outpost', 'Wandering Smuggler Caravan', 'Research Station Theta']
          };

          const type = nodeTypes[Math.floor(Math.random() * nodeTypes.length)];
          const namesList = nodeNames[type];
          const name = namesList[Math.floor(Math.random() * namesList.length)];
          const id = 'node_' + Math.random().toString(36).substr(2, 9);
          const distance = Math.floor(Math.random() * 50) + 10;

          let description = '';
          let options: ExplorationNode['options'] = [];

          if (type === 'asteroid') {
            description = `Deep scans reveal a rich asteroid formation with high energy readings.`;
            options = [
              {
                text: 'Send Drilling Drone (High Success)',
                successRate: 0.9,
                successOutcome: { message: 'The drone easily gathered rich ores.', credits: 0, resources: { ironOre: 20, heliumGas: 5 } },
                failOutcome: { message: 'The drone collided with space debris and lost its payload.', credits: 0, resources: {} }
              },
              {
                text: 'Deploy Plasma Sunderer (Riskier)',
                successRate: 0.5,
                successOutcome: { message: 'Plasma blast shattered the core! Collected exotic dark matter.', credits: 0, resources: { darkMatter: 1, plasmaCrystals: 5 } },
                failOutcome: { message: 'Reflective crystal energy backfired, short-circuiting the refinery.', credits: -50, resources: {} }
              }
            ];
          } else if (type === 'anomaly') {
            description = `Sensors warning: A spinning gravity well is fluctuating nearby. Cosmic readings are erratic.`;
            options = [
              {
                text: 'Collect Event Horizon Readings',
                successRate: 0.8,
                successOutcome: { message: 'Data logged successfully. Science guild paid us bounty.', credits: 250, resources: {} },
                failOutcome: { message: 'Gravity ripples corrupted the station drive. Systems lost data.', credits: 0, resources: {} }
              },
              {
                text: 'Attempt Dark Matter Extraction',
                successRate: 0.45,
                successOutcome: { message: 'Success! Stabilized dark matter cells.', credits: 0, resources: { darkMatter: 2 } },
                failOutcome: { message: 'Hull breach triggered! Spent credits on repairs.', credits: -150, resources: {} }
              }
            ];
          } else if (type === 'derelict') {
            description = `A silent pre-war mining vessel floats in orbital lock. Life support is fully offline.`;
            options = [
              {
                text: 'Scavenge Cargo Lockers',
                successRate: 0.85,
                successOutcome: { message: 'Found pristine components and alloy sheets.', credits: 100, resources: { steelPlates: 8, fuelCells: 3 } },
                failOutcome: { message: 'Automated traps locked down, destroying scrap.', credits: 0, resources: {} }
              },
              {
                text: 'Overload Reactor to Recover Fusion Core',
                successRate: 0.4,
                successOutcome: { message: 'Nuclear fuel recovered completely!', credits: 300, resources: { fuelCells: 15 } },
                failOutcome: { message: 'The core exploded! Debris damaged station shields.', credits: -100, resources: {} }
              }
            ];
          } else {
            description = `A secure corporate merchant hub is broadcasting trading routes on general frequencies.`;
            options = [
              {
                text: 'Trade raw minerals for credits',
                successRate: 1.0,
                successOutcome: { message: 'Traded raw materials for credits.', credits: 150, resources: { ironOre: -10 } },
                failOutcome: { message: 'Cancelled', credits: 0, resources: {} }
              },
              {
                text: 'Hack merchant vault (Extremely Dangerous)',
                successRate: 0.25,
                successOutcome: { message: 'Cyber breach successful! Transferred cargo bank completely.', credits: 600, resources: { darkMatter: 1, steelPlates: 5 } },
                failOutcome: { message: 'Corporate ICE blocked the link and blacklisted your station.', credits: -200, resources: {} }
              }
            ];
          }

          const newNode: ExplorationNode = {
            id,
            name,
            type,
            distance,
            explored: false,
            description,
            options
          };

          nextScan = {
            ...s.exploration,
            scanning: false,
            scanProgress: 100,
            scannedNodes: [newNode, ...s.exploration.scannedNodes.slice(0, 5)] // max 6 history
          };
        } else {
          nextScan = {
            ...s.exploration,
            scanProgress: nextProgress
          };
        }
      }

      // --- Overdrive Ability Timer tick ---
      let nextOverdrive = { ...s.overdrive };
      if (s.overdrive.active) {
        const nextTime = s.overdrive.timeLeft - 1;
        if (nextTime <= 0) {
          nextOverdrive = {
            ...s.overdrive,
            active: false,
            timeLeft: 0,
            cooldownLeft: s.overdrive.cooldown
          };
        } else {
          nextOverdrive = {
            ...s.overdrive,
            timeLeft: nextTime
          };
        }
      } else if (s.overdrive.cooldownLeft > 0) {
        nextOverdrive = {
          ...s.overdrive,
          cooldownLeft: s.overdrive.cooldownLeft - 1
        };
      }

      // --- Dynamic Contract Generator ---
      let nextContracts = [...s.contracts];
      // 1. Tick down timers of active contracts
      nextContracts = nextContracts
        .map(c => ({ ...c, timeLeft: c.timeLeft - 1 }))
        .filter(c => c.timeLeft > 0);

      // 2. Randomly spawn contracts (approx 22% chance per second, max 3 contracts)
      if (nextContracts.length < 3 && Math.random() < 0.22) {
        const factions = ['Orion Corp', 'Free Belt Alliance', 'Weyland Mining Co', 'Apex Labs'];
        const faction = factions[Math.floor(Math.random() * factions.length)];
        const resourcesAllowed: ResourceType[] = ['ironOre', 'heliumGas', 'plasmaCrystals', 'steelPlates', 'fuelCells', 'hyperPlasma'];
        const rType = resourcesAllowed[Math.floor(Math.random() * resourcesAllowed.length)];
        
        let qty = 10;
        let baseVal = s.market[rType].currentPrice;
        if (rType === 'ironOre') qty = Math.floor(Math.random() * 30) + 15;
        else if (rType === 'heliumGas') qty = Math.floor(Math.random() * 20) + 10;
        else if (rType === 'plasmaCrystals') qty = Math.floor(Math.random() * 10) + 5;
        else if (rType === 'steelPlates') qty = Math.floor(Math.random() * 12) + 5;
        else if (rType === 'fuelCells') qty = Math.floor(Math.random() * 8) + 3;
        else qty = Math.floor(Math.random() * 4) + 2;

        const contractId = 'contract_' + Math.random().toString(36).substr(2, 9);
        
        // Quality rarity checks
        const randRarity = Math.random();
        let rarity: 'common' | 'rare' | 'legendary' = 'common';
        let bonus = 1.40; // 40% bonus
        if (randRarity > 0.90) {
          rarity = 'legendary';
          bonus = 2.20; // 120% bonus!
        } else if (randRarity > 0.70) {
          rarity = 'rare';
          bonus = 1.70; // 70% bonus!
        }

        const reward = Math.round(qty * baseVal * bonus);
        const duration = Math.floor(Math.random() * 90) + 60; // 60-150s

        const newContract: MarketContract = {
          id: contractId,
          faction,
          resourceType: rType,
          requiredAmount: qty,
          rewardCredits: reward,
          timeLeft: duration,
          duration,
          rarity
        };
        nextContracts.push(newContract);
      }

      // --- Active Price Modifications Tick ---
      let nextPriceMods = s.activePriceModifications ? [...s.activePriceModifications] : [];
      nextPriceMods = nextPriceMods
        .map(m => ({ ...m, timeLeft: m.timeLeft - 1 }))
        .filter(m => m.timeLeft > 0);

      // --- Hyperwave Mail Generator ---
      let nextMail = s.mail ? [...s.mail] : [];
      if (nextMail.filter(m => !m.read).length < 6 && Math.random() < 0.015) {
        const npcs = [
          { name: 'Slick Malone', desc: 'Black-market broker', rType: 'heliumGas' as ResourceType, action: 'dump' as const, cost: 200, effect: -0.65, dur: 45, text: 'Hey boss, I have a transport route lined up. Pay me ₵200 and I will flood the market with Helium Gas, crashing the price by 65% for 45 seconds. You can auto-buy it cheap!' },
          { name: 'Vesper Vance', desc: 'Plasma cartel enforcer', rType: 'plasmaCrystals' as ResourceType, action: 'pump' as const, cost: 400, effect: 0.85, dur: 45, text: 'Want to make a quick buck? For ₵400, I\'ll block plasma crystal shipping lanes, pumping the market price by 85% for 45 seconds. Time to sell your hoard!' },
          { name: 'Dr. Evelyn Vance', desc: 'Orion council lobbyist', rType: 'steelPlates' as ResourceType, action: 'dump' as const, cost: 120, effect: -0.45, dur: 30, text: 'I have influence over tariff adjustments. We can lobby steel plate subsidies, dropping prices by 45% for 30 seconds. Cost: ₵120.' },
          { name: 'Scrapper Jax', desc: 'Scavenger guild leader', rType: 'ironOre' as ResourceType, action: 'dump' as const, cost: 80, effect: -0.55, dur: 60, text: 'A massive scrap barge just arrived. I\'ll dump all scrap iron on the Exchange, dropping iron prices by 55% for 60 seconds. Cost: ₵80.' },
          { name: 'Director Nomi', desc: 'Apex Labs director', rType: 'hyperPlasma' as ResourceType, action: 'pump' as const, cost: 650, effect: 1.10, dur: 40, text: 'We require Hyper-Plasma to configure warp drive systems. Pumping market index demand by 110% for 40 seconds. Cost: ₵650.' },
          { name: 'Smuggler Cole', desc: 'Outlaw runner', rType: 'fuelCells' as ResourceType, action: 'pump' as const, cost: 250, effect: 0.70, dur: 50, text: 'Interstellar fuel depots are running dry. Pay me to route panic calls, pumping Helium Fuel Cell prices by 70% for 50 seconds. Cost: ₵250.' }
        ];

        const npc = npcs[Math.floor(Math.random() * npcs.length)];
        const mailId = 'mail_' + Math.random().toString(36).substr(2, 9);
        const newMail: MailMessage = {
          id: mailId,
          sender: `${npc.name} (${npc.desc})`,
          subject: `${npc.action === 'dump' ? '📉 DUMP' : '📈 PUMP'} Offer: ${s.market[npc.rType].name}`,
          body: npc.text,
          timeReceived: s.stats.playtime,
          read: false,
          type: 'npc_offer',
          npcAction: {
            npcName: npc.name,
            resource: npc.rType,
            action: npc.action,
            cost: npc.cost,
            priceEffectPct: npc.effect,
            duration: npc.dur,
            hired: false
          }
        };
        nextMail.push(newMail);
      }

      // --- Space Ship Flight Tick ---
      let nextTraveling = s.traveling || false;
      let nextTimeLeft = s.travelTimeLeft || 0;
      let nextLoc = s.currentLocation || 'core';
      
      if (nextTraveling && nextTimeLeft > 0) {
        nextTimeLeft -= 1;
        if (nextTimeLeft === 0) {
          nextTraveling = false;
          nextLoc = s.travelTarget || 'core';
          audioSynth.playUnlockSound(); // Arrival arpeggio
        }
      }

      // --- Compile Tick Changes ---
      const totalOreTickMined = droneGains.ironOre + droneGains.heliumGas + droneGains.plasmaCrystals;
      const totalRefinedProducedTick = steelYield + fuelYield + plasmaYield;

      const nextState: GameState = {
        ...s,
        credits: Math.max(0, s.credits),
        energy: {
          ...s.energy,
          consumption: totalRefineryEnergyDemand
        },
        resources: currentRes,
        exploration: nextScan,
        overdrive: nextOverdrive,
        contracts: nextContracts,
        mail: nextMail,
        activePriceModifications: nextPriceMods,
        currentLocation: nextLoc,
        traveling: nextTraveling,
        travelTimeLeft: nextTimeLeft,
        stats: {
          ...s.stats,
          totalOreMined: s.stats.totalOreMined + totalOreTickMined,
          totalRefinedProduced: s.stats.totalRefinedProduced + totalRefinedProducedTick,
          playtime: s.stats.playtime + 1
        },
        lastSaved: Date.now()
      };

      setState(nextState);
      setTimeout(() => checkAchievements(nextState, setState), 10);
    }, 1000);

    return () => clearInterval(tickInterval);
  }, []);

  // 3. Simulated market price adjustments + Auto-Trade Orders (every 4 seconds)
  useEffect(() => {
    const marketInterval = setInterval(() => {
      setState(prev => {
        const nextMarket = { ...prev.market };
        Object.keys(nextMarket).forEach((key) => {
          const rType = key as ResourceType;
          const currentVal = nextMarket[rType].currentPrice;
          const baseVal = nextMarket[rType].basePrice;
          const vol = nextMarket[rType].volatility;

          // Price noise: standard random walk with slight mean reversion to base value
          // 4% chance of a market shock event (boom or bust) per tick
          let shockMultiplier = 1.0;
          if (Math.random() < 0.04) {
            shockMultiplier = Math.random() < 0.5 ? 2.5 : -1.8;
          }
          
          const drift = (baseVal - currentVal) * 0.05; // reversion drift
          const shock = currentVal * vol * (Math.random() - 0.5) * 1.6 * shockMultiplier;
          
          let nextPrice = Math.round(currentVal + drift + shock);
          
          // Apply active NPC price modifications if present!
          const activeMod = prev.activePriceModifications?.find(m => m.resourceType === rType);
          if (activeMod) {
            nextPrice = Math.round(nextPrice * (1 + activeMod.effectPct));
          }

          // Clamp price floor & ceiling
          nextPrice = Math.max(Math.round(baseVal * 0.35), nextPrice);
          nextPrice = Math.min(Math.round(baseVal * 3.5), nextPrice);

          const updatedHistory = [...nextMarket[rType].history.slice(1), nextPrice];

          nextMarket[rType] = {
            ...nextMarket[rType],
            currentPrice: nextPrice,
            history: updatedHistory
          };
        });

        // --- Run Automated Trade Checks ---
        let nextCredits = prev.credits;
        const nextResources = { ...prev.resources };
        const nextAutoTrades = prev.autoTrades ? { ...prev.autoTrades } : createInitialState().autoTrades!;
        
        let autoTradeTriggered = false;

        Object.keys(nextMarket).forEach((key) => {
          const rType = key as ResourceType;
          const price = nextMarket[rType].currentPrice;
          const config = nextAutoTrades[rType];

          if (config) {
            // Auto-Buy check (prices dropped below target threshold)
            if (config.buyActive && price <= config.buyThreshold) {
              const maxAffordable = Math.floor(nextCredits / price);
              const buyQty = Math.min(config.buyAmount, maxAffordable);
              if (buyQty > 0) {
                const cost = buyQty * price;
                nextCredits -= cost;
                nextResources[rType] = {
                  ...nextResources[rType],
                  amount: nextResources[rType].amount + buyQty
                };
                autoTradeTriggered = true;
              }
            }

            // Auto-Sell check (prices rose above target threshold)
            if (config.sellActive && price >= config.sellThreshold) {
              const sellQty = Math.min(config.sellAmount, Math.floor(nextResources[rType].amount));
              if (sellQty > 0) {
                const earnings = sellQty * price;
                nextCredits += earnings;
                nextResources[rType] = {
                  ...nextResources[rType],
                  amount: nextResources[rType].amount - sellQty
                };
                autoTradeTriggered = true;
              }
            }
          }
        });

        if (autoTradeTriggered) {
          audioSynth.playChirpSound();
        }

        return {
          ...prev,
          credits: nextCredits,
          resources: nextResources,
          market: nextMarket,
          autoTrades: nextAutoTrades
        };
      });
    }, 4000);

    return () => clearInterval(marketInterval);
  }, []);

  // 4. Auto-save State (every 10 seconds)
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      localStorage.setItem(SAVE_KEY, JSON.stringify(stateRef.current));
    }, 10000);
    return () => clearInterval(autoSaveInterval);
  }, []);

  // 11. Main Menu control
  const setMainMenuActive = (active: boolean) => {
    setState(prev => {
      const nextState = { ...prev, isMainMenuActive: active };
      if (!active && !nextState.audioMuted) {
        audioSynth.playAmbientHum();
      }
      return nextState;
    });
  };

  // 12. Audio Mute controller
  const toggleAudioMute = () => {
    setState(prev => {
      const nextMuted = !prev.audioMuted;
      audioSynth.setMute(nextMuted);
      if (nextMuted) {
        audioSynth.stopAmbientHum();
      } else {
        audioSynth.playAmbientHum();
      }
      return { ...prev, audioMuted: nextMuted };
    });
  };

  // 13. Tutorial controllers
  const advanceTutorial = () => {
    setState(prev => {
      const nextStep = prev.tutorialStep + 1;
      const isDone = nextStep > 5;
      
      let rewardCredits = 0;
      if (isDone) {
        rewardCredits = 250;
        triggerAchievementToast("Academy Graduate", "Complete the station operational tutorial", "🎓");
        audioSynth.playUnlockSound();
      } else {
        audioSynth.playChirpSound();
      }

      return {
        ...prev,
        tutorialStep: isDone ? 0 : nextStep,
        hasCompletedTutorial: isDone ? true : prev.hasCompletedTutorial,
        credits: prev.credits + rewardCredits,
        stats: {
          ...prev.stats,
          totalCreditsEarned: prev.stats.totalCreditsEarned + rewardCredits
        }
      };
    });
  };

  const skipTutorial = () => {
    setState(prev => ({
      ...prev,
      tutorialStep: 0,
      hasCompletedTutorial: true
    }));
    audioSynth.playChirpSound();
  };

  // 14. Save Import / Export managers (base64 encryption helper)
  const exportSave = () => {
    try {
      const stateStr = JSON.stringify(stateRef.current);
      return btoa(unescape(encodeURIComponent(stateStr)));
    } catch (e) {
      console.error('Failed to export save state:', e);
      return '';
    }
  };

  const importSave = (saveStr: string): boolean => {
    try {
      const decoded = decodeURIComponent(escape(atob(saveStr)));
      const raw = JSON.parse(decoded) as Partial<GameState>;
      
      if (raw.credits !== undefined && raw.resources !== undefined && raw.drones !== undefined) {
        const parsed = mergeSaveWithDefaults(raw);
        setState(parsed);
        audioSynth.setMute(parsed.audioMuted);
        if (!parsed.audioMuted && !parsed.isMainMenuActive) {
          audioSynth.playAmbientHum();
        } else {
          audioSynth.stopAmbientHum();
        }
        audioSynth.playUnlockSound();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to import save state:', e);
      return false;
    }
  };

  return (
    <GameContext.Provider
      value={{
        state,
        mineManually,
        purchaseDrone,
        purchaseRefinery,
        toggleRefinery,
        purchaseUpgrade,
        buyResource,
        sellResource,
        fulfillContract,
        startScanning,
        selectNode,
        resolveNodeChoice,
        closeOutcome,
        activateOverdrive,
        unlockOverdrive,
        resetGame,
        triggerAchievementToast,
        activeToast,
        setMainMenuActive,
        toggleAudioMute,
        advanceTutorial,
        skipTutorial,
        exportSave,
        importSave,
        configureAutoTrade: (type: ResourceType, config: Partial<AutoTradeConfig>) => {
          setState(prev => {
            const nextAutoTrades = prev.autoTrades ? { ...prev.autoTrades } : createInitialState().autoTrades!;
            nextAutoTrades[type] = {
              ...nextAutoTrades[type],
              ...config
            };
            return {
              ...prev,
              autoTrades: nextAutoTrades
            };
          });
        },
        readMail: (mailId: string) => {
          setState(prev => {
            const updatedMail = prev.mail ? [...prev.mail] : [];
            const index = updatedMail.findIndex(m => m.id === mailId);
            if (index !== -1) {
              updatedMail[index] = { ...updatedMail[index], read: true };
            }
            return { ...prev, mail: updatedMail };
          });
        },
        deleteMail: (mailId: string) => {
          setState(prev => {
            const updatedMail = prev.mail ? prev.mail.filter(m => m.id !== mailId) : [];
            return { ...prev, mail: updatedMail };
          });
        },
        hireNPC: (mailId: string) => {
          setState(prev => {
            const updatedMail = prev.mail ? [...prev.mail] : [];
            const index = updatedMail.findIndex(m => m.id === mailId);
            if (index === -1) return prev;

            const mailItem = updatedMail[index];
            if (!mailItem.npcAction || mailItem.npcAction.hired || prev.credits < mailItem.npcAction.cost) return prev;

            audioSynth.playUnlockSound();

            updatedMail[index] = {
              ...mailItem,
              npcAction: {
                ...mailItem.npcAction,
                hired: true
              }
            };

            const activeMods = prev.activePriceModifications ? [...prev.activePriceModifications] : [];
            const newMod: ActivePriceModification = {
              resourceType: mailItem.npcAction.resource,
              npcName: mailItem.npcAction.npcName,
              action: mailItem.npcAction.action,
              effectPct: mailItem.npcAction.priceEffectPct,
              timeLeft: mailItem.npcAction.duration,
              duration: mailItem.npcAction.duration
            };

            const filteredMods = activeMods.filter(m => m.resourceType !== mailItem.npcAction!.resource);
            filteredMods.push(newMod);

            return {
              ...prev,
              credits: prev.credits - mailItem.npcAction.cost,
              mail: updatedMail,
              activePriceModifications: filteredMods
            };
          });
        },
        travelTo: (location: TravelLocation) => {
          setState(prev => {
            if (prev.traveling || prev.currentLocation === location) return prev;
            audioSynth.playSonarSound();
            return {
              ...prev,
              traveling: true,
              travelTarget: location,
              travelTimeLeft: 6
            };
          });
        },
        buyItemFromShop: (itemId: string, cost: number) => {
          setState(prev => {
            if (prev.credits < cost) return prev;
            let nextState = { ...prev, credits: prev.credits - cost };
            audioSynth.playChirpSound();

            if (itemId === 'overdrive_catalyst') {
              nextState.overdrive = {
                ...nextState.overdrive,
                cooldownLeft: 0
              };
            } else if (itemId === 'dark_matter_locator') {
              const id = 'node_' + Math.random().toString(36).substr(2, 9);
              const newNode = {
                id,
                name: 'Target Anomaly Sector',
                type: 'anomaly' as const,
                distance: Math.floor(Math.random() * 20) + 5,
                explored: false,
                description: 'A locator probe locked onto a dense dark energy signature.',
                options: [
                  {
                    text: 'Attempt Dark Matter Extraction',
                    successRate: 0.8,
                    successOutcome: { message: 'Locator coordinates were perfect. Stabilized dark matter cells.', credits: 0, resources: { darkMatter: 2 } },
                    failOutcome: { message: 'Containment leak, but recovered plasma crystals.', credits: 0, resources: { plasmaCrystals: 5 } }
                  }
                ]
              };
              nextState.exploration = {
                ...nextState.exploration,
                scannedNodes: [newNode, ...nextState.exploration.scannedNodes.slice(0, 5)]
              };
            } else if (itemId === 'alien_fusion_core') {
              nextState.energy = {
                ...nextState.energy,
                max: nextState.energy.max + 15
              };
            }
            if (prev.multiplayer.active) {
              setTimeout(() => {
                logTransactionShared(`${prev.multiplayer.playerName} bought "${itemId}" for ₵${cost}.`, nextState.credits);
              }, 20);
            }
            return nextState;
          });
        },
        sellDarkMatterToApex: () => {
          setState(prev => {
            const owned = prev.resources.darkMatter.amount;
            if (owned < 1) return prev;
            audioSynth.playChirpSound();
            const updatedRes = { ...prev.resources };
            updatedRes.darkMatter = { ...updatedRes.darkMatter, amount: owned - 1 };
            const earnings = 1000;
            const nextCredits = prev.credits + earnings;
            if (prev.multiplayer.active) {
              setTimeout(() => {
                logTransactionShared(`${prev.multiplayer.playerName} sold 1 Dark Matter to Apex for +₵1000.`, nextCredits);
              }, 20);
            }
            return {
              ...prev,
              credits: nextCredits,
              resources: updatedRes,
              stats: {
                ...prev.stats,
                totalCreditsEarned: prev.stats.totalCreditsEarned + earnings
              }
            };
          });
        },
        setActiveTerminal: (terminal: string | null) => {
          setState(prev => ({ ...prev, activeTerminal: terminal }));
        },
        createLobby: (playerName: string) => {
          const code = 'VOID-' + Math.random().toString(36).substr(2, 4).toUpperCase();
          const myId = 'player_' + Math.random().toString(36).substr(2, 5);
          const selfPlayer = { id: myId, name: playerName || 'Captain', isBot: false, color: '#00f2fe' };
          
          setState(prev => ({
            ...prev,
            multiplayer: {
              active: true,
              roomCode: code,
              playerName: playerName || 'Captain',
              players: [selfPlayer],
              activityLog: [{ id: 'log_start', text: `🛸 Created competitive grid ${code}. Standby for other pilots.`, time: Date.now() }],
              chatMessages: []
            }
          }));
        },
        joinLobby: (roomCode: string, playerName: string): boolean => {
          const cleanCode = roomCode.trim().toUpperCase();
          if (!cleanCode) return false;
          
          const myId = 'player_' + Math.random().toString(36).substr(2, 5);
          const selfPlayer = { id: myId, name: playerName || 'Guest', isBot: false, color: '#ff007f' };

          setState(prev => ({
            ...prev,
            multiplayer: {
              active: true,
              roomCode: cleanCode,
              playerName: playerName || 'Guest',
              players: [selfPlayer],
              activityLog: [{ id: 'log_join', text: `🛸 Connected to competitive grid ${cleanCode}. Syncing...`, time: Date.now() }],
              chatMessages: []
            }
          }));

          // Broadcast join event to all networks
          setTimeout(() => {
            broadcastMessage({
              type: 'PLAYER_JOIN',
              roomCode: cleanCode,
              payload: selfPlayer
            });
          }, 100);

          return true;
        },
        leaveLobby: () => {
          setState(prev => ({
            ...prev,
            multiplayer: {
              active: false,
              roomCode: null,
              playerName: '',
              players: [],
              activityLog: [],
              chatMessages: []
            }
          }));
        },
        sendChatMessage: (text: string) => {
          const s = stateRef.current;
          if (!s.multiplayer.active || !s.multiplayer.roomCode) return;

          const myPlayer = s.multiplayer.players.find(p => p.name === s.multiplayer.playerName) || { color: '#00f2fe' };
          const chatMsg = {
            id: 'chat_' + Date.now() + Math.random().toString(36).substr(2, 4),
            sender: s.multiplayer.playerName,
            text,
            time: Date.now(),
            color: myPlayer.color
          };

          setState(prev => ({
            ...prev,
            multiplayer: {
              ...prev.multiplayer,
              chatMessages: [...prev.multiplayer.chatMessages, chatMsg].slice(-100)
            }
          }));

          // Broadcast to both local BroadcastChannel AND remote MQTT
          broadcastMessage({
            type: 'CHAT_MSG',
            roomCode: s.multiplayer.roomCode,
            payload: {
              sender: s.multiplayer.playerName,
              text,
              color: myPlayer.color
            }
          });
        }
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
