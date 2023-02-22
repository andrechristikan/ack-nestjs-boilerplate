import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';

export class PaginationListDto {
    @ApiProperty({
        name: 'search',
        required: true,
        nullable: false,
    })
    _search: Record<string, any>;

    @ApiHideProperty()
    _availableSearch: string[];

    @ApiProperty({
        name: 'page',
        required: true,
        nullable: false,
    })
    page: number;

    @ApiProperty({
        name: 'perPage',
        required: true,
        nullable: false,
    })
    perPage: number;

    @ApiHideProperty()
    _offset: number;

    @ApiProperty({
        name: 'search',
        example: 'createdAt@asc',
        required: true,
        nullable: false,
    })
    _sort: Record<string, any>;

    @ApiHideProperty()
    _availableSort: string[];
}
