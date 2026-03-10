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
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
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
}

function newMember(): MemberEntry {
  return { id: crypto.randomUUID(), name: "", instrument: "", email: "" };
}

export default function OnboardingPage() {
  return <OnboardingWizard />;
}

interface MeResponse {
  user: { id: string; tier: string; name: string | null };
}

function OnboardingWizard() {
  const router = useRouter();
  const { data: meData } = useApiQuery<MeResponse>(["me"], "/me");
  const tier = meData?.user?.tier || "free";
  const maxMembers = TIER_MEMBER_LIMITS[tier] || 2;

  const [step, setStep] = useState(0);
  const [bandName, setBandName] = useState("");
  const [members, setMembers] = useState<MemberEntry[]>([newMember()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    bandId: string;
    invites: { name: string; email?: string; joinUrl: string }[];
  } | null>(null);

  const canAddMore = members.length < maxMembers - 1; // -1 for leader

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

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const validMembers = members
        .filter((m) => m.name.trim())
        .map((m) => ({
          name: m.name.trim(),
          instrument: m.instrument.trim() || undefined,
          email: m.email.trim() || undefined,
        }));

      const res = await apiFetch<{
        bandId: string;
        bandName: string;
        invites: { name: string; email?: string; joinUrl: string }[];
      }>("/onboarding", {
        method: "POST",
        body: JSON.stringify({ bandName, members: validMembers }),
      });

      setResult(res);
      setStep(4); // done step
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
          <Card.Body p={8}>
            <Heading size="lg" mb={2} color="gray.800">
              What's your band called?
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
          <Card.Body p={8}>
            <Heading size="lg" mb={2} color="gray.800">
              Who's in the band?
            </Heading>
            <Flex align="center" gap={2} mb={6}>
              <Text color="gray.500">
                Add your band members by name.
              </Text>
              <Badge colorPalette="blue" variant="subtle" fontSize="xs">
                {members.length + 1}/{maxMembers === 999 ? "∞" : maxMembers}
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
                You'll be added automatically
              </Text>
            </Flex>

            <VStack gap={3} mb={4}>
              {members.map((m, i) => (
                <Flex key={m.id} gap={2} w="full" align="center">
                  <Text fontSize="sm" color="gray.400" w="20px" flexShrink={0}>
                    {i + 2}.
                  </Text>
                  <Input
                    value={m.name}
                    onChange={(e) => updateMember(m.id, "name", e.target.value)}
                    placeholder="Member name"
                    size="sm"
                    flex={1}
                    autoFocus={i === 0}
                  />
                  {members.length > 1 && (
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
            {!canAddMore && members.length >= maxMembers - 1 && (
              <Text fontSize="xs" color="orange.500" mb={4}>
                {maxMembers === 999
                  ? ""
                  : `Your ${tier} plan allows up to ${maxMembers} members (including you).`}
              </Text>
            )}

            <Flex gap={3}>
              <Button variant="outline" flex={1} onClick={() => setStep(0)}>
                Back
              </Button>
              <Button
                colorPalette="blue"
                flex={1}
                onClick={() => setStep(2)}
                disabled={!members.some((m) => m.name.trim())}
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
          <Card.Body p={8}>
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
                  <Flex key={m.id} gap={3} w="full" align="center">
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      color="gray.700"
                      w="120px"
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
          <Card.Body p={8}>
            <Heading size="lg" mb={2} color="gray.800">
              Invite your band members
            </Heading>
            <Text color="gray.500" mb={6}>
              Enter their email to send an invite link. You can skip this and share
              a link later.
            </Text>

            <VStack gap={3} mb={6}>
              {members
                .filter((m) => m.name.trim())
                .map((m) => (
                  <Flex key={m.id} gap={3} w="full" align="center">
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      color="gray.700"
                      w="120px"
                      flexShrink={0}
                      truncate
                    >
                      {m.name}
                    </Text>
                    <Flex align="center" gap={2} flex={1}>
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
              {members.some((m) => m.email.trim()) ? (
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
          <Card.Body p={8} textAlign="center">
            <Text fontSize="4xl" mb={4}>
              🎉
            </Text>
            <Heading size="lg" mb={2} color="gray.800">
              {result.bandId ? `${bandName} is ready!` : "All set!"}
            </Heading>
            <Text color="gray.500" mb={6}>
              {result.invites.some((i) => i.email)
                ? "Invite emails have been sent. Your band members can join using the link in their inbox."
                : "Share the invite link below with your band members."}
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
                        variant="outline"
                        onClick={async () => {
                          await navigator.clipboard.writeText(inv.joinUrl);
                        }}
                      >
                        Copy Link
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
