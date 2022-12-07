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
    PaginationMongoFilterEnum,
    PaginationMongoSearch,
    PaginationMongoSort,
} from 'src/common/pagination/decorators/pagination.mongo.decorator';
import { IPaginationSort } from 'src/common/pagination/interfaces/pagination.interface';
import { ENUM_PERMISSION_GROUP } from 'src/modules/permission/constants/permission.enum.constant';
import {
    PERMISSION_DEFAULT_ACTIVE,
    PERMISSION_DEFAULT_AVAILABLE_SEARCH,
    PERMISSION_DEFAULT_AVAILABLE_SORT,
    PERMISSION_DEFAULT_GROUP,
    PERMISSION_DEFAULT_PAGE,
    PERMISSION_DEFAULT_PER_PAGE,
    PERMISSION_DEFAULT_SORT,
} from 'src/modules/permission/constants/permission.list.constant';

export class PermissionListDto implements PaginationListAbstract {
    @PaginationMongoSearch(PERMISSION_DEFAULT_AVAILABLE_SEARCH)
    readonly search: Record<string, any>;

    @ApiHideProperty()
    @PaginationAvailableSearch(PERMISSION_DEFAULT_AVAILABLE_SEARCH)
    readonly availableSearch: string[];

    @PaginationPage(PERMISSION_DEFAULT_PAGE)
    readonly page: number;

    @PaginationPerPage(PERMISSION_DEFAULT_PER_PAGE)
    readonly perPage: number;

    @PaginationMongoSort(
        PERMISSION_DEFAULT_SORT,
        PERMISSION_DEFAULT_AVAILABLE_SORT
    )
    readonly sort: IPaginationSort;

    @ApiHideProperty()
    @PaginationAvailableSort(PERMISSION_DEFAULT_AVAILABLE_SORT)
    readonly availableSort: string[];

    @PaginationMongoFilterBoolean(PERMISSION_DEFAULT_ACTIVE)
    readonly isActive: boolean[];

    @PaginationMongoFilterEnum(PERMISSION_DEFAULT_GROUP, ENUM_PERMISSION_GROUP)
    readonly group: string[];
}
