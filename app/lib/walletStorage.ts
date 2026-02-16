export type WalletCard = {
  id: string; // unique local id
  storeId: string;
  customerId: string;

  stamps: number;      // 0..target
  target: number;      // ex: 10
  rewardReady: boolean; // true si stamps >= target (ta logique actuelle peut varier)
  createdAt: number;
};

const STORAGE_KEY = "my_fidelity_wallet_cards_v1";

function safeParse(json: string | null): WalletCard[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? (v as WalletCard[]) : [];
  } catch {
    return [];
  }
}

function notifyWalletUpdated() {
  // important: compatible SSR
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("wallet_updated"));
}

export function getCards(): WalletCard[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
}

export function saveCards(cards: WalletCard[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  notifyWalletUpdated();
}

export function clearCards() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  notifyWalletUpdated();
}

export function addTestCard() {
  const cards = getCards();
  const now = Date.now();

  const newCard: WalletCard = {
    id: `card_${now}`,
    storeId: "demo_store",
    customerId: "demo_customer",
    stamps: 0,
    target: 10,
    rewardReady: false,
    createdAt: now,
  };

  saveCards([newCard, ...cards]);
}

/**
 * Optionnel si tu l’utilises déjà:
 * Met à jour une carte et déclenche l’event automatiquement via saveCards()
 */
export function upsertCard(updated: WalletCard) {
  const cards = getCards();
  const idx = cards.findIndex((c) => c.id === updated.id);
  const next = [...cards];

  if (idx >= 0) next[idx] = updated;
  else next.unshift(updated);

  saveCards(next);
}
