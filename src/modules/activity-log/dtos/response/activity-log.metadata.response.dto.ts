import { z } from 'zod';
import { faker } from '@faker-js/faker';
import {
    EnumApiKeyType,
    EnumNotificationChannel,
    EnumNotificationType,
    EnumRoleScope,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import { EnumRolePlatformKey } from '@modules/role/enums/role.platform-key.enum';

/**
 * Metadata recorded with an activity-log entry; which keys are present depends on the action.
 * @public
 */
export const ActivityLogMetadataResponseSchema = z.object({
    targetUserId: z.string().optional().meta({
        description: 'Identifier of the user the action was performed on',
        example: faker.string.uuid(),
    }),
    targetUsername: z.string().optional().meta({
        description: 'Username of the user the action was performed on',
        example: faker.internet.username().toLowerCase(),
    }),
    actorUserId: z.string().optional().meta({
        description: 'Identifier of the user who performed the action',
        example: faker.string.uuid(),
    }),
    timestamp: z.string().optional().meta({
        description: 'Time of the affected record when the action was recorded',
        example: faker.date.recent().toISOString(),
    }),
    sessionId: z.string().optional().meta({
        description: 'Identifier of the affected session',
        example: faker.string.uuid(),
    }),
    sessionCount: z.number().optional().meta({
        description: 'Number of sessions revoked by the action',
        example: 2,
    }),
    deviceOwnershipId: z.string().optional().meta({
        description: 'Identifier of the affected device ownership',
        example: faker.string.uuid(),
    }),
    deviceId: z.string().optional().meta({
        description: 'Identifier of the affected device',
        example: faker.string.uuid(),
    }),
    workspaceInviteId: z.string().optional().meta({
        description: 'Identifier of the affected workspace invite',
        example: faker.string.uuid(),
    }),
    userCount: z.number().optional().meta({
        description: 'Number of users created by an import',
        example: 10,
    }),
    apiKeyId: z.string().optional().meta({
        description: 'Identifier of the affected API key',
        example: faker.string.uuid(),
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
        example: faker.string.uuid(),
    }),
    roleName: z.string().optional().meta({
        description: 'Name of the affected role',
        example: 'admin',
    }),
    roleKey: z.string().optional().meta({
        description: 'Key of the affected role',
        example: EnumRolePlatformKey.admin,
    }),
    roleScope: z.string().optional().meta({
        description: 'Scope of the affected role',
        example: EnumRoleScope.platform,
    }),
    termPolicyId: z.string().optional().meta({
        description: 'Identifier of the affected term policy',
        example: faker.string.uuid(),
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
