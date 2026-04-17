"use client";

import { Component, ReactNode } from "react";
import { Box, Button, Heading, Text, VStack } from "@chakra-ui/react";
import { AlertCircle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" px={4}>
          <VStack gap={6} maxW="500px" textAlign="center">
            <Box color="red.500">
              <AlertCircle size={64} />
            </Box>
            <Heading size="xl" color="gray.800">
              Something went wrong
            </Heading>
            <Text color="gray.600" fontSize="lg">
              We&apos;re sorry, but something unexpected happened. Please try refreshing the page.
            </Text>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <Box
                bg="gray.100"
                p={4}
                borderRadius="md"
                w="full"
                textAlign="left"
                fontSize="sm"
                fontFamily="mono"
                overflowX="auto"
              >
                <Text fontWeight="bold" mb={2}>Error details:</Text>
                <Text color="red.600">{this.state.error.message}</Text>
                {this.state.error.stack && (
                  <Text color="gray.600" fontSize="xs" mt={2}>
                    {this.state.error.stack}
                  </Text>
                )}
              </Box>
            )}
            <Button
              colorPalette="blue"
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                window.location.reload();
              }}
            >
              Refresh Page
            </Button>
          </VStack>
        </Box>
      );
    }

    return this.props.children;
  }
}
