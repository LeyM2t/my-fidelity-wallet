export type WalletCard = {
  id: string;              // identifiant unique de LA carte (instance)
  merchantId: string;      // identifiant commerce (ex: "get-your-crepe")
  merchantName: string;
  stamps: number;
  goal: number;
  rewardAvailable: boolean;
  createdAt: number;
};

const KEY = "my_fidelity_wallet_v1";
const CUSTOMER_KEY = "my_fidelity_customer_id_v1";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

export function getOrCreateCustomerId(): string {
  if (typeof window === "undefined") return "unknown";
  const existing = localStorage.getItem(CUSTOMER_KEY);
  if (existing) return existing;

  const created = crypto?.randomUUID?.() ?? generateId();
  localStorage.setItem(CUSTOMER_KEY, created);
  return created;
}

export function getCards(): WalletCard[] {
  if (typeof window === "undefined") return [];
  return safeParse<WalletCard[]>(localStorage.getItem(KEY)) ?? [];
}

export function saveCards(cards: WalletCard[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(cards));
}

export function clearCards(): WalletCard[] {
  saveCards([]);
  return [];
}

function createNewActiveCard(
  merchantId: string,
  merchantName: string,
  goal: number,
  initialStamps = 0
): WalletCard {
  return {
    id: `${merchantId}#${generateId()}`,
    merchantId,
    merchantName,
    stamps: initialStamps,
    goal: Number.isFinite(goal) && goal > 0 ? goal : 10,
    rewardAvailable: false,
    createdAt: Date.now(),
  };
}

export function ensureActiveCard(
  merchantId: string,
  merchantName: string,
  goal: number
): WalletCard[] {
  const cards = getCards();
  const hasActive = cards.some((c) => c.merchantId === merchantId && !c.rewardAvailable);
  if (hasActive) return cards;

  const newActive = createNewActiveCard(merchantId, merchantName || "Commerce", goal, 0);
  const next = [newActive, ...cards];
  saveCards(next);
  return next;
}

export function addTestCard(): WalletCard[] {
  return ensureActiveCard("get-your-crepe", "Get Your Crêpe", 10);
}

export function applyAddStampsToCard(
  cardId: string,
  add: number
): { nextCards: WalletCard[]; rewardsGained: number; activeCardIdAfter?: string } {
  const cards = getCards();
  const idx = cards.findIndex((c) => c.id === cardId);
  if (idx === -1) return { nextCards: cards, rewardsGained: 0 };

  const card = cards[idx];
  const safeAdd = Math.max(0, Math.floor(add));
  if (safeAdd === 0) return { nextCards: cards, rewardsGained: 0 };

  // on n'ajoute pas sur une carte "récompense"
  if (card.rewardAvailable) return { nextCards: cards, rewardsGained: 0 };

  const goal = card.goal > 0 ? card.goal : 10;
  const total = card.stamps + safeAdd;

  const rewardsGained = Math.floor(total / goal);
  const remainder = total % goal;

  const nextCards = [...cards];

  if (rewardsGained <= 0) {
    nextCards[idx] = { ...card, stamps: total };
    saveCards(nextCards);
    return { nextCards, rewardsGained: 0 };
  }

  // la carte actuelle devient "récompense"
  nextCards[idx] = { ...card, stamps: goal, rewardAvailable: true };

  // nouvelle carte en cours avec le reste
  const newActive = createNewActiveCard(card.merchantId, card.merchantName, goal, remainder);
  nextCards.unshift(newActive);

  saveCards(nextCards);
  return { nextCards, rewardsGained, activeCardIdAfter: newActive.id };
}

export function consumeReward(
  cardId: string
): { nextCards: WalletCard[]; removed: boolean } {
  const cards = getCards();
  const card = cards.find((c) => c.id === cardId) ?? null;
  if (!card || !card.rewardAvailable) return { nextCards: cards, removed: false };

  const next = cards.filter((c) => c.id !== cardId);
  saveCards(next);
  return { nextCards: next, removed: true };
}
