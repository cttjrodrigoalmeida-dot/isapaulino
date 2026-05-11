import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import WhatsappFloat from '../components/WhatsappFloat'
import CustomCursor from '../components/CustomCursor'
import postsData from '../data/cmsPosts.json'
import type { CMSPost } from '../cms/types'
import styles from './Blog.module.css'

const posts: CMSPost[] = postsData as CMSPost[]

export default function Blog() {
  const featured = posts.find((p) => p.featured) || posts[0]
  const otherPosts = posts.filter((p) => p.slug !== featured?.slug)

  return (
    <>
      <CustomCursor />
      <Navbar />
      <div className={styles.blogPage}>
        {/* Header */}
        <div className={styles.blogHeader}>
          <h1 className={styles.blogTitle}>
            BLOG <span className={styles.blogTitleAccent}>ISABELA PAULINO</span>
          </h1>
          <p className={styles.blogSubtitle}>
            Artigos sobre arquitetura, detalhamento executivo, processos e tudo que envolve transformar ideias em projetos reais.
          </p>
        </div>

        {posts.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📝</div>
            <h2 className={styles.emptyTitle}>Em breve, novos conteúdos</h2>
            <p className={styles.emptyText}>Estamos preparando artigos especiais para você. Volte em breve!</p>
          </div>
        ) : (
          <>
            {/* Featured */}
            {featured && (
              <div className={styles.featuredCard}>
                <Link to={`/blog/${featured.slug}`} className={styles.featuredInner}>
                  {featured.coverImage ? (
                    <img src={featured.coverImage} alt={featured.coverImageAlt || featured.title} className={styles.featuredImage} />
                  ) : (
                    <div className={styles.postCardImagePlaceholder}>📄</div>
                  )}
                  <div className={styles.featuredContent}>
                    <span className={styles.featuredBadge}>⭐ {featured.category}</span>
                    <h2 className={styles.featuredPostTitle}>{featured.title}</h2>
                    <p className={styles.featuredPostSubtitle}>{featured.subtitle}</p>
                    <div className={styles.featuredMeta}>
                      <span>{featured.date}</span>
                      <span>·</span>
                      <span>{featured.readTime}</span>
                    </div>
                  </div>
                </Link>
              </div>
            )}

            {/* Grid */}
            {otherPosts.length > 0 && (
              <div className={styles.postsGrid}>
                {otherPosts.map((post) => (
                  <Link key={post.slug} to={`/blog/${post.slug}`} className={styles.postCard}>
                    {post.coverImage ? (
                      <img src={post.coverImage} alt={post.coverImageAlt || post.title} className={styles.postCardImage} loading="lazy" />
                    ) : (
                      <div className={styles.postCardImagePlaceholder}>📄</div>
                    )}
                    <div className={styles.postCardBody}>
                      <span className={styles.postCardCategory}>{post.category}</span>
                      <h3 className={styles.postCardTitle}>{post.title}</h3>
                      <div className={styles.postCardMeta}>
                        <span>{post.date}</span>
                        <span>·</span>
                        <span>{post.readTime}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
      <WhatsappFloat />
    </>
  )
}
