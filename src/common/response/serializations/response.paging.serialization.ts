import { ApiProperty, PickType } from '@nestjs/swagger';
import { IErrorHttpFilterMetadata } from 'src/common/error/interfaces/error.interface';
import { ResponseDefaultSerialization } from 'src/common/response/serializations/response.default.serialization';

export class ResponsePagingMetadataSerialization {
    nextPage?: string;
    previousPage?: string;
    firstPage?: string;
    lastPage?: string;
}

export class ResponsePagingSerialization<
    T = Record<string, any>
> extends PickType(ResponseDefaultSerialization, [
    'statusCode',
    'message',
] as const) {
    @ApiProperty({
        name: 'totalData',
        type: Number,
        nullable: false,
        description: 'return total data in database',
        example: 100,
    })
    readonly totalData: number;

    @ApiProperty({
        name: 'totalPage',
        type: Number,
        nullable: true,
        description: 'return total page, max 20',
        example: 20,
    })
    totalPage?: number;

    @ApiProperty({
        name: 'currentPage',
        type: Number,
        nullable: true,
        description: 'return current page',
        example: 2,
    })
    currentPage?: number;

    @ApiProperty({
        name: 'perPage',
        type: Number,
        nullable: true,
        description: 'return per page',
        example: 10,
    })
    perPage?: number;

    @ApiProperty({
        name: '_availableSearch',
        type: 'array',
        nullable: false,
        description:
            'Search will base on _availableSearch with rule contains, and case insensitive',
    })
    _availableSearch?: string[];

    @ApiProperty({
        name: '_availableSort',
        type: 'array',
        nullable: false,
        description: 'Sort will base on _availableSort',
    })
    _availableSort?: string[];

    @ApiProperty({
        name: '_metadata',
        nullable: true,
        description: 'Contain metadata about API',
        type: 'object',
        required: true,
        example: {
            languages: ['en'],
            timestamp: 1660190937231,
            timezone: 'Asia/Jakarta',
            requestId: '40c2f734-7247-472b-bc26-8eff6e669781',
            path: '/api/v1/test/hello',
            version: '1',
            repoVersion: '1.0.0',
            nextPage: `http://217.0.0.1/__path?perPage=10&page=3&search=abc`,
            previousPage: `http://217.0.0.1/__path?perPage=10&page=1&search=abc`,
            firstPage: `http://217.0.0.1/__path?perPage=10&page=1&search=abc`,
            lastPage: `http://217.0.0.1/__path?perPage=10&page=20&search=abc`,
        },
    })
    readonly _metadata?: IErrorHttpFilterMetadata &
        ResponsePagingMetadataSerialization;

    readonly data?: T[];
}
