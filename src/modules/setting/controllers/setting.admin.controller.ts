import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Param,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaginationQuery } from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { RequestRequiredPipe } from 'src/common/request/pipes/request.required.pipe';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from 'src/common/response/interfaces/response.interface';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from 'src/modules/auth/decorators/auth.jwt.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';
import {
    PolicyAbilityProtected,
    PolicyRoleProtected,
} from 'src/modules/policy/decorators/policy.decorator';
import { SETTING_DEFAULT_AVAILABLE_SEARCH } from 'src/modules/setting/constants/setting.list.constant';
import { ENUM_SETTING_STATUS_CODE_ERROR } from 'src/modules/setting/enums/setting.status-code.enum';
import {
    SettingAdminGetDoc,
    SettingAdminListDoc,
    SettingAdminUpdateDoc,
} from 'src/modules/setting/docs/setting.admin.doc';
import { SettingUpdateRequestDto } from 'src/modules/setting/dtos/request/setting.update.request.dto';
import { SettingGetResponseDto } from 'src/modules/setting/dtos/response/setting.get.response.dto';
import { SettingListResponseDto } from 'src/modules/setting/dtos/response/setting.list.response.dto';
import { SettingParsePipe } from 'src/modules/setting/pipes/setting.parse.pipe';
import { SettingDoc } from 'src/modules/setting/repository/entities/setting.entity';
import { SettingService } from 'src/modules/setting/services/setting.service';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';

@ApiTags('modules.admin.setting')
@Controller({
    version: '1',
    path: '/setting',
})
export class SettingAdminController {
    constructor(
        private readonly settingService: SettingService,
        private readonly paginationService: PaginationService
    ) {}

    @SettingAdminListDoc()
    @ResponsePaging('setting.list')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.SETTING,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationQuery({
            availableSearch: SETTING_DEFAULT_AVAILABLE_SEARCH,
        })
        { _search, _limit, _offset, _order }: PaginationListDto
    ): Promise<IResponsePaging<SettingListResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
        };

        const settings: SettingDoc[] = await this.settingService.findAll(find, {
            paging: {
                limit: _limit,
                offset: _offset,
            },
            order: _order,
        });
        const mapSettings: SettingListResponseDto[] =
            await this.settingService.mapList(settings);
        const total: number = await this.settingService.getTotal(find);
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        return {
            _pagination: { total, totalPage },
            data: mapSettings,
        };
    }

    @SettingAdminGetDoc()
    @Response('setting.get')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.SETTING,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @Get('/get/:setting')
    async get(
        @Param('setting', RequestRequiredPipe, SettingParsePipe)
        setting: SettingDoc
    ): Promise<IResponse<SettingGetResponseDto>> {
        const mapSetting = await this.settingService.mapGet(setting);
        return { data: mapSetting };
    }

    @SettingAdminUpdateDoc()
    @Response('setting.update')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.SETTING,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @Put('/update/:setting')
    async update(
        @Param('setting', RequestRequiredPipe, SettingParsePipe)
        setting: SettingDoc,
        @Body()
        body: SettingUpdateRequestDto
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const check = this.settingService.checkValue(setting.type, body.value);
        if (!check) {
            throw new BadRequestException({
                statusCode: ENUM_SETTING_STATUS_CODE_ERROR.VALUE_NOT_ALLOWED,
                message: 'setting.error.valueNotAllowed',
            });
        }

        await this.settingService.update(setting, body);

        return {
            data: { _id: setting._id },
        };
    }
}
