import { z } from 'zod';

export const AnalyticOptionalDateRangeRequestSchema = z.strictObject({
    startDate: z.coerce.date().optional().meta({
        description: 'Optional range start (inclusive)',
        example: '2026-01-01T00:00:00.000Z',
    }),
    endDate: z.coerce.date().optional().meta({
        description: 'Optional range end (exclusive)',
        example: '2026-02-01T00:00:00.000Z',
    }),
});

export type AnalyticOptionalDateRangeRequestDto = z.infer<
    typeof AnalyticOptionalDateRangeRequestSchema
>;
