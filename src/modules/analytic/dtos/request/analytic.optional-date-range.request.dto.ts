import { z } from 'zod';

/**
 * Validates the optional start and end date query of an analytics route.
 * @public
 */
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

/**
 * Optional analytics date range query.
 * @public
 */
export type AnalyticOptionalDateRangeRequestDto = z.infer<
    typeof AnalyticOptionalDateRangeRequestSchema
>;
