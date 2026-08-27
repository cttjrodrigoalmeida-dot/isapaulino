import { useEffect, useState, useCallback } from "react";
import { api, type AdminUser } from "./api";
import Login from "./Login";
import styles from "./Admin.module.css";
import dash from "./dashboard/Dashboard.module.css";
import { useAdminTheme } from "./dashboard/useAdminTheme";
import Sidebar from "./dashboard/Sidebar";
import Topbar from "./dashboard/Topbar";
import QuickNav, { type QuickAction } from "./dashboard/QuickNav";
import Dashboard from "./dashboard/Dashboard";
import Calendar from "./dashboard/Calendar";
import Comercial from "./dashboard/Comercial";
import Clientes from "./dashboard/Clientes";
import Contratos from "./dashboard/Contratos";
import Projetos from "./dashboard/Projetos";
import Tarefas from "./dashboard/Tarefas";
import TabelaCustos from "./dashboard/TabelaCustos";
import Financeiro from "./dashboard/Financeiro";
import Relatorios from "./dashboard/Relatorios";
import Arquivos from "./dashboard/Arquivos";
import Auditoria from "./dashboard/Auditoria";
import Lixeira from "./dashboard/Lixeira";
import Armazenamento from "./dashboard/Armazenamento";
import Biblioteca from "./Biblioteca";
import HistoricoProjetos from "./HistoricoProjetos";
import Placeholder from "./dashboard/Placeholder";
import MinhaConta from "./dashboard/MinhaConta";
import { SECTIONS, type SectionId } from "./dashboard/sections";

export default function AdminApp() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [section, setSection] = useState<SectionId>("visao");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [comercialNew, setComercialNew] = useState<{ area: "proposals" | "briefings"; n: number } | null>(null);
  const [clientesNew, setClientesNew] = useState<number | null>(null);
  const [contratosNew, setContratosNew] = useState<number | null>(null);
  // Pasta a abrir ao ir para Arquivos (deep-link a partir do editor de cliente).
  const [arquivosFolder, setArquivosFolder] = useState<string | null>(null);

  const { theme, toggle } = useAdminTheme();

  const checkAuth = useCallback(async () => {
    try {
      const { user } = await api.me();
      setUser(user);
    } catch {
      setUser(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Painel · Isabela Paulino Studio";
    checkAuth();
  }, [checkAuth]);

  // toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);

  const logout = async () => {
    await api.logout().catch(() => {});
    setUser(null);
    setSection("visao");
  };

  const selectSection = (id: SectionId) => {
    // Navegação pela barra lateral sempre mostra a LISTA da seção. Limpamos os
    // sinais de "novo" (usados pelos atalhos) para que um clique antigo em
    // "Novo …" não reabra o formulário em branco ao remontar a seção.
    setComercialNew(null);
    setClientesNew(null);
    setContratosNew(null);
    setArquivosFolder(null); // nav pela barra abre Arquivos na raiz (não no deep-link antigo)
    setSection(id);
    setSidebarOpen(false);
  };

  const goComercialNew = (area: "proposals" | "briefings") => {
    setComercialNew({ area, n: Date.now() });
    setSection("comercial");
  };

  const goClientesNew = () => {
    setClientesNew(Date.now());
    setSection("clientes");
  };

  const goContratosNew = () => {
    setContratosNew(Date.now());
    setSection("contratos");
  };

  const onQuickAction = (a: QuickAction) => {
    if (a === "proposta") return goComercialNew("proposals");
    if (a === "briefing") return goComercialNew("briefings");
    if (a === "cliente") return goClientesNew();
    if (a === "contrato") return goContratosNew();
    if (a === "recebimento") return selectSection("financeiro");
    if (a === "relatorio") return selectSection("relatorios");
    if (a === "lembrete") return selectSection("financeiro");
    if (a === "projeto") return selectSection("projetos");
    setToast("Esse módulo — em breve neste painel.");
  };

  if (checking) {
    return (
      <div className={styles.shell} data-theme={theme}>
        <div className={styles.loading}>Carregando…</div>
      </div>
    );
  }

  if (!user) {
    return <Login onLoggedIn={checkAuth} />;
  }

  const current = SECTIONS.find((sec) => sec.id === section);

  const renderSection = () => {
    switch (section) {
      case "visao":
        return <Dashboard username={user.name || user.username} onGoComercial={() => setSection("comercial")} onGoContratos={() => setSection("contratos")} onGoProjetos={() => setSection("projetos")} onGoAgenda={() => setSection("calendario")} onGoClientes={() => setSection("clientes")} />;
      case "comercial":
        return <Comercial requestNew={comercialNew} />;
      case "clientes":
        return <Clientes requestNew={clientesNew} onGoArquivos={(folder) => { setArquivosFolder(folder); setSection("arquivos"); }} />;
      case "contratos":
        return <Contratos requestNew={contratosNew} />;
      case "projetos":
        return <Projetos onGoComercial={() => setSection("comercial")} />;
      case "tarefas":
        return <Tarefas />;
      case "tabela":
        return <TabelaCustos />;
      case "historico":
        return <HistoricoProjetos />;
      case "biblioteca":
        return <Biblioteca />;
      case "financeiro":
        return <Financeiro />;
      case "relatorios":
        return <Relatorios />;
      case "arquivos":
        return <Arquivos key={arquivosFolder ?? "root"} initialFolder={arquivosFolder} />;
      case "auditoria":
        return <Auditoria />;
      case "lixeira":
        return <Lixeira />;
      case "calendario":
        return <Calendar />;
      case "armazenamento":
        return <Armazenamento />;
      default:
        return <Placeholder title={current?.label ?? ""} sub={`${current?.sub ?? ""}. Este módulo entra nas próximas etapas do sistema.`} />;
    }
  };

  return (
    <div className={styles.shell} data-theme={theme}>
      <div className={dash.layout}>
        <Sidebar active={section} onSelect={selectSection} open={sidebarOpen} />
        <div className={dash.main}>
          <div className={dash.stickyHeader}>
            <Topbar
              username={user.name || user.username}
              theme={theme}
              onToggleTheme={toggle}
              onAccount={() => setAccountOpen(true)}
              onLogout={logout}
              onToggleSidebar={() => setSidebarOpen((o) => !o)}
              onNavigate={(sec) => {
                if (SECTIONS.some((x) => x.id === sec)) selectSection(sec as SectionId);
              }}
            />
            <QuickNav onAction={onQuickAction} />
          </div>
          <div className={dash.content}>{renderSection()}</div>
        </div>
      </div>

      {accountOpen && <MinhaConta onClose={() => setAccountOpen(false)} onSaved={(u) => setUser(u)} />}
      {toast && <div className={dash.toast}>{toast}</div>}
    </div>
  );
}
