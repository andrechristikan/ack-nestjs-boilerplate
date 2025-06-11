import { ApiTags } from '@nestjs/swagger';
import { Controller, Get, Post } from '@nestjs/common';
import { IResponsePaging } from '@common/response/interfaces/response.interface';

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
import {
    SettingAdminCacheReloadDoc,
    SettingAdminListDoc,
} from '../docs/setting.admin.doc';
import { SettingFeatureService } from '@modules/setting/services/setting-feature.service';
import { SettingFeatureListResponseDto } from '@modules/setting/dtos/response/setting-feature.list.response.dto';

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
    @Get('/')
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

    @SettingAdminCacheReloadDoc()
    @Response('setting.reload')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.SETTINGS,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/reload')
    async reload(): Promise<void> {
        await this.settingFeatureService.reloadAllKeys();

        return;
    }
}
