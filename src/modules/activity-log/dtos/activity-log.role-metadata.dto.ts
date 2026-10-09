import { z } from 'zod';

/**
 * Validates the activity-log metadata of a role action.
 * @public
 */
export const ActivityLogRoleMetadataSchema = z.strictObject({
    roleId: z.string().exactOptional(),
    roleName: z.string().exactOptional(),
    roleType: z.string().exactOptional(),
    timestamp: z.union([z.string(), z.date()]).exactOptional(),
});

/**
 * Activity-log metadata of a role action.
 * @public
 */
export type ActivityLogRoleMetadataDto = z.infer<
    typeof ActivityLogRoleMetadataSchema
>;
