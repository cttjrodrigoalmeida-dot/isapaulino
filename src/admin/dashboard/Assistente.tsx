import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../api";
import styles from "../Admin.module.css";

interface Msg { role: "user" | "assistant"; content: string }

const SUGGESTIONS = [
  "Qual é o meu faturamento e quanto tenho a receber?",
  "Quais clientes estão com parcelas atrasadas?",
  "Quantos contratos assinados e quantas propostas aprovadas?",
  "Quais tarefas estão atrasadas ou para hoje?",
];

export default function Assistente() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    setError(null);
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { answer } = await api.askAssistant(next);
      setMessages([...next, { role: "assistant", content: answer }]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não consegui falar com a IA agora.");
      setMessages(next); // mantém a pergunta; permite tentar de novo
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); send(input); };
  const empty = messages.length === 0;

  return (
    <div className={styles.container}>
      <div className={styles.pageHead}>
        <div>
          <div className={styles.pageTitle}>Assistente (IA)</div>
          <div className={styles.pageHint}>Pergunte sobre seus números — a IA responde com base nos dados do painel. É um teste inicial.</div>
        </div>
        {messages.length > 0 && (
          <button className={styles.btn} onClick={() => { setMessages([]); setError(null); }}>Limpar conversa</button>
        )}
      </div>

      <div className={styles.chatCard}>
        <div className={styles.chatScroll} ref={scrollRef}>
          {empty ? (
            <div className={styles.chatWelcome}>
              <div className={styles.chatSpark}>✦</div>
              <h3 className={styles.chatWelcomeTitle}>Como posso ajudar?</h3>
              <p className={styles.chatWelcomeSub}>Pergunte em linguagem natural. Alguns exemplos:</p>
              <div className={styles.chatSuggestions}>
                {SUGGESTIONS.map((s) => (
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

        <form className={styles.chatInputRow} onSubmit={onSubmit}>
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
