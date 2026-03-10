"use client";

import { Box, Heading, Text, VStack, Flex } from "@chakra-ui/react";
import Image from "next/image";
import NextLink from "next/link";

export default function PrivacyPage() {
  return (
    <Box minH="100vh" bg="white">
      {/* Navbar */}
      <Flex
        as="nav"
        align="center"
        justify="space-between"
        py={4}
        px={6}
        maxW="1100px"
        mx="auto"
      >
        <NextLink href="/">
          <Image src="/logo.png" alt="RehearSync" width={140} height={32} />
        </NextLink>
      </Flex>

      {/* Content */}
      <Box maxW="760px" mx="auto" px={6} py={12}>
        <VStack align="start" gap={6}>
          <Heading as="h1" size="2xl" color="gray.900">
            Privacy Policy
          </Heading>
          <Text fontSize="sm" color="gray.400">
            Last updated: March 9, 2026
          </Text>

          <Heading as="h2" size="lg" color="gray.800" mt={4}>
            1. Information We Collect
          </Heading>
          <Text color="gray.600" lineHeight="1.8">
            When you create an account, we collect your name, email address, and
            password (stored securely as a hash). When you use RehearSync, we
            collect data about the bands you create or join, songs you upload,
            and your usage of the platform.
          </Text>

          <Heading as="h2" size="lg" color="gray.800" mt={4}>
            2. How We Use Your Information
          </Heading>
          <Text color="gray.600" lineHeight="1.8">
            We use your information to provide and improve the RehearSync
            service, including: managing your account, enabling band
            collaboration, processing audio files, sending transactional emails
            (welcome, password reset, band invitations), and communicating
            important service updates.
          </Text>

          <Heading as="h2" size="lg" color="gray.800" mt={4}>
            3. Audio &amp; File Processing
          </Heading>
          <Text color="gray.600" lineHeight="1.8">
            Audio files you upload are processed using third-party AI services
            (such as Replicate) for stem separation. These files are transmitted
            securely and used solely for processing. We do not sell or share your
            audio content with third parties for their own purposes.
          </Text>

          <Heading as="h2" size="lg" color="gray.800" mt={4}>
            4. Data Storage &amp; Security
          </Heading>
          <Text color="gray.600" lineHeight="1.8">
            Your data is stored on secure servers provided by Supabase and
            Vercel. We use industry-standard encryption for data in transit
            (TLS) and at rest. Passwords are hashed using bcrypt and are never
            stored in plain text.
          </Text>

          <Heading as="h2" size="lg" color="gray.800" mt={4}>
            5. Third-Party Services
          </Heading>
          <Text color="gray.600" lineHeight="1.8">
            We use the following third-party services to operate RehearSync:
            Supabase (database and file storage), Vercel (hosting), Resend
            (transactional emails), Replicate (audio processing), and Stripe
            (payment processing). Each of these services has their own privacy
            policy governing their handling of your data.
          </Text>

          <Heading as="h2" size="lg" color="gray.800" mt={4}>
            6. Cookies &amp; Analytics
          </Heading>
          <Text color="gray.600" lineHeight="1.8">
            We use essential cookies to maintain your session and authentication
            state. We do not use third-party tracking cookies or advertising
            networks.
          </Text>

          <Heading as="h2" size="lg" color="gray.800" mt={4}>
            7. Your Rights
          </Heading>
          <Text color="gray.600" lineHeight="1.8">
            You may access, update, or delete your account and associated data
            at any time through your account settings. If you wish to request a
            full export or deletion of your data, please contact us at the email
            below.
          </Text>

          <Heading as="h2" size="lg" color="gray.800" mt={4}>
            8. Data Retention
          </Heading>
          <Text color="gray.600" lineHeight="1.8">
            We retain your data for as long as your account is active. If you
            delete your account, we will remove your personal data within 30
            days, except where required by law.
          </Text>

          <Heading as="h2" size="lg" color="gray.800" mt={4}>
            9. Changes to This Policy
          </Heading>
          <Text color="gray.600" lineHeight="1.8">
            We may update this policy from time to time. We will notify you of
            significant changes via email or an in-app notice.
          </Text>

          <Heading as="h2" size="lg" color="gray.800" mt={4}>
            10. Contact
          </Heading>
          <Text color="gray.600" lineHeight="1.8">
            If you have questions about this privacy policy, please contact us
            at{" "}
            <Text as="span" color="blue.500">
              support@rehearsync.com
            </Text>
            .
          </Text>
        </VStack>
      </Box>

      {/* Footer */}
      <Box py={8} px={6} borderTop="1px solid" borderColor="gray.200">
        <Text fontSize="sm" color="gray.400" textAlign="center">
          &copy; {new Date().getFullYear()} RehearSync. All rights reserved.
        </Text>
      </Box>
    </Box>
  );
}
