import { ApiHideProperty } from '@nestjs/swagger';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { PaginationListAbstract } from 'src/common/pagination/abstracts/pagination.abstract';
import {
    PaginationAvailableSearch,
    PaginationAvailableSort,
    PaginationPage,
    PaginationPerPage,
} from 'src/common/pagination/decorators/pagination.decorator';
import {
    PaginationMongoFilterBoolean,
    PaginationMongoFilterEnum,
    PaginationMongoSearch,
    PaginationMongoSort,
} from 'src/common/pagination/decorators/pagination.mongo.decorator';
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
    @PaginationMongoSearch(ROLE_DEFAULT_AVAILABLE_SEARCH)
    readonly search: Record<string, any>;

    @ApiHideProperty()
    @PaginationAvailableSearch(ROLE_DEFAULT_AVAILABLE_SEARCH)
    readonly availableSearch: string[];

    @PaginationPage(ROLE_DEFAULT_PAGE)
    readonly page: number;

    @PaginationPerPage(ROLE_DEFAULT_PER_PAGE)
    readonly perPage: number;

    @PaginationMongoSort(ROLE_DEFAULT_SORT, ROLE_DEFAULT_AVAILABLE_SORT)
    readonly sort: IPaginationSort;

    @ApiHideProperty()
    @PaginationAvailableSort(ROLE_DEFAULT_AVAILABLE_SORT)
    readonly availableSort: string[];

    @PaginationMongoFilterBoolean(ROLE_DEFAULT_IS_ACTIVE)
    readonly isActive: boolean[];

    @PaginationMongoFilterEnum(ROLE_DEFAULT_ACCESS_FOR, ENUM_AUTH_ACCESS_FOR)
    readonly accessFor: ENUM_AUTH_ACCESS_FOR[];
}
