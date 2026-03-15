/**
 * Mock data factories for Storybook stories.
 * All monetary values stored as integers in cents per project convention.
 */

import type { Asset, WarrantyReport } from '@protolabsai/types';
import type { Vendor } from '@protolabsai/types';
import type {
  BudgetSummary,
  BudgetCategory,
  Transaction,
  BudgetCategorySummary,
} from '@protolabsai/types';
import type {
  GamificationProfile,
  AchievementWithStatus,
  HomeHealthScore,
  Quest,
  EarnedAchievement,
} from '@protolabsai/types';
import type { VaultEntry } from '@protolabsai/types';
import type {
  MaintenanceSchedule,
  MaintenanceCompletion,
} from '../views/maintenance-view/hooks/use-maintenance';
import type { SensorEntry } from '../views/sensors-view/hooks/use-sensors';

// ── Assets ────────────────────────────────────────────────────────────────────

export const mockAssetRefrigerator: Asset = {
  id: 'asset-001',
  name: 'Samsung French Door Refrigerator',
  category: 'appliance',
  location: 'Kitchen',
  manufacturer: 'Samsung',
  modelNumber: 'RF28R7351SR',
  serialNumber: 'SN123456789',
  purchaseDate: '2022-03-15',
  purchasePrice: 189900,
  warrantyExpiration: '2027-03-15',
  replacementCost: 200000,
  notes: 'Extended warranty purchased. Ice maker occasionally needs reset.',
  sensorIds: ['sensor-temp-01'],
  photoUrls: [],
  createdAt: '2022-03-15T10:00:00Z',
  updatedAt: '2024-01-10T14:00:00Z',
};

export const mockAssetLaptop: Asset = {
  id: 'asset-002',
  name: 'MacBook Pro 16"',
  category: 'electronics',
  location: 'Home Office',
  manufacturer: 'Apple',
  modelNumber: 'MNW93LL/A',
  serialNumber: 'C02XL0Y7JHD2',
  purchaseDate: '2023-09-01',
  purchasePrice: 249900,
  warrantyExpiration: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // expiring in 45 days
  replacementCost: 260000,
  notes: 'AppleCare+ expires same date.',
  sensorIds: [],
  photoUrls: [],
  createdAt: '2023-09-01T09:00:00Z',
  updatedAt: '2024-02-20T11:30:00Z',
};

export const mockAssetHvacUnit: Asset = {
  id: 'asset-003',
  name: 'Carrier Central AC Unit',
  category: 'hvac',
  location: 'Utility Room',
  manufacturer: 'Carrier',
  modelNumber: '24ACC636A003',
  serialNumber: 'CARRIER2019001',
  purchaseDate: '2019-06-10',
  purchasePrice: 450000,
  warrantyExpiration: '2022-06-10', // expired
  replacementCost: 600000,
  notes: 'Annual service recommended. Filter replaced every 3 months.',
  sensorIds: ['sensor-hvac-01'],
  photoUrls: [],
  createdAt: '2019-06-10T08:00:00Z',
  updatedAt: '2023-07-15T09:00:00Z',
};

export const mockAssetCouch: Asset = {
  id: 'asset-004',
  name: 'West Elm Sectional Sofa',
  category: 'furniture',
  location: 'Living Room',
  manufacturer: 'West Elm',
  modelNumber: null,
  serialNumber: null,
  purchaseDate: '2021-11-20',
  purchasePrice: 320000,
  warrantyExpiration: null, // no warranty
  replacementCost: 350000,
  notes: null,
  sensorIds: [],
  photoUrls: [],
  createdAt: '2021-11-20T15:00:00Z',
  updatedAt: '2021-11-20T15:00:00Z',
};

export const mockWarrantyReport: WarrantyReport = {
  active: [mockAssetRefrigerator],
  expiringSoon: [mockAssetLaptop],
  expired: [mockAssetHvacUnit],
  noWarranty: [mockAssetCouch],
};

// ── Maintenance Schedules ─────────────────────────────────────────────────────

export const mockScheduleOverdue: MaintenanceSchedule = {
  id: 'sched-001',
  title: 'Replace HVAC Air Filter',
  description: 'Replace 20x25x1 MERV 11 filter in main return vent.',
  category: 'hvac',
  intervalDays: 90,
  lastCompletedAt: '2024-09-01T00:00:00Z',
  nextDueAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(), // 12 days ago
  assetId: 'asset-003',
  assetName: 'Carrier Central AC Unit',
  vendorId: null,
  vendorName: null,
  estimatedCost: 2500,
  createdAt: '2023-06-01T00:00:00Z',
  updatedAt: '2024-09-01T00:00:00Z',
};

export const mockScheduleDueSoon: MaintenanceSchedule = {
  id: 'sched-002',
  title: 'Inspect Smoke Detectors',
  description: 'Test all 6 smoke detectors and replace batteries if needed.',
  category: 'safety',
  intervalDays: 180,
  lastCompletedAt: '2024-09-10T00:00:00Z',
  nextDueAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // due in 5 days
  assetId: null,
  assetName: null,
  vendorId: null,
  vendorName: null,
  estimatedCost: 1500,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2024-09-10T00:00:00Z',
};

export const mockScheduleUpToDate: MaintenanceSchedule = {
  id: 'sched-003',
  title: 'Gutter Cleaning',
  description: 'Clean gutters and downspouts, inspect for damage.',
  category: 'exterior',
  intervalDays: 365,
  lastCompletedAt: '2024-11-01T00:00:00Z',
  nextDueAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // due in 60 days
  assetId: null,
  assetName: null,
  vendorId: 'vendor-002',
  vendorName: 'Green Thumb Landscaping',
  estimatedCost: 20000,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2024-11-01T00:00:00Z',
};

export const mockScheduleWithAssetAndVendor: MaintenanceSchedule = {
  id: 'sched-004',
  title: 'Annual AC Tune-Up',
  description: 'Full system inspection, coil cleaning, refrigerant check.',
  category: 'hvac',
  intervalDays: 365,
  lastCompletedAt: '2024-05-15T00:00:00Z',
  nextDueAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(), // due in 45 days
  assetId: 'asset-003',
  assetName: 'Carrier Central AC Unit',
  vendorId: 'vendor-001',
  vendorName: 'Cool Comfort HVAC',
  estimatedCost: 15000,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2024-05-15T00:00:00Z',
};

export const mockCompletions: MaintenanceCompletion[] = [
  {
    id: 'comp-001',
    scheduleId: 'sched-001',
    completedAt: '2024-09-01T10:30:00Z',
    completedBy: 'Josh',
    notes: 'Found filter was very dirty. Ordered extra filters.',
    actualCost: 2300,
  },
  {
    id: 'comp-002',
    scheduleId: 'sched-001',
    completedAt: '2024-06-01T09:00:00Z',
    completedBy: 'Josh',
    notes: null,
    actualCost: 2500,
  },
  {
    id: 'comp-003',
    scheduleId: 'sched-001',
    completedAt: '2024-03-01T11:00:00Z',
    completedBy: 'Sarah',
    notes: 'Filter was lightly used, replaced anyway per schedule.',
    actualCost: 2500,
  },
  {
    id: 'comp-004',
    scheduleId: 'sched-001',
    completedAt: '2023-12-01T14:00:00Z',
    completedBy: 'Josh',
    notes: null,
    actualCost: 2000,
  },
];

// ── Vendors ───────────────────────────────────────────────────────────────────

export const mockVendorHvac: Vendor = {
  id: 'vendor-001',
  name: 'Mike Rodriguez',
  company: 'Cool Comfort HVAC',
  phone: '(555) 234-5678',
  email: 'mike@coolcomforthvac.com',
  website: 'https://coolcomforthvac.com',
  category: 'hvac',
  notes: 'Has been our HVAC tech for 5 years. Always prompt and professional.',
  rating: 5,
  lastContactedAt: '2024-11-20T10:00:00Z',
  lastServiceDate: '2024-05-15T00:00:00Z',
  linkedAssetIds: ['asset-003'],
  createdAt: '2019-07-01T00:00:00Z',
  updatedAt: '2024-05-15T00:00:00Z',
};

export const mockVendorPlumber: Vendor = {
  id: 'vendor-002',
  name: 'Dana Chen',
  company: 'Chen Plumbing Services',
  phone: '(555) 345-6789',
  email: null,
  website: null,
  category: 'plumber',
  notes: 'Fixed the kitchen sink leak. Reasonable pricing.',
  rating: 3,
  lastContactedAt: '2024-08-10T00:00:00Z',
  lastServiceDate: '2024-08-10T00:00:00Z',
  linkedAssetIds: [],
  createdAt: '2024-08-01T00:00:00Z',
  updatedAt: '2024-08-10T00:00:00Z',
};

export const mockVendorElectrician: Vendor = {
  id: 'vendor-003',
  name: 'James Wilson',
  company: null,
  phone: '(555) 456-7890',
  email: 'jwilson.electric@gmail.com',
  website: null,
  category: 'electrician',
  notes: 'Independent contractor. Licensed and insured.',
  rating: null, // unrated
  lastContactedAt: null,
  lastServiceDate: null,
  linkedAssetIds: [],
  createdAt: '2024-01-15T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
};

// ── Budget ────────────────────────────────────────────────────────────────────

export const mockBudgetCategories: BudgetCategory[] = [
  { id: 'cat-001', name: 'Utilities', color: '#06b6d4', budgetedAmount: 30000 },
  { id: 'cat-002', name: 'Maintenance', color: '#f59e0b', budgetedAmount: 20000 },
  { id: 'cat-003', name: 'Groceries', color: '#10b981', budgetedAmount: 80000 },
  { id: 'cat-004', name: 'Insurance', color: '#8b5cf6', budgetedAmount: 25000 },
  { id: 'cat-005', name: 'Mortgage', color: '#ef4444', budgetedAmount: 200000 },
  { id: 'cat-006', name: 'Entertainment', color: '#f97316', budgetedAmount: 15000 },
];

export const mockTransactions: Transaction[] = [
  {
    id: 'txn-001',
    type: 'income',
    amount: 650000,
    categoryId: 'cat-001',
    description: 'Monthly Salary',
    date: '2026-03-01',
    recurrence: 'monthly',
    createdAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 'txn-002',
    type: 'expense',
    amount: 185000,
    categoryId: 'cat-005',
    description: 'Mortgage Payment',
    date: '2026-03-05',
    recurrence: 'monthly',
    createdAt: '2026-03-05T00:00:00Z',
  },
  {
    id: 'txn-003',
    type: 'expense',
    amount: 23400,
    categoryId: 'cat-001',
    description: 'Electric Bill',
    date: '2026-03-08',
    recurrence: null,
    createdAt: '2026-03-08T00:00:00Z',
  },
  {
    id: 'txn-004',
    type: 'expense',
    amount: 15000,
    categoryId: 'cat-003',
    description: 'Costco run',
    date: '2026-03-10',
    recurrence: null,
    createdAt: '2026-03-10T00:00:00Z',
  },
  {
    id: 'txn-005',
    type: 'expense',
    amount: 2500,
    categoryId: 'cat-002',
    description: 'HVAC filter replacement',
    date: '2026-03-12',
    recurrence: null,
    createdAt: '2026-03-12T00:00:00Z',
  },
  {
    id: 'txn-006',
    type: 'income',
    amount: 50000,
    categoryId: 'cat-001',
    description: 'Freelance project',
    date: '2026-03-14',
    recurrence: null,
    createdAt: '2026-03-14T00:00:00Z',
  },
];

export const mockBudgetSummaryPositive: BudgetSummary = {
  totalIncome: 700000,
  totalExpenses: 408500,
  balance: 291500,
  byCategory: [
    { categoryId: 'cat-001', categoryName: 'Utilities', total: 23400 },
    { categoryId: 'cat-002', categoryName: 'Maintenance', total: 2500 },
    { categoryId: 'cat-003', categoryName: 'Groceries', total: 15000 },
    { categoryId: 'cat-004', categoryName: 'Insurance', total: 12000 },
    { categoryId: 'cat-005', categoryName: 'Mortgage', total: 185000 },
    { categoryId: 'cat-006', categoryName: 'Entertainment', total: 8500 },
  ],
};

export const mockBudgetSummaryNegative: BudgetSummary = {
  totalIncome: 300000,
  totalExpenses: 450000,
  balance: -150000,
  byCategory: [
    { categoryId: 'cat-001', categoryName: 'Utilities', total: 35000 },
    { categoryId: 'cat-002', categoryName: 'Maintenance', total: 80000 },
    { categoryId: 'cat-003', categoryName: 'Groceries', total: 95000 },
    { categoryId: 'cat-005', categoryName: 'Mortgage', total: 185000 },
    { categoryId: 'cat-006', categoryName: 'Entertainment', total: 55000 },
  ],
};

export const mockBudgetSummaryBreakEven: BudgetSummary = {
  totalIncome: 500000,
  totalExpenses: 500000,
  balance: 0,
  byCategory: [
    { categoryId: 'cat-001', categoryName: 'Utilities', total: 28000 },
    { categoryId: 'cat-005', categoryName: 'Mortgage', total: 185000 },
    { categoryId: 'cat-003', categoryName: 'Groceries', total: 72000 },
    { categoryId: 'cat-004', categoryName: 'Insurance', total: 25000 },
    { categoryId: 'cat-006', categoryName: 'Entertainment', total: 190000 },
  ],
};

export const mockCategoryBreakdown: BudgetCategorySummary[] = mockBudgetSummaryPositive.byCategory;

// ── Gamification ──────────────────────────────────────────────────────────────

export const mockAchievements: AchievementWithStatus[] = [
  // Earned
  {
    id: 'ach-001',
    title: 'First Steps',
    description: 'Complete your first maintenance task.',
    icon: '🏠',
    xpReward: 50,
    category: 'onboarding',
    earned: true,
    unlockedAt: '2024-01-15T10:00:00Z',
    seen: true,
  },
  {
    id: 'ach-002',
    title: 'Asset Manager',
    description: 'Add 5 assets to your inventory.',
    icon: '📦',
    xpReward: 100,
    category: 'inventory',
    earned: true,
    unlockedAt: '2024-02-20T14:00:00Z',
    seen: true,
  },
  {
    id: 'ach-003',
    title: 'Budget Hawk',
    description: 'Track expenses for 3 consecutive months.',
    icon: '💰',
    xpReward: 150,
    category: 'budget',
    earned: true,
    unlockedAt: '2024-04-01T09:00:00Z',
    seen: false,
  },
  // Locked
  {
    id: 'ach-004',
    title: 'Maintenance Master',
    description: 'Complete 25 maintenance tasks on time.',
    icon: '🔧',
    xpReward: 500,
    category: 'maintenance',
    earned: false,
    unlockedAt: null,
    seen: false,
  },
  {
    id: 'ach-005',
    title: 'Winter Ready',
    description: 'Complete all seasonal winter prep tasks.',
    icon: '❄️',
    xpReward: 200,
    category: 'seasonal',
    earned: false,
    unlockedAt: null,
    seen: false,
  },
  // Secret
  {
    id: 'ach-006',
    title: 'Hidden Discovery',
    description: 'Complete a secret action.',
    icon: '🔮',
    xpReward: 1000,
    category: 'secret',
    hidden: true,
    earned: false,
    unlockedAt: null,
    seen: false,
  },
];

export const mockHealthScoreHigh: HomeHealthScore = {
  total: 85,
  maintenance: 22,
  inventory: 20,
  budget: 23,
  systems: 20,
  calculatedAt: '2026-03-15T08:00:00Z',
  pillarHints: ['Consider adding remaining assets to get full inventory score.'],
};

export const mockHealthScoreMedium: HomeHealthScore = {
  total: 52,
  maintenance: 10,
  inventory: 15,
  budget: 17,
  systems: 10,
  calculatedAt: '2026-03-15T08:00:00Z',
  pillarHints: [
    '3 overdue maintenance tasks are dragging your score down.',
    'Add warranty info for unlisted assets.',
    'Connect at least one IoT sensor to improve systems score.',
  ],
};

export const mockHealthScoreLow: HomeHealthScore = {
  total: 15,
  maintenance: 2,
  inventory: 5,
  budget: 4,
  systems: 4,
  calculatedAt: '2026-03-15T08:00:00Z',
  pillarHints: [
    '7 overdue maintenance tasks need attention.',
    'Only 2 assets tracked — add more to build your inventory.',
    'No budget transactions this month.',
    'No sensors registered.',
  ],
};

const mockEarnedAchievements: EarnedAchievement[] = [
  { id: 'ach-001', unlockedAt: '2024-01-15T10:00:00Z', seen: true },
  { id: 'ach-002', unlockedAt: '2024-02-20T14:00:00Z', seen: true },
  { id: 'ach-003', unlockedAt: '2024-04-01T09:00:00Z', seen: false },
];

const mockAllEarnedAchievements: EarnedAchievement[] = mockAchievements.map((a) => ({
  id: a.id,
  unlockedAt: '2025-01-01T00:00:00Z',
  seen: true,
}));

export const mockGamificationProfileLow: GamificationProfile = {
  xp: 0,
  level: 1,
  levelTitle: 'New Homeowner',
  xpToNextLevel: 100,
  achievements: [],
  streaks: {
    maintenance: { current: 0, best: 0, lastCompletedAt: null },
    budget: { current: 0, best: 0, lastMonth: null },
  },
  homeHealthScore: mockHealthScoreLow,
};

export const mockGamificationProfileMid: GamificationProfile = {
  xp: 450,
  level: 5,
  levelTitle: 'Home Manager',
  xpToNextLevel: 500,
  achievements: mockEarnedAchievements,
  streaks: {
    maintenance: { current: 12, best: 15, lastCompletedAt: '2026-03-14T00:00:00Z' },
    budget: { current: 3, best: 3, lastMonth: '2026-02-01' },
  },
  homeHealthScore: mockHealthScoreMedium,
};

export const mockGamificationProfileMax: GamificationProfile = {
  xp: 9999,
  level: 10,
  levelTitle: 'Grandmaster Homeowner',
  xpToNextLevel: 9999,
  achievements: mockAllEarnedAchievements,
  streaks: {
    maintenance: { current: 52, best: 52, lastCompletedAt: '2026-03-15T00:00:00Z' },
    budget: { current: 12, best: 12, lastMonth: '2026-02-01' },
  },
  homeHealthScore: mockHealthScoreHigh,
};

export const mockQuests: Quest[] = [
  {
    id: 'quest-001',
    title: 'Winter Prep Blitz',
    description:
      'Complete 3 seasonal maintenance tasks before the first freeze: check weatherstripping, inspect furnace, and clean gutters.',
    xpReward: 300,
    progress: 0,
    target: 3,
    category: 'maintenance',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    generatedBy: 'ava',
  },
  {
    id: 'quest-002',
    title: 'Budget on Track',
    description:
      "Keep monthly expenses under budget for the entire month of March. You're 60% through — keep it up!",
    xpReward: 150,
    progress: 60,
    target: 100,
    category: 'budget',
    expiresAt: '2026-03-31T23:59:59Z',
    generatedBy: 'system',
  },
  {
    id: 'quest-003',
    title: 'Inventory Complete',
    description: 'Add all 5 major appliances to your inventory with warranty info.',
    xpReward: 200,
    progress: 100,
    target: 5,
    category: 'inventory',
    expiresAt: null,
    generatedBy: 'system',
  },
];

// ── Sensors ───────────────────────────────────────────────────────────────────

export const mockSensorTemperatureActive: SensorEntry = {
  sensor: {
    id: 'sensor-temp-01',
    name: 'Living Room Thermostat',
    description: 'Temperature and humidity sensor in main living area',
    registeredAt: '2024-01-01T00:00:00Z',
    lastSeenAt: new Date(Date.now() - 30 * 1000).toISOString(), // 30 seconds ago
  },
  reading: {
    sensorId: 'sensor-temp-01',
    data: { temperature: 72.4, humidity: 45, unit: 'F' },
    receivedAt: new Date(Date.now() - 30 * 1000).toISOString(),
  },
  state: 'active',
};

export const mockSensorHumidityStale: SensorEntry = {
  sensor: {
    id: 'sensor-humid-01',
    name: 'Basement Humidity Monitor',
    description: 'Humidity sensor for moisture detection in basement',
    registeredAt: '2024-03-01T00:00:00Z',
    lastSeenAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(), // 8 minutes ago
  },
  reading: {
    sensorId: 'sensor-humid-01',
    data: { humidity: 68, temperature: 61, status: 'warning' },
    receivedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
  state: 'stale',
};

export const mockSensorEnergyOffline: SensorEntry = {
  sensor: {
    id: 'sensor-energy-01',
    name: 'Smart Energy Monitor',
    description: 'Whole-home energy consumption tracking',
    registeredAt: '2023-11-01T00:00:00Z',
    lastSeenAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  },
  reading: {
    sensorId: 'sensor-energy-01',
    data: { kwh: 2.4, watts: 1200, phase: 'A' },
    receivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  state: 'offline',
};

// ── Vault Entries ─────────────────────────────────────────────────────────────

export const mockVaultEntryPassword: VaultEntry = {
  id: 'vault-001',
  name: 'Home Router Admin',
  category: 'password',
  value: '[encrypted]',
  username: 'admin',
  url: 'http://192.168.1.1',
  tags: ['network', 'router'],
  notes: 'Changed from default credentials in Jan 2024.',
  createdAt: '2024-01-10T00:00:00Z',
  updatedAt: '2024-01-10T00:00:00Z',
};

export const mockVaultEntryApiKey: VaultEntry = {
  id: 'vault-002',
  name: 'OpenWeatherMap API Key',
  category: 'api-key',
  value: '[encrypted]',
  username: null,
  url: 'https://openweathermap.org',
  tags: ['weather', 'api'],
  notes: null,
  createdAt: '2024-02-01T00:00:00Z',
  updatedAt: '2024-02-01T00:00:00Z',
};

export const mockVaultEntryWifi: VaultEntry = {
  id: 'vault-003',
  name: 'Home WiFi — Main Network',
  category: 'wifi',
  value: '[encrypted]',
  username: 'MyHomeNetwork_5G',
  url: null,
  tags: ['wifi', 'guest'],
  notes: 'Share with guests when needed.',
  createdAt: '2023-06-01T00:00:00Z',
  updatedAt: '2023-06-01T00:00:00Z',
};

export const mockVaultEntryMinimal: VaultEntry = {
  id: 'vault-004',
  name: 'Alarm System Code',
  category: 'code',
  value: '[encrypted]',
  username: null,
  url: null,
  tags: [],
  notes: null,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};
