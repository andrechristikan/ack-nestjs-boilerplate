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
    PERMISSION_DEFAULT_AVAILABLE_SORT,
    PERMISSION_DEFAULT_PAGE,
    PERMISSION_DEFAULT_PER_PAGE,
    PERMISSION_DEFAULT_SORT,
} from '../permission.constant';

export class PermissionListDto implements PaginationListAbstract {
    @Expose()
    @Transform(({ value }) => (value ? value : undefined), {
        toClassOnly: true,
    })
    readonly search?: string;

    @Expose()
    @PaginationDefaultPage(PERMISSION_DEFAULT_PAGE)
    readonly page: number;

    @Expose()
    @PaginationDefaultPerPage(PERMISSION_DEFAULT_PER_PAGE)
    readonly perPage: number;

    @Expose()
    @PaginationDefaultSort(
        PERMISSION_DEFAULT_SORT,
        PERMISSION_DEFAULT_AVAILABLE_SORT
    )
    readonly sort: IPaginationSort;

    @Expose()
    @PaginationDefaultAvailableSort(PERMISSION_DEFAULT_AVAILABLE_SORT)
    readonly availableSort: string[];
}
