import { faker } from '@faker-js/faker';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@common/pagination/enums/pagination.enum';
import {
    ResponseDto,
    ResponseMetadataDto,
} from '@common/response/dtos/response.dto';

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
        example: 1,
    })
    page: number;

    @ApiProperty({
        required: true,
        example: 20,
    })
    perPage: number;

    @ApiProperty({
        required: true,
        example: 'createdAt',
    })
    orderBy: string;

    @ApiProperty({
        required: true,
        type: String,
        enum: ENUM_PAGINATION_ORDER_DIRECTION_TYPE,
        example: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC,
    })
    orderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE;

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
    })
    count: number;

    @ApiProperty({
        required: true,
    })
    totalPage: number;
}

export class ResponsePagingDto<T> extends PickType(ResponseDto, [
    'statusCode',
    'message',
] as const) {
    @ApiProperty({
        name: 'metadata',
        required: true,
        description: 'Contain metadata about API',
        type: ResponsePagingMetadataDto,
        example: {
            language: 'en',
            timestamp: 1660190937231,
            timezone: 'Asia/Jakarta',
            path: '/api/v1/test/hello',
            version: '1',
            repoVersion: '1.0.0',
            search: faker.person.fullName(),
            filters: {
                status: 'active',
                category: ['electronics', 'furniture'],
            },
            page: 1,
            perPage: 20,
            orderBy: 'createdAt',
            orderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC,
            availableSearch: ['name'],
            availableOrderBy: {
                createdAt: [
                    ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC,
                    ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
                ],
            },
            count: 100,
            totalPage: 5,
        },
    })
    metadata: ResponsePagingMetadataDto;

    @ApiProperty({
        required: true,
        isArray: true,
    })
    data: T[];
}
