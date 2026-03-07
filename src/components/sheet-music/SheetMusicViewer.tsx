"use client";

import { useState, useCallback } from "react";
import { Box, Flex, Text, Button, Spinner } from "@chakra-ui/react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface SheetMusicViewerProps {
  fileUrl: string;
  fileType: "pdf" | "musicxml";
  fileName?: string;
  currentBar?: number | null;
}

export function SheetMusicViewer({
  fileUrl,
  fileType,
  fileName,
  currentBar,
}: SheetMusicViewerProps) {
  if (fileType === "musicxml") {
    return <MusicXmlPlaceholder fileName={fileName} />;
  }

  return (
    <PdfViewer fileUrl={fileUrl} fileName={fileName} currentBar={currentBar} />
  );
}

function MusicXmlPlaceholder({ fileName }: { fileName?: string }) {
  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      h="400px"
      bg="gray.50"
      borderRadius="md"
      border="1px dashed"
      borderColor="gray.300"
    >
      <Text fontSize="2xl" mb={2}>
        MusicXML
      </Text>
      {fileName && (
        <Text fontSize="sm" color="gray.500" mb={2}>
          {fileName}
        </Text>
      )}
      <Text fontSize="sm" color="gray.400">
        MusicXML rendering coming soon
      </Text>
    </Flex>
  );
}

function PdfViewer({
  fileUrl,
  fileName,
  currentBar,
}: {
  fileUrl: string;
  fileName?: string;
  currentBar?: number | null;
}) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
      setLoading(false);
    },
    []
  );

  const onDocumentLoadError = useCallback((err: Error) => {
    setError(err.message || "Failed to load PDF");
    setLoading(false);
  }, []);

  return (
    <Box w="full">
      {/* Header */}
      <Flex
        justify="space-between"
        align="center"
        mb={2}
        px={1}
      >
        <Flex align="center" gap={2}>
          {fileName && (
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              {fileName}
            </Text>
          )}
          {currentBar != null && (
            <Text fontSize="xs" color="blue.500" fontFamily="mono">
              Bar {currentBar}
            </Text>
          )}
        </Flex>
        {numPages > 1 && (
          <Flex align="center" gap={2}>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              disabled={pageNumber <= 1}
            >
              Prev
            </Button>
            <Text fontSize="xs" color="gray.500">
              {pageNumber} / {numPages}
            </Text>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
              disabled={pageNumber >= numPages}
            >
              Next
            </Button>
          </Flex>
        )}
      </Flex>

      {/* PDF Document */}
      <Box
        w="full"
        minH="400px"
        bg="white"
        borderRadius="md"
        border="1px solid"
        borderColor="gray.200"
        overflow="auto"
        display="flex"
        justifyContent="center"
        position="relative"
      >
        {loading && (
          <Flex
            position="absolute"
            inset={0}
            align="center"
            justify="center"
            zIndex={1}
          >
            <Spinner size="lg" color="blue.500" />
          </Flex>
        )}

        {error && (
          <Flex align="center" justify="center" h="400px" w="full">
            <Text color="red.500" fontSize="sm">
              {error}
            </Text>
          </Flex>
        )}

        {!error && (
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading=""
          >
            <Page
              pageNumber={pageNumber}
              width={800}
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </Document>
        )}
      </Box>
    </Box>
  );
}
