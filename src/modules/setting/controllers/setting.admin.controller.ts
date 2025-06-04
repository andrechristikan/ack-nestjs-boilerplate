import { ApiTags } from '@nestjs/swagger';
import { Controller, Get } from '@nestjs/common';
import { IResponse } from '@common/response/interfaces/response.interface';

import { Response } from '@common/response/decorators/response.decorator';
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
    SettingAdminCacheListDoc,
    SettingAdminCacheReloadDoc,
    SettingAdminListDoc,
} from '@modules/setting/docs/setting.admin.doc';
import { SettingDbService } from '@modules/setting/services/setting.db.service';
import { SettingListResponseDto } from '@modules/setting/dtos/response/setting.list.response.dto';

@ApiTags('common.admin.setting')
@Controller({
    version: '1',
    path: '/setting',
})
export class SettingAdminController {
    constructor(private readonly settingService: SettingDbService) {}

    @SettingAdminListDoc()
    @Get('/')
    @Response('setting.list')
    //@PolicyAbilityProtected({
    //    subject: ENUM_POLICY_SUBJECT.FEATURES,
    //    action: [ENUM_POLICY_ACTION.READ],
    //})
    //@PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    //@UserProtected()
    //@AuthJwtAccessProtected()
    //@ApiKeyProtected()
    async list(): Promise<IResponse<SettingListResponseDto[]>> {
        const appSettings = await this.settingService.findAll();
        const output = this.settingService.mapList(appSettings);
        return {
            data: output,
        };
    }

    @SettingAdminCacheListDoc()
    @Get('/cache')
    @Response('setting.list')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.FEATURES,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    async listCache(): Promise<IResponse<Record<string, any>>> {
        const appSettings = this.settingService.findAllCache();
        return {
            data: appSettings,
        };
    }

    @SettingAdminCacheReloadDoc()
    @Get('/cache/reload')
    @Response('setting.reload')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.FEATURES,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    async reload(): Promise<IResponse<Record<string, any>>> {
        await this.settingService.reloadAllKeysFromDb();
        const appSettings = this.settingService.findAllCache();
        return {
            data: appSettings,
        };
    }
}
