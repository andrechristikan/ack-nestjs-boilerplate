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
    USER_DEFAULT_AVAILABLE_SEARCH,
    USER_DEFAULT_AVAILABLE_SORT,
    USER_DEFAULT_SORT,
} from '../user.constant';

export class UserListDto implements PaginationListAbstract {
    @PaginationSearch()
    readonly search: string;

    @PaginationAvailableSearch(USER_DEFAULT_AVAILABLE_SEARCH)
    readonly availableSearch: string[];

    @PaginationPage()
    readonly page: number;

    @PaginationPerPage()
    readonly perPage: number;

    @PaginationSort(USER_DEFAULT_SORT, USER_DEFAULT_AVAILABLE_SORT)
    readonly sort: IPaginationSort;

    @PaginationAvailableSort(USER_DEFAULT_AVAILABLE_SORT)
    readonly availableSort: string[];
}
