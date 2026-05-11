import { useState, useCallback } from "react";
import type { CMSPost, PublishResult } from "../types";

const GITHUB_OWNER = "cttjrodrigoalmeida-dot";
const GITHUB_REPO = "isapaulino";
const GITHUB_BRANCH = "main";
const FILE_PATH = "src/data/cmsPosts.json";

const API_BASE = "https://api.github.com";

async function githubFetch(
  path: string,
  token: string,
  options: RequestInit = {}
) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `GitHub API error: ${res.status}`);
  }
  return res.json();
}

export function useGitHub() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getStoredToken = () => localStorage.getItem("cms_github_token") || "";
  const setStoredToken = (t: string) => localStorage.setItem("cms_github_token", t);

  const testToken = useCallback(async (token: string): Promise<boolean> => {
    try {
      await githubFetch(
        `/repos/${GITHUB_OWNER}/${GITHUB_REPO}`,
        token
      );
      return true;
    } catch {
      return false;
    }
  }, []);

  const fetchPosts = useCallback(async (token: string): Promise<{ posts: CMSPost[]; sha: string }> => {
    setLoading(true);
    setError(null);
    try {
      const data = await githubFetch(
        `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${GITHUB_BRANCH}`,
        token
      );
      const base64 = data.content.replace(/\n/g, "");
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const content = new TextDecoder("utf-8").decode(bytes);
      const posts: CMSPost[] = JSON.parse(content);
      return { posts, sha: data.sha };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao buscar posts";
      if (msg.includes("404") || msg.includes("Not Found")) {
        return { posts: [], sha: "" };
      }
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSha = useCallback(async (token: string): Promise<string> => {
    try {
      const data = await githubFetch(
        `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${GITHUB_BRANCH}`,
        token
      );
      return data.sha as string;
    } catch {
      return "";
    }
  }, []);

  const savePosts = useCallback(
    async (
      token: string,
      posts: CMSPost[],
      sha: string,
      commitMessage: string
    ): Promise<PublishResult> => {
      setLoading(true);
      setError(null);
      try {
        let currentSha = sha;
        if (!currentSha) {
          currentSha = await fetchSha(token);
        }

        const contentStr = JSON.stringify(posts, null, 2);
        const encoded = btoa(unescape(encodeURIComponent(contentStr)));

        const body: Record<string, unknown> = {
          message: commitMessage,
          content: encoded,
          branch: GITHUB_BRANCH,
        };
        if (currentSha) body.sha = currentSha;

        const result = await githubFetch(
          `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`,
          token,
          { method: "PUT", body: JSON.stringify(body) }
        );

        return {
          success: true,
          message: "Post publicado com sucesso! 🎉",
          commitUrl: result?.commit?.html_url,
        };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Erro ao publicar";
        setError(msg);
        return { success: false, message: msg };
      } finally {
        setLoading(false);
      }
    },
    [fetchSha]
  );

  return {
    loading,
    error,
    getStoredToken,
    setStoredToken,
    testToken,
    fetchPosts,
    savePosts,
    repoUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`,
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
  };
}
