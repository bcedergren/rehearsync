"use client";

import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  Field,
  NativeSelect,
} from "@chakra-ui/react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useApiQuery, useApiMutation } from "@/hooks/useApi";
import { useUpload } from "@/hooks/useUpload";
import { FileDropzone } from "@/components/uploads/FileDropzone";

interface Part {
  id: string;
  instrumentName: string;
  partName: string | null;
}

export default function UploadSheetMusicPage() {
  const params = useParams();
  const router = useRouter();
  const bandId = params.bandId as string;
  const arrangementId = params.arrangementId as string;

  const { data: parts } = useApiQuery<Part[]>(
    ["parts", arrangementId],
    `/arrangements/${arrangementId}/parts`
  );

  const [file, setFile] = useState<File | null>(null);
  const [partId, setPartId] = useState("");
  const { isUploading, progress, error: uploadError, upload } = useUpload();

  const createAsset = useApiMutation(
    `/arrangements/${arrangementId}/sheet-music`,
    "POST",
    {
      invalidateKeys: [["arrangement", arrangementId]],
      onSuccess: () =>
        router.push(
          `/bands/${bandId}/songs/${params.songId}/arrangements/${arrangementId}`
        ),
    }
  );

  function detectFileType(f: File): "musicxml" | "pdf" {
    if (f.name.endsWith(".pdf") || f.type === "application/pdf") return "pdf";
    return "musicxml";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !partId) return;

    const storageObjectId = await upload(file, bandId, "sheet_music");
    if (!storageObjectId) return;

    createAsset.mutate({
      partId,
      storageObjectId,
      fileType: detectFileType(file),
    });
  }

  return (
    <Box maxW="600px">
      <Heading size="lg" mb={6}>
        Upload Sheet Music
      </Heading>

      <form onSubmit={handleSubmit}>
        <VStack gap={4} align="stretch">
          <FileDropzone
            accept={[".musicxml", ".xml", ".mxl", ".pdf"]}
            onFile={setFile}
            label="Drop MusicXML or PDF"
          />

          <Field.Root>
            <Field.Label>Part</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                value={partId}
                onChange={(e) => setPartId(e.target.value)}
              >
                <option value="">Select a part...</option>
                {parts?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.instrumentName}
                    {p.partName ? ` — ${p.partName}` : ""}
                  </option>
                ))}
              </NativeSelect.Field>
            </NativeSelect.Root>
          </Field.Root>

          {isUploading && (
            <Text fontSize="sm" color="blue.500">
              Uploading... {progress}%
            </Text>
          )}
          {uploadError && (
            <Text fontSize="sm" color="red.500">
              {uploadError}
            </Text>
          )}

          <Button
            type="submit"
            colorPalette="blue"
            loading={isUploading || createAsset.isPending}
            disabled={!file || !partId}
          >
            Upload
          </Button>
        </VStack>
      </form>
    </Box>
  );
}
