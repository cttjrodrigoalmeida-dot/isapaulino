import { useCallback, useEffect, useState } from "react";

export type AdminTheme = "light" | "dark";
const KEY = "ips_admin_theme";

function read(): AdminTheme {
  try {
    const v = window.localStorage.getItem(KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    /* ignore */
  }
  return "light"; // padrão claro (igual ao PDF)
}

/** Tema do painel (claro padrão), persistido em localStorage. Escopo: só o admin. */
export function useAdminTheme() {
  const [theme, setTheme] = useState<AdminTheme>(read);

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const toggle = useCallback(
    () => setTheme((t) => (t === "light" ? "dark" : "light")),
    []
  );

  return { theme, toggle, setTheme };
}
