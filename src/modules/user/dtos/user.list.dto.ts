import { PaginationListAbstract } from 'src/common/pagination/abstracts/pagination.abstract';
import {
    PaginationAvailableSearch,
    PaginationAvailableSort,
    PaginationPage,
    PaginationPerPage,
    PaginationSearch,
    PaginationSort,
} from 'src/common/pagination/pagination.decorator';
import { IPaginationSort } from 'src/common/pagination/pagination.interface';
import {
    USER_DEFAULT_AVAILABLE_SEARCH,
    USER_DEFAULT_AVAILABLE_SORT,
    USER_DEFAULT_PAGE,
    USER_DEFAULT_PER_PAGE,
    USER_DEFAULT_SORT,
} from '../constants/user.list.constant';

export class UserListDto implements PaginationListAbstract {
    @PaginationSearch(USER_DEFAULT_AVAILABLE_SEARCH)
    readonly search: Record<string, any>;

    @PaginationAvailableSearch(USER_DEFAULT_AVAILABLE_SEARCH)
    readonly availableSearch: string[];

    @PaginationPage(USER_DEFAULT_PAGE)
    readonly page: number;

    @PaginationPerPage(USER_DEFAULT_PER_PAGE)
    readonly perPage: number;

    @PaginationSort(USER_DEFAULT_SORT, USER_DEFAULT_AVAILABLE_SORT)
    readonly sort: IPaginationSort;

    @PaginationAvailableSort(USER_DEFAULT_AVAILABLE_SORT)
    readonly availableSort: string[];
}
