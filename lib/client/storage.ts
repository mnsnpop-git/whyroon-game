"use client";

const PROFILE_KEY = "raraeng-profile";
const ROOM_KEY = "raraeng-room";

export interface SavedProfile {
  nickname: string;
  emoji: string;
  avatar?: string | null;
}

function safeGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

export function loadProfile(): SavedProfile | null {
  const raw = safeGet(PROFILE_KEY);
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as SavedProfile;
    return typeof p.nickname === "string" && typeof p.emoji === "string" ? p : null;
  } catch {
    return null;
  }
}

export function saveProfile(p: SavedProfile) {
  safeSet(PROFILE_KEY, JSON.stringify(p));
}

export function loadLastRoom() {
  return safeGet(ROOM_KEY);
}

export function saveLastRoom(code: string | null) {
  safeSet(ROOM_KEY, code);
}
