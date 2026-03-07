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
        progress: 10,
        error: null,
        storageObjectId: null,
      });

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("bandId", bandId);
        formData.append("kind", kind);

        setState((s) => ({ ...s, progress: 30 }));

        const res = await fetch("/api/v1/uploads", {
          method: "POST",
          body: formData,
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error?.message || "Upload failed");
        }

        const storageObjectId = json.data.storageObjectId as string;

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
