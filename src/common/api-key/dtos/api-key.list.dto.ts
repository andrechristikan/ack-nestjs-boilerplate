import { ApiHideProperty } from '@nestjs/swagger';
import {
    API_KEY_DEFAULT_AVAILABLE_SEARCH,
    API_KEY_DEFAULT_AVAILABLE_SORT,
    API_KEY_DEFAULT_IS_ACTIVE,
    API_KEY_DEFAULT_PAGE,
    API_KEY_DEFAULT_PER_PAGE,
    API_KEY_DEFAULT_SORT,
} from 'src/common/api-key/constants/api-key.list.constant';
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

export class ApiKeyListDto implements PaginationListAbstract {
    @PaginationMongoSearch(API_KEY_DEFAULT_AVAILABLE_SEARCH)
    readonly search: Record<string, any>;

    @ApiHideProperty()
    @PaginationAvailableSearch(API_KEY_DEFAULT_AVAILABLE_SEARCH)
    readonly availableSearch: string[];

    @PaginationPage(API_KEY_DEFAULT_PAGE)
    readonly page: number;

    @PaginationPerPage(API_KEY_DEFAULT_PER_PAGE)
    readonly perPage: number;

    @PaginationMongoSort(API_KEY_DEFAULT_SORT, API_KEY_DEFAULT_AVAILABLE_SORT)
    readonly sort: IPaginationSort;

    @ApiHideProperty()
    @PaginationAvailableSort(API_KEY_DEFAULT_AVAILABLE_SORT)
    readonly availableSort: string[];

    @PaginationMongoFilterBoolean(API_KEY_DEFAULT_IS_ACTIVE)
    readonly isActive: boolean[];
}
