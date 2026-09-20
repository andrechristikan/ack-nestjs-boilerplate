import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { RequestBooleanStringSchema } from '@common/request/validations/request.boolean-string.validation';
import {
    ApiKeyDefaultAvailableOrderBy,
    ApiKeyDefaultAvailableSearch,
} from '@modules/api-key/constants/api-key.list.constant';
import { EnumApiKeyType } from '@generated/prisma-client/client';

/**
 * Offset list query for admin API key listing.
 * @public
 */
export const ApiKeyListRequestSchema = PaginationOffsetQuerySchema.extend({
    search: z
        .string()
        .optional()
        .meta({
            description: `Search query, available fields: ${ApiKeyDefaultAvailableSearch.join(', ')}. Search is case-insensitive and support partial match.`,
            example: '',
        }),
    orderBy: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .meta({
            description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${ApiKeyDefaultAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
            example: `${ApiKeyDefaultAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
        }),
    isActive: RequestBooleanStringSchema.optional().meta({
        description: "Filter by active: 'true' or 'false'",
        example: 'true',
    }),
    type: z
        .string()
        .optional()
        .meta({
            description: "value with ',' delimiter",
            example: Object.values(EnumApiKeyType).join(','),
        }),
});

/**
 * Inferred DTO for ApiKeyListRequestSchema.
 * @public
 */
export type ApiKeyListRequestDto = z.infer<typeof ApiKeyListRequestSchema>;
