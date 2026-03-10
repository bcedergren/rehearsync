"use client";

import {
  Box,
  Button,
  Dialog,
  CloseButton,
  Flex,
  Text,
  Badge,
  VStack,
} from "@chakra-ui/react";
import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";

interface UnassignedPart {
  id: string;
  instrumentName: string;
  partName: string | null;
}

interface BandMember {
  id: string;
  displayName: string;
  defaultInstrument: string | null;
}

interface Assignment {
  memberId: string;
  partId: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  unassignedParts: UnassignedPart[];
  members: BandMember[];
  autoAssigned: Assignment[];
  onConfirm: (assignments: Assignment[]) => Promise<void>;
  isSubmitting?: boolean;
}

function DraggablePart({ part, isAssigned }: { part: UnassignedPart; isAssigned: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: part.id,
    disabled: isAssigned,
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      p={2}
      bg={isAssigned ? "green.50" : "blue.50"}
      border="1px solid"
      borderColor={isAssigned ? "green.200" : "blue.200"}
      borderRadius="md"
      cursor={isAssigned ? "default" : "grab"}
      opacity={isDragging ? 0.5 : 1}
      transition="background 0.15s"
      _hover={!isAssigned ? { bg: "blue.100", borderColor: "blue.300" } : undefined}
    >
      <Text fontSize="sm" fontWeight="medium" color={isAssigned ? "green.700" : "gray.800"}>
        {part.instrumentName}
      </Text>
      {part.partName && (
        <Text fontSize="xs" color="gray.500">{part.partName}</Text>
      )}
    </Box>
  );
}

function PartOverlay({ part }: { part: UnassignedPart }) {
  return (
    <Box
      p={2}
      bg="blue.100"
      border="2px solid"
      borderColor="blue.400"
      borderRadius="md"
      boxShadow="lg"
      cursor="grabbing"
    >
      <Text fontSize="sm" fontWeight="medium" color="gray.800">
        {part.instrumentName}
      </Text>
      {part.partName && (
        <Text fontSize="xs" color="gray.500">{part.partName}</Text>
      )}
    </Box>
  );
}

function MemberDropZone({
  member,
  assignedPart,
  onRemove,
}: {
  member: BandMember;
  assignedPart: UnassignedPart | null;
  onRemove: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `member-${member.id}`,
  });

  return (
    <Box
      ref={setNodeRef}
      p={3}
      bg={isOver ? "purple.50" : assignedPart ? "green.50" : "gray.50"}
      border="2px"
      borderStyle={assignedPart ? "solid" : "dashed"}
      borderColor={isOver ? "purple.300" : assignedPart ? "green.200" : "gray.200"}
      borderRadius="lg"
      transition="all 0.15s"
      minH="70px"
    >
      <Flex justify="space-between" align="center" mb={assignedPart ? 2 : 0}>
        <Box>
          <Text fontSize="sm" fontWeight="semibold" color="gray.800">
            {member.displayName}
          </Text>
          {member.defaultInstrument && (
            <Text fontSize="xs" color="gray.500">
              Plays: {member.defaultInstrument}
            </Text>
          )}
        </Box>
      </Flex>
      {assignedPart ? (
        <Flex
          align="center"
          justify="space-between"
          p={2}
          bg="green.100"
          borderRadius="md"
        >
          <Flex align="center" gap={2}>
            <Badge colorPalette="green" variant="subtle" fontSize="xs">
              Assigned
            </Badge>
            <Text fontSize="sm" fontWeight="medium">
              {assignedPart.instrumentName}
              {assignedPart.partName ? ` (${assignedPart.partName})` : ""}
            </Text>
          </Flex>
          <Button
            size="xs"
            variant="ghost"
            colorPalette="red"
            onClick={onRemove}
          >
            ✕
          </Button>
        </Flex>
      ) : (
        <Text fontSize="xs" color="gray.400" textAlign="center" py={1}>
          {isOver ? "Drop here to assign" : "Drag a part here"}
        </Text>
      )}
    </Box>
  );
}

export function AssignmentReviewModal({
  open,
  onClose,
  unassignedParts,
  members,
  autoAssigned,
  onConfirm,
  isSubmitting,
}: Props) {
  // Local draft assignments (memberId -> partId)
  const [draftAssignments, setDraftAssignments] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const a of autoAssigned) {
      initial[a.memberId] = a.partId;
    }
    return initial;
  });

  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // All parts that need assignment (both already auto-assigned and unassigned)
  const allParts = unassignedParts;

  // Reverse lookup: partId -> memberId
  const partToMember: Record<string, string> = {};
  for (const [memberId, partId] of Object.entries(draftAssignments)) {
    partToMember[partId] = memberId;
  }

  const assignedPartIds = new Set(Object.values(draftAssignments));
  const remainingParts = allParts.filter((p) => !assignedPartIds.has(p.id));

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const partId = String(active.id);
    const droppableId = String(over.id);

    // Extract member id from droppable id
    if (!droppableId.startsWith("member-")) return;
    const memberId = droppableId.replace("member-", "");

    setDraftAssignments((prev) => {
      const next = { ...prev };
      // Remove part from any previous member
      for (const [mId, pId] of Object.entries(next)) {
        if (pId === partId) delete next[mId];
      }
      // Remove any existing assignment for this member
      delete next[memberId];
      // Assign
      next[memberId] = partId;
      return next;
    });
  }, []);

  const handleRemove = useCallback((memberId: string) => {
    setDraftAssignments((prev) => {
      const next = { ...prev };
      delete next[memberId];
      return next;
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    const assignments: Assignment[] = Object.entries(draftAssignments).map(
      ([memberId, partId]) => ({ memberId, partId })
    );
    await onConfirm(assignments);
  }, [draftAssignments, onConfirm]);

  const activePart = activeDragId
    ? allParts.find((p) => p.id === activeDragId) ?? null
    : null;

  const totalAssigned = Object.keys(draftAssignments).length;

  return (
    <Dialog.Root open={open} onOpenChange={(e) => { if (!e.open) onClose(); }}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxW="700px" w="90vw">
          <Dialog.Header>
            <Dialog.Title>Review Part Assignments</Dialog.Title>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Header>
          <Dialog.Body>
            <Text fontSize="sm" color="gray.500" mb={4}>
              Some parts couldn&apos;t be automatically matched to band members. Drag parts to assign them.
            </Text>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <Flex gap={6} direction={{ base: "column", md: "row" }}>
                {/* Unassigned parts pool */}
                <Box flex={1}>
                  <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" mb={2}>
                    Parts
                  </Text>
                  <VStack gap={2} align="stretch">
                    {allParts.map((part) => (
                      <DraggablePart
                        key={part.id}
                        part={part}
                        isAssigned={assignedPartIds.has(part.id)}
                      />
                    ))}
                  </VStack>
                  {remainingParts.length > 0 && (
                    <Text fontSize="xs" color="orange.500" mt={2}>
                      {remainingParts.length} part{remainingParts.length !== 1 ? "s" : ""} unassigned
                    </Text>
                  )}
                </Box>

                {/* Members with drop zones */}
                <Box flex={1}>
                  <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" mb={2}>
                    Band Members
                  </Text>
                  <VStack gap={2} align="stretch">
                    {members.map((member) => {
                      const assignedPartId = draftAssignments[member.id];
                      const assignedPart = assignedPartId
                        ? allParts.find((p) => p.id === assignedPartId) ?? null
                        : null;
                      return (
                        <MemberDropZone
                          key={member.id}
                          member={member}
                          assignedPart={assignedPart}
                          onRemove={() => handleRemove(member.id)}
                        />
                      );
                    })}
                  </VStack>
                </Box>
              </Flex>

              <DragOverlay>
                {activePart ? <PartOverlay part={activePart} /> : null}
              </DragOverlay>
            </DndContext>
          </Dialog.Body>
          <Dialog.Footer>
            <Flex gap={3} w="full" align="center">
              <Text fontSize="xs" color="gray.500" flex={1}>
                {totalAssigned} of {allParts.length} parts assigned
              </Text>
              <Button variant="outline" onClick={onClose}>
                Skip
              </Button>
              <Button
                colorPalette="blue"
                onClick={handleConfirm}
                loading={isSubmitting}
                disabled={totalAssigned === 0}
              >
                Confirm Assignments
              </Button>
            </Flex>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
