import { useEffect, useRef, useState } from "react";
import styles from "./AreaCliente.module.css";

interface Msg { role: "user" | "assistant"; content: string }

const SUGGESTIONS = [
  "Quando vence meu próximo pagamento?",
  "Quanto já paguei e quanto falta?",
  "Em que fase está meu projeto?",
];

// Chat flutuante da Área do Cliente. Usa /api/client/assistant (só os dados
// do próprio cliente). Herda o tema (claro/escuro) via os tokens --ac-* do .page.
export default function ClientAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    setError(null);
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/client/assistant", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const b = await res.json().catch(() => ({}));
      if (res.ok) setMessages([...next, { role: "assistant", content: b.answer || "" }]);
      else { setError(b?.error || "Não consegui responder agora."); setMessages(next); }
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setMessages(next);
    } finally {
      setLoading(false);
    }
  };

  const submit = (e: React.FormEvent) => { e.preventDefault(); send(input); };
  const empty = messages.length === 0;

  return (
    <>
      <button
        type="button"
        className={`${styles.acFabBtn} ${open ? styles.acFabBtnOpen : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Fechar assistente" : "Abrir assistente"}
        title={open ? "Fechar" : "Precisa de ajuda?"}
      >
        {open ? "✕" : "✦"}
      </button>

      {open && (
        <div className={styles.acFabPanel} role="dialog" aria-label="Assistente">
          <div className={styles.acFabHead}>
            <div className={styles.acFabTitle}><span className={styles.acFabSpark}>✦</span> Posso ajudar?</div>
            <div style={{ display: "flex", gap: 4 }}>
              {messages.length > 0 && <button className={styles.acFabHeadBtn} onClick={() => { setMessages([]); setError(null); }}>Limpar</button>}
              <button className={styles.acFabHeadBtn} onClick={() => setOpen(false)} aria-label="Fechar">✕</button>
            </div>
          </div>

          <div className={styles.acFabScroll} ref={scrollRef}>
            {empty ? (
              <div className={styles.acFabWelcome}>
                <p className={styles.acFabWelcomeSub}>Oi! 👋 Tire dúvidas sobre seu projeto — pagamentos, contrato ou andamento.</p>
                <div className={styles.acFabSuggestions}>
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" className={styles.acFabSuggestion} onClick={() => send(s)}>{s}</button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`${styles.acFabMsg} ${m.role === "user" ? styles.acFabMsgUser : styles.acFabMsgAI}`}>
                  {m.role === "assistant" && <div className={styles.acFabAvatar}>✦</div>}
                  <div className={styles.acFabBubble}>{m.content}</div>
                </div>
              ))
            )}
            {loading && (
              <div className={`${styles.acFabMsg} ${styles.acFabMsgAI}`}>
                <div className={styles.acFabAvatar}>✦</div>
                <div className={`${styles.acFabBubble} ${styles.acFabTyping}`}><span /><span /><span /></div>
              </div>
            )}
          </div>

          {error && <div className={styles.acFabError}>{error}</div>}

          <form className={styles.acFabInputRow} onSubmit={submit}>
            <input
              className={styles.acFabInput}
              placeholder="Escreva sua dúvida…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <button type="submit" className={styles.acFabSend} disabled={loading || !input.trim()} aria-label="Enviar">
              {loading ? "…" : "➤"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
