import { z } from 'zod';
import { faker } from '@faker-js/faker';
import {
    EnumApiKeyType,
    EnumNotificationChannel,
    EnumNotificationType,
    EnumRoleType,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';

/**
 * Metadata recorded with an activity-log entry; which keys are present depends on the action.
 * @public
 */
export const ActivityLogMetadataResponseSchema = z.object({
    targetUserId: z.string().optional().meta({
        description: 'Identifier of the user the action was performed on',
        example: faker.database.mongodbObjectId(),
    }),
    targetUsername: z.string().optional().meta({
        description: 'Username of the user the action was performed on',
        example: faker.internet.username().toLowerCase(),
    }),
    actorUserId: z.string().optional().meta({
        description: 'Identifier of the user who performed the action',
        example: faker.database.mongodbObjectId(),
    }),
    timestamp: z.string().optional().meta({
        description: 'Time of the affected record when the action was recorded',
        example: faker.date.recent().toISOString(),
    }),
    sessionId: z.string().optional().meta({
        description: 'Identifier of the affected session',
        example: faker.database.mongodbObjectId(),
    }),
    sessionCount: z.number().optional().meta({
        description: 'Number of sessions revoked by the action',
        example: 2,
    }),
    deviceOwnershipId: z.string().optional().meta({
        description: 'Identifier of the affected device ownership',
        example: faker.database.mongodbObjectId(),
    }),
    deviceId: z.string().optional().meta({
        description: 'Identifier of the affected device',
        example: faker.database.mongodbObjectId(),
    }),
    workspaceInviteId: z.string().optional().meta({
        description: 'Identifier of the affected workspace invite',
        example: faker.database.mongodbObjectId(),
    }),
    userCount: z.number().optional().meta({
        description: 'Number of users created by an import',
        example: 10,
    }),
    apiKeyId: z.string().optional().meta({
        description: 'Identifier of the affected API key',
        example: faker.database.mongodbObjectId(),
    }),
    apiKeyName: z.string().optional().meta({
        description: 'Name of the affected API key',
        example: faker.company.name(),
    }),
    apiKeyType: z.string().optional().meta({
        description: 'Type of the affected API key',
        example: EnumApiKeyType.default,
    }),
    roleId: z.string().optional().meta({
        description: 'Identifier of the affected role',
        example: faker.database.mongodbObjectId(),
    }),
    roleName: z.string().optional().meta({
        description: 'Name of the affected role',
        example: 'admin',
    }),
    roleType: z.string().optional().meta({
        description: 'Type of the affected role',
        example: EnumRoleType.admin,
    }),
    termPolicyId: z.string().optional().meta({
        description: 'Identifier of the affected term policy',
        example: faker.database.mongodbObjectId(),
    }),
    termPolicyType: z.string().optional().meta({
        description: 'Type of the affected term policy',
        example: EnumTermPolicyType.termsOfService,
    }),
    termPolicyVersion: z.union([z.string(), z.number()]).optional().meta({
        description: 'Version of the affected term policy',
        example: 1,
    }),
    channel: z.string().optional().meta({
        description: 'Notification channel of the changed setting',
        example: EnumNotificationChannel.email,
    }),
    type: z.string().optional().meta({
        description: 'Notification type of the changed setting',
        example: EnumNotificationType.userActivity,
    }),
    isActive: z.boolean().optional().meta({
        description: 'Whether the changed notification setting is active',
        example: true,
    }),
});

/**
 * Metadata recorded with an activity-log entry.
 * @public
 */
export type ActivityLogMetadataResponseDto = z.infer<
    typeof ActivityLogMetadataResponseSchema
>;
