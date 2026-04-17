import { Box, Button, Heading, Text, VStack } from "@chakra-ui/react";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action, children }: EmptyStateProps) {
  return (
    <Box
      textAlign="center"
      py={12}
      px={6}
      borderRadius="lg"
      bg="gray.50"
      borderWidth="2px"
      borderColor="gray.200"
      borderStyle="dashed"
    >
      <VStack gap={4}>
        {Icon && (
          <Box color="gray.400">
            <Icon size={48} />
          </Box>
        )}
        <Heading size="md" color="gray.700">
          {title}
        </Heading>
        <Text color="gray.500" maxW="md" fontSize="sm">
          {description}
        </Text>
        {action && (
          <Button colorPalette="blue" onClick={action.onClick} mt={2}>
            {action.label}
          </Button>
        )}
        {children}
      </VStack>
    </Box>
  );
}
