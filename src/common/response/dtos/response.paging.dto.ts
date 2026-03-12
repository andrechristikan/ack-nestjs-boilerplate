import { faker } from '@faker-js/faker';
import { ApiProperty, PickType } from '@nestjs/swagger';
import {
    ResponseDto,
    ResponseMetadataDto,
} from '@common/response/dtos/response.dto';
import {
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';
import { IPaginationOrderBy } from '@common/pagination/interfaces/pagination.interface';

/**
 * Pagination metadata DTO extending base response metadata with pagination information.
 * Provides comprehensive pagination details including search, filtering, sorting, and page statistics.
 *
 * **Pagination Types:**
 * - `OFFSET`: Traditional page-based pagination with page numbers
 * - `CURSOR`: Cursor-based pagination for efficient traversal of large datasets
 */
export class ResponsePagingMetadataDto extends ResponseMetadataDto {
    @ApiProperty({
        required: false,
        description: 'Active search query string.',
        example: faker.person.fullName(),
    })
    search?: string;

    @ApiProperty({
        required: false,
        description: 'Active filter conditions applied to the query.',
    })
    filters?: Record<
        string,
        string | number | boolean | Array<string | number | boolean> | Date
    >;

    @ApiProperty({
        required: true,
        description: 'Number of items per page.',
        example: 20,
    })
    perPage: number;

    @ApiProperty({
        required: false,
        description: 'Current page number. Present only for offset pagination.',
        example: 1,
    })
    page?: number;

    @ApiProperty({
        required: false,
        description:
            'Total number of pages. Present only for offset pagination.',
        example: 5,
    })
    totalPage?: number;

    @ApiProperty({
        required: false,
        description: 'Total number of matching records.',
        example: 100,
    })
    count?: number;

    @ApiProperty({
        required: false,
        description:
            'Next page number. Present only for offset pagination when hasNext is true.',
        example: 2,
    })
    nextPage?: number;

    @ApiProperty({
        required: false,
        description:
            'Previous page number. Present only for offset pagination when hasPrevious is true.',
        example: 1,
    })
    previousPage?: number;

    @ApiProperty({
        required: false,
        description:
            'Encoded cursor token for the next page. Present only for cursor pagination when hasNext is true.',
        example: faker.string.alphanumeric(16),
    })
    nextCursor?: string;

    @ApiProperty({
        required: false,
        description:
            'Encoded cursor token for the previous page. Reserved for future use.',
        example: faker.string.alphanumeric(16),
    })
    previousCursor?: string;

    @ApiProperty({
        required: true,
        description: 'Indicates whether a next page exists.',
        example: true,
    })
    hasNext: boolean;

    @ApiProperty({
        required: true,
        description:
            'Indicates whether a previous page exists. Always false for cursor pagination.',
        example: false,
    })
    hasPrevious: boolean;

    @ApiProperty({
        required: true,
        isArray: true,
        description:
            'Active sort order applied to the query. Each entry is a single-key object with direction.',
        example: [
            {
                createdAt: EnumPaginationOrderDirectionType.desc,
            },
        ],
    })
    orderBy: IPaginationOrderBy[];

    @ApiProperty({
        required: true,
        description: 'Fields available for search.',
        example: ['name'],
    })
    availableSearch: string[];

    @ApiProperty({
        required: true,
        description: 'Fields available for ordering.',
        example: ['createdAt', 'updatedAt'],
    })
    availableOrderBy: string[];

    @ApiProperty({
        required: true,
        type: String,
        enum: EnumPaginationType,
        description: 'Pagination strategy used for this response.',
        example: EnumPaginationType.offset,
    })
    type: EnumPaginationType;
}

/**
 * Paginated response DTO for API responses with data arrays.
 * Extends standard response structure to include pagination metadata and array of data items.
 *
 * @template T - Type of the individual data items in the array
 */
export class ResponsePagingDto<T> extends PickType(ResponseDto, [
    'statusCode',
    'message',
] as const) {
    @ApiProperty({
        name: 'metadata',
        required: true,
        description: 'Contain metadata about API',
        type: ResponsePagingMetadataDto,
    })
    metadata: ResponsePagingMetadataDto;

    @ApiProperty({
        required: true,
        isArray: true,
    })
    data: T[];
}
