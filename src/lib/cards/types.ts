// Shared card types for C7 Cards UI.
export type C7Color = "r" | "b" | "g" | "y" | "w";
export type C7Value =
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
  | "skip" | "rev" | "d2" | "wild" | "wd4";

export interface C7Card {
  c: C7Color;
  v: C7Value;
  chosen?: Exclude<C7Color, "w">;
}

export interface C7PublicState {
  discardTop: C7Card;
  deckSize: number;
  discardSize: number;
  hands: (C7Card[] | number)[]; // seat 0 = full hand, others = count
  turn: number;
  direction: 1 | -1;
  pendingDraw: number;
  activeColor: Exclude<C7Color, "w">;
  mustChooseColor: boolean;
  log: string[];
  finished: boolean;
  winner?: number;
}

export const C7_COLOR_LABEL: Record<Exclude<C7Color, "w">, string> = {
  r: "Red", b: "Blue", g: "Green", y: "Yellow",
};

export function cardLabel(card: C7Card): string {
  if (card.v === "wild") return "WILD";
  if (card.v === "wd4") return "+4";
  if (card.v === "d2") return "+2";
  if (card.v === "skip") return "⊘";
  if (card.v === "rev") return "↻";
  return card.v;
}

export function isPlayable(
  card: C7Card,
  top: C7Card,
  activeColor: Exclude<C7Color, "w">,
  pendingDraw: number,
): boolean {
  if (pendingDraw > 0) {
    if (top.v === "d2" && card.v === "d2") return true;
    if (top.v === "wd4" && card.v === "wd4") return true;
    return false;
  }
  if (card.c === "w") return true;
  if (card.c === activeColor) return true;
  if (card.v === top.v) return true;
  return false;
}
