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
    USER_DEFAULT_AVAILABLE_SORT,
    USER_DEFAULT_SORT,
} from '../user.constant';

export class UserListDto implements PaginationListAbstract {
    @Expose()
    @Transform(({ value }) => (value ? value : undefined), {
        toClassOnly: true,
    })
    readonly search?: string;

    @Expose()
    @PaginationDefaultPage()
    readonly page: number;

    @Expose()
    @PaginationDefaultPerPage()
    readonly perPage: number;

    @Expose()
    @PaginationDefaultSort(USER_DEFAULT_SORT, USER_DEFAULT_AVAILABLE_SORT)
    readonly sort: IPaginationSort;

    @Expose()
    @PaginationDefaultAvailableSort(USER_DEFAULT_AVAILABLE_SORT)
    readonly availableSort: string[];
}
