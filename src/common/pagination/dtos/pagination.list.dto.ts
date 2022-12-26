import { ApiHideProperty } from '@nestjs/swagger';

export class PaginationListDto {
    search: Record<string, any>;

    @ApiHideProperty()
    availableSearch: string[];
    page: number;
    perPage: number;

    @ApiHideProperty()
    offset: number;

    sort: Record<string, any>;

    @ApiHideProperty()
    availableSort: string[];
}
