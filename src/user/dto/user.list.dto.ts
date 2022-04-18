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
    USER_DEFAULT_AVAILABLE_SEARCH,
    USER_DEFAULT_AVAILABLE_SORT,
    USER_DEFAULT_SORT,
} from '../user.constant';

export class UserListDto implements PaginationListAbstract {
    @PaginationDefaultSearch()
    readonly search?: string;

    @PaginationDefaultAvailableSearch(USER_DEFAULT_AVAILABLE_SEARCH)
    readonly availableSearch?: string[];

    @PaginationDefaultPage()
    readonly page: number;

    @PaginationDefaultPerPage()
    readonly perPage: number;

    @PaginationDefaultSort(USER_DEFAULT_SORT, USER_DEFAULT_AVAILABLE_SORT)
    readonly sort?: IPaginationSort;

    @PaginationDefaultAvailableSort(USER_DEFAULT_AVAILABLE_SORT)
    readonly availableSort?: string[];
}
