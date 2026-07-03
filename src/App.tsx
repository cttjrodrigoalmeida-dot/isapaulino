import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import HomePage from './pages/HomePage'
import Blog from './pages/Blog'
import BlogPost from './pages/BlogPost'
import Bio from './pages/Bio'
import Proposta from './pages/Proposta'
import Briefing from './pages/Briefing'
import Contrato from './pages/Contrato'
import AreaCliente from './pages/AreaCliente'
// Painel admin e CMS (pesados) carregados sob demanda — ficam fora do
// bundle das páginas públicas.
const AdminApp = lazy(() => import('./admin/AdminApp'))
const CMSApp = lazy(() => import('./cms/CMSApp').then((m) => ({ default: m.CMSApp })))

function ScrollToTop() {
  const { pathname } = useLocation()
  
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  
  return null
}

function App() {
  useEffect(() => {
    // Força a página a carregar no topo no F5/Refresh
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }
    window.scrollTo(0, 0)
  }, [])

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/bio" element={<Bio />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/proposta/:number" element={<Proposta />} />
        <Route path="/briefing/:number" element={<Briefing />} />
        <Route path="/contrato/:slug" element={<Contrato />} />
        <Route path="/area" element={<AreaCliente />} />
        <Route
          path="/cms"
          element={
            <Suspense fallback={null}>
              <CMSApp />
            </Suspense>
          }
        />
        <Route
          path="/admin"
          element={
            <Suspense fallback={null}>
              <AdminApp />
            </Suspense>
          }
        />
      </Routes>
    </>
  )
}

export default App
