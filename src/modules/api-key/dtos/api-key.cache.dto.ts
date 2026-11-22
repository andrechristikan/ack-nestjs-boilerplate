import { z } from 'zod';
import { EnumApiKeyType } from '@generated/prisma-client/client';
import type { ApiKey } from '@generated/prisma-client/client';

/** @public */
export const ApiKeyCacheSchema = z.object({
    id: z.string(),
    type: z.enum(EnumApiKeyType),
    name: z.string(),
    key: z.string(),
    hash: z.string(),
    isActive: z.boolean(),
    startAt: z.coerce.date().nullable(),
    endAt: z.coerce.date().nullable(),
    createdAt: z.coerce.date(),
    createdBy: z.string().nullable(),
    updatedAt: z.coerce.date(),
    updatedBy: z.string().nullable(),
}) satisfies z.ZodType<ApiKey>;

/** @public */
export type ApiKeyCacheDto = z.infer<typeof ApiKeyCacheSchema>;
