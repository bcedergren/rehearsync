"use client";

import { Flex, Box } from "@chakra-ui/react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { PlanSwitcher } from "@/components/admin/PlanSwitcher";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Flex minH="100vh" bg="gray.50">
      <Sidebar />
      <Box flex={1} display="flex" flexDirection="column">
        <Navbar />
        <Box as="main" p={8} flex={1}>
          {children}
        </Box>
      </Box>
      <PlanSwitcher />
    </Flex>
  );
}
