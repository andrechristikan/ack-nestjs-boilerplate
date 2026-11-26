import type { ISessionLogin } from '@modules/session/interfaces/session.interface';
import { z } from 'zod';

/** @public */
export const SessionLoginCacheSchema = z.object({
    jtiDigest: z.string(),
}) satisfies z.ZodType<ISessionLogin>;

/** @public */
export type SessionLoginCacheDto = z.infer<typeof SessionLoginCacheSchema>;
