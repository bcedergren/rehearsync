"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "@/hooks/useApi";

interface ProcessingJob {
  id: string;
  jobType: string;
  status: string;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  childJobs: {
    id: string;
    jobType: string;
    status: string;
    errorMessage: string | null;
  }[];
}

interface UseProcessingJobReturn {
  job: ProcessingJob | null;
  isProcessing: boolean;
  error: string | null;
  startJob: (audioAssetId: string, jobType: string) => Promise<void>;
  reset: () => void;
}

export function useProcessingJob(
  onComplete?: () => void
): UseProcessingJobReturn {
  const [job, setJob] = useState<ProcessingJob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const pollJobStatus = useCallback(
    (jobId: string) => {
      intervalRef.current = setInterval(async () => {
        try {
          const data = await apiFetch<ProcessingJob>(
            `/processing/${jobId}`
          );
          setJob(data);

          if (data.status === "completed") {
            stopPolling();
            setIsProcessing(false);
            onComplete?.();
          } else if (data.status === "failed") {
            stopPolling();
            setIsProcessing(false);
            setError(data.errorMessage || "Processing failed");
          }
        } catch {
          // Silently retry on network errors
        }
      }, 5000);
    },
    [stopPolling, onComplete]
  );

  const startJob = useCallback(
    async (audioAssetId: string, jobType: string) => {
      setError(null);
      setIsProcessing(true);

      try {
        const result = await apiFetch<{ jobId: string; status: string }>(
          "/processing/start",
          {
            method: "POST",
            body: JSON.stringify({ audioAssetId, jobType }),
          }
        );

        setJob({
          id: result.jobId,
          jobType,
          status: result.status,
          errorMessage: null,
          startedAt: null,
          completedAt: null,
          childJobs: [],
        });

        pollJobStatus(result.jobId);
      } catch (err) {
        setIsProcessing(false);
        setError(
          err instanceof Error ? err.message : "Failed to start processing"
        );
      }
    },
    [pollJobStatus]
  );

  const reset = useCallback(() => {
    stopPolling();
    setJob(null);
    setIsProcessing(false);
    setError(null);
  }, [stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return { job, isProcessing, error, startJob, reset };
}
