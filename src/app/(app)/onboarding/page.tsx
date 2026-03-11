"use client";

import {
  Box,
  Button,
  Field,
  Heading,
  Input,
  VStack,
  Text,
  Flex,
  Badge,
  Card,
  Spinner,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { apiFetch, useApiQuery } from "@/hooks/useApi";
import { Plus, Trash2, Mail, Check } from "lucide-react";

const TIER_MEMBER_LIMITS: Record<string, number> = {
  free: 2,
  band: 15,
  agent: 999,
};

interface MemberEntry {
  id: string;
  name: string;
  instrument: string;
  email: string;
  /** If set, this is an existing member from the DB — name is read-only */
  existingMemberId?: string;
  /** Populated after band/members are saved in step 1 */
  joinUrl?: string;
}

interface MeResponse {
  user: { id: string; tier: string; name: string | null };
}

interface BandSummary {
  id: string;
  name: string;
  members: {
    id: string;
    displayName: string;
    role: string;
    defaultInstrument: string | null;
  }[];
}

function newMember(): MemberEntry {
  return { id: crypto.randomUUID(), name: "", instrument: "", email: "" };
}

export default function OnboardingPage() {
  return <OnboardingWizard />;
}

function OnboardingWizard() {
  const router = useRouter();
  const { data: meData } = useApiQuery<MeResponse>(["me"], "/me");
  const { data: bands, isLoading: bandsLoading } = useApiQuery<BandSummary[]>(
    ["bands"],
    "/bands"
  );
  const tier = meData?.user?.tier || "free";
  const maxMembers = TIER_MEMBER_LIMITS[tier] || 2;

  // Existing band (edit mode)
  const existingBand = bands && bands.length > 0 ? bands[0] : null;
  const isEditMode = !!existingBand;

  const [step, setStep] = useState(0);
  const [bandName, setBandName] = useState("");
  const [members, setMembers] = useState<MemberEntry[]>([newMember()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [result, setResult] = useState<{
    bandId: string;
    invites: { name: string; email?: string; joinUrl: string }[];
  } | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [savedBandId, setSavedBandId] = useState<string | null>(null);
  const [savingMembers, setSavingMembers] = useState(false);

  // Pre-fill from existing band
  useEffect(() => {
    if (initialized || bandsLoading) return;
    if (existingBand) {
      setBandName(existingBand.name);
      // Load existing non-leader members
      const existingMembers: MemberEntry[] = existingBand.members
        .filter((m) => m.role !== "leader")
        .map((m) => ({
          id: crypto.randomUUID(),
          name: m.displayName,
          instrument: m.defaultInstrument || "",
          email: "",
          existingMemberId: m.id,
        }));
      setMembers(existingMembers.length > 0 ? existingMembers : [newMember()]);
      setInitialized(true);
    } else if (bands) {
      // No existing band — create mode, already initialized
      setInitialized(true);
    }
  }, [existingBand, bands, bandsLoading, initialized]);

  const existingMemberCount = members.filter((m) => m.existingMemberId).length;
  const totalMembers = members.filter((m) => m.name.trim()).length + 1; // +1 for leader
  const canAddMore = totalMembers < maxMembers;

  const addMember = useCallback(() => {
    if (canAddMore) setMembers((m) => [...m, newMember()]);
  }, [canAddMore]);

  const removeMember = useCallback((id: string) => {
    setMembers((m) => m.filter((e) => e.id !== id));
  }, []);

  const updateMember = useCallback(
    (id: string, field: keyof MemberEntry, value: string) => {
      setMembers((m) =>
        m.map((e) => (e.id === id ? { ...e, [field]: value } : e))
      );
    },
    []
  );

  // Save band + members when clicking "Next" on step 1
  async function handleSaveBandMembers() {
    setSavingMembers(true);
    setError("");
    try {
      const validMembers = members
        .filter((m) => m.name.trim() && !m.existingMemberId)
        .map((m) => ({
          name: m.name.trim(),
          instrument: m.instrument.trim() || undefined,
        }));

      if (isEditMode && existingBand) {
        const bandId = existingBand.id;

        // Update band name if changed
        if (bandName.trim() !== existingBand.name) {
          await apiFetch(`/bands/${bandId}`, {
            method: "PATCH",
            body: JSON.stringify({ name: bandName.trim() }),
          });
        }

        // Create invite links for new members (no emails yet)
        for (const m of validMembers) {
          const link = await apiFetch<{ code: string }>(
            `/bands/${bandId}/invites`,
            {
              method: "POST",
              body: JSON.stringify({ maxUses: 1, expiresInHours: 168 }),
            }
          );
          // Store the join URL on the member entry for later
          const entry = members.find(
            (e) => !e.existingMemberId && e.name.trim() === m.name
          );
          if (entry) {
            entry.joinUrl = `${window.location.origin}/join/${link.code}`;
          }
        }
        setSavedBandId(bandId);
      } else {
        // Create mode: create band via onboarding endpoint (no emails)
        const res = await apiFetch<{
          bandId: string;
          bandName: string;
          invites: { name: string; email?: string; joinUrl: string }[];
        }>("/onboarding", {
          method: "POST",
          body: JSON.stringify({ bandName, members: validMembers }),
        });

        setSavedBandId(res.bandId);

        // Store joinUrls on member entries for the result step
        for (const inv of res.invites) {
          const entry = members.find(
            (e) => !e.existingMemberId && e.name.trim() === inv.name
          );
          if (entry) entry.joinUrl = inv.joinUrl;
        }
      }

      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save members");
    } finally {
      setSavingMembers(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const bandId = savedBandId || existingBand?.id;
      if (!bandId) throw new Error("Band not saved yet");

      // Update instruments for all members
      for (const m of members) {
        if (m.existingMemberId && m.instrument.trim()) {
          const original = existingBand?.members.find(
            (bm) => bm.id === m.existingMemberId
          );
          if (!original || (original.defaultInstrument || "") !== m.instrument.trim()) {
            await apiFetch(`/bands/${bandId}/members/${m.existingMemberId}`, {
              method: "PATCH",
              body: JSON.stringify({ defaultInstrument: m.instrument.trim() }),
            });
          }
        }
      }

      // For new members with emails, create a new invite with email (triggers email send)
      const newMembers = members.filter(
        (m) => !m.existingMemberId && m.name.trim()
      );
      for (const m of newMembers) {
        if (m.email.trim()) {
          const link = await apiFetch<{ code: string }>(
            `/bands/${bandId}/invites`,
            {
              method: "POST",
              body: JSON.stringify({
                maxUses: 1,
                expiresInHours: 168,
                email: m.email.trim(),
              }),
            }
          );
          // Update joinUrl to the email-linked invite
          m.joinUrl = `${window.location.origin}/join/${link.code}`;
        }
      }

      // Build result from stored joinUrls
      const inviteResults = newMembers
        .filter((m) => m.joinUrl)
        .map((m) => ({
          name: m.name.trim(),
          email: m.email.trim() || undefined,
          joinUrl: m.joinUrl!,
        }));

      setResult({ bandId, invites: inviteResults });
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  const STEPS = [
    { label: "Band Name", num: 1 },
    { label: "Members", num: 2 },
    { label: "Instruments", num: 3 },
    { label: "Invites", num: 4 },
  ];

  if (bandsLoading || !initialized) {
    return (
      <Flex justify="center" align="center" minH="60vh">
        <Spinner size="lg" color="blue.500" />
      </Flex>
    );
  }

  return (
    <Box maxW="600px" mx="auto" py={12} px={4}>
      {/* Step indicator */}
      {step < 4 && (
        <Flex gap={2} mb={8} justify="center">
          {STEPS.map((s, i) => (
            <Flex key={s.num} align="center" gap={2}>
              <Flex
                w="32px"
                h="32px"
                borderRadius="full"
                align="center"
                justify="center"
                bg={i < step ? "blue.500" : i === step ? "blue.500" : "gray.200"}
                color={i <= step ? "white" : "gray.500"}
                fontSize="sm"
                fontWeight="bold"
                transition="all 0.2s"
              >
                {i < step ? <Check size={16} /> : s.num}
              </Flex>
              <Text
                fontSize="sm"
                color={i === step ? "blue.600" : "gray.400"}
                fontWeight={i === step ? "semibold" : "normal"}
                display={{ base: i === step ? "block" : "none", md: "block" }}
              >
                {s.label}
              </Text>
              {i < STEPS.length - 1 && (
                <Box
                  w="24px"
                  h="2px"
                  bg={i < step ? "blue.400" : "gray.200"}
                  display={{ base: "none", md: "block" }}
                />
              )}
            </Flex>
          ))}
        </Flex>
      )}

      {/* Step 1: Band Name */}
      {step === 0 && (
        <Card.Root>
          <Card.Body p={{ base: 5, md: 8 }}>
            <Heading size="lg" mb={2} color="gray.800">
              {isEditMode ? "Update your band name" : "What's your band called?"}
            </Heading>
            <Text color="gray.500" mb={6}>
              You can always change this later.
            </Text>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (bandName.trim()) setStep(1);
              }}
            >
              <Field.Root mb={6}>
                <Input
                  value={bandName}
                  onChange={(e) => setBandName(e.target.value)}
                  placeholder='e.g. "The Midnight Sessions"'
                  required
                  autoFocus
                  size="lg"
                />
              </Field.Root>
              <Button
                type="submit"
                colorPalette="blue"
                w="full"
                size="lg"
                disabled={!bandName.trim()}
              >
                Next
              </Button>
            </form>
          </Card.Body>
        </Card.Root>
      )}

      {/* Step 2: Band Members */}
      {step === 1 && (
        <Card.Root>
          <Card.Body p={{ base: 5, md: 8 }}>
            <Heading size="lg" mb={2} color="gray.800">
              Who's in the band?
            </Heading>
            <Flex align="center" gap={2} mb={6}>
              <Text color="gray.500">
                {isEditMode
                  ? "Your current members and any new ones to invite."
                  : "Add your band members by name."}
              </Text>
              <Badge colorPalette="blue" variant="subtle" fontSize="xs">
                {totalMembers}/{maxMembers === 999 ? "\u221e" : maxMembers}
              </Badge>
            </Flex>

            {/* Leader (you) */}
            <Flex
              align="center"
              gap={3}
              p={3}
              borderRadius="md"
              bg="blue.50"
              border="1px solid"
              borderColor="blue.100"
              mb={3}
            >
              <Badge colorPalette="blue" fontSize="xs">You (Leader)</Badge>
              <Text fontSize="sm" color="gray.600" flex={1}>
                {isEditMode ? "Already a member" : "You'll be added automatically"}
              </Text>
            </Flex>

            <VStack gap={3} mb={4}>
              {members.map((m, i) => (
                <Flex key={m.id} gap={2} w="full" align="center">
                  <Text fontSize="sm" color="gray.400" w="20px" flexShrink={0}>
                    {i + 2}.
                  </Text>
                  {m.existingMemberId ? (
                    <Flex align="center" gap={2} flex={1}>
                      <Input
                        value={m.name}
                        size="sm"
                        flex={1}
                        readOnly
                        bg="gray.50"
                        color="gray.600"
                      />
                      <Badge colorPalette="green" variant="subtle" fontSize="2xs">
                        Joined
                      </Badge>
                    </Flex>
                  ) : (
                    <Input
                      value={m.name}
                      onChange={(e) => updateMember(m.id, "name", e.target.value)}
                      placeholder="Member name"
                      size="sm"
                      flex={1}
                      autoFocus={i === members.length - 1 && !m.existingMemberId}
                    />
                  )}
                  {!m.existingMemberId && members.filter((x) => !x.existingMemberId).length > 1 && (
                    <Button
                      size="xs"
                      variant="ghost"
                      colorPalette="red"
                      onClick={() => removeMember(m.id)}
                      px={2}
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </Flex>
              ))}
            </VStack>

            {canAddMore && (
              <Button
                size="sm"
                variant="ghost"
                colorPalette="blue"
                onClick={addMember}
                mb={4}
              >
                <Plus size={14} /> Add Member
              </Button>
            )}
            {!canAddMore && (
              <Text fontSize="xs" color="orange.500" mb={4}>
                {maxMembers === 999
                  ? ""
                  : `Your ${tier} plan allows up to ${maxMembers} members (including you).`}
              </Text>
            )}

            {error && (
              <Box p={3} mb={4} bg="red.50" borderRadius="md" border="1px solid" borderColor="red.100">
                <Text color="red.600" fontSize="sm">{error}</Text>
              </Box>
            )}

            <Flex gap={3}>
              <Button variant="outline" flex={1} onClick={() => setStep(0)}>
                Back
              </Button>
              <Button
                colorPalette="blue"
                flex={1}
                onClick={handleSaveBandMembers}
                loading={savingMembers}
                disabled={
                  !members.some((m) => m.name.trim()) &&
                  existingMemberCount === 0
                }
              >
                Next
              </Button>
            </Flex>
          </Card.Body>
        </Card.Root>
      )}

      {/* Step 3: Instruments */}
      {step === 2 && (
        <Card.Root>
          <Card.Body p={{ base: 5, md: 8 }}>
            <Heading size="lg" mb={2} color="gray.800">
              What does everyone play?
            </Heading>
            <Text color="gray.500" mb={6}>
              Assign instruments to each member. You can skip this for now.
            </Text>

            <VStack gap={3} mb={6}>
              {members
                .filter((m) => m.name.trim())
                .map((m) => (
                  <Flex key={m.id} gap={{ base: 2, sm: 3 }} w="full" align={{ base: "start", sm: "center" }} direction={{ base: "column", sm: "row" }}>
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      color="gray.700"
                      w={{ base: "auto", sm: "120px" }}
                      flexShrink={0}
                      truncate
                    >
                      {m.name}
                    </Text>
                    <Input
                      value={m.instrument}
                      onChange={(e) =>
                        updateMember(m.id, "instrument", e.target.value)
                      }
                      placeholder="e.g. Guitar, Drums, Vocals"
                      size="sm"
                      flex={1}
                      w="full"
                    />
                  </Flex>
                ))}
            </VStack>

            <Flex gap={3}>
              <Button variant="outline" flex={1} onClick={() => setStep(1)}>
                Back
              </Button>
              <Button colorPalette="blue" flex={1} onClick={() => setStep(3)}>
                Next
              </Button>
            </Flex>
          </Card.Body>
        </Card.Root>
      )}

      {/* Step 4: Email Invites */}
      {step === 3 && (
        <Card.Root>
          <Card.Body p={{ base: 5, md: 8 }}>
            <Heading size="lg" mb={2} color="gray.800">
              Invite your band members
            </Heading>
            <Text color="gray.500" mb={6}>
              Enter their email to send an invite link. You can skip this and share
              a link later.
            </Text>

            <VStack gap={3} mb={6}>
              {members
                .filter((m) => m.name.trim() && !m.existingMemberId)
                .map((m) => (
                  <Flex key={m.id} gap={{ base: 2, sm: 3 }} w="full" align={{ base: "start", sm: "center" }} direction={{ base: "column", sm: "row" }}>
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      color="gray.700"
                      w={{ base: "auto", sm: "120px" }}
                      flexShrink={0}
                      truncate
                    >
                      {m.name}
                    </Text>
                    <Flex align="center" gap={2} flex={1} w="full">
                      <Mail size={14} color="var(--chakra-colors-gray-400)" />
                      <Input
                        type="email"
                        value={m.email}
                        onChange={(e) =>
                          updateMember(m.id, "email", e.target.value)
                        }
                        placeholder="email@example.com"
                        size="sm"
                        flex={1}
                      />
                    </Flex>
                  </Flex>
                ))}
              {members.filter((m) => m.name.trim() && !m.existingMemberId)
                .length === 0 && (
                <Text fontSize="sm" color="gray.500" textAlign="center" py={4}>
                  No new members to invite. Click save to update instruments.
                </Text>
              )}
            </VStack>

            {error && (
              <Box
                p={3}
                mb={4}
                bg="red.50"
                borderRadius="md"
                border="1px solid"
                borderColor="red.100"
              >
                <Text color="red.600" fontSize="sm">
                  {error}
                </Text>
              </Box>
            )}

            <Flex gap={3}>
              <Button variant="outline" flex={1} onClick={() => setStep(2)}>
                Back
              </Button>
              {isEditMode ? (
                <Button
                  colorPalette="blue"
                  flex={1}
                  onClick={handleSubmit}
                  loading={submitting}
                >
                  {members.some((m) => !m.existingMemberId && m.email.trim())
                    ? "Save & Send Invites"
                    : members.some((m) => !m.existingMemberId && m.name.trim())
                      ? "Save & Create Invites"
                      : "Save Changes"}
                </Button>
              ) : members.some((m) => m.email.trim()) ? (
                <Button
                  colorPalette="blue"
                  flex={1}
                  onClick={handleSubmit}
                  loading={submitting}
                >
                  Create Band & Send Invites
                </Button>
              ) : (
                <Button
                  colorPalette="blue"
                  flex={1}
                  onClick={handleSubmit}
                  loading={submitting}
                >
                  Skip & Create Band
                </Button>
              )}
            </Flex>
          </Card.Body>
        </Card.Root>
      )}

      {/* Step 5: Done */}
      {step === 4 && result && (
        <Card.Root>
          <Card.Body p={{ base: 5, md: 8 }} textAlign="center">
            <Text fontSize="4xl" mb={4}>
              🎉
            </Text>
            <Heading size="lg" mb={2} color="gray.800">
              {isEditMode ? `${bandName} updated!` : `${bandName} is ready!`}
            </Heading>
            <Text color="gray.500" mb={6}>
              {result.invites.length > 0
                ? result.invites.some((i) => i.email)
                  ? "Invite emails have been sent. Your band members can join using the link in their inbox."
                  : "Share the invite link below with your band members."
                : isEditMode
                  ? "Your band has been updated successfully."
                  : "Your band is set up and ready to go."}
            </Text>

            {result.invites.length > 0 && (
              <VStack gap={2} mb={6} align="stretch">
                {result.invites.map((inv, i) => (
                  <Flex
                    key={i}
                    align="center"
                    gap={3}
                    p={3}
                    bg="gray.50"
                    borderRadius="md"
                  >
                    <Text fontSize="sm" fontWeight="medium" flex={1} textAlign="left">
                      {inv.name}
                    </Text>
                    {inv.email ? (
                      <Badge colorPalette="green" variant="subtle" fontSize="xs">
                        Email sent
                      </Badge>
                    ) : (
                      <Button
                        size="xs"
                        variant={copiedIndex === i ? "solid" : "outline"}
                        colorPalette={copiedIndex === i ? "green" : "gray"}
                        onClick={async () => {
                          await navigator.clipboard.writeText(inv.joinUrl);
                          setCopiedIndex(i);
                          setTimeout(() => setCopiedIndex(null), 2000);
                        }}
                      >
                        {copiedIndex === i ? (
                          <><Check size={14} /> Copied!</>
                        ) : (
                          "Copy Link"
                        )}
                      </Button>
                    )}
                  </Flex>
                ))}
              </VStack>
            )}

            <Button
              colorPalette="blue"
              size="lg"
              w="full"
              onClick={() => router.push(`/bands/${result.bandId}`)}
            >
              Go to {bandName}
            </Button>
          </Card.Body>
        </Card.Root>
      )}
    </Box>
  );
}
