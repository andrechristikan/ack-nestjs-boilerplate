import { z } from 'zod';

/** @public */
export const UserExportResponseSchema = z.object({
    outboxId: z.string().meta({
        description: 'Id of the queued export job record',
        example: '507f1f77bcf86cd799439011',
    }),
});

/** @public */
export type UserExportResponseDto = z.infer<typeof UserExportResponseSchema>;
