import { z } from 'zod';

/** @public */
export const PaginationOrderByQuerySchema = z.object({
    orderBy: z.string().optional(),
});

/** @public */
export type PaginationOrderByQueryDto = z.infer<
    typeof PaginationOrderByQuerySchema
>;
