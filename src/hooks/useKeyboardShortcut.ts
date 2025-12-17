import { useEffect, useCallback } from "react";

interface UseKeyboardShortcutOptions {
  altKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  enabled?: boolean;
}

/**
 * Custom hook for keyboard shortcuts
 * @param key - The key to listen for (e.g., 's', 'Enter')
 * @param callback - Function to call when shortcut is triggered
 * @param options - Modifier keys and enabled state
 */
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  options: UseKeyboardShortcutOptions = {}
) {
  const {
    altKey = false,
    ctrlKey = false,
    shiftKey = false,
    enabled = true,
  } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const isAltMatch = altKey ? event.altKey : !event.altKey;
      const isCtrlMatch = ctrlKey ? event.ctrlKey : !event.ctrlKey;
      const isShiftMatch = shiftKey ? event.shiftKey : !event.shiftKey;
      const isKeyMatch = event.key.toLowerCase() === key.toLowerCase();

      if (isKeyMatch && isAltMatch && isCtrlMatch && isShiftMatch) {
        event.preventDefault();
        callback();
      }
    },
    [key, callback, altKey, ctrlKey, shiftKey, enabled]
  );

  useEffect(() => {
    if (enabled) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
}

/**
 * Hook specifically for Ctrl+S save shortcut
 * @param onSave - Function to call when Ctrl+S is pressed
 * @param enabled - Whether the shortcut is active (default: true)
 */
export function useSaveShortcut(onSave: () => void, enabled: boolean = true) {
  useKeyboardShortcut("s", onSave, { ctrlKey: true, enabled });
}
