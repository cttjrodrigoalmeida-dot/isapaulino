import { useEffect, useRef, useState } from "react";
import { useAssistant, ASSISTANT_SUGGESTIONS } from "./useAssistant";
import styles from "../Admin.module.css";

// Chat flutuante no canto inferior. Usa o mesmo assistente da seção Gestão.
export default function AssistantFab({ onExpand }: { onExpand?: () => void }) {
  const { messages, loading, error, send, clear } = useAssistant();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
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

  const submit = (e: React.FormEvent) => { e.preventDefault(); send(input); setInput(""); };
  const empty = messages.length === 0;

  return (
    <>
      <button
        type="button"
        className={`${styles.fabBtn} ${open ? styles.fabBtnOpen : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Fechar assistente" : "Abrir assistente de IA"}
        title={open ? "Fechar assistente" : "Assistente de IA"}
      >
        {open ? "✕" : "✦"}
      </button>

      {open && (
        <div className={styles.fabPanel} role="dialog" aria-label="Assistente de IA">
          <div className={styles.fabHead}>
            <div className={styles.fabTitle}><span className={styles.fabSpark}>✦</span> Assistente IA</div>
            <div className={styles.fabHeadActions}>
              {messages.length > 0 && <button className={styles.fabHeadBtn} onClick={clear} title="Nova conversa">Limpar</button>}
              {onExpand && <button className={styles.fabHeadBtn} onClick={() => { onExpand(); setOpen(false); }} title="Abrir em tela cheia">⤢</button>}
              <button className={styles.fabHeadBtn} onClick={() => setOpen(false)} aria-label="Fechar">✕</button>
            </div>
          </div>

          <div className={styles.fabScroll} ref={scrollRef}>
            {empty ? (
              <div className={styles.fabWelcome}>
                <p className={styles.fabWelcomeSub}>Oi! Pergunte sobre seus números — faturamento, clientes, tarefas…</p>
                <div className={styles.fabSuggestions}>
                  {ASSISTANT_SUGGESTIONS.slice(0, 3).map((s) => (
                    <button key={s} type="button" className={styles.fabSuggestion} onClick={() => send(s)}>{s}</button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`${styles.chatMsg} ${m.role === "user" ? styles.chatMsgUser : styles.chatMsgAI}`}>
                  {m.role === "assistant" && <div className={styles.chatAvatar}>✦</div>}
                  <div className={styles.chatBubble}>{m.content}</div>
                </div>
              ))
            )}
            {loading && (
              <div className={`${styles.chatMsg} ${styles.chatMsgAI}`}>
                <div className={styles.chatAvatar}>✦</div>
                <div className={`${styles.chatBubble} ${styles.chatTyping}`}><span /><span /><span /></div>
              </div>
            )}
          </div>

          {error && <div className={styles.error} style={{ margin: "0 12px 10px", fontSize: 12 }}>{error}</div>}

          <form className={styles.fabInputRow} onSubmit={submit}>
            <input
              className={styles.input}
              placeholder="Pergunte algo…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={loading || !input.trim()}>
              {loading ? "…" : "➤"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
