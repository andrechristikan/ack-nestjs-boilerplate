import { z } from 'zod';

/** @public */
export const SessionLoginCacheSchema = z.object({
    jtiDigest: z.string(),
});

/** @public */
export type SessionLoginCacheDto = z.infer<typeof SessionLoginCacheSchema>;
