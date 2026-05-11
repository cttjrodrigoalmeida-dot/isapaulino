import { useState, useCallback } from "react";
import type { CMSPost } from "../types";

export const CATEGORIES = ["Arquitetura", "Detalhamento", "Interiores", "Dicas", "Processos"];

// Gera slug a partir do título
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// Estima tempo de leitura
export function estimateReadTime(html: string): string {
  const text = html.replace(/<[^>]+>/g, "");
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min`;
}

// Formata data em pt-BR
export function formatDateBR(iso: string): string {
  if (!iso) return "";
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()} de ${months[d.getMonth()]}, ${d.getFullYear()}`;
}

// Hoje em formato ISO
export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function createEmptyPost(): CMSPost {
  return {
    slug: "",
    title: "",
    subtitle: "",
    category: "Arquitetura",
    date: formatDateBR(todayISO()),
    readTime: "1 min",
    coverImage: "",
    coverImageAlt: "",
    featured: false,
    content: "",
    seoTitle: "",
    metaDescription: "",
  };
}

export function usePosts(initialPosts: CMSPost[] = []) {
  const [posts, setPosts] = useState<CMSPost[]>(initialPosts);
  const [sha, setSha] = useState<string>("");

  const addPost = useCallback((post: CMSPost) => {
    setPosts((prev) => [post, ...prev]);
  }, []);

  const updatePost = useCallback((slug: string, updated: CMSPost) => {
    setPosts((prev) => prev.map((p) => (p.slug === slug ? updated : p)));
  }, []);

  const deletePost = useCallback((slug: string) => {
    setPosts((prev) => prev.filter((p) => p.slug !== slug));
  }, []);

  const reorderPost = useCallback((slug: string, direction: "up" | "down") => {
    setPosts((prev) => {
      const idx = prev.findIndex((p) => p.slug === slug);
      if (idx < 0) return prev;
      const next = [...prev];
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }, []);

  return { posts, setPosts, sha, setSha, addPost, updatePost, deletePost, reorderPost, CATEGORIES };
}
