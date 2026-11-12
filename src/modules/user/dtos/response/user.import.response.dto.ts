import { z } from 'zod';

/** @public */
export const UserImportResponseSchema = z.object({
    outboxId: z.string().meta({
        description: 'Id of the queued import job record',
        example: '507f1f77bcf86cd799439011',
    }),
});

/** @public */
export type UserImportResponseDto = z.infer<typeof UserImportResponseSchema>;
