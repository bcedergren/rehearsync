"use client";

import { Box, Heading, Text, VStack, Flex } from "@chakra-ui/react";
import Image from "next/image";
import NextLink from "next/link";

export default function TermsPage() {
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
          <Image src="/logo.png" alt="RehearSync" width={140} height={32} style={{ height: "auto" }} />
        </NextLink>
      </Flex>

      {/* Content */}
      <Box maxW="760px" mx="auto" px={6} py={12}>
        <VStack align="start" gap={6}>
          <Heading as="h1" size="2xl" color="gray.900">
            Terms of Service
          </Heading>
          <Text fontSize="sm" color="gray.400">
            Last updated: March 9, 2026
          </Text>

          <Heading as="h2" size="lg" color="gray.800" mt={4}>
            1. Acceptance of Terms
          </Heading>
          <Text color="gray.600" lineHeight="1.8">
            By accessing or using RehearSync, you agree to be bound by these
            Terms of Service. If you do not agree to these terms, do not use the
            service.
          </Text>

          <Heading as="h2" size="lg" color="gray.800" mt={4}>
            2. Description of Service
          </Heading>
          <Text color="gray.600" lineHeight="1.8">
            RehearSync is a rehearsal management platform that allows bands to
            organize songs, share sheet music and audio, separate audio stems,
            and collaborate on rehearsal sessions.
          </Text>

          <Heading as="h2" size="lg" color="gray.800" mt={4}>
            3. Account Responsibilities
          </Heading>
          <Text color="gray.600" lineHeight="1.8">
            You are responsible for maintaining the security of your account
            credentials. You must provide accurate information when creating an
            account. You are responsible for all activity that occurs under your
            account.
          </Text>

          <Heading as="h2" size="lg" color="gray.800" mt={4}>
            4. Acceptable Use
          </Heading>
          <Text color="gray.600" lineHeight="1.8">
            You agree not to use RehearSync to upload content that infringes on
            intellectual property rights, distribute malicious software, attempt
            to gain unauthorized access to other accounts or systems, or use the
            service for any unlawful purpose.
          </Text>

          <Heading as="h2" size="lg" color="gray.800" mt={4}>
            5. Content &amp; Intellectual Property
          </Heading>
          <Text color="gray.600" lineHeight="1.8">
            You retain all rights to content you upload to RehearSync. By
            uploading content, you grant us a limited license to store, process,
            and display that content as necessary to provide the service. We do
            not claim ownership of your music, sheet music, or other uploaded
            files.
          </Text>

          <Heading as="h2" size="lg" color="gray.800" mt={4}>
            6. Subscriptions &amp; Payments
          </Heading>
          <Text color="gray.600" lineHeight="1.8">
            Paid plans are billed monthly or yearly through Stripe. You may
            cancel your subscription at any time; access continues until the end
            of the current billing period. Refunds are handled on a
            case-by-case basis.
          </Text>

          <Heading as="h2" size="lg" color="gray.800" mt={4}>
            7. Service Availability
          </Heading>
          <Text color="gray.600" lineHeight="1.8">
            We strive to keep RehearSync available at all times but do not
            guarantee uninterrupted access. We may perform maintenance or updates
            that temporarily affect availability. We are not liable for any
            downtime or data loss.
          </Text>

          <Heading as="h2" size="lg" color="gray.800" mt={4}>
            8. Limitation of Liability
          </Heading>
          <Text color="gray.600" lineHeight="1.8">
            RehearSync is provided &quot;as is&quot; without warranties of any
            kind. To the fullest extent permitted by law, we shall not be liable
            for any indirect, incidental, or consequential damages arising from
            your use of the service.
          </Text>

          <Heading as="h2" size="lg" color="gray.800" mt={4}>
            9. Termination
          </Heading>
          <Text color="gray.600" lineHeight="1.8">
            We reserve the right to suspend or terminate accounts that violate
            these terms. You may delete your account at any time. Upon
            termination, your data will be handled in accordance with our Privacy
            Policy.
          </Text>

          <Heading as="h2" size="lg" color="gray.800" mt={4}>
            10. Changes to Terms
          </Heading>
          <Text color="gray.600" lineHeight="1.8">
            We may update these terms from time to time. Continued use of
            RehearSync after changes constitutes acceptance of the updated terms.
            We will notify you of significant changes via email or an in-app
            notice.
          </Text>

          <Heading as="h2" size="lg" color="gray.800" mt={4}>
            11. Contact
          </Heading>
          <Text color="gray.600" lineHeight="1.8">
            If you have questions about these terms, please contact us at{" "}
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
