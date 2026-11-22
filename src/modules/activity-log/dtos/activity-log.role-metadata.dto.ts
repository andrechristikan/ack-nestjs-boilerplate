import { z } from 'zod';

/** @public */
export const ActivityLogRoleMetadataSchema = z.strictObject({
    roleId: z.string().exactOptional(),
    roleName: z.string().exactOptional(),
    roleType: z.string().exactOptional(),
    timestamp: z.union([z.string(), z.date()]).exactOptional(),
});

/** @public */
export type ActivityLogRoleMetadataDto = z.infer<
    typeof ActivityLogRoleMetadataSchema
>;
