export type ResourceType =
  | 'ironOre'
  | 'heliumGas'
  | 'plasmaCrystals'
  | 'steelPlates'
  | 'fuelCells'
  | 'hyperPlasma'
  | 'darkMatter';

export interface ResourceData {
  amount: number;
  perSecond: number;
}

export interface ResourceMarket {
  currentPrice: number;
  history: number[];
  basePrice: number;
  volatility: number;
  name: string;
  category: 'raw' | 'refined' | 'exotic';
}

export interface DroneData {
  count: number;
  cost: number;
  efficiency: number;
  name: string;
  resourceProduced: ResourceType;
}

export interface RefineryData {
  count: number;
  cost: number;
  active: boolean;
  efficiency: number; // raw units refined per second per refinery
  inputResource: ResourceType;
  outputResource: ResourceType;
  inputRatio: number; // how much raw is consumed
  outputRatio: number; // how much refined is produced
  energyConsumption: number; // energy cost per active refinery
  name: string;
}

export interface UpgradeData {
  id: string;
  name: string;
  description: string;
  cost: number;
  level: number;
  maxLevel: number;
  multiplier: number;
  category: 'mining' | 'cargo' | 'radar' | 'refinery' | 'special';
}

export interface Outcome {
  message: string;
  credits: number;
  resources: { [key in ResourceType]?: number };
}

export interface ExplorationOption {
  text: string;
  successRate: number; // 0 to 1
  successOutcome: Outcome;
  failOutcome: Outcome;
}

export interface ExplorationNode {
  id: string;
  name: string;
  type: 'anomaly' | 'asteroid' | 'derelict' | 'outpost';
  distance: number;
  explored: boolean;
  description: string;
  options: ExplorationOption[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  icon: string;
}

export interface MarketContract {
  id: string;
  faction: string;
  resourceType: ResourceType;
  requiredAmount: number;
  rewardCredits: number;
  timeLeft: number; // in seconds
  duration: number; // total duration
  rarity?: 'common' | 'rare' | 'legendary';
}

export interface GameState {
  credits: number;
  energy: {
    max: number;
    production: number;
    consumption: number;
  };
  resources: { [key in ResourceType]: ResourceData };
  drones: {
    mining: DroneData;
    gas: DroneData;
    plasma: DroneData;
  };
  refineries: {
    steel: RefineryData;
    fuel: RefineryData;
    plasma: RefineryData;
  };
  upgrades: { [key: string]: UpgradeData };
  market: { [key in ResourceType]: ResourceMarket };
  contracts: MarketContract[];
  exploration: {
    scanning: boolean;
    scanProgress: number; // 0 to 100
    scannedNodes: ExplorationNode[];
    activeNode: ExplorationNode | null;
    currentOutcome: Outcome | null;
  };
  achievements: Achievement[];
  overdrive: {
    unlocked: boolean;
    active: boolean;
    timeLeft: number; // seconds
    cooldownLeft: number; // seconds
    duration: number; // total seconds (e.g. 15)
    cooldown: number; // total cooldown seconds (e.g. 60)
  };
  stats: {
    totalCreditsEarned: number;
    totalOreMined: number;
    totalRefinedProduced: number;
    totalContractsCompleted: number;
    totalNodesExplored: number;
    playtime: number; // in seconds
  };
  lastSaved: number;
  isMainMenuActive: boolean;
  tutorialStep: number;
  hasCompletedTutorial: boolean;
  audioMuted: boolean;
  autoTrades?: { [key in ResourceType]: AutoTradeConfig };
  mail?: MailMessage[];
  activePriceModifications?: ActivePriceModification[];
  currentLocation?: TravelLocation;
  traveling?: boolean;
  travelTimeLeft?: number; // in seconds
  travelTarget?: TravelLocation;
  // 2D Ship Interior state
  playerX: number; // robot x position in ship world coordinates
  activeTerminal: string | null; // which terminal panel is open (tab id), null = walking around
  // Multiplayer state
  multiplayer: CoopState;
}

export type TravelLocation =
  | 'core'
  | 'nebula_pass'
  | 'fuel_depot'
  | 'smuggler'
  | 'weyland'
  | 'apex'
  | 'dark_rift';

export interface CoopPlayer {
  id: string;
  name: string;
  isBot: boolean;
  color: string;
  credits?: number;
  dronesCount?: number;
  currentLocation?: string;
}

export interface CoopLog {
  id: string;
  text: string;
  time: number;
}

export interface CoopMessage {
  id: string;
  sender: string;
  text: string;
  time: number;
  color: string;
}

export interface CoopState {
  active: boolean;
  roomCode: string | null;
  playerName: string;
  players: CoopPlayer[];
  activityLog: CoopLog[];
  chatMessages: CoopMessage[];
}

export interface MailMessage {
  id: string;
  sender: string;
  subject: string;
  body: string;
  timeReceived: number; // in-game playtime seconds
  read: boolean;
  type: 'neutral' | 'npc_offer';
  npcAction?: {
    npcName: string;
    resource: ResourceType;
    action: 'dump' | 'pump';
    cost: number;
    priceEffectPct: number; // e.g. -0.50 for dump, 0.80 for pump
    duration: number; // duration in seconds
    hired: boolean;
  };
}

export interface ActivePriceModification {
  resourceType: ResourceType;
  npcName: string;
  action: 'dump' | 'pump';
  effectPct: number;
  timeLeft: number; // in seconds
  duration: number;
}

export interface AutoTradeConfig {
  buyActive: boolean;
  buyThreshold: number;
  buyAmount: number;
  sellActive: boolean;
  sellThreshold: number;
  sellAmount: number;
}
