import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import Blog from './pages/Blog'
import BlogPost from './pages/BlogPost'
import { CMSApp } from './cms/CMSApp'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:slug" element={<BlogPost />} />
      <Route path="/cms" element={<CMSApp />} />
    </Routes>
  )
}

export default App
