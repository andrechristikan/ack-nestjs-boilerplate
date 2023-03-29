import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaginationQuery } from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { RequestParamGuard } from 'src/common/request/decorators/request.decorator';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import {
    SETTING_DEFAULT_AVAILABLE_SEARCH,
    SETTING_DEFAULT_AVAILABLE_SORT,
    SETTING_DEFAULT_PER_PAGE,
    SETTING_DEFAULT_SORT,
} from 'src/common/setting/constants/setting.list.constant';
import {
    GetSetting,
    SettingGetByNameGuard,
    SettingGetGuard,
} from 'src/common/setting/decorators/setting.decorator';
import {
    SettingGetByNameDoc,
    SettingGetDoc,
    SettingListDoc,
} from 'src/common/setting/docs/setting.doc';
import { SettingRequestDto } from 'src/common/setting/dtos/setting.request.dto';
import { SettingDoc } from 'src/common/setting/repository/entities/setting.entity';
import { SettingGetSerialization } from 'src/common/setting/serializations/setting.get.serialization';
import { SettingListSerialization } from 'src/common/setting/serializations/setting.list.serialization';
import { SettingService } from 'src/common/setting/services/setting.service';

@ApiTags('setting')
@Controller({
    version: '1',
    path: '/setting',
})
export class SettingController {
    constructor(
        private readonly settingService: SettingService,
        private readonly paginationService: PaginationService
    ) {}

    @SettingListDoc()
    @ResponsePaging('setting.list', {
        serialization: SettingListSerialization,
    })
    @Get('/list')
    async list(
        @PaginationQuery(
            SETTING_DEFAULT_PER_PAGE,
            SETTING_DEFAULT_AVAILABLE_SEARCH,
            SETTING_DEFAULT_SORT,
            SETTING_DEFAULT_AVAILABLE_SORT
        )
        {
            page,
            perPage,
            _offset,
            _search,
            _sort,
            _availableSort,
            _availableSearch,
        }: PaginationListDto
    ): Promise<IResponse> {
        const find: Record<string, any> = {
            ..._search,
        };

        const settings: SettingDoc[] = await this.settingService.findAll(find, {
            paging: {
                limit: perPage,
                offset: _offset,
            },
            order: _sort,
        });
        const totalData: number = await this.settingService.getTotal(find);
        const totalPage: number = this.paginationService.totalPage(
            totalData,
            perPage
        );

        return {
            totalData,
            totalPage,
            currentPage: page,
            perPage,
            _availableSearch,
            _availableSort,
            data: settings,
        };
    }

    @SettingGetDoc()
    @Response('setting.get', {
        serialization: SettingGetSerialization,
    })
    @SettingGetGuard()
    @RequestParamGuard(SettingRequestDto)
    @Get('get/:setting')
    async get(@GetSetting() setting: SettingDoc): Promise<IResponse> {
        return setting;
    }

    @SettingGetByNameDoc()
    @Response('setting.getByName', {
        serialization: SettingGetSerialization,
    })
    @SettingGetByNameGuard()
    @Get('get/name/:settingName')
    async getByName(@GetSetting() setting: SettingDoc): Promise<IResponse> {
        return setting;
    }
}
