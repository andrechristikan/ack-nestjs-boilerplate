import { faker } from '@faker-js/faker';
import { ResponseSchema } from '@common/response/dtos/response.dto';
import {
    ResponsePagingMetadataDto,
    ResponsePagingMetadataSchema,
} from '@common/response/dtos/response.paging-metadata.dto';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import {
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';

/**
 * Paginated response envelope without `data`. A route documenting a page adds it with
 * `.extend({ data: z.array(item) })`.
 */
export const ResponsePagingSchema = ResponseSchema.extend({
    metadata: ResponsePagingMetadataSchema.meta({
        description: 'Contain metadata about API',
        example: {
            language: EnumMessageLanguage.en,
            timestamp: 1660190937231,
            timezone: 'Asia/Jakarta',
            version: '1',
            repoVersion: '1.0.0',
            requestId: '01966c9a-2b8d-7000-a957-4e1c1de0c8f7',
            correlationId: '01966c9a-2b8d-7000-a957-4e1c1de0c8f7',
            search: faker.person.fullName(),
            filters: {},
            perPage: 20,
            page: 1,
            totalPage: 5,
            count: 100,
            nextPage: 2,
            previousPage: 1,
            nextCursor: faker.string.alphanumeric(16),
            previousCursor: faker.string.alphanumeric(16),
            hasNext: true,
            hasPrevious: false,
            orderBy: [`createdAt:${EnumPaginationOrderDirectionType.desc}`],
            availableSearch: ['name'],
            availableOrderBy: ['createdAt', 'updatedAt'],
            type: EnumPaginationType.offset,
        },
    }),
});

/**
 * Paginated response envelope: statusCode, message, paging metadata, and a `data` array.
 */
export type ResponsePagingDto<T> = {
    statusCode: number;
    message: string;
    metadata: ResponsePagingMetadataDto;
    data: T[];
};
