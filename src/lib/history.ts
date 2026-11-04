/** Analysis history stored locally in the browser (no paid service). */
export type HistoryEntry = {
  id: string;
  date: string;
  isBottle: boolean;
  confidence: number | null;
  thumbnail: string; // annotated JPEG data URL
};

const KEY = "bottle-check-history";
const MAX = 30;

export function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function addHistory(e: HistoryEntry): HistoryEntry[] {
  const list = [e, ...loadHistory()].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 10)));
  }
  return list;
}

export function clearHistory() {
  localStorage.removeItem(KEY);
}
