"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Box, Flex, Text, Button, Spinner } from "@chakra-ui/react";
import { Document, Page, pdfjs } from "react-pdf";
import { Maximize, Minimize } from "lucide-react";
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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  function toggleFullscreen() {
    if (!wrapperRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      wrapperRef.current.requestFullscreen();
    }
  }

  if (fileType === "musicxml") {
    return (
      <Box ref={wrapperRef} bg={isFullscreen ? "white" : undefined} h={isFullscreen ? "100vh" : undefined} overflow={isFullscreen ? "auto" : undefined}>
        <MusicXmlViewer
          fileUrl={fileUrl}
          fileName={fileName}
          currentBar={currentBar}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
      </Box>
    );
  }

  return (
    <Box ref={wrapperRef} bg={isFullscreen ? "white" : undefined} h={isFullscreen ? "100vh" : undefined} overflow={isFullscreen ? "auto" : undefined}>
      <PdfViewer
        fileUrl={fileUrl}
        fileName={fileName}
        currentBar={currentBar}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
    </Box>
  );
}

function MusicXmlViewer({
  fileUrl,
  fileName,
  currentBar,
  isFullscreen,
  onToggleFullscreen,
}: {
  fileUrl: string;
  fileName?: string;
  currentBar?: number | null;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
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

        const res = await fetch(fileUrl);
        if (!res.ok) throw new Error("Failed to fetch MusicXML file");

        const contentType = res.headers.get("content-type") || "";

        if (cancelled) return;

        // Handle compressed MusicXML (.mxl) — OSMD can load it from ArrayBuffer
        if (
          contentType.includes("octet-stream") ||
          contentType.includes("zip") ||
          fileUrl.endsWith(".mxl")
        ) {
          const buffer = await res.arrayBuffer();
          await osmd.load(new Uint8Array(buffer) as unknown as string);
        } else {
          let xmlText = await res.text();

          // Strip markdown code fences that LLMs sometimes add
          xmlText = xmlText.replace(/^```(?:xml|musicxml)?\s*\n?/i, "").replace(/\n?```\s*$/, "");

          // Strip BOM and leading whitespace
          xmlText = xmlText.replace(/^\uFEFF/, "").trim();

          // Extract XML if there's extra text before the declaration
          const xmlStart = xmlText.indexOf("<?xml");
          if (xmlStart > 0) {
            xmlText = xmlText.substring(xmlStart);
          }

          if (!xmlText.startsWith("<")) {
            throw new Error("File does not appear to be valid MusicXML");
          }

          await osmd.load(xmlText);
        }
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

  // Re-render on zoom change
  useEffect(() => {
    if (osmdRef.current) {
      osmdRef.current.zoom = zoom;
      osmdRef.current.render();
    }
  }, [zoom]);

  // Re-render when entering/exiting fullscreen (container size changes)
  useEffect(() => {
    if (osmdRef.current && !loading) {
      // Small delay to let the DOM resize settle
      const timer = setTimeout(() => {
        osmdRef.current?.render();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isFullscreen, loading]);

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
    <Box w="full" h={isFullscreen ? "100%" : undefined} display="flex" flexDirection="column">
      <Flex justify="space-between" align="center" mb={2} px={isFullscreen ? 4 : 1} pt={isFullscreen ? 3 : 0}>
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
          <Button
            size="xs"
            variant="outline"
            onClick={onToggleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
          </Button>
        </Flex>
      </Flex>

      <Box
        w="full"
        flex={isFullscreen ? 1 : undefined}
        minH={isFullscreen ? undefined : "400px"}
        bg="white"
        borderRadius={isFullscreen ? undefined : "md"}
        border={isFullscreen ? undefined : "1px solid"}
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
  isFullscreen,
  onToggleFullscreen,
}: {
  fileUrl: string;
  fileName?: string;
  currentBar?: number | null;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
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
    <Box w="full" h={isFullscreen ? "100%" : undefined} display="flex" flexDirection="column">
      {/* Header */}
      <Flex
        justify="space-between"
        align="center"
        mb={2}
        px={isFullscreen ? 4 : 1}
        pt={isFullscreen ? 3 : 0}
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
        <Flex align="center" gap={2}>
          {numPages > 1 && (
            <>
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
            </>
          )}
          <Button
            size="xs"
            variant="outline"
            onClick={onToggleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
          </Button>
        </Flex>
      </Flex>

      {/* PDF Document */}
      <Box
        w="full"
        flex={isFullscreen ? 1 : undefined}
        minH={isFullscreen ? undefined : "400px"}
        bg="white"
        borderRadius={isFullscreen ? undefined : "md"}
        border={isFullscreen ? undefined : "1px solid"}
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
              width={isFullscreen ? Math.min(window.innerWidth - 64, 1200) : 800}
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </Document>
        )}
      </Box>
    </Box>
  );
}
