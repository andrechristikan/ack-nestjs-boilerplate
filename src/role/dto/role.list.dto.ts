import { PaginationListAbstract } from 'src/utils/pagination/pagination.abstract';
import {
    PaginationAvailableSearch,
    PaginationAvailableSort,
    PaginationPage,
    PaginationPerPage,
    PaginationSearch,
    PaginationSort,
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
    @PaginationSearch()
    readonly search?: string;

    @PaginationAvailableSearch(ROLE_DEFAULT_AVAILABLE_SEARCH)
    readonly availableSearch?: string[];

    @PaginationPage(ROLE_DEFAULT_PAGE)
    readonly page: number;

    @PaginationPerPage(ROLE_DEFAULT_PER_PAGE)
    readonly perPage: number;

    @PaginationSort(ROLE_DEFAULT_SORT, ROLE_DEFAULT_AVAILABLE_SORT)
    readonly sort?: IPaginationSort;

    @PaginationAvailableSort(ROLE_DEFAULT_AVAILABLE_SORT)
    readonly availableSort?: string[];
}
