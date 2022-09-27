import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthApiKey } from 'src/common/auth/decorators/auth.api-key.decorator';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import {
    RequestParamGuard,
    RequestValidateTimestamp,
    RequestValidateUserAgent,
} from 'src/common/request/decorators/request.decorator';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from 'src/common/response/interfaces/response.interface';
import {
    SettingDocParamsGet,
    SettingDocParamsGetByName,
} from 'src/common/setting/constants/setting.doc.constant';
import {
    SETTING_DEFAULT_AVAILABLE_SEARCH,
    SETTING_DEFAULT_AVAILABLE_SORT,
} from 'src/common/setting/constants/setting.list.constant';
import { GetSetting } from 'src/common/setting/decorators/setting.decorator';
import {
    SettingGetByNameGuard,
    SettingGetGuard,
} from 'src/common/setting/decorators/setting.public.decorator';
import { SettingListDto } from 'src/common/setting/dtos/setting.list.dto';
import { SettingRequestDto } from 'src/common/setting/dtos/setting.request.dto';
import { SettingDocument } from 'src/common/setting/schemas/setting.schema';
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

    @ResponsePaging('setting.list', {
        classSerialization: SettingListSerialization,
        doc: {
            availableSearch: SETTING_DEFAULT_AVAILABLE_SEARCH,
            availableSort: SETTING_DEFAULT_AVAILABLE_SORT,
        },
    })
    @AuthApiKey()
    @RequestValidateUserAgent()
    @RequestValidateTimestamp()
    @Get('/list')
    async list(
        @Query()
        {
            page,
            perPage,
            sort,
            search,
            availableSort,
            availableSearch,
        }: SettingListDto
    ): Promise<IResponsePaging> {
        const skip: number = await this.paginationService.skip(page, perPage);
        const find: Record<string, any> = {
            ...search,
        };

        const settings: SettingDocument[] = await this.settingService.findAll(
            find,
            {
                limit: perPage,
                skip: skip,
                sort,
            }
        );
        const totalData: number = await this.settingService.getTotal(find);
        const totalPage: number = await this.paginationService.totalPage(
            totalData,
            perPage
        );

        return {
            totalData,
            totalPage,
            currentPage: page,
            perPage,
            availableSearch,
            availableSort,
            data: settings,
        };
    }

    @Response('setting.get', {
        classSerialization: SettingGetSerialization,
        doc: {
            params: SettingDocParamsGet,
        },
    })
    @SettingGetGuard()
    @RequestParamGuard(SettingRequestDto)
    @AuthApiKey()
    @RequestValidateUserAgent()
    @RequestValidateTimestamp()
    @Get('get/:setting')
    async get(@GetSetting() setting: SettingDocument): Promise<IResponse> {
        return setting;
    }

    @Response('setting.getByName', {
        classSerialization: SettingGetSerialization,
        doc: {
            params: SettingDocParamsGetByName,
        },
    })
    @SettingGetByNameGuard()
    @AuthApiKey()
    @RequestValidateUserAgent()
    @RequestValidateTimestamp()
    @Get('get/name/:settingName')
    async getByName(
        @GetSetting() setting: SettingDocument
    ): Promise<IResponse> {
        return setting;
    }
}
