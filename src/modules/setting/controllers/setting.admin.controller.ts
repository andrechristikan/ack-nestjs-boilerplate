import { ApiTags } from '@nestjs/swagger';
import { Controller, Get } from '@nestjs/common';
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
import { ApiKeyProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import {
    SettingAdminCacheReloadDoc,
    SettingAdminListDoc,
} from '@modules/setting/docs/setting.admin.doc';
import { SettingDbService } from '@modules/setting/services/setting.db.service';
import { SettingListResponseDto } from '@modules/setting/dtos/response/setting.list.response.dto';
import { PaginationQuery } from '@common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from '@common/pagination/dtos/pagination.list.dto';
import { PaginationService } from '@common/pagination/services/pagination.service';

@ApiTags('common.admin.setting')
@Controller({
    version: '1',
    path: '/setting',
})
export class SettingAdminController {
    constructor(
        private readonly settingService: SettingDbService,
        private readonly paginationService: PaginationService
    ) {}

    @SettingAdminListDoc()
    @Get('/')
    @ResponsePaging('setting.list')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.SETTINGS,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    async list(
        @PaginationQuery()
        { _limit, _offset, _order }: PaginationListDto
    ): Promise<IResponsePaging<SettingListResponseDto>> {
        const appSettings = await this.settingService.findAll(
            {},
            {
                paging: {
                    limit: _limit,
                    offset: _offset,
                },
                order: _order,
            }
        );
        const total: number = await this.settingService.getTotal();
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        const mapped = this.settingService.mapList(appSettings);
        return {
            _pagination: { total, totalPage },
            data: mapped,
        };
    }

    @SettingAdminCacheReloadDoc()
    @Get('/cache/reload')
    @Response('setting.reload')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.SETTINGS,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    async reload(): Promise<void> {
        await this.settingService.reloadAllKeysFromDb();
        return;
    }
}
