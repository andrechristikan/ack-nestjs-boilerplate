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
        example: faker.person.fullName(),
    })
    search?: string;

    @ApiProperty({
        required: false,
    })
    filters?: Record<
        string,
        string | number | boolean | Array<string | number | boolean> | Date
    >;

    @ApiProperty({
        required: true,
        example: 20,
    })
    perPage: number;

    @ApiProperty({
        required: false,
        example: 1,
    })
    page?: number;

    @ApiProperty({
        required: false,
        example: 5,
    })
    totalPage?: number;

    @ApiProperty({
        required: false,
        example: 100,
    })
    count?: number;

    @ApiProperty({
        required: false,
        example: 2,
    })
    nextPage?: number;

    @ApiProperty({
        required: false,
        example: 0,
    })
    previousPage?: number;

    @ApiProperty({
        required: false,
        example: faker.string.alphanumeric(16),
    })
    nextCursor?: string;

    @ApiProperty({
        required: false,
        example: faker.string.alphanumeric(16),
    })
    previousCursor?: string;

    @ApiProperty({
        required: true,
        example: true,
    })
    hasNext: boolean;

    @ApiProperty({
        required: true,
        example: true,
    })
    hasPrevious: boolean;

    @ApiProperty({
        required: true,
        example: 'createdAt',
    })
    orderBy: string;

    @ApiProperty({
        required: true,
        type: String,
        enum: EnumPaginationOrderDirectionType,
        example: EnumPaginationOrderDirectionType.asc,
    })
    orderDirection: EnumPaginationOrderDirectionType;

    @ApiProperty({
        required: true,
        example: ['name'],
    })
    availableSearch: string[];

    @ApiProperty({
        required: true,
        example: ['createdAt', 'updatedAt'],
    })
    availableOrderBy: string[];

    @ApiProperty({
        required: true,
        type: String,
        enum: EnumPaginationType,
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
