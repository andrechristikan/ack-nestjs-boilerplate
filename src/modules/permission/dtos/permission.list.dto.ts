import { ApiHideProperty } from '@nestjs/swagger';
import { PaginationListAbstract } from 'src/common/pagination/abstracts/pagination.abstract';
import {
    PaginationAvailableSearch,
    PaginationAvailableSort,
    PaginationFilterBoolean,
    PaginationPage,
    PaginationPerPage,
    PaginationSearch,
    PaginationSort,
} from 'src/common/pagination/decorators/pagination.decorator';
import { IPaginationSort } from 'src/common/pagination/interfaces/pagination.interface';
import {
    PERMISSION_DEFAULT_ACTIVE,
    PERMISSION_DEFAULT_AVAILABLE_SEARCH,
    PERMISSION_DEFAULT_AVAILABLE_SORT,
    PERMISSION_DEFAULT_PAGE,
    PERMISSION_DEFAULT_PER_PAGE,
    PERMISSION_DEFAULT_SORT,
} from 'src/modules/permission/constants/permission.list.constant';

export class PermissionListDto implements PaginationListAbstract {
    @PaginationSearch(PERMISSION_DEFAULT_AVAILABLE_SEARCH)
    readonly search: Record<string, any>;

    @ApiHideProperty()
    @PaginationAvailableSearch(PERMISSION_DEFAULT_AVAILABLE_SEARCH)
    readonly availableSearch: string[];

    @PaginationPage(PERMISSION_DEFAULT_PAGE)
    readonly page: number;

    @PaginationPerPage(PERMISSION_DEFAULT_PER_PAGE)
    readonly perPage: number;

    @PaginationSort(PERMISSION_DEFAULT_SORT, PERMISSION_DEFAULT_AVAILABLE_SORT)
    readonly sort: IPaginationSort;

    @ApiHideProperty()
    @PaginationAvailableSort(PERMISSION_DEFAULT_AVAILABLE_SORT)
    readonly availableSort: string[];

    @PaginationFilterBoolean(PERMISSION_DEFAULT_ACTIVE)
    readonly isActive: boolean[];
}
