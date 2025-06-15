import { ApiTags } from '@nestjs/swagger';
import { Body, Controller, Delete, Get, Param, Put } from '@nestjs/common';
import {
    IResponse,
    IResponsePaging,
} from '@common/response/interfaces/response.interface';

import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import {
    PolicyAbilityProtected,
    PolicyRoleProtected,
} from '@modules/policy/decorators/policy.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from '@modules/policy/enums/policy.enum';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { PaginationQuery } from '@common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from '@common/pagination/dtos/pagination.list.dto';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { SettingFeatureService } from '@modules/setting/services/setting-feature.service';
import { SettingFeatureListResponseDto } from '@modules/setting/dtos/response/setting-feature.list.response.dto';
import {
    SettingAdminFlushDoc,
    SettingAdminListDoc,
    SettingAdminUpdateDoc,
} from '@modules/setting/docs/setting.admin.doc';
import { SettingFeatureGetResponseDto } from '@modules/setting/dtos/response/setting-feature.get.response.dto';
import { SettingFeatureUpdateRequestDto } from '@modules/setting/dtos/request/setting-feature.update.request.dto';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import { SettingFeatureParseByKeyPipe } from '@modules/setting/pipes/setting-feature.parse.pipe';
import { SettingFeatureDoc } from '@modules/setting/repository/entities/setting-feature.entity';

@ApiTags('common.admin.setting')
@Controller({
    version: '1',
    path: '/setting',
})
export class SettingAdminController {
    constructor(
        private readonly settingFeatureService: SettingFeatureService,
        private readonly paginationService: PaginationService
    ) {}

    @SettingAdminListDoc()
    @ResponsePaging('setting.list')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.SETTINGS,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationQuery()
        { _search, _limit, _offset, _order }: PaginationListDto
    ): Promise<IResponsePaging<SettingFeatureListResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
        };
        const settingFeatures = await this.settingFeatureService.findAll(find, {
            paging: {
                limit: _limit,
                offset: _offset,
            },
            order: _order,
        });

        const total: number = await this.settingFeatureService.getTotal(find);
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        const mapped = this.settingFeatureService.mapList(settingFeatures);
        return {
            _pagination: { total, totalPage },
            data: mapped,
        };
    }

    @SettingAdminFlushDoc()
    @Response('setting.flush')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.SETTINGS,
        action: [ENUM_POLICY_ACTION.DELETE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/flush')
    async flush(): Promise<void> {
        await this.settingFeatureService.flush();

        return;
    }

    @SettingAdminUpdateDoc()
    @Response('setting.update')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.SETTINGS,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/:key')
    async update(
        @Param('key', RequestRequiredPipe, SettingFeatureParseByKeyPipe)
        settingFeature: SettingFeatureDoc,
        @Body() dto: SettingFeatureUpdateRequestDto
    ): Promise<IResponse<SettingFeatureGetResponseDto>> {
        const updated = await this.settingFeatureService.update(
            settingFeature,
            dto
        );

        await this.settingFeatureService.deleteCache(updated.key);

        return {
            data: this.settingFeatureService.mapGet(updated),
        };
    }
}
