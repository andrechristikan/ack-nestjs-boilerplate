import { z } from 'zod';

/** @public */
export const AnalyticDateRangeRequestSchema = z.strictObject({
    startDate: z.coerce.date().meta({
        description: 'Range start (inclusive)',
        example: '2026-01-01T00:00:00.000Z',
    }),
    endDate: z.coerce.date().meta({
        description:
            'Range end (exclusive); the range cannot exceed the maximum window',
        example: '2026-02-01T00:00:00.000Z',
    }),
});

/** @public */
export type AnalyticDateRangeRequestDto = z.infer<
    typeof AnalyticDateRangeRequestSchema
>;
