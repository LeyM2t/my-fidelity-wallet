export type LocalWallet = {
  id: string;
  name: string;
  color: string;
  createdAt: number;
};

export type MainWalletConfig = {
  name: string;
  color: string;
};

export type CardWalletMap = Record<string, string>;

export const LOCAL_WALLETS_KEY = "fw_custom_wallets_v1";
export const LOCAL_MAIN_WALLET_CONFIG_KEY = "fw_main_wallet_config_v1";
export const LOCAL_CARD_WALLET_MAP_KEY = "fw_card_wallet_map_v1";

export const DEFAULT_WALLET_ID = "__all_cards__";
export const DEFAULT_MAIN_WALLET_NAME = "My main wallet";
export const DEFAULT_MAIN_WALLET_COLOR = "#18181b";
export const DEFAULT_CUSTOM_WALLET_COLOR = "#a16207";

const ALLOWED_WALLET_COLORS = [
  "#18181b",
  "#3f3f46",
  "#0f172a",
  "#1d4ed8",
  "#2563eb",
  "#7c3aed",
  "#9333ea",
  "#be185d",
  "#dc2626",
  "#ea580c",
  "#a16207",
  "#15803d",
] as const;

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function isValidHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

export function sanitizeWalletColor(
  value: unknown,
  fallback = DEFAULT_CUSTOM_WALLET_COLOR
): string {
  if (!isValidHexColor(value)) return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized;
}

export function getWalletColorChoices(): readonly string[] {
  return ALLOWED_WALLET_COLORS;
}

export function sanitizeWalletName(
  value: unknown,
  fallback: string,
  maxLength = 40
): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed || fallback;
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseLocalStorage()) return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!canUseLocalStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function removeKey(key: string) {
  if (!canUseLocalStorage()) return;
  window.localStorage.removeItem(key);
}

export function createLocalWalletId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeLocalWallet(value: unknown): LocalWallet | null {
  const item = value as Partial<LocalWallet> | null | undefined;
  const id = typeof item?.id === "string" ? item.id.trim() : "";
  const name = sanitizeWalletName(item?.name, "");
  const createdAt =
    typeof item?.createdAt === "number" && Number.isFinite(item.createdAt)
      ? item.createdAt
      : Date.now();
  const color = sanitizeWalletColor(item?.color, DEFAULT_CUSTOM_WALLET_COLOR);

  if (!id || !name) return null;

  return {
    id,
    name,
    color,
    createdAt,
  };
}

export function loadLocalWallets(): LocalWallet[] {
  const parsed = readJson<unknown[]>(LOCAL_WALLETS_KEY, []);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item) => normalizeLocalWallet(item))
    .filter((item): item is LocalWallet => Boolean(item))
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function saveLocalWallets(wallets: LocalWallet[]) {
  const normalized = wallets
    .map((wallet) => normalizeLocalWallet(wallet))
    .filter((item): item is LocalWallet => Boolean(item));

  writeJson(LOCAL_WALLETS_KEY, normalized);
}

export function addLocalWallet(input: {
  name: string;
  color?: string;
}): LocalWallet {
  const wallet: LocalWallet = {
    id: createLocalWalletId(),
    name: sanitizeWalletName(input.name, "Wallet"),
    color: sanitizeWalletColor(input.color, DEFAULT_CUSTOM_WALLET_COLOR),
    createdAt: Date.now(),
  };

  const wallets = loadLocalWallets();
  wallets.push(wallet);
  saveLocalWallets(wallets);

  return wallet;
}

export function updateLocalWallet(
  walletId: string,
  updates: Partial<Pick<LocalWallet, "name" | "color">>
): LocalWallet[] {
  const cleanWalletId = String(walletId || "").trim();
  if (!cleanWalletId || cleanWalletId === DEFAULT_WALLET_ID) {
    return loadLocalWallets();
  }

  const wallets = loadLocalWallets().map((wallet) => {
    if (wallet.id !== cleanWalletId) return wallet;

    return {
      ...wallet,
      name: updates.name !== undefined
        ? sanitizeWalletName(updates.name, wallet.name)
        : wallet.name,
      color: updates.color !== undefined
        ? sanitizeWalletColor(updates.color, wallet.color)
        : wallet.color,
    };
  });

  saveLocalWallets(wallets);
  return wallets;
}

export function deleteLocalWallet(walletId: string): LocalWallet[] {
  const cleanWalletId = String(walletId || "").trim();
  if (!cleanWalletId || cleanWalletId === DEFAULT_WALLET_ID) {
    return loadLocalWallets();
  }

  const wallets = loadLocalWallets().filter((wallet) => wallet.id !== cleanWalletId);
  saveLocalWallets(wallets);

  const map = loadCardWalletMap();
  let changed = false;

  Object.keys(map).forEach((cardId) => {
    if (map[cardId] === cleanWalletId) {
      delete map[cardId];
      changed = true;
    }
  });

  if (changed) {
    saveCardWalletMap(map);
  }

  return wallets;
}

export function loadMainWalletConfig(): MainWalletConfig {
  const parsed = readJson<Partial<MainWalletConfig>>(
    LOCAL_MAIN_WALLET_CONFIG_KEY,
    {}
  );

  return {
    name: sanitizeWalletName(parsed?.name, DEFAULT_MAIN_WALLET_NAME),
    color: sanitizeWalletColor(
      parsed?.color,
      DEFAULT_MAIN_WALLET_COLOR
    ),
  };
}

export function saveMainWalletConfig(config: Partial<MainWalletConfig>) {
  const current = loadMainWalletConfig();

  const next: MainWalletConfig = {
    name:
      config.name !== undefined
        ? sanitizeWalletName(config.name, current.name)
        : current.name,
    color:
      config.color !== undefined
        ? sanitizeWalletColor(config.color, current.color)
        : current.color,
  };

  writeJson(LOCAL_MAIN_WALLET_CONFIG_KEY, next);
  return next;
}

export function resetMainWalletConfig() {
  removeKey(LOCAL_MAIN_WALLET_CONFIG_KEY);
}

export function normalizeCardWalletMap(value: unknown): CardWalletMap {
  const raw = value as Record<string, unknown> | null | undefined;
  if (!raw || typeof raw !== "object") return {};

  const result: CardWalletMap = {};

  for (const [cardId, walletId] of Object.entries(raw)) {
    const cleanCardId = String(cardId || "").trim();
    const cleanWalletId = String(walletId || "").trim();

    if (!cleanCardId) continue;
    if (!cleanWalletId) continue;

    result[cleanCardId] = cleanWalletId;
  }

  return result;
}

export function loadCardWalletMap(): CardWalletMap {
  const parsed = readJson<Record<string, unknown>>(
    LOCAL_CARD_WALLET_MAP_KEY,
    {}
  );
  return normalizeCardWalletMap(parsed);
}

export function saveCardWalletMap(map: CardWalletMap) {
  writeJson(LOCAL_CARD_WALLET_MAP_KEY, normalizeCardWalletMap(map));
}

export function getCardWalletId(cardId: string): string {
  const cleanCardId = String(cardId || "").trim();
  if (!cleanCardId) return DEFAULT_WALLET_ID;

  const map = loadCardWalletMap();
  return map[cleanCardId] || DEFAULT_WALLET_ID;
}

export function setCardWallet(cardId: string, walletId: string) {
  const cleanCardId = String(cardId || "").trim();
  const cleanWalletId = String(walletId || "").trim() || DEFAULT_WALLET_ID;

  if (!cleanCardId) return loadCardWalletMap();

  const map = loadCardWalletMap();

  if (cleanWalletId === DEFAULT_WALLET_ID) {
    delete map[cleanCardId];
  } else {
    map[cleanCardId] = cleanWalletId;
  }

  saveCardWalletMap(map);
  return map;
}

export function moveCardToWallet(cardId: string, walletId: string) {
  return setCardWallet(cardId, walletId);
}

export function removeCardFromWalletMap(cardId: string) {
  const cleanCardId = String(cardId || "").trim();
  if (!cleanCardId) return loadCardWalletMap();

  const map = loadCardWalletMap();
  delete map[cleanCardId];
  saveCardWalletMap(map);
  return map;
}

export function getCardsForWallet<T extends { id: string }>(
  cards: T[],
  walletId: string
): T[] {
  const cleanWalletId = String(walletId || "").trim() || DEFAULT_WALLET_ID;

  if (cleanWalletId === DEFAULT_WALLET_ID) {
    return cards;
  }

  const map = loadCardWalletMap();
  return cards.filter((card) => map[String(card.id)] === cleanWalletId);
}

export function getWalletDisplayName(
  walletId: string,
  fallbackMainName = DEFAULT_MAIN_WALLET_NAME,
  fallbackCustomName = "Wallet"
): string {
  const cleanWalletId = String(walletId || "").trim();

  if (cleanWalletId === DEFAULT_WALLET_ID) {
    return loadMainWalletConfig().name || fallbackMainName;
  }

  const wallets = loadLocalWallets();
  const found = wallets.find((wallet) => wallet.id === cleanWalletId);
  return found?.name || fallbackCustomName;
}

export function getWalletDisplayColor(
  walletId: string,
  fallbackMainColor = DEFAULT_MAIN_WALLET_COLOR,
  fallbackCustomColor = DEFAULT_CUSTOM_WALLET_COLOR
): string {
  const cleanWalletId = String(walletId || "").trim();

  if (cleanWalletId === DEFAULT_WALLET_ID) {
    return loadMainWalletConfig().color || fallbackMainColor;
  }

  const wallets = loadLocalWallets();
  const found = wallets.find((wallet) => wallet.id === cleanWalletId);
  return found?.color || fallbackCustomColor;
}

export function clearAllWalletLocalData() {
  removeKey(LOCAL_WALLETS_KEY);
  removeKey(LOCAL_MAIN_WALLET_CONFIG_KEY);
  removeKey(LOCAL_CARD_WALLET_MAP_KEY);
}