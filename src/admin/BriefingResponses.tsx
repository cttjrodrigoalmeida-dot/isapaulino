import { useEffect, useState } from "react";
import type { BriefingSection } from "../components/briefing/types";
import SectionFigure from "../components/briefing/SectionFigure";
import { api, ApiError, type BriefingResponse } from "./api";
import styles from "./Admin.module.css";

// Respostas no MESMO formato do template do cliente: seção por seção, com a
// imagem do ambiente (pinos numerados) e as perguntas numeradas na ordem —
// assim dá pra ver exatamente a que ponto da foto cada resposta se refere.
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
  // Edição das respostas pelo admin (sobrescreve).
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  // Bloqueio manual das respostas (preserva o briefing após iniciar os trabalhos).
  const [locked, setLocked] = useState(false);
  const [lockBusy, setLockBusy] = useState(false);

  const startEdit = (r: BriefingResponse) => { setEditingId(r.id); setDraft({ ...r.answers }); setNotice(null); setError(null); };
  const cancelEdit = () => { setEditingId(null); setDraft({}); };
  const saveEdit = async (r: BriefingResponse) => {
    setSaving(true); setError(null);
    try {
      await api.updateBriefingResponse(number, r.id, draft);
      setResponses((prev) => prev.map((x) => (x.id === r.id ? { ...x, answers: { ...draft } } : x)));
      setEditingId(null); setDraft({});
      setNotice("Respostas atualizadas.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar.");
    } finally { setSaving(false); }
  };

  const toggleLock = async () => {
    const next = !locked;
    if (next && !confirm("Bloquear a edição deste briefing?\n\nO cliente continuará VISUALIZANDO, mas não poderá mais alterar as respostas. Você (admin) ainda pode editar por aqui. Use isso ao iniciar os trabalhos, para preservar o briefing que embasou o projeto.")) return;
    setLockBusy(true); setError(null); setNotice(null);
    try {
      await api.lockBriefing(number, next);
      setLocked(next);
      setNotice(next ? "Briefing bloqueado — o cliente agora só visualiza." : "Briefing desbloqueado — o cliente pode editar novamente.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao alterar o bloqueio.");
    } finally { setLockBusy(false); }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [{ briefing, locked }, { responses }] = await Promise.all([
          api.getBriefing(number),
          api.listBriefingResponses(number),
        ]);
        if (!alive) return;
        setSections(briefing.sections);
        setResponses(responses);
        setLocked(!!locked);
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

  // Uma pergunta pode ter vários anexos (imagens/PDFs). Normaliza o formato
  // guardado (string legada OU array) para uma lista de URLs.
  const refList = (r: BriefingResponse, qid: string): string[] => {
    const v = r.refImages[qid];
    return Array.isArray(v) ? v.filter(Boolean) : v ? [v] : [];
  };

  // ids cobertos pelas seções (para detectar respostas/anexos "órfãos")
  const knownIds = new Set(sections.flatMap((s) => s.questions.map((q) => q.id)));

  // bloco de continuação = seção ambiente com o MESMO título da anterior
  const isContinuation = (i: number) => {
    const s = sections[i];
    const p = sections[i - 1];
    return (
      !!p && s.kind === "ambiente" && p.kind === "ambiente" &&
      s.title.trim().toLowerCase() === p.title.trim().toLowerCase()
    );
  };

  // ── Exportação (CSV / PDF / Arquivos) ──
  // Monta as linhas (seção · pergunta · resposta · anexo) de uma resposta.
  const rowsFor = (r: BriefingResponse) => {
    const rows: { section: string; question: string; answer: string; attachment: string }[] = [];
    for (const section of sections) {
      for (const q of section.questions) {
        if (!(answered(r.answers, q.id) || refList(r, q.id).length)) continue;
        rows.push({ section: section.title, question: q.text, answer: r.answers[q.id] ?? "", attachment: refList(r, q.id).join(" | ") });
      }
    }
    for (const qid of [...new Set([...Object.keys(r.answers), ...Object.keys(r.refImages)])]) {
      if (knownIds.has(qid) || !(answered(r.answers, qid) || refList(r, qid).length)) continue;
      rows.push({ section: "Outras respostas", question: qid, answer: r.answers[qid] ?? "", attachment: refList(r, qid).join(" | ") });
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

  const isImgUrl = (url: string) => /\.(jpe?g|png|webp|avif|gif)$/i.test(url);

  // PDF no formato do template: imagem do ambiente com pinos numerados,
  // perguntas numeradas e anexos do cliente embutidos como imagem.
  const exportPdf = (r: BriefingResponse) => {
    const esc = (s: string) => (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    let body = "";
    for (let si = 0; si < sections.length; si++) {
      const section = sections[si];
      const hasAny = section.questions.length > 0 || (section.kind === "ambiente" && section.image);
      if (!hasAny) continue;
      const contLabel = isContinuation(si) ? " · continuação" : "";
      body += `<h2>${section.kind === "ambiente" ? "Ambiente · " : ""}${esc(section.title)}${contLabel}</h2>`;
      if (section.kind === "ambiente" && section.image) {
        const pins = section.questions
          .map((q, i) =>
            q.pin
              ? `<span class="pin" style="left:${q.pin.x}%;top:${q.pin.y}%"><span class="pinN">${i + 1}</span>${q.pin.label ? `<span class="pinL">${esc(q.pin.label)}</span>` : ""}</span>`
              : ""
          )
          .join("");
        body += `<div class="fig"><div class="figIn"><img src="${esc(section.image)}" alt="">${pins}</div></div>`;
      }
      section.questions.forEach((q, i) => {
        const val = (r.answers[q.id] ?? "").trim();
        body += `<div class="q"><span class="qn">${String(i + 1).padStart(2, "0")}</span> ${esc(q.text)}</div>`;
        body += `<div class="a${val ? "" : " empty"}">${val ? esc(val) : "— sem resposta"}</div>`;
        for (const att of refList(r, q.id)) {
          body += isImgUrl(att)
            ? `<img class="att" src="${esc(att)}" alt="Anexo">`
            : `<div class="a">📎 ${esc(att)}</div>`;
        }
      });
    }
    // respostas fora do template atual
    const orphans = [...new Set([...Object.keys(r.answers), ...Object.keys(r.refImages)])].filter(
      (qid) => !knownIds.has(qid) && (answered(r.answers, qid) || refList(r, qid).length)
    );
    if (orphans.length > 0) {
      body += `<h2>Outras respostas</h2>`;
      for (const qid of orphans) {
        body += `<div class="q">${esc(qid)}</div><div class="a">${esc(r.answers[qid] ?? "")}</div>`;
        for (const att of refList(r, qid)) {
          body += isImgUrl(att) ? `<img class="att" src="${esc(att)}" alt="Anexo">` : `<div class="a">📎 ${esc(att)}</div>`;
        }
      }
    }
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Briefing ${number} — ${esc(r.client || "Cliente")}</title>
<style>
body{font-family:Inter,Arial,sans-serif;color:#1a1a1a;padding:32px;max-width:840px;margin:auto}
h1{font-size:20px;margin:0}
h2{font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#8a6d3b;margin:26px 0 8px;border-bottom:1px solid #e5e0d8;padding-bottom:4px}
.meta{color:#666;font-size:12px;margin-bottom:8px}
.fig{text-align:center;margin:10px 0 16px}
.figIn{position:relative;display:inline-block;line-height:0}
.figIn img{max-width:100%;max-height:430px;width:auto;height:auto;border-radius:10px;border:1px solid #e2ddd4}
.pin{position:absolute;transform:translate(-50%,-50%);display:inline-flex;flex-direction:column;align-items:center;gap:2px;line-height:1}
.pinN{width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font:700 10px/1 monospace;color:#fff;background:#f0506e;border:1px solid #fff;border-radius:50%}
.pinL{font:700 7px/1.4 monospace;letter-spacing:.05em;text-transform:uppercase;color:#fff;background:rgba(240,80,110,.92);padding:1px 4px;border-radius:3px;white-space:nowrap}
.q{font-weight:600;font-size:13px;margin-top:12px}
.qn{font:700 10px/1 monospace;color:#a08d6a;margin-right:4px}
.a{font-size:13px;white-space:pre-wrap;margin-top:2px;color:#333}
.a.empty{color:#b3aca0;font-style:italic}
.att{display:block;max-width:320px;max-height:260px;border-radius:8px;border:1px solid #e2ddd4;margin:6px 0 2px}
@media print{.fig,.att{break-inside:avoid}}
</style>
</head><body><h1>Briefing Nº ${number}</h1><div class="meta">${esc(r.client || "Cliente")} · ${esc(submittedLabel(r))}</div>${body}</body></html>`;
    const w = window.open("", "_blank");
    if (!w) { setError("Permita pop-ups para gerar o PDF (ou use Exportar CSV)."); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    // espera as imagens carregarem antes de imprimir (com teto de 4s)
    const waits = Array.from(w.document.images).map(
      (img) =>
        new Promise<void>((res) => {
          if (img.complete) return res();
          img.onload = () => res();
          img.onerror = () => res();
        })
    );
    const timeout = new Promise<void>((res) => setTimeout(res, 4000));
    Promise.race([Promise.all(waits).then(() => undefined), timeout]).then(() =>
      setTimeout(() => w.print(), 150)
    );
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

  // Miniatura de anexo (imagem inline; PDF/outros viram link de download).
  const Attachment = ({ url }: { url: string }) => {
    return isImgUrl(url) ? (
      <a href={url} target="_blank" rel="noopener noreferrer" className={styles.refThumbLink}>
        <img src={url} alt="Anexo enviado" className={styles.refThumb} />
      </a>
    ) : (
      <a href={url} target="_blank" rel="noopener noreferrer" className={styles.answerView}>
        📎 {/\.pdf$/i.test(url) ? "Baixar PDF" : "Baixar anexo"}
      </a>
    );
  };
  // Lista de anexos de uma pergunta (vários possíveis).
  const Attachments = ({ urls }: { urls: string[] }) =>
    urls.length ? (
      <span className={styles.refThumbRow}>
        {urls.map((u, i) => (
          <Attachment key={i} url={u} />
        ))}
      </span>
    ) : null;

  const numBadge = (i: number) => (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10.5,
        fontWeight: 700,
        color: "var(--color-accent)",
        minWidth: 22,
        display: "inline-block",
      }}
    >
      {String(i + 1).padStart(2, "0")}
    </span>
  );

  return (
    <div className={styles.container}>
      <div className={styles.pageHead}>
        <div>
          <div className={styles.pageTitle}>
            Respostas · Briefing Nº {number}
            {locked && <span className={`${styles.badge} ${styles.badgeAmber}`} style={{ marginLeft: 10, verticalAlign: "middle" }}>🔒 Bloqueado</span>}
          </div>
          <div className={styles.pageHint}>
            {responses.length} envio(s) recebido(s). As respostas seguem o template do cliente —
            a imagem de cada ambiente aparece com os pinos numerados.
            {locked
              ? " Edição bloqueada: o cliente só visualiza (você ainda edita por aqui)."
              : " O cliente pode editar e reenviar até você bloquear."}
          </div>
        </div>
        <div className={styles.rowActions}>
          <button
            className={`${styles.btn} ${locked ? styles.btnPrimary : styles.btnGhost}`}
            onClick={toggleLock}
            disabled={lockBusy}
            title={locked ? "Permitir que o cliente edite novamente" : "Impedir novas edições do cliente (preserva o briefing)"}
          >
            {lockBusy ? "…" : locked ? "🔓 Desbloquear edição" : "🔒 Bloquear edição"}
          </button>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onBack}>← Voltar</button>
        </div>
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
            const hasContent = (qid: string) => answered(r.answers, qid) || refList(r, qid).length > 0;
            const orphanIds = [
              ...new Set([...Object.keys(r.answers), ...Object.keys(r.refImages)]),
            ].filter((qid) => hasContent(qid) && !knownIds.has(qid));
            return (
              <div key={r.id} className={styles.card}>
                <div className={styles.blockHead}>
                  <div className={styles.cardTitle} style={{ margin: 0 }}>
                    {r.client || "Cliente"} · #{r.id}
                  </div>
                  <span className={styles.userTag}>{submittedLabel(r)}</span>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                  {editingId === r.id ? (
                    <>
                      <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => saveEdit(r)} disabled={saving}>
                        {saving ? "Salvando…" : "Salvar respostas"}
                      </button>
                      <button className={`${styles.btn} ${styles.btnGhost}`} onClick={cancelEdit} disabled={saving}>Cancelar</button>
                    </>
                  ) : (
                    <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => startEdit(r)} disabled={editingId !== null}>
                      ✏ Editar respostas
                    </button>
                  )}
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

                {sections.map((section, si) => {
                  const showSection =
                    section.questions.length > 0 || (section.kind === "ambiente" && !!section.image);
                  if (!showSection) return null;
                  return (
                    <div key={section.id} className={styles.respGroup}>
                      <div className={styles.respGroupTitle}>
                        {section.kind === "ambiente" ? "Ambiente · " : ""}
                        {section.title}
                        {isContinuation(si) ? " · continuação" : ""}
                      </div>

                      {/* imagem do ambiente com os pinos numerados (igual o cliente vê) */}
                      {section.kind === "ambiente" && section.image && (
                        <SectionFigure section={section} />
                      )}

                      {section.questions.map((q, i) => {
                        const editing = editingId === r.id;
                        const val = (r.answers[q.id] ?? "").trim();
                        return (
                          <div key={q.id} className={styles.field} style={{ marginBottom: 12 }}>
                            <label className={styles.label}>
                              {numBadge(i)} {q.text}
                            </label>
                            {editing ? (
                              <textarea
                                className={styles.textarea}
                                rows={2}
                                value={draft[q.id] ?? ""}
                                placeholder="— sem resposta"
                                onChange={(e) => setDraft((d) => ({ ...d, [q.id]: e.target.value }))}
                              />
                            ) : val ? (
                              <div className={styles.answerView}>{val}</div>
                            ) : (
                              <div
                                className={styles.answerView}
                                style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}
                              >
                                — sem resposta
                              </div>
                            )}
                            <Attachments urls={refList(r, q.id)} />
                          </div>
                        );
                      })}
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
                        <Attachments urls={refList(r, qid)} />
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
