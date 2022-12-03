import { ApiHideProperty } from '@nestjs/swagger';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { PaginationListAbstract } from 'src/common/pagination/abstracts/pagination.abstract';
import {
    PaginationAvailableSearch,
    PaginationAvailableSort,
    PaginationFilterBoolean,
    PaginationFilterEnum,
    PaginationPage,
    PaginationPerPage,
    PaginationSearch,
    PaginationSort,
} from 'src/common/pagination/decorators/pagination.decorator';
import { IPaginationSort } from 'src/common/pagination/interfaces/pagination.interface';
import {
    ROLE_DEFAULT_ACCESS_FOR,
    ROLE_DEFAULT_AVAILABLE_SEARCH,
    ROLE_DEFAULT_AVAILABLE_SORT,
    ROLE_DEFAULT_IS_ACTIVE,
    ROLE_DEFAULT_PAGE,
    ROLE_DEFAULT_PER_PAGE,
    ROLE_DEFAULT_SORT,
} from 'src/modules/role/constants/role.list.constant';

export class RoleListDto implements PaginationListAbstract {
    @PaginationSearch(ROLE_DEFAULT_AVAILABLE_SEARCH)
    readonly search: Record<string, any>;

    @ApiHideProperty()
    @PaginationAvailableSearch(ROLE_DEFAULT_AVAILABLE_SEARCH)
    readonly availableSearch: string[];

    @PaginationPage(ROLE_DEFAULT_PAGE)
    readonly page: number;

    @PaginationPerPage(ROLE_DEFAULT_PER_PAGE)
    readonly perPage: number;

    @PaginationSort(ROLE_DEFAULT_SORT, ROLE_DEFAULT_AVAILABLE_SORT)
    readonly sort: IPaginationSort;

    @ApiHideProperty()
    @PaginationAvailableSort(ROLE_DEFAULT_AVAILABLE_SORT)
    readonly availableSort: string[];

    @PaginationFilterBoolean(ROLE_DEFAULT_IS_ACTIVE)
    readonly isActive: boolean[];

    @PaginationFilterEnum(ROLE_DEFAULT_ACCESS_FOR, ENUM_AUTH_ACCESS_FOR)
    readonly accessFor: ENUM_AUTH_ACCESS_FOR[];
}
