import Link from "next/link";

type LocalCard = {
  storeId: string;
  storeName: string;
  city: string;
  stamps: number;
  goal: number;
};

const LOCAL_CARDS: LocalCard[] = [
  { storeId: "get-your-crepe", storeName: "Get Your Crepe", city: "Wellington", stamps: 3, goal: 10 },
  { storeId: "sushi-kiwi", storeName: "Sushi Kiwi", city: "Lower Hutt", stamps: 7, goal: 10 },
  { storeId: "cafe-brewtown", storeName: "Cafe Brewtown", city: "Upper Hutt", stamps: 1, goal: 8 },
];

export default function CardsPage() {
  return (
    <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Mes cartes</h1>

      <div style={{ display: "grid", gap: 12 }}>
        {LOCAL_CARDS.map((card) => {
          const ratio = Math.min(1, card.stamps / card.goal);
          const percent = Math.round(ratio * 100);
          const almost = card.goal - card.stamps <= 2;

          return (
            <Link
              key={card.storeId}
              href={`/cards/${card.storeId}`}
              style={{
                display: "block",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 12,
                padding: 16,
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{card.storeName}</div>

                    {almost && (
                      <span
                        style={{
                          fontSize: 12,
                          padding: "2px 8px",
                          borderRadius: 999,
                          border: "1px solid rgba(255,255,255,0.2)",
                          opacity: 0.9,
                        }}
                      >
                        Bientot recompense
                      </span>
                    )}
                  </div>

                  <div style={{ opacity: 0.7, marginTop: 4 }}>{card.city}</div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>
                    {card.stamps}/{card.goal}
                  </div>
                  <div style={{ opacity: 0.7, marginTop: 4 }}>tampons</div>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div
                  style={{
                    height: 10,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.10)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${percent}%`,
                      height: "100%",
                      background: "rgba(255,255,255,0.55)",
                    }}
                  />
                </div>
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.65 }}>{percent}%</div>
              </div>
            </Link>
          );
        })}
      </div>

      <p style={{ opacity: 0.6, marginTop: 16 }}>(Etape 2.5 — UX uniquement)</p>
    </main>
  );
}
