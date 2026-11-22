import { z } from 'zod';
import type { Prisma } from '@generated/prisma-client/client';
import type { IFeatureFlag } from '@modules/feature-flag/interfaces/feature-flag.interface';

/** @public */
export const FeatureFlagCacheSchema = z.object({
    id: z.string(),
    key: z.string(),
    description: z.string(),
    isEnable: z.boolean(),
    rolloutPercent: z.number(),
    targetUserIds: z.array(z.string()),
    metadata: z
        .custom<Prisma.JsonValue>(value => z.json().safeParse(value).success)
        .nullable(),
    createdAt: z.coerce.date(),
    createdBy: z.string().nullable(),
    updatedAt: z.coerce.date(),
    updatedBy: z.string().nullable(),
}) satisfies z.ZodType<IFeatureFlag>;

/** @public */
export type FeatureFlagCacheDto = z.infer<typeof FeatureFlagCacheSchema>;
