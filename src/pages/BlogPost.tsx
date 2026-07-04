import { useParams, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import WhatsappFloat from '../components/WhatsappFloat'
import CustomCursor from '../components/CustomCursor'
import postsData from '../data/cmsPosts.json'
import type { CMSPost } from '../cms/types'
import { sanitizeHtml } from '../utils/sanitizeHtml'
import styles from './BlogPost.module.css'

const posts: CMSPost[] = postsData as CMSPost[]

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>()
  const post = posts.find((p) => p.slug === slug)

  if (!post) {
    return (
      <>
        <CustomCursor />
        <Navbar />
        <div className={styles.blogPostPage}>
          <div className={styles.notFound}>
            <h1 className={styles.notFoundTitle}>Post não encontrado</h1>
            <p className={styles.notFoundText}>O artigo que você procura não existe ou foi removido.</p>
            <Link to="/blog" className={styles.notFoundBtn}>← Voltar ao Blog</Link>
          </div>
        </div>
        <Footer />
        <WhatsappFloat />
      </>
    )
  }

  return (
    <>
      <CustomCursor />
      <Navbar />
      <div className={styles.blogPostPage}>
        {/* Cover Image */}
        {post.coverImage && (
          <div className={styles.coverWrapper}>
            <img src={post.coverImage} alt={post.coverImageAlt || post.title} className={styles.coverImage} />
          </div>
        )}

        {/* Article Header */}
        <div className={styles.articleHeader}>
          <Link to="/blog" className={styles.backLink}>← Voltar ao Blog</Link>
          <span className={styles.articleCategory}>{post.category}</span>
          <h1 className={styles.articleTitle}>{post.title}</h1>
          {post.subtitle && <p className={styles.articleSubtitle}>{post.subtitle}</p>}
          <div className={styles.articleMeta}>
            <span>{post.date}</span>
            <span>·</span>
            <span>{post.readTime} de leitura</span>
            <span>·</span>
            <span>{post.category}</span>
          </div>
        </div>

        {/* Article Content */}
        {post.content && (
          <div
            className={styles.articleContent}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
          />
        )}
      </div>
      <Footer />
      <WhatsappFloat />
    </>
  )
}
