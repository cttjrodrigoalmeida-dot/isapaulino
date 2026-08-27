import { useState } from "react";
import { api, ApiError } from "../api";

export interface Msg { role: "user" | "assistant"; content: string }

export const ASSISTANT_SUGGESTIONS = [
  "Qual é o meu faturamento e quanto tenho a receber?",
  "Quais clientes estão com parcelas atrasadas?",
  "Quantos contratos assinados e quantas propostas aprovadas?",
  "Quais tarefas estão atrasadas ou para hoje?",
];

// Estado + envio do chat do assistente. Compartilhado pela seção da Gestão e
// pelo widget flutuante — cada um mantém sua própria conversa.
export function useAssistant() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    setError(null);
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
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

  const clear = () => { setMessages([]); setError(null); };

  return { messages, loading, error, send, clear };
}
