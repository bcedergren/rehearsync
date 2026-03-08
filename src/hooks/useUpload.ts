"use client";

import { useState, useCallback } from "react";

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  storageObjectId: string | null;
}

export function useUpload() {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    storageObjectId: null,
  });

  const upload = useCallback(
    async (
      file: File,
      bandId: string,
      kind: "sheet_music" | "audio"
    ): Promise<string | null> => {
      setState({
        isUploading: true,
        progress: 5,
        error: null,
        storageObjectId: null,
      });

      try {
        // Step 1: Get a signed upload URL from our API
        setState((s) => ({ ...s, progress: 10 }));
        const signedRes = await fetch("/api/v1/uploads/signed-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bandId,
            kind,
            fileName: file.name,
            mimeType: file.type,
            fileSize: file.size,
          }),
        });

        const signedJson = await signedRes.json();
        if (!signedRes.ok) {
          throw new Error(signedJson.error?.message || "Failed to get upload URL");
        }

        const { signedUrl, token, storageObjectId } = signedJson.data;

        // Step 2: Upload directly to Supabase Storage using XMLHttpRequest for progress
        setState((s) => ({ ...s, progress: 20 }));

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const pct = Math.round(20 + (e.loaded / e.total) * 70);
              setState((s) => ({ ...s, progress: pct }));
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });

          xhr.addEventListener("error", () => reject(new Error("Upload failed")));
          xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

          xhr.open("PUT", signedUrl);
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.setRequestHeader("x-upsert", "false");
          if (token) {
            xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          }
          xhr.send(file);
        });

        setState({
          isUploading: false,
          progress: 100,
          error: null,
          storageObjectId,
        });

        return storageObjectId;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Upload failed";
        setState({
          isUploading: false,
          progress: 0,
          error: message,
          storageObjectId: null,
        });
        return null;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({
      isUploading: false,
      progress: 0,
      error: null,
      storageObjectId: null,
    });
  }, []);

  return { ...state, upload, reset };
}
