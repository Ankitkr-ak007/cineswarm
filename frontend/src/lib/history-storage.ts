export interface SavedSession {
  id: string;
  mood?: string;
  title?: string;
  mode: "mood" | "title" | "quickpick";
  createdAt: string;
}

const STORAGE_KEY = "cineswarm_history";

export function getHistoryFromStorage(): SavedSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Failed to read history from localStorage", err);
    return [];
  }
}

export function saveSessionToHistory(session: Omit<SavedSession, "createdAt">) {
  if (typeof window === "undefined") return;
  try {
    const existing = getHistoryFromStorage();
    // Prevent duplicate entries for same session ID
    const filtered = existing.filter((item) => item.id !== session.id);
    const newSession: SavedSession = {
      ...session,
      createdAt: new Date().toISOString(),
    };
    const updated = [newSession, ...filtered].slice(0, 50); // Keep last 50
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to save session to localStorage", err);
  }
}

export function clearLocalHistory() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear localStorage history", err);
  }
}
