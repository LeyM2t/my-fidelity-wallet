export function getOrCreateCustomerId(): string {
  if (typeof window === "undefined") return ""; // sécurité SSR

  const key = "fidelity.customerId";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `cid_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  window.localStorage.setItem(key, id);
  return id;
}
