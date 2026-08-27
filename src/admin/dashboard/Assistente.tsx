import { useEffect, useRef, useState } from "react";
import { useAssistant, ASSISTANT_SUGGESTIONS } from "./useAssistant";
import styles from "../Admin.module.css";

export default function Assistente() {
  const { messages, loading, error, send, clear } = useAssistant();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const submit = (e: React.FormEvent) => { e.preventDefault(); send(input); setInput(""); };
  const empty = messages.length === 0;

  return (
    <div className={styles.container}>
      <div className={styles.pageHead}>
        <div>
          <div className={styles.pageTitle}>Assistente (IA)</div>
          <div className={styles.pageHint}>Pergunte sobre seus números — a IA responde com base nos dados do painel. É um teste inicial.</div>
        </div>
        {messages.length > 0 && <button className={styles.btn} onClick={clear}>Limpar conversa</button>}
      </div>

      <div className={styles.chatCard}>
        <div className={styles.chatScroll} ref={scrollRef}>
          {empty ? (
            <div className={styles.chatWelcome}>
              <div className={styles.chatSpark}>✦</div>
              <h3 className={styles.chatWelcomeTitle}>Como posso ajudar?</h3>
              <p className={styles.chatWelcomeSub}>Pergunte em linguagem natural. Alguns exemplos:</p>
              <div className={styles.chatSuggestions}>
                {ASSISTANT_SUGGESTIONS.map((s) => (
                  <button key={s} type="button" className={styles.chatSuggestion} onClick={() => send(s)}>{s}</button>
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

        {error && <div className={styles.error} style={{ margin: "0 16px 12px" }}>{error}</div>}

        <form className={styles.chatInputRow} onSubmit={submit}>
          <input
            className={styles.input}
            placeholder="Pergunte sobre faturamento, clientes, tarefas…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            autoFocus
          />
          <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={loading || !input.trim()}>
            {loading ? "Pensando…" : "Enviar"}
          </button>
        </form>
      </div>

      <p className={styles.chatDisclaimer}>
        A IA pode errar — confira números importantes no módulo correspondente. Roda na Workers AI da Cloudflare; nenhum dado sai da sua conta.
      </p>
    </div>
  );
}
