import { z } from 'zod';
import {
    PaginationDefaultMaxPerPage,
    PaginationDefaultMaxSearchLength,
    PaginationDefaultPerPage,
} from '@common/pagination/constants/pagination.constant';

/** @public */
export const PaginationCursorQuerySchema = z.strictObject({
    cursor: z.string().optional().meta({
        description: 'The pagination cursor returned from the previous request',
        example:
            'io9mYCW27uEJ71dxE4regQ.bBxY9VoJIDlj9122.yqPmXbUIwNz8_fRnl6Tk6H3aTTYkWvRuvM6z8UOn8uAi0ADM09R3Dps_SKciuf9fmfJ6WYvZK0funT0ompmg1jWmMX84kCRcZUnm4cFq1LCfDbVhyyxd3_o6wWQu3VxXf02675zFzQ8cWhrQGVoZkNsGfSfC82zZPgcLO2t_6f_3rqM-AqLpukEGIPkkPsXEaBQB3oeNofuOQitKU3jei3ZfxvXoNfBTUidMpsbIbt06.lp71i4NZZsnn5AISvLzyAw',
    }),
    perPage: z.coerce
        .number()
        .int()
        .optional()
        .meta({
            description: `Data per page, max ${PaginationDefaultMaxPerPage}`,
            example: PaginationDefaultPerPage,
        }),
    search: z
        .string()
        .trim()
        .max(PaginationDefaultMaxSearchLength)
        .optional()
        .meta({
            description: `Search query, case-insensitive, partial match, max ${PaginationDefaultMaxSearchLength} characters`,
            example: '',
        }),
});

/** @public */
export type PaginationCursorQueryDto = z.infer<
    typeof PaginationCursorQuerySchema
>;
