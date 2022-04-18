import { PaginationListAbstract } from 'src/utils/pagination/pagination.abstract';
import {
    PaginationDefaultAvailableSearch,
    PaginationDefaultAvailableSort,
    PaginationDefaultFilterBoolean,
    PaginationDefaultPage,
    PaginationDefaultPerPage,
    PaginationDefaultSearch,
    PaginationDefaultSort,
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

export class PermissionListDto implements PaginationListAbstract {
    @PaginationDefaultSearch()
    readonly search?: string;

    @PaginationDefaultAvailableSearch(PERMISSION_DEFAULT_AVAILABLE_SEARCH)
    readonly availableSearch?: string[];

    @PaginationDefaultPage(PERMISSION_DEFAULT_PAGE)
    readonly page: number;

    @PaginationDefaultPerPage(PERMISSION_DEFAULT_PER_PAGE)
    readonly perPage: number;

    @PaginationDefaultSort(
        PERMISSION_DEFAULT_SORT,
        PERMISSION_DEFAULT_AVAILABLE_SORT
    )
    readonly sort?: IPaginationSort;

    @PaginationDefaultAvailableSort(PERMISSION_DEFAULT_AVAILABLE_SORT)
    readonly availableSort?: string[];

    @PaginationDefaultFilterBoolean(PERMISSION_DEFAULT_ACTIVE)
    readonly isActive: string[];
}
