import { PaginationFullListAbstract } from 'src/utils/pagination/pagination.abstract';
import {
    PaginationAvailableSearch,
    PaginationAvailableSort,
    PaginationFilterBoolean,
    PaginationPage,
    PaginationPerPage,
    PaginationSearch,
    PaginationSort,
} from 'src/utils/pagination/pagination.decorator';
import { IPaginationSort } from 'src/utils/pagination/pagination.interface';
import {
    PERMISSION_DEFAULT_ACTIVE,
    PERMISSION_DEFAULT_AVAILABLE_SEARCH,
    PERMISSION_DEFAULT_AVAILABLE_SORT,
    PERMISSION_DEFAULT_PAGE,
    PERMISSION_DEFAULT_PER_PAGE,
    PERMISSION_DEFAULT_SORT,
} from '../permission.constant';

export class PermissionListDto implements PaginationFullListAbstract {
    @PaginationSearch()
    readonly search: string;

    @PaginationAvailableSearch(PERMISSION_DEFAULT_AVAILABLE_SEARCH)
    readonly availableSearch: string[];

    @PaginationPage(PERMISSION_DEFAULT_PAGE)
    readonly page: number;

    @PaginationPerPage(PERMISSION_DEFAULT_PER_PAGE)
    readonly perPage: number;

    @PaginationSort(PERMISSION_DEFAULT_SORT, PERMISSION_DEFAULT_AVAILABLE_SORT)
    readonly sort: IPaginationSort;

    @PaginationAvailableSort(PERMISSION_DEFAULT_AVAILABLE_SORT)
    readonly availableSort: string[];

    @PaginationFilterBoolean(PERMISSION_DEFAULT_ACTIVE)
    readonly isActive: string[];
}
