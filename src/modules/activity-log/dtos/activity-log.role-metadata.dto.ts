import { z } from 'zod';

export const ActivityLogRoleMetadataSchema = z
    .strictObject({
        roleId: z.string(),
        roleName: z.string(),
        roleType: z.string(),
        timestamp: z.union([z.string(), z.date()]),
    })
    .partial();

export type ActivityLogRoleMetadataDto = z.infer<
    typeof ActivityLogRoleMetadataSchema
>;
