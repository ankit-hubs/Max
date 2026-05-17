"use client";

import { useEffect } from "react";

type KeyHandler = (e: KeyboardEvent) => void;

interface ShortcutConfig {
  [key: string]: KeyHandler;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const combo = [
        e.ctrlKey && "ctrl",
        e.metaKey && "meta",
        e.shiftKey && "shift",
        e.altKey && "alt",
        key,
      ]
        .filter(Boolean)
        .join("+");

      for (const [shortcut, fn] of Object.entries(shortcuts)) {
        const normalizedShortcut = shortcut.toLowerCase();
        if (combo === normalizedShortcut) {
          e.preventDefault();
          fn(e);
          break;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcuts, enabled]);
}
