"use client";

import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <ErrorBoundary>
      <SessionProvider basePath="/api/v1/auth">
        <QueryClientProvider client={queryClient}>
          <ChakraProvider value={defaultSystem}>
            {children}
            <Toaster />
          </ChakraProvider>
        </QueryClientProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
}
