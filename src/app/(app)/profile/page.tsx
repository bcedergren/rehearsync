"use client";

import {
  Box,
  Button,
  Card,
  Field,
  Heading,
  Input,
  Text,
  VStack,
  HStack,
  Badge,
  Spinner,
  Flex,
} from "@chakra-ui/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiQuery, useApiMutation, apiFetch } from "@/hooks/useApi";
import { User, Mail, Lock, Trash2 } from "lucide-react";
import { toaster } from "@/components/ui/toaster";

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  tier: string;
  subscribedAt: string | null;
  subscriptionEndsAt: string | null;
}

interface MeResponse {
  user: UserProfile;
}

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  band: "Band",
  agent: "Agent",
};

const TIER_COLORS: Record<string, string> = {
  free: "gray",
  band: "blue",
  agent: "purple",
};

export default function ProfilePage() {
  const router = useRouter();
  const { data: meData, isLoading, refetch } = useApiQuery<MeResponse>(["me"], "/me");
  const user = meData?.user;

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const updateProfileMutation = useApiMutation(
    "/me",
    "PATCH",
    {
      onSuccess: () => {
        toaster.success({
          title: "Profile updated",
          description: "Your profile has been updated successfully.",
        });
        setIsEditingProfile(false);
        refetch();
      },
      onError: (error: Error) => {
        toaster.error({
          title: "Update failed",
          description: error.message,
        });
      },
    }
  );

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      toaster.error({ title: "Name is required" });
      return;
    }
    updateProfileMutation.mutate({ name: name.trim() });
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toaster.error({ title: "All password fields are required" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toaster.error({ title: "New passwords do not match" });
      return;
    }
    if (newPassword.length < 8) {
      toaster.error({ title: "Password must be at least 8 characters" });
      return;
    }

    try {
      await apiFetch("/me/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      toaster.success({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsChangingPassword(false);
    } catch (error: unknown) {
      toaster.error({
        title: "Password change failed",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  if (isLoading) {
    return (
      <Flex justify="center" align="center" minH="60vh">
        <Spinner size="lg" color="blue.500" />
      </Flex>
    );
  }

  if (!user) {
    return (
      <Box p={8}>
        <Text>User not found</Text>
      </Box>
    );
  }

  return (
    <Box maxW="900px" mx="auto" p={8}>
      <VStack align="stretch" gap={6}>
        <Heading size="xl" color="gray.900">
          Profile Settings
        </Heading>

        {/* Account Information */}
        <Card.Root>
          <Card.Header>
            <HStack gap={2}>
              <User size={20} />
              <Heading size="md">Account Information</Heading>
            </HStack>
          </Card.Header>
          <Card.Body>
            <VStack align="stretch" gap={4}>
              <Field label="Name">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditingProfile}
                  placeholder="Your name"
                />
              </Field>

              <Field label="Email">
                <Input
                  value={email || ""}
                  disabled
                  placeholder="your@email.com"
                />
                <Text fontSize="sm" color="gray.500" mt={1}>
                  Email cannot be changed. Contact support if needed.
                </Text>
              </Field>

              <Field label="Subscription Tier">
                <HStack>
                  <Badge colorPalette={TIER_COLORS[user.tier]} size="lg">
                    {TIER_LABELS[user.tier]}
                  </Badge>
                  {user.tier !== "free" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push("/pricing")}
                    >
                      Manage Subscription
                    </Button>
                  )}
                  {user.tier === "free" && (
                    <Button
                      size="sm"
                      colorPalette="blue"
                      onClick={() => router.push("/pricing")}
                    >
                      Upgrade
                    </Button>
                  )}
                </HStack>
              </Field>

              <HStack>
                {!isEditingProfile ? (
                  <Button colorPalette="blue" onClick={() => setIsEditingProfile(true)}>
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button
                      colorPalette="blue"
                      onClick={handleUpdateProfile}
                      loading={updateProfileMutation.isPending}
                    >
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setName(user.name || "");
                        setIsEditingProfile(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </HStack>
            </VStack>
          </Card.Body>
        </Card.Root>

        {/* Password Change */}
        <Card.Root>
          <Card.Header>
            <HStack gap={2}>
              <Lock size={20} />
              <Heading size="md">Change Password</Heading>
            </HStack>
          </Card.Header>
          <Card.Body>
            {!isChangingPassword ? (
              <Button colorPalette="gray" onClick={() => setIsChangingPassword(true)}>
                Change Password
              </Button>
            ) : (
              <VStack align="stretch" gap={4}>
                <Field label="Current Password">
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                </Field>

                <Field label="New Password">
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 8 characters)"
                  />
                </Field>

                <Field label="Confirm New Password">
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </Field>

                <HStack>
                  <Button colorPalette="blue" onClick={handleChangePassword}>
                    Update Password
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                      setIsChangingPassword(false);
                    }}
                  >
                    Cancel
                  </Button>
                </HStack>
              </VStack>
            )}
          </Card.Body>
        </Card.Root>

        {/* Danger Zone */}
        <Card.Root borderColor="red.200">
          <Card.Header>
            <HStack gap={2}>
              <Trash2 size={20} color="red" />
              <Heading size="md" color="red.600">
                Danger Zone
              </Heading>
            </HStack>
          </Card.Header>
          <Card.Body>
            <VStack align="stretch" gap={4}>
              <Text color="gray.600">
                Once you delete your account, there is no going back. All your bands, songs,
                and data will be permanently deleted.
              </Text>
              <Box>
                <Button colorPalette="red" variant="outline" disabled>
                  Delete Account
                </Button>
                <Text fontSize="sm" color="gray.500" mt={2}>
                  Account deletion is coming soon. Contact support@rehearsync.com to request deletion.
                </Text>
              </Box>
            </VStack>
          </Card.Body>
        </Card.Root>
      </VStack>
    </Box>
  );
}
