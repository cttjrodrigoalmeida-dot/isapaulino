import { useEffect, useState } from "react";
import type { BriefingSection } from "../components/briefing/types";
import { api, ApiError, type BriefingResponse } from "./api";
import styles from "./Admin.module.css";

export default function BriefingResponses({
  number,
  onBack,
}: {
  number: string;
  onBack: () => void;
}) {
  const [responses, setResponses] = useState<BriefingResponse[]>([]);
  const [sections, setSections] = useState<BriefingSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [{ briefing }, { responses }] = await Promise.all([
          api.getBriefing(number),
          api.listBriefingResponses(number),
        ]);
        if (!alive) return;
        setSections(briefing.sections);
        setResponses(responses);
      } catch (err) {
        if (alive) setError(err instanceof ApiError ? err.message : "Erro ao carregar.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [number]);

  const answered = (answers: Record<string, string>, qid: string) =>
    (answers[qid] ?? "").trim() !== "";

  // ids cobertos pelas seções (para detectar respostas/anexos "órfãos")
  const knownIds = new Set(sections.flatMap((s) => s.questions.map((q) => q.id)));

  // Miniatura de anexo (imagem inline; outros formatos viram link de download).
  const Attachment = ({ url }: { url: string }) => {
    const isImg = /\.(jpe?g|png|webp|avif|gif)$/i.test(url);
    return isImg ? (
      <a href={url} target="_blank" rel="noopener noreferrer" className={styles.refThumbLink}>
        <img src={url} alt="Anexo enviado" className={styles.refThumb} />
      </a>
    ) : (
      <a href={url} target="_blank" rel="noopener noreferrer" className={styles.answerView}>
        📎 Baixar anexo
      </a>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHead}>
        <div>
          <div className={styles.pageTitle}>Respostas · Briefing Nº {number}</div>
          <div className={styles.pageHint}>{responses.length} envio(s) recebido(s).</div>
        </div>
        <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onBack}>← Voltar</button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.loading}>Carregando…</div>
      ) : responses.length === 0 ? (
        <div className={styles.empty}>Nenhuma resposta recebida ainda.</div>
      ) : (
        <div className={styles.editorGrid}>
          {responses.map((r) => {
            const hasContent = (qid: string) => answered(r.answers, qid) || !!r.refImages[qid];
            const orphanIds = [
              ...new Set([...Object.keys(r.answers), ...Object.keys(r.refImages)]),
            ].filter((qid) => hasContent(qid) && !knownIds.has(qid));
            return (
              <div key={r.id} className={styles.card}>
                <div className={styles.blockHead}>
                  <div className={styles.cardTitle} style={{ margin: 0 }}>
                    {r.client || "Cliente"} · #{r.id}
                  </div>
                  <span className={styles.userTag}>
                    {new Date(r.submittedAt.replace(" ", "T") + "Z").toLocaleString("pt-BR")}
                  </span>
                </div>

                {sections.map((section) => {
                  const qs = section.questions.filter((q) => hasContent(q.id));
                  if (qs.length === 0) return null;
                  return (
                    <div key={section.id} className={styles.respGroup}>
                      <div className={styles.respGroupTitle}>
                        {section.kind === "ambiente" ? "Ambiente · " : ""}
                        {section.title}
                      </div>
                      {qs.map((q) => (
                        <div key={q.id} className={styles.field} style={{ marginBottom: 12 }}>
                          <label className={styles.label}>{q.text}</label>
                          {answered(r.answers, q.id) && (
                            <div className={styles.answerView}>{r.answers[q.id]}</div>
                          )}
                          {r.refImages[q.id] && <Attachment url={r.refImages[q.id]} />}
                        </div>
                      ))}
                    </div>
                  );
                })}

                {orphanIds.length > 0 && (
                  <div className={styles.respGroup}>
                    <div className={styles.respGroupTitle}>Outras respostas</div>
                    {orphanIds.map((qid) => (
                      <div key={qid} className={styles.field} style={{ marginBottom: 12 }}>
                        <label className={styles.label}>{qid}</label>
                        {answered(r.answers, qid) && (
                          <div className={styles.answerView}>{r.answers[qid]}</div>
                        )}
                        {r.refImages[qid] && <Attachment url={r.refImages[qid]} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
