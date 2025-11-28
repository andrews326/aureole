// src/utils/url.ts


export function makeAbsoluteUrl(path: string | null | undefined) {
    if (!path) return path;
  
    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  
    if (path.startsWith("http")) return path;
  
    return base + path;
  }
  