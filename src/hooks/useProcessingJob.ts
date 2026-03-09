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
  progress: number | null;
  progressLabel: string | null;
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
  progress: number | null;
  progressLabel: string | null;
  startJob: (audioAssetId: string, jobType: string) => Promise<void>;
  resumeJob: (jobId: string, jobType: string) => void;
  reset: () => void;
}

export function useProcessingJob(
  onComplete?: () => void
): UseProcessingJobReturn {
  const [job, setJob] = useState<ProcessingJob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const pollJobStatus = useCallback(
    (jobId: string) => {
      // Avoid duplicate intervals
      stopPolling();

      intervalRef.current = setInterval(async () => {
        try {
          const data = await apiFetch<ProcessingJob>(
            `/processing/${jobId}`
          );
          setJob(data);
          setProgress(data.progress);
          setProgressLabel(data.progressLabel);

          if (data.status === "completed") {
            stopPolling();
            setIsProcessing(false);
            setProgress(100);
            setProgressLabel(null);
            onComplete?.();
          } else if (data.status === "failed") {
            stopPolling();
            setIsProcessing(false);
            setProgress(null);
            setProgressLabel(null);
            setError(data.errorMessage || "Processing failed");
          }
        } catch {
          // Silently retry on network errors
        }
      }, 3000);
    },
    [stopPolling, onComplete]
  );

  const resumeJob = useCallback(
    (jobId: string, jobType: string) => {
      setError(null);
      setIsProcessing(true);
      setProgress(null);
      setProgressLabel(null);
      setJob({
        id: jobId,
        jobType,
        status: "running",
        errorMessage: null,
        startedAt: null,
        completedAt: null,
        progress: null,
        progressLabel: null,
        childJobs: [],
      });
      pollJobStatus(jobId);
    },
    [pollJobStatus]
  );

  const startJob = useCallback(
    async (audioAssetId: string, jobType: string) => {
      setError(null);
      setIsProcessing(true);
      setProgress(null);
      setProgressLabel(null);

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
          progress: null,
          progressLabel: null,
          childJobs: [],
        });

        pollJobStatus(result.jobId);
      } catch (err) {
        setIsProcessing(false);
        setProgress(null);
        setProgressLabel(null);
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
    setProgress(null);
    setProgressLabel(null);
  }, [stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return { job, isProcessing, error, progress, progressLabel, startJob, resumeJob, reset };
}
