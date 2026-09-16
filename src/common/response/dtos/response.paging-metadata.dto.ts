import { faker } from '@faker-js/faker';
import { z } from 'zod';
import {
    ResponseMetadataDto,
    ResponseMetadataSchema,
} from '@common/response/dtos/response.metadata.dto';
import {
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';

/**
 * Response metadata extended with pagination state (search, filters, order, page/cursor stats).
 */
export const ResponsePagingMetadataSchema = ResponseMetadataSchema.extend({
    search: z.string().optional().meta({
        description: 'Active search query string.',
        example: faker.person.fullName(),
    }),
    filters: z
        .record(
            z.string(),
            z.union([
                z.string(),
                z.number(),
                z.boolean(),
                z.array(z.union([z.string(), z.number(), z.boolean()])),
                z.date(),
            ])
        )
        .optional()
        .meta({
            description: 'Active filter conditions applied to the query.',
            example: {},
        }),
    perPage: z.number().meta({
        description: 'Number of items per page.',
        example: 20,
    }),
    page: z.number().optional().meta({
        description: 'Current page number. Present only for offset pagination.',
        example: 1,
    }),
    totalPage: z.number().optional().meta({
        description:
            'Total number of pages. Present only for offset pagination.',
        example: 5,
    }),
    count: z.number().optional().meta({
        description: 'Total number of matching records.',
        example: 100,
    }),
    nextPage: z.number().optional().meta({
        description:
            'Next page number. Present only for offset pagination when hasNext is true.',
        example: 2,
    }),
    previousPage: z.number().optional().meta({
        description:
            'Previous page number. Present only for offset pagination when hasPrevious is true.',
        example: 1,
    }),
    nextCursor: z
        .string()
        .optional()
        .meta({
            description:
                'Encoded cursor token for the next page. Present only for cursor pagination when hasNext is true.',
            example: faker.string.alphanumeric(16),
        }),
    previousCursor: z
        .string()
        .optional()
        .meta({
            description:
                'Encoded cursor token for the previous page. Reserved for future use.',
            example: faker.string.alphanumeric(16),
        }),
    hasNext: z.boolean().meta({
        description: 'Indicates whether a next page exists.',
        example: true,
    }),
    hasPrevious: z.boolean().meta({
        description:
            'Indicates whether a previous page exists. Always false for cursor pagination.',
        example: false,
    }),
    orderBy: z.array(z.string()).meta({
        description:
            'Active sort order applied to the query, in `field:direction` format.',
        example: [`createdAt:${EnumPaginationOrderDirectionType.desc}`],
    }),
    availableSearch: z.array(z.string()).meta({
        description: 'Fields available for search.',
        example: ['name'],
    }),
    availableOrderBy: z.array(z.string()).meta({
        description: 'Fields available for ordering.',
        example: ['createdAt', 'updatedAt'],
    }),
    type: z.enum(EnumPaginationType).meta({
        description: 'Pagination strategy used for this response.',
        example: EnumPaginationType.offset,
    }),
});

/**
 * Extensible: carries additional metadata fields alongside the declared ones.
 */
export type ResponsePagingMetadataDto = z.infer<
    typeof ResponsePagingMetadataSchema
> &
    ResponseMetadataDto;
