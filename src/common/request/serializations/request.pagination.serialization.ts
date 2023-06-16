import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/constants/pagination.enum.constant';

export class RequestPaginationSerialization {
    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.person.firstName(),
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
