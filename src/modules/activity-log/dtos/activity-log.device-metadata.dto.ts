import { z } from 'zod';

export const ActivityLogDeviceMetadataSchema = z
    .strictObject({
        deviceOwnershipId: z.string(),
        deviceId: z.string(),
        userId: z.string(),
        userUsername: z.string(),
        timestamp: z.union([z.string(), z.date()]),
        sessionCount: z.number(),
    })
    .partial();

export type ActivityLogDeviceMetadataDto = z.infer<
    typeof ActivityLogDeviceMetadataSchema
>;
