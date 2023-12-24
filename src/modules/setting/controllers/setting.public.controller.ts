import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeyPublicProtected } from 'src/common/api-key/decorators/api-key.decorator';
import {
    FILE_SIZE_IN_BYTES,
    FILE_SIZE_LARGE_IN_BYTES,
    FILE_SIZE_MEDIUM_IN_BYTES,
} from 'src/common/file/constants/file.constant';
import { MessageService } from 'src/common/message/services/message.service';
import { PaginationQuery } from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { RequestParamGuard } from 'src/common/request/decorators/request.decorator';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from 'src/common/response/interfaces/response.interface';
import {
    SETTING_DEFAULT_AVAILABLE_ORDER_BY,
    SETTING_DEFAULT_AVAILABLE_SEARCH,
    SETTING_DEFAULT_ORDER_BY,
    SETTING_DEFAULT_ORDER_DIRECTION,
    SETTING_DEFAULT_PER_PAGE,
} from 'src/modules/setting/constants/setting.list.constant';
import { GetSetting } from 'src/modules/setting/decorators/setting.decorator';
import { SettingPublicGetGuard } from 'src/modules/setting/decorators/setting.public.decorator';
import {
    SettingPublicCoreDoc,
    SettingPublicGetDoc,
    SettingPublicListDoc,
} from 'src/modules/setting/docs/setting.public.doc';
import { SettingRequestDto } from 'src/modules/setting/dtos/setting.request.dto';
import { SettingEntity } from 'src/modules/setting/repository/entities/setting.entity';
import { SettingCoreSerialization } from 'src/modules/setting/serializations/setting.core.serialization';
import { SettingFileSerialization } from 'src/modules/setting/serializations/setting.file.serialization';
import { SettingGetSerialization } from 'src/modules/setting/serializations/setting.get.serialization';
import { SettingListSerialization } from 'src/modules/setting/serializations/setting.list.serialization';
import { SettingService } from 'src/modules/setting/services/setting.service';

@ApiTags('modules.public.setting')
@Controller({
    version: '1',
    path: '/setting',
})
export class SettingPublicController {
    constructor(
        private readonly settingService: SettingService,
        private readonly messageService: MessageService,
        private readonly paginationService: PaginationService
    ) {}

    @SettingPublicListDoc()
    @ResponsePaging('setting.list', {
        serialization: SettingListSerialization,
    })
    @ApiKeyPublicProtected()
    @Get('/list')
    async list(
        @PaginationQuery(
            SETTING_DEFAULT_PER_PAGE,
            SETTING_DEFAULT_ORDER_BY,
            SETTING_DEFAULT_ORDER_DIRECTION,
            SETTING_DEFAULT_AVAILABLE_SEARCH,
            SETTING_DEFAULT_AVAILABLE_ORDER_BY
        )
        { _search, _limit, _offset, _order }: PaginationListDto
    ): Promise<IResponsePaging> {
        const find: Record<string, any> = {
            ..._search,
        };

        const settings: SettingEntity[] =
            await this.settingService.findAll<SettingEntity>(find, {
                paging: {
                    limit: _limit,
                    offset: _offset,
                },
                order: _order,
                plainObject: true,
            });
        const total: number = await this.settingService.getTotal(find);
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        return {
            _pagination: { total, totalPage },
            data: settings,
        };
    }

    @SettingPublicGetDoc()
    @Response('setting.get', {
        serialization: SettingGetSerialization,
    })
    @SettingPublicGetGuard()
    @ApiKeyPublicProtected()
    @RequestParamGuard(SettingRequestDto)
    @Get('get/:setting')
    async get(@GetSetting(true) setting: SettingEntity): Promise<IResponse> {
        return { data: setting };
    }

    @SettingPublicCoreDoc()
    @Response('setting.core', {
        serialization: SettingCoreSerialization,
    })
    @ApiKeyPublicProtected()
    @Get('/core')
    async getUserMaxCertificate(): Promise<IResponse> {
        const languages: string[] = this.messageService.getAvailableLanguages();

        const file: SettingFileSerialization = {
            sizeInBytes: FILE_SIZE_IN_BYTES,
            sizeMediumInBytes: FILE_SIZE_MEDIUM_IN_BYTES,
            sizeLargeInBytes: FILE_SIZE_LARGE_IN_BYTES,
        };

        const timezone: string = await this.settingService.getTimezone();

        return {
            data: {
                languages,
                file,
                timezone,
            },
        };
    }
}
