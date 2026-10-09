import { z } from 'zod';

/**
 * Boolean string: exactly `true` or `false`, case-sensitive.
 * @public
 */
export const RequestBooleanStringSchema = z
    .stringbool({ truthy: ['true'], falsy: ['false'], case: 'sensitive' })
    .meta({
        description:
            "Boolean string: exactly 'true' or 'false', case-sensitive",
        example: 'true',
    });
