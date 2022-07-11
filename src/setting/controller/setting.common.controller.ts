import { Controller, Get, Query } from '@nestjs/common';
import { PaginationService } from 'src/pagination/service/pagination.service';
import { RequestParamGuard } from 'src/utils/request/request.decorator';
import {
    Response,
    ResponsePaging,
} from 'src/utils/response/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from 'src/utils/response/response.interface';
import { SettingListDto } from '../dto/setting.list.dto';
import { SettingRequestDto } from '../dto/setting.request.dto';
import { SettingDocument } from '../schema/setting.schema';
import { SettingListSerialization } from '../serialization/setting.list.serialization';
import { SettingService } from '../service/setting.service';
import {
    GetSetting,
    SettingGetByNameGuard,
    SettingGetGuard,
} from '../setting.decorator';

@Controller({
    version: '1',
    path: 'setting',
})
export class SettingCommonController {
    constructor(
        private readonly settingService: SettingService,
        private readonly paginationService: PaginationService
    ) {}

    @ResponsePaging('setting.list')
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
        const find: Record<string, any> = {};

        if (search) {
            find['$or'] = [
                {
                    name: {
                        $regex: new RegExp(search),
                        $options: 'i',
                    },
                },
            ];
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

        const data: SettingListSerialization[] =
            await this.settingService.serializationList(settings);

        return {
            totalData,
            totalPage,
            currentPage: page,
            perPage,
            availableSearch,
            availableSort,
            data,
        };
    }

    @Response('setting.get')
    @SettingGetGuard()
    @RequestParamGuard(SettingRequestDto)
    @Get('get/:setting')
    async get(@GetSetting() setting: SettingDocument): Promise<IResponse> {
        return this.settingService.serializationGet(setting);
    }

    @Response('setting.getByName')
    @SettingGetByNameGuard()
    @Get('get/name/:settingName')
    async getByName(
        @GetSetting() setting: SettingDocument
    ): Promise<IResponse> {
        return this.settingService.serializationGet(setting);
    }
}
