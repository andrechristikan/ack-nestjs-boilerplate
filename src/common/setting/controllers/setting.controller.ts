import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeyProtected } from 'src/common/api-key/decorators/api-key.decorator';
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
import { GetSetting } from 'src/common/setting/decorators/setting.decorator';
import {
    SettingGetByNameGuard,
    SettingGetGuard,
} from 'src/common/setting/decorators/setting.public.decorator';
import {
    SettingGetByNameDoc,
    SettingGetDoc,
    SettingListDoc,
} from 'src/common/setting/docs/setting.doc';
import { SettingListDto } from 'src/common/setting/dtos/setting.list.dto';
import { SettingRequestDto } from 'src/common/setting/dtos/setting.request.dto';
import { SettingEntity } from 'src/common/setting/repository/entities/setting.entity';
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
        const find: Record<string, any> = {
            ...search,
        };

        const settings: SettingEntity[] = await this.settingService.findAll(
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

    @SettingGetDoc()
    @Response('setting.get', {
        classSerialization: SettingGetSerialization,
    })
    @SettingGetGuard()
    @RequestParamGuard(SettingRequestDto)
    @Get('get/:setting')
    async get(@GetSetting() setting: SettingEntity): Promise<IResponse> {
        return setting;
    }

    @SettingGetByNameDoc()
    @Response('setting.getByName', {
        classSerialization: SettingGetSerialization,
    })
    @SettingGetByNameGuard()
    @Get('get/name/:settingName')
    async getByName(@GetSetting() setting: SettingEntity): Promise<IResponse> {
        return setting;
    }
}
