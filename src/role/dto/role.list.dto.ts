import { PaginationListAbstract } from 'src/utils/pagination/pagination.abstract';
import {
    PaginationDefaultAvailableSearch,
    PaginationDefaultAvailableSort,
    PaginationDefaultPage,
    PaginationDefaultPerPage,
    PaginationDefaultSearch,
    PaginationDefaultSort,
} from 'src/utils/pagination/pagination.decorator';
import { IPaginationSort } from 'src/utils/pagination/pagination.interface';
import {
    ROLE_DEFAULT_AVAILABLE_SEARCH,
    ROLE_DEFAULT_AVAILABLE_SORT,
    ROLE_DEFAULT_PAGE,
    ROLE_DEFAULT_PER_PAGE,
    ROLE_DEFAULT_SORT,
} from '../role.constant';

export class RoleListDto implements PaginationListAbstract {
    @PaginationDefaultSearch()
    readonly search?: string;

    @PaginationDefaultAvailableSearch(ROLE_DEFAULT_AVAILABLE_SEARCH)
    readonly availableSearch?: string[];

    @PaginationDefaultPage(ROLE_DEFAULT_PAGE)
    readonly page: number;

    @PaginationDefaultPerPage(ROLE_DEFAULT_PER_PAGE)
    readonly perPage: number;

    @PaginationDefaultSort(ROLE_DEFAULT_SORT, ROLE_DEFAULT_AVAILABLE_SORT)
    readonly sort?: IPaginationSort;

    @PaginationDefaultAvailableSort(ROLE_DEFAULT_AVAILABLE_SORT)
    readonly availableSort?: string[];
}
