"use client";

import { useState, useEffect } from "react";

const cache = new Map<string, { url: string; expires: number }>();

export function useSignedUrl(objectKey: string | null): string | null {
  const [url, setUrl] = useState<string | null>(() => {
    if (!objectKey) return null;
    const cached = cache.get(objectKey);
    if (cached && cached.expires > Date.now()) return cached.url;
    return null;
  });

  useEffect(() => {
    if (!objectKey) {
      setUrl(null);
      return;
    }

    const cached = cache.get(objectKey);
    if (cached && cached.expires > Date.now()) {
      setUrl(cached.url);
      return;
    }

    let cancelled = false;

    fetch("/api/v1/files/signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objectKey }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.data?.signedUrl) {
          // Cache for 50 minutes (URL valid for 60)
          cache.set(objectKey, {
            url: json.data.signedUrl,
            expires: Date.now() + 50 * 60 * 1000,
          });
          setUrl(json.data.signedUrl);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [objectKey]);

  return url;
}

export function useSignedUrls(
  objectKeys: string[]
): Record<string, string | null> {
  const [urls, setUrls] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (objectKeys.length === 0) return;

    const toFetch = objectKeys.filter((key) => {
      const cached = cache.get(key);
      return !cached || cached.expires <= Date.now();
    });

    // Set cached URLs immediately
    const initial: Record<string, string | null> = {};
    for (const key of objectKeys) {
      const cached = cache.get(key);
      initial[key] = cached && cached.expires > Date.now() ? cached.url : null;
    }
    setUrls(initial);

    if (toFetch.length === 0) return;

    let cancelled = false;

    Promise.all(
      toFetch.map((key) =>
        fetch("/api/v1/files/signed-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ objectKey: key }),
        })
          .then((res) => res.json())
          .then((json) => ({ key, url: json.data?.signedUrl || null }))
          .catch(() => ({ key, url: null }))
      )
    ).then((results) => {
      if (cancelled) return;
      const updated: Record<string, string | null> = { ...initial };
      for (const { key, url } of results) {
        if (url) {
          cache.set(key, { url, expires: Date.now() + 50 * 60 * 1000 });
        }
        updated[key] = url;
      }
      setUrls(updated);
    });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectKeys.join(",")]);

  return urls;
}
