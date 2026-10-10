import { z } from 'zod';

/**
 * Validates the activity-log metadata of a role action.
 * @public
 */
export const ActivityLogRoleMetadataSchema = z
    .strictObject({
        roleId: z.string(),
        roleName: z.string(),
        roleKey: z.string(),
        roleScope: z.string(),
        timestamp: z.union([z.string(), z.date()]),
    })
    .partial();

/**
 * Activity-log metadata of a role action.
 * @public
 */
export type ActivityLogRoleMetadataDto = z.infer<
    typeof ActivityLogRoleMetadataSchema
>;
