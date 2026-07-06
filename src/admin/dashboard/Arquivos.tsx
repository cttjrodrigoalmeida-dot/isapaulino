import { useEffect, useState, useCallback, useRef } from "react";
import { api, ApiError, type DocumentFile, type Client } from "../api";
import s from "./Dashboard.module.css";
import admin from "../Admin.module.css";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}
function fileIcon(name: string, type: string | null): string {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (type?.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(ext)) return "🖼️";
  if (ext === "pdf") return "📕";
  if (["doc", "docx"].includes(ext)) return "📘";
  if (["xls", "xlsx", "csv"].includes(ext)) return "📗";
  if (["zip", "rar", "7z"].includes(ext)) return "🗜️";
  if (["dwg", "dxf"].includes(ext)) return "📐";
  return "📄";
}

export default function Arquivos() {
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [folders, setFolders] = useState<{ name: string; count: number }[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState<string | null>(null); // pasta aberta (null = raiz)
  const [newFolder, setNewFolder] = useState("");
  const [uploadClient, setUploadClient] = useState("");
  const [search, setSearch] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ files, folders }, { clients }] = await Promise.all([api.listDocuments(), api.listClients()]);
      setFiles(files);
      setFolders(folders);
      setClients(clients);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createFolder = async () => {
    const name = newFolder.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      const { folder } = await api.createFolder(name);
      setNewFolder("");
      await load();
      setCurrent(folder);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao criar pasta.");
    } finally {
      setBusy(false);
    }
  };

  const removeFolder = async (f: { name: string; count: number }) => {
    const msg = f.count > 0
      ? `A pasta "${f.name}" tem ${f.count} arquivo(s). Excluir a pasta apaga TODOS eles (inclusive os vinculados a clientes, que somem da Área do Cliente). Esta ação não pode ser desfeita. Continuar?`
      : `Excluir a pasta "${f.name}"?`;
    if (!confirm(msg)) return;
    setBusy(true);
    setError(null);
    try {
      await api.deleteFolder(f.name);
      if (current === f.name) setCurrent(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao excluir a pasta.");
    } finally {
      setBusy(false);
    }
  };

  const doUpload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      await api.uploadDocument(file, current || undefined, uploadClient || undefined);
      if (fileInput.current) fileInput.current.value = "";
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao enviar.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (f: DocumentFile) => {
    if (!confirm(`Excluir "${f.name}"? Esta ação não pode ser desfeita.`)) return;
    setBusy(true);
    try {
      await api.deleteDocument(f.key);
      setFiles((prev) => prev.filter((x) => x.key !== f.key));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao excluir.");
    } finally {
      setBusy(false);
    }
  };

  const inFolder = current ? files.filter((f) => f.folder === current) : [];
  const shown = inFolder.filter((f) => !search || f.name.toLowerCase().includes(search.toLowerCase()));
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <>
      <div className={s.greeting}>
        <div>
          <h1 className={s.greetTitle}>Arquivos</h1>
          <p className={s.greetSub}>
            {current ? (
              <><span style={{ cursor: "pointer" }} onClick={() => setCurrent(null)}>Arquivos</span> › <strong>{current}</strong></>
            ) : (
              <>{folders.length} pasta(s) · {files.length} arquivo(s) · {formatBytes(totalBytes)}</>
            )}
          </p>
        </div>
        <button className={`${admin.btn} ${admin.btnGhost}`} onClick={load} disabled={loading}>Atualizar</button>
      </div>

      {error && <div className={admin.error}>{error}</div>}

      {loading ? (
        <div className={s.emptyMini}>Carregando…</div>
      ) : current === null ? (
        /* ── RAIZ: pastas ── */
        <>
          <div className={s.card} style={{ marginBottom: 16 }}>
            <div className={s.cardTitleX}>Nova pasta</div>
            <div className={s.cardSub} style={{ marginBottom: 12 }}>Organize seus documentos em pastas. Clique numa pasta para entrar e enviar arquivos.</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                className={admin.input}
                style={{ maxWidth: 260 }}
                placeholder="Nome da pasta. Ex: contratos, plantas…"
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") createFolder(); }}
                disabled={busy}
              />
              <button className={`${admin.btn} ${admin.btnPrimary}`} onClick={createFolder} disabled={busy || !newFolder.trim()}>
                Criar pasta
              </button>
            </div>
          </div>

          {folders.length === 0 ? (
            <div className={admin.empty}>Nenhuma pasta ainda. Crie a primeira acima.</div>
          ) : (
            <div className={`${s.grid} ${s.cols4}`}>
              {folders.map((f) => (
                <div
                  key={f.name}
                  className={s.card}
                  onClick={() => setCurrent(f.name)}
                  style={{ cursor: "pointer", textAlign: "left", border: "1px solid var(--color-border)", position: "relative" }}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFolder(f); }}
                    disabled={busy}
                    title={`Excluir pasta "${f.name}"`}
                    aria-label={`Excluir pasta ${f.name}`}
                    style={{ position: "absolute", top: 8, right: 8, background: "transparent", border: "none", cursor: "pointer", fontSize: 15, opacity: 0.55, padding: 4, lineHeight: 1 }}
                  >
                    🗑️
                  </button>
                  <div style={{ fontSize: 30, marginBottom: 6 }}>📁</div>
                  <div className={s.cardTitleX}>{f.name}</div>
                  <div className={s.cardSub}>{f.count} arquivo(s)</div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* ── DENTRO DE UMA PASTA ── */
        <>
          <div style={{ marginBottom: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className={`${admin.btn} ${admin.btnGhost}`} onClick={() => { setCurrent(null); setSearch(""); }}>← Voltar às pastas</button>
            <button
              className={`${admin.btn} ${admin.btnDanger}`}
              disabled={busy}
              onClick={() => removeFolder({ name: current, count: inFolder.length })}
            >
              🗑️ Excluir pasta
            </button>
          </div>

          <div className={s.card} style={{ marginBottom: 16 }}>
            <div className={s.cardTitleX}>Enviar para “{current}”</div>
            <div className={s.cardSub} style={{ marginBottom: 12 }}>Até 25 MB. Vincule a um cliente para ele ver na Área do Cliente dele.</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <select className={admin.input} style={{ maxWidth: 220 }} value={uploadClient} onChange={(e) => setUploadClient(e.target.value)} disabled={busy}>
                <option value="">Sem cliente (interno)</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input ref={fileInput} type="file" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) doUpload(f); }} />
              {busy && <span className={s.emptyMini} style={{ margin: 0 }}>Enviando…</span>}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <input className={admin.input} style={{ maxWidth: 260 }} placeholder="Buscar por nome…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {shown.length === 0 ? (
            <div className={admin.empty}>{inFolder.length === 0 ? "Pasta vazia. Envie o primeiro arquivo acima." : "Nada neste filtro."}</div>
          ) : (
            <div className={admin.tableScroll}>
              <table className={admin.table}>
                <thead>
                  <tr><th>Arquivo</th><th>Cliente</th><th>Tamanho</th><th>Enviado</th><th style={{ textAlign: "right" }}>Ações</th></tr>
                </thead>
                <tbody>
                  {shown.map((f) => (
                    <tr key={f.key}>
                      <td>{fileIcon(f.name, f.contentType)} {f.name}</td>
                      <td>{f.clientName ? <span className={`${admin.badge} ${admin.badgeSigned}`}>{f.clientName}</span> : <span style={{ opacity: 0.5 }}>—</span>}</td>
                      <td className={admin.mono}>{formatBytes(f.size)}</td>
                      <td>{fmtDate(f.uploaded)}</td>
                      <td>
                        <div className={admin.rowActions}>
                          <a className={`${admin.btn} ${admin.btnGhost}`} href={api.documentDownloadUrl(f.key)} target="_blank" rel="noopener noreferrer">Baixar</a>
                          <button className={`${admin.btn} ${admin.btnDanger}`} onClick={() => remove(f)} disabled={busy}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
