"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";

const BASE_URL = "/api/v1";

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  const json = await res.json();

  if (!res.ok) {
    const errorMessage = json.error?.message || "Request failed";
    throw new Error(errorMessage);
  }

  return json.data;
}

export function useApiQuery<T>(
  key: string[],
  path: string,
  options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">
) {
  return useQuery<T>({
    queryKey: key,
    queryFn: () => apiFetch<T>(path),
    ...options,
  });
}

export function useApiMutation<TData, TVariables>(
  path: string,
  method: "POST" | "PATCH" | "DELETE" = "POST",
  options?: {
    invalidateKeys?: string[][];
    onSuccess?: (data: TData) => void;
  }
) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
    mutationFn: (variables) =>
      apiFetch<TData>(path, {
        method,
        body: JSON.stringify(variables),
      }),
    onSuccess: (data) => {
      if (options?.invalidateKeys) {
        options.invalidateKeys.forEach((key) =>
          queryClient.invalidateQueries({ queryKey: key })
        );
      }
      options?.onSuccess?.(data);
    },
  });
}

export { apiFetch };
