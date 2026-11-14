import { useEffect, useRef, useState } from "react";

export const NOTIFICATION_POSITIONS = {
  "top-right": "Trên bên phải", "top-left": "Trên bên trái",
  "bottom-right": "Dưới bên phải", "bottom-left": "Dưới bên trái", "bottom-center": "Dưới chính giữa",
} as const;
type Preferences = { sound: boolean; position: keyof typeof NOTIFICATION_POSITIONS; dndUntil: number };
const defaults: Preferences = { sound: false, position: "top-right", dndUntil: 0 };

export function parseNotificationPreferences(value: string | null): Preferences {
  try {
    const data = JSON.parse(value ?? "null");
    return { sound: data?.sound === true,
      position: Object.hasOwn(NOTIFICATION_POSITIONS, data?.position) ? data.position : defaults.position,
      dndUntil: typeof data?.dndUntil === "number" && Number.isFinite(data.dndUntil) && data.dndUntil > 0 ? data.dndUntil : 0 };
  } catch { return defaults; }
}

export function useNotificationPreferences(subject: string) {
  const key = `dolores-notification-preferences:${subject}`;
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const current = useRef(preferences);
  const [clock, refreshClock] = useState(0);
  useEffect(() => {
    const sync = (event?: Event) => {
      if (event instanceof CustomEvent && event.detail?.key !== key) return;
      try {
        current.current = parseNotificationPreferences(event instanceof CustomEvent ? event.detail.value : localStorage.getItem(key));
        setPreferences(current.current);
      } catch { /* Browser settings remain usable when storage is unavailable. */ }
    };
    setPreferences(defaults); current.current = defaults; sync();
    window.addEventListener("storage", sync);
    window.addEventListener("dolores-notification-preferences", sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("dolores-notification-preferences", sync); };
  }, [key]);
  useEffect(() => {
    if (preferences.dndUntil <= Date.now()) return;
    const timer = window.setTimeout(() => refreshClock((value) => value + 1), Math.min(preferences.dndUntil - Date.now() + 50, 2_147_483_647));
    return () => clearTimeout(timer);
  }, [preferences.dndUntil, clock]);
  const update = (patch: Partial<Preferences>) => {
    current.current = { ...current.current, ...patch }; setPreferences(current.current);
    const value = JSON.stringify(current.current);
    try { localStorage.setItem(key, value); } catch { /* Keep the current session working without persistent storage. */ }
    window.dispatchEvent(new CustomEvent("dolores-notification-preferences", { detail: { key, value } }));
  };
  return { preferences, update, dnd: preferences.dndUntil > Date.now() };
}

let audio: AudioContext | undefined;
export function prepareNotificationSound() {
  try { audio ??= new AudioContext(); void audio.resume().catch(() => {}); } catch { /* Sound is optional and may be blocked by the browser. */ }
}
export function playNotificationSound() {
  if (!audio || audio.state !== "running") return;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.frequency.value = 660;
  gain.gain.setValueAtTime(.035, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .18);
  oscillator.connect(gain); gain.connect(audio.destination);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  oscillator.start(); oscillator.stop(audio.currentTime + .2);
}
