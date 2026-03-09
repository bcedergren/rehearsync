"use client";

import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  Field,
  Input,
  NativeSelect,
} from "@chakra-ui/react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useApiMutation } from "@/hooks/useApi";
import { useUpload } from "@/hooks/useUpload";
import { FileDropzone } from "@/components/uploads/FileDropzone";

export default function UploadAudioPage() {
  const params = useParams();
  const router = useRouter();
  const bandId = params.bandId as string;
  const arrangementId = params.arrangementId as string;

  const [file, setFile] = useState<File | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [assetRole, setAssetRole] = useState("full_mix");
  const [stemName, setStemName] = useState("");
  const { isUploading, progress, error: uploadError, upload } = useUpload();

  function handleFile(f: File) {
    setFile(f);
    // Extract audio duration from the file
    const url = URL.createObjectURL(f);
    const audio = new Audio(url);
    audio.addEventListener("loadedmetadata", () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDurationMs(Math.round(audio.duration * 1000));
      }
      URL.revokeObjectURL(url);
    });
    audio.addEventListener("error", () => URL.revokeObjectURL(url));
  }

  const createAsset = useApiMutation(
    `/arrangements/${arrangementId}/audio`,
    "POST",
    {
      invalidateKeys: [["arrangement", arrangementId]],
      onSuccess: () =>
        router.push(
          `/bands/${bandId}/songs/${params.songId}/arrangements/${arrangementId}`
        ),
    }
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    const storageObjectId = await upload(file, bandId, "audio");
    if (!storageObjectId) return;

    createAsset.mutate({
      storageObjectId,
      assetRole,
      ...(assetRole === "stem" && stemName ? { stemName } : {}),
      ...(durationMs ? { durationMs } : {}),
    });
  }

  return (
    <Box maxW="600px">
      <Heading size="lg" mb={6}>
        Upload Audio
      </Heading>

      <form onSubmit={handleSubmit}>
        <VStack gap={4} align="stretch">
          <FileDropzone
            accept={[".wav", ".mp3", ".m4a", ".aac"]}
            onFile={handleFile}
            label="Drop audio file (WAV, MP3, M4A)"
          />

          <Field.Root>
            <Field.Label>Asset Role</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                value={assetRole}
                onChange={(e) => setAssetRole(e.target.value)}
              >
                <option value="full_mix">Full Mix</option>
                <option value="stem">Stem</option>
                <option value="click">Click Track</option>
                <option value="guide">Guide Track</option>
              </NativeSelect.Field>
            </NativeSelect.Root>
          </Field.Root>

          {assetRole === "stem" && (
            <Field.Root>
              <Field.Label>Stem Name</Field.Label>
              <Input
                value={stemName}
                onChange={(e) => setStemName(e.target.value)}
                placeholder="e.g. Drums, Bass, Guitar"
                required
              />
            </Field.Root>
          )}

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
            disabled={!file}
          >
            Upload
          </Button>
        </VStack>
      </form>
    </Box>
  );
}
