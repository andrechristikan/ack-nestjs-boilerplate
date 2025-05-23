import { ApiTags } from '@nestjs/swagger';
import { Controller, Get } from '@nestjs/common';
import { IResponse } from '@common/response/interfaces/response.interface';
import { FeatureConfigService } from 'src/common/features/services/feature-config.service';

import { UserProtected } from 'src/modules/user/decorators/user.decorator';
import { AuthJwtAccessProtected } from 'src/modules/auth/decorators/auth.jwt.decorator';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { PolicyAbilityProtected, PolicyRoleProtected } from '@modules/policy/decorators/policy.decorator';
import { ENUM_POLICY_ACTION, ENUM_POLICY_ROLE_TYPE, ENUM_POLICY_SUBJECT } from '@modules/policy/enums/policy.enum';

@ApiTags('common.admin.feature')
@Controller({
    version: '1',
    path: '/features',
})
export class FeatureConfigAdminController {
    constructor(private readonly featureSettingService: FeatureConfigService) {}

    @Get('/')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.FEATURES,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    async list(): Promise<IResponse<any>> {
        const appSettings = this.featureSettingService.all();
        return {
            data: appSettings,
        };
    }

    @Get('/reload')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.FEATURES,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    async reload(): Promise<IResponse<any>> {
        await this.featureSettingService.reload();
        const appSettings = this.featureSettingService.all();
        return {
            data: appSettings,
        };
    }
}