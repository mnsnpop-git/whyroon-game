import type { OhanaState } from "./types";

export interface DrinkRank {
  id: string;
  n: number;
  rank: number; // อันดับแบบเสมอกันได้ (1, 1, 3)
  reasons: [string, number][];
}

/** จัดอันดับคนดื่ม มาก → น้อย (รวมคนที่ออกจากห้องไปแล้วแต่เคยดื่ม) */
export function rankDrinkers(state: OhanaState): DrinkRank[] {
  const drinks = state.drinks ?? {};
  const ids = [...new Set([...state.order, ...Object.keys(drinks).filter((id) => drinks[id] > 0)])];
  const rows = ids
    .map((id) => ({
      id,
      n: drinks[id] ?? 0,
      reasons: Object.entries(state.drinkBy?.[id] ?? {}).sort((a, b) => b[1] - a[1]),
    }))
    .sort((a, b) => b.n - a.n);
  return rows.map((r) => ({ ...r, rank: rows.findIndex((x) => x.n === r.n) + 1 }));
}
