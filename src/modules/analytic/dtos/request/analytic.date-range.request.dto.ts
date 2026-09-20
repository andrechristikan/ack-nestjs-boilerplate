import { z } from 'zod';

/**
 * Validates the required start and end date query of an analytics route.
 * @public
 */
export const AnalyticDateRangeRequestSchema = z.strictObject({
    startDate: z.coerce.date().meta({
        description: 'Range start (inclusive)',
        example: '2026-01-01T00:00:00.000Z',
    }),
    endDate: z.coerce.date().meta({
        description: 'Range end (exclusive)',
        example: '2026-02-01T00:00:00.000Z',
    }),
});

/**
 * Required analytics date range query.
 * @public
 */
export type AnalyticDateRangeRequestDto = z.infer<
    typeof AnalyticDateRangeRequestSchema
>;
