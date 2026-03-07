"use client";

import { Box, Text, VStack } from "@chakra-ui/react";
import { useCallback, useState } from "react";

interface FileDropzoneProps {
  accept: string[];
  onFile: (file: File) => void;
  label?: string;
}

export function FileDropzone({ accept, onFile, label }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        setFileName(file.name);
        onFile(file);
      }
    },
    [onFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setFileName(file.name);
        onFile(file);
      }
    },
    [onFile]
  );

  return (
    <Box
      border="2px dashed"
      borderColor={isDragging ? "blue.400" : "gray.300"}
      borderRadius="lg"
      p={8}
      textAlign="center"
      bg={isDragging ? "blue.50" : "gray.50"}
      cursor="pointer"
      transition="all 0.2s"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => document.getElementById("file-input")?.click()}
    >
      <input
        id="file-input"
        type="file"
        accept={accept.join(",")}
        onChange={handleChange}
        style={{ display: "none" }}
      />
      <VStack gap={2}>
        {fileName ? (
          <Text fontWeight="semibold">{fileName}</Text>
        ) : (
          <>
            <Text fontWeight="semibold">
              {label || "Drop file here or click to upload"}
            </Text>
            <Text fontSize="sm" color="gray.500">
              {accept.join(", ")}
            </Text>
          </>
        )}
      </VStack>
    </Box>
  );
}
