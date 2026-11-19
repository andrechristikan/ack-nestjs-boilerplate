import { z } from 'zod';
import { PaginationMaxFilterLength } from '@common/pagination/constants/pagination.constant';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { RequestBooleanStringSchema } from '@common/request/validations/request.boolean-string.validation';
import { ApiKeyDefaultAvailableSearch } from '@modules/api-key/constants/api-key.list.constant';
import { EnumApiKeyType } from '@generated/prisma-client/client';
import { EnumApiKeyOrderBy } from '@modules/api-key/enums/api-key.enum';

/** @public */
export const ApiKeyListRequestSchema = PaginationOffsetQuerySchema.extend({
    search: PaginationOffsetQuerySchema.shape.search.meta({
        description: `Search query, available fields: ${ApiKeyDefaultAvailableSearch.join(', ')}. Search is case-insensitive and support partial match.`,
        example: '',
    }),
    orderBy: z
        .union([z.enum(EnumApiKeyOrderBy), z.literal('')])
        .optional()
        .meta({
            description: `Sort preset name. Available presets: ${Object.values(EnumApiKeyOrderBy).join(', ')}. An empty or absent value uses \`${EnumApiKeyOrderBy.latest}\`.`,
            example: EnumApiKeyOrderBy.latest,
        }),
    isActive: RequestBooleanStringSchema.optional().meta({
        description: "Filter by active: 'true' or 'false'",
        example: 'true',
    }),
    type: z
        .string()
        .max(PaginationMaxFilterLength)
        .optional()
        .meta({
            description: `value with ',' delimiter, at most ${PaginationMaxFilterLength} characters`,
            example: Object.values(EnumApiKeyType).join(','),
        }),
});

/** @public */
export type ApiKeyListRequestDto = z.infer<typeof ApiKeyListRequestSchema>;
