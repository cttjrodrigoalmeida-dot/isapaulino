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
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

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

  // ── Exportação (CSV / PDF / Arquivos) ──
  // Monta as linhas (seção · pergunta · resposta · anexo) de uma resposta.
  const rowsFor = (r: BriefingResponse) => {
    const rows: { section: string; question: string; answer: string; attachment: string }[] = [];
    for (const section of sections) {
      for (const q of section.questions) {
        if (!(answered(r.answers, q.id) || r.refImages[q.id])) continue;
        rows.push({ section: section.title, question: q.text, answer: r.answers[q.id] ?? "", attachment: r.refImages[q.id] ?? "" });
      }
    }
    for (const qid of [...new Set([...Object.keys(r.answers), ...Object.keys(r.refImages)])]) {
      if (knownIds.has(qid) || !(answered(r.answers, qid) || r.refImages[qid])) continue;
      rows.push({ section: "Outras respostas", question: qid, answer: r.answers[qid] ?? "", attachment: r.refImages[qid] ?? "" });
    }
    return rows;
  };
  const fileBase = (r: BriefingResponse) => `briefing-${number}-${(r.client || "cliente").replace(/[^\w-]+/g, "_")}`;
  const submittedLabel = (r: BriefingResponse) => new Date(r.submittedAt.replace(" ", "T") + "Z").toLocaleString("pt-BR");

  const buildCsv = (r: BriefingResponse) => {
    const esc = (s: string) => `"${(s ?? "").replace(/"/g, '""')}"`;
    const header = ["Seção", "Pergunta", "Resposta", "Anexo"].map(esc).join(",");
    const lines = rowsFor(r).map((row) => [row.section, row.question, row.answer, row.attachment].map(esc).join(","));
    return "﻿" + [header, ...lines].join("\r\n"); // BOM p/ Excel abrir acentos certo
  };

  const exportCsv = (r: BriefingResponse) => {
    const blob = new Blob([buildCsv(r)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileBase(r)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportPdf = (r: BriefingResponse) => {
    const esc = (s: string) => (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    let body = "";
    let cur = "";
    for (const row of rowsFor(r)) {
      if (row.section !== cur) { body += `<h2>${esc(row.section)}</h2>`; cur = row.section; }
      const val = esc(row.answer) || (row.attachment ? `📎 ${esc(row.attachment)}` : "—");
      body += `<div class="q">${esc(row.question)}</div><div class="a">${val}</div>`;
    }
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Briefing ${number} — ${esc(r.client || "Cliente")}</title>
<style>body{font-family:Inter,Arial,sans-serif;color:#1a1a1a;padding:32px;max-width:820px;margin:auto}h1{font-size:20px;margin:0}h2{font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#8a6d3b;margin:22px 0 4px;border-bottom:1px solid #e5e0d8;padding-bottom:4px}.meta{color:#666;font-size:12px;margin-bottom:8px}.q{font-weight:600;font-size:13px;margin-top:12px}.a{font-size:13px;white-space:pre-wrap;margin-top:2px;color:#333}</style>
</head><body><h1>Briefing Nº ${number}</h1><div class="meta">${esc(r.client || "Cliente")} · ${esc(submittedLabel(r))}</div>${body}</body></html>`;
    const w = window.open("", "_blank");
    if (!w) { setError("Permita pop-ups para gerar o PDF (ou use Exportar CSV)."); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const saveToArquivos = async (r: BriefingResponse) => {
    const folder = window.prompt("Salvar a resposta (CSV) em qual pasta de Arquivos?", "briefings");
    if (folder === null) return;
    setBusyId(r.id);
    setError(null);
    setNotice(null);
    try {
      const file = new File([buildCsv(r)], `${fileBase(r)}.csv`, { type: "text/csv" });
      const res = await api.uploadDocument(file, folder.trim() || "briefings");
      setNotice(`Resposta salva em Arquivos → pasta “${res.folder}”.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar em Arquivos.");
    } finally {
      setBusyId(null);
    }
  };

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
      {notice && <div className={styles.notice}>{notice}</div>}

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

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                  <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => exportCsv(r)}>
                    ⬇ Exportar CSV
                  </button>
                  <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => exportPdf(r)}>
                    🖨 PDF
                  </button>
                  <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => saveToArquivos(r)} disabled={busyId === r.id}>
                    {busyId === r.id ? "Salvando…" : "📁 Salvar em Arquivos"}
                  </button>
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
