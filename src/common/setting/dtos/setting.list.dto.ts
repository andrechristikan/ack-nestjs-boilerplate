import { ApiHideProperty } from '@nestjs/swagger';
import { PaginationListAbstract } from 'src/common/pagination/abstracts/pagination.abstract';
import {
    PaginationAvailableSearch,
    PaginationAvailableSort,
    PaginationPage,
    PaginationPerPage,
    PaginationSearch,
    PaginationSort,
} from 'src/common/pagination/decorators/pagination.decorator';
import { IPaginationSort } from 'src/common/pagination/interfaces/pagination.interface';
import {
    SETTING_DEFAULT_AVAILABLE_SEARCH,
    SETTING_DEFAULT_AVAILABLE_SORT,
    SETTING_DEFAULT_PAGE,
    SETTING_DEFAULT_PER_PAGE,
    SETTING_DEFAULT_SORT,
} from 'src/common/setting/constants/setting.list.constant';

export class SettingListDto implements PaginationListAbstract {
    @PaginationSearch(SETTING_DEFAULT_AVAILABLE_SEARCH)
    readonly search: Record<string, any>;

    @ApiHideProperty()
    @PaginationAvailableSearch(SETTING_DEFAULT_AVAILABLE_SEARCH)
    readonly availableSearch: string[];

    @PaginationPage(SETTING_DEFAULT_PAGE)
    readonly page: number;

    @PaginationPerPage(SETTING_DEFAULT_PER_PAGE)
    readonly perPage: number;

    @PaginationSort(SETTING_DEFAULT_SORT, SETTING_DEFAULT_AVAILABLE_SORT)
    readonly sort: IPaginationSort;

    @ApiHideProperty()
    @PaginationAvailableSort(SETTING_DEFAULT_AVAILABLE_SORT)
    readonly availableSort: string[];
}
