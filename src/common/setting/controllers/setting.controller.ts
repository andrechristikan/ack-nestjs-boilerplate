import { Controller, Get, Query } from '@nestjs/common';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { RequestParamGuard } from 'src/common/request/decorators/request.decorator';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from 'src/common/response/response.interface';
import { GetSetting } from '../decorators/setting.decorator';
import {
    SettingGetByNameGuard,
    SettingGetGuard,
} from '../decorators/setting.public.decorator';
import { SettingListDto } from '../dtos/setting.list.dto';
import { SettingRequestDto } from '../dtos/setting.request.dto';
import { SettingDocument } from '../schemas/setting.schema';
import { SettingGetSerialization } from '../serializations/setting.get.serialization';
import { SettingListSerialization } from '../serializations/setting.list.serialization';
import { SettingService } from '../services/setting.service';

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
    })
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
        let find: Record<string, any> = {};

        if (search) {
            find = {
                ...find,
                ...search,
            };
        }
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
    })
    @SettingGetGuard()
    @RequestParamGuard(SettingRequestDto)
    @Get('get/:setting')
    async get(@GetSetting() setting: SettingDocument): Promise<IResponse> {
        return setting;
    }

    @Response('setting.getByName', {
        classSerialization: SettingGetSerialization,
    })
    @SettingGetByNameGuard()
    @Get('get/name/:settingName')
    async getByName(
        @GetSetting() setting: SettingDocument
    ): Promise<IResponse> {
        return setting;
    }
}
