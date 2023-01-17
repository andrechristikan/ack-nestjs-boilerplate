import { ApiHideProperty } from '@nestjs/swagger';

export class PaginationListDto {
    _search: Record<string, any>;

    @ApiHideProperty()
    _availableSearch: string[];

    page: number;
    perPage: number;

    @ApiHideProperty()
    _offset: number;

    _sort: Record<string, any>;

    @ApiHideProperty()
    _availableSort: string[];
}
