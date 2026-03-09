"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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
    return (
      <MusicXmlViewer
        fileUrl={fileUrl}
        fileName={fileName}
        currentBar={currentBar}
      />
    );
  }

  return (
    <PdfViewer fileUrl={fileUrl} fileName={fileName} currentBar={currentBar} />
  );
}

function MusicXmlViewer({
  fileUrl,
  fileName,
  currentBar,
}: {
  fileUrl: string;
  fileName?: string;
  currentBar?: number | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<import("opensheetmusicdisplay").OpenSheetMusicDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.0);

  useEffect(() => {
    let cancelled = false;

    async function loadScore() {
      if (!containerRef.current) return;

      setLoading(true);
      setError(null);

      try {
        const { OpenSheetMusicDisplay } = await import(
          "opensheetmusicdisplay"
        );

        if (cancelled) return;

        // Clear previous render
        containerRef.current.innerHTML = "";

        const osmd = new OpenSheetMusicDisplay(containerRef.current, {
          autoResize: true,
          backend: "svg",
          drawTitle: true,
          drawComposer: false,
          drawCredits: false,
        });

        osmdRef.current = osmd;

        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error("Failed to fetch MusicXML file");
        const xmlText = await response.text();

        if (cancelled) return;

        await osmd.load(xmlText);
        osmd.zoom = zoom;
        osmd.render();
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to render sheet music"
          );
          setLoading(false);
        }
      }
    }

    loadScore();
    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  useEffect(() => {
    if (osmdRef.current) {
      osmdRef.current.zoom = zoom;
      osmdRef.current.render();
    }
  }, [zoom]);

  useEffect(() => {
    if (!osmdRef.current || currentBar == null) return;

    const cursor = osmdRef.current.cursor;
    if (!cursor) return;

    cursor.reset();
    for (let i = 1; i < currentBar; i++) {
      cursor.next();
      if (cursor.Iterator.EndReached) break;
    }
    cursor.show();
  }, [currentBar]);

  return (
    <Box w="full">
      <Flex justify="space-between" align="center" mb={2} px={1}>
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
        <Flex align="center" gap={2}>
          <Button
            size="xs"
            variant="outline"
            onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))}
            disabled={zoom <= 0.4}
          >
            -
          </Button>
          <Text fontSize="xs" color="gray.500">
            {Math.round(zoom * 100)}%
          </Text>
          <Button
            size="xs"
            variant="outline"
            onClick={() => setZoom((z) => Math.min(2.0, z + 0.1))}
            disabled={zoom >= 2.0}
          >
            +
          </Button>
        </Flex>
      </Flex>

      <Box
        w="full"
        minH="400px"
        bg="white"
        borderRadius="md"
        border="1px solid"
        borderColor="gray.200"
        overflow="auto"
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

        <Box ref={containerRef} w="full" p={4} />
      </Box>
    </Box>
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
