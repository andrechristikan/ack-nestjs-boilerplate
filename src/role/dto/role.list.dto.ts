import { Expose, Transform } from 'class-transformer';
import { PaginationListAbstract } from 'src/utils/pagination/pagination.abstract';
import {
    PaginationDefaultAvailableSort,
    PaginationDefaultPage,
    PaginationDefaultPerPage,
    PaginationDefaultSort,
} from 'src/utils/pagination/pagination.decorator';
import { IPaginationSort } from 'src/utils/pagination/pagination.interface';
import {
    ROLE_DEFAULT_AVAILABLE_SORT,
    ROLE_DEFAULT_PAGE,
    ROLE_DEFAULT_PER_PAGE,
    ROLE_DEFAULT_SORT,
} from '../role.constant';

export class RoleListDto implements PaginationListAbstract {
    @Expose()
    @Transform(({ value }) => (value ? value : undefined), {
        toClassOnly: true,
    })
    readonly search?: string;

    @Expose()
    @PaginationDefaultPage(ROLE_DEFAULT_PAGE)
    readonly page: number;

    @Expose()
    @PaginationDefaultPerPage(ROLE_DEFAULT_PER_PAGE)
    readonly perPage: number;

    @Expose()
    @PaginationDefaultSort(ROLE_DEFAULT_SORT, ROLE_DEFAULT_AVAILABLE_SORT)
    readonly sort: IPaginationSort;

    @Expose()
    @PaginationDefaultAvailableSort(ROLE_DEFAULT_AVAILABLE_SORT)
    readonly availableSort: string[];
}
