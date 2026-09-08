import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';
import {
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceJoinRequestStatus,
} from '@generated/prisma-client';

/**
 * Base workspace-join-request shape: the stored join request row and its review outcome.
 */
export const WorkspaceJoinRequestResponseSchema = DatabaseResponseSchema.omit({
    deletedAt: true,
    deletedBy: true,
}).extend({
    workspaceId: z.string().meta({
        description: 'Identifier of the workspace the join request targets',
        example: faker.database.mongodbObjectId(),
    }),
    userId: z.string().meta({
        description: 'Identifier of the user who submitted the join request',
        example: faker.database.mongodbObjectId(),
    }),
    status: z.enum(EnumWorkspaceJoinRequestStatus).meta({
        description: 'Current status of the join request',
        example: EnumWorkspaceJoinRequestStatus.pending,
    }),
    message: z.string().nullable().meta({
        description: 'Optional message from the requester',
        example: faker.lorem.sentence(),
    }),
    rejectReasonCode: z.enum(EnumWorkspaceJoinRejectReason).nullable().meta({
        description: 'Coded reason when the join request was rejected',
        example: EnumWorkspaceJoinRejectReason.wrongWorkspace,
    }),
    reviewedByUserId: z.string().nullable().meta({
        description: 'Identifier of the user who reviewed the join request',
        example: faker.database.mongodbObjectId(),
    }),
    reviewedAt: z.date().nullable().meta({
        description: 'When the join request was reviewed',
        example: faker.date.recent(),
    }),
});

export type WorkspaceJoinRequestResponseDto = z.infer<
    typeof WorkspaceJoinRequestResponseSchema
>;
