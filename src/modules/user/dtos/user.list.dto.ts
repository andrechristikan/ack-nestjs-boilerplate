import { ApiHideProperty } from '@nestjs/swagger';
import { PaginationListAbstract } from 'src/common/pagination/abstracts/pagination.abstract';
import {
    PaginationAvailableSearch,
    PaginationAvailableSort,
    PaginationPage,
    PaginationPerPage,
} from 'src/common/pagination/decorators/pagination.decorator';
import {
    PaginationMongoFilterBoolean,
    PaginationMongoSearch,
    PaginationMongoSort,
} from 'src/common/pagination/decorators/pagination.mongo.decorator';
import { IPaginationSort } from 'src/common/pagination/interfaces/pagination.interface';
import {
    USER_DEFAULT_AVAILABLE_SEARCH,
    USER_DEFAULT_AVAILABLE_SORT,
    USER_DEFAULT_IS_ACTIVE,
    USER_DEFAULT_PAGE,
    USER_DEFAULT_PER_PAGE,
    USER_DEFAULT_SORT,
} from 'src/modules/user/constants/user.list.constant';

export class UserListDto implements PaginationListAbstract {
    @PaginationMongoSearch(USER_DEFAULT_AVAILABLE_SEARCH)
    readonly search: Record<string, any>;

    @ApiHideProperty()
    @PaginationAvailableSearch(USER_DEFAULT_AVAILABLE_SEARCH)
    readonly availableSearch: string[];

    @PaginationPage(USER_DEFAULT_PAGE)
    readonly page: number;

    @PaginationPerPage(USER_DEFAULT_PER_PAGE)
    readonly perPage: number;

    @PaginationMongoSort(USER_DEFAULT_SORT, USER_DEFAULT_AVAILABLE_SORT)
    readonly sort: IPaginationSort;

    @ApiHideProperty()
    @PaginationAvailableSort(USER_DEFAULT_AVAILABLE_SORT)
    readonly availableSort: string[];

    @PaginationMongoFilterBoolean(USER_DEFAULT_IS_ACTIVE)
    readonly isActive: boolean[];
}
