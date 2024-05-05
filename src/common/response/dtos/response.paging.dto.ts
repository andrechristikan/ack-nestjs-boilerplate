import { faker } from '@faker-js/faker';
import { ApiHideProperty, ApiProperty, PickType } from '@nestjs/swagger';
import { PAGINATION_DEFAULT_AVAILABLE_ORDER_DIRECTION } from 'src/common/pagination/constants/pagination.constant';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/constants/pagination.enum.constant';
import {
    ResponseDto,
    ResponseMetadataDto,
} from 'src/common/response/dtos/response.dto';

export class ResponsePagingMetadataCursorDto {
    @ApiProperty({
        required: true,
    })
    nextPage: string;

    @ApiProperty({
        required: true,
    })
    previousPage: string;

    @ApiProperty({
        required: true,
    })
    firstPage: string;

    @ApiProperty({
        required: true,
    })
    lastPage: string;
}

export class ResponsePagingMetadataRequestDto {
    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.person.fullName(),
    })
    search: string;

    @ApiProperty({
        required: true,
        nullable: false,
        example: {},
    })
    filters: Record<
        string,
        string | number | boolean | Array<string | number | boolean>
    >;

    @ApiProperty({
        required: true,
        nullable: false,
        example: 1,
    })
    page: number;

    @ApiProperty({
        required: true,
        nullable: false,
        example: 20,
    })
    perPage: number;

    @ApiProperty({
        required: true,
        nullable: false,
        example: 'createdAt',
    })
    orderBy: string;

    @ApiProperty({
        required: true,
        nullable: false,
        example: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC,
    })
    orderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE;

    @ApiProperty({
        required: true,
        nullable: false,
        example: ['name'],
    })
    availableSearch: string[];

    @ApiProperty({
        required: true,
        nullable: false,
        example: ['name', 'createdAt'],
    })
    availableOrderBy: string[];

    @ApiProperty({
        required: true,
        nullable: false,
        example: Object.values(ENUM_PAGINATION_ORDER_DIRECTION_TYPE),
    })
    availableOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE[];
}

export class ResponsePagingMetadataPaginationDto extends ResponsePagingMetadataRequestDto {
    @ApiProperty({
        required: false,
    })
    total?: number;

    @ApiProperty({
        required: false,
    })
    totalPage?: number;
}

export class ResponsePagingMetadataDto extends ResponseMetadataDto {
    @ApiProperty({
        required: false,
        type: () => ResponsePagingMetadataCursorDto,
    })
    cursor?: ResponsePagingMetadataCursorDto;

    @ApiProperty({
        required: false,
        type: () => ResponsePagingMetadataPaginationDto,
    })
    pagination?: ResponsePagingMetadataPaginationDto;
}

export class ResponsePagingDto extends PickType(ResponseDto, [
    'statusCode',
    'message',
] as const) {
    @ApiProperty({
        name: '_metadata',
        required: true,
        nullable: false,
        description: 'Contain metadata about API',
        type: () => ResponsePagingMetadataDto,
        example: {
            language: 'en',
            timestamp: 1660190937231,
            timezone: 'Asia/Dubai',
            path: '/api/v1/test/hello',
            version: '1',
            repoVersion: '1.0.0',
            pagination: {
                search: faker.person.fullName(),
                page: 1,
                perPage: 20,
                orderBy: 'createdAt',
                orderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC,
                availableSearch: ['name'],
                availableOrderBy: ['createdAt'],
                availableOrderDirection:
                    PAGINATION_DEFAULT_AVAILABLE_ORDER_DIRECTION,
                total: 100,
                totalPage: 5,
            },
            cursor: {
                nextPage: `http://217.0.0.1/__path?perPage=10&page=3&search=abc`,
                previousPage: `http://217.0.0.1/__path?perPage=10&page=1&search=abc`,
                firstPage: `http://217.0.0.1/__path?perPage=10&page=1&search=abc`,
                lastPage: `http://217.0.0.1/__path?perPage=10&page=20&search=abc`,
            },
        },
    })
    readonly _metadata: ResponsePagingMetadataDto;

    @ApiHideProperty()
    data?: Record<string, any>[];
}
