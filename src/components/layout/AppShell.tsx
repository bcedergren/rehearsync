"use client";

import { Flex, Box } from "@chakra-ui/react";
import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { PlanSwitcher } from "@/components/admin/PlanSwitcher";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <Flex minH="100vh" bg="gray.50">
      {/* Desktop sidebar */}
      <Box display={{ base: "none", md: "block" }}>
        <Sidebar />
      </Box>

      {/* Mobile drawer overlay */}
      {mobileNavOpen && (
        <Box
          position="fixed"
          inset={0}
          zIndex={40}
          display={{ base: "block", md: "none" }}
        >
          {/* Backdrop */}
          <Box
            position="fixed"
            inset={0}
            bg="blackAlpha.500"
            onClick={() => setMobileNavOpen(false)}
          />
          {/* Drawer */}
          <Box
            position="fixed"
            top={0}
            left={0}
            bottom={0}
            zIndex={41}
            w="240px"
            bg="white"
            shadow="xl"
            overflowY="auto"
          >
            <Sidebar onNavigate={() => setMobileNavOpen(false)} />
          </Box>
        </Box>
      )}

      <Box flex={1} display="flex" flexDirection="column" minW={0}>
        <Navbar onMenuToggle={() => setMobileNavOpen((v) => !v)} />
        <Box as="main" p={{ base: 4, md: 8 }} flex={1}>
          {children}
        </Box>
      </Box>
      <PlanSwitcher />
    </Flex>
  );
}
