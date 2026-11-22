import { z } from 'zod';

/** @public */
export const WorkspaceSoftDeleteResponseSchema = z.object({
    outboxId: z.string().meta({
        description: 'Id of the queued workspace delete job record',
        example: '507f1f77bcf86cd799439011',
    }),
});

/** @public */
export type WorkspaceSoftDeleteResponseDto = z.infer<
    typeof WorkspaceSoftDeleteResponseSchema
>;
