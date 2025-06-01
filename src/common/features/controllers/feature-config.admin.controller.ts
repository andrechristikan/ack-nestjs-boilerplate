import { ApiTags } from '@nestjs/swagger';
import { Controller, Get } from '@nestjs/common';
import { IResponse } from '@common/response/interfaces/response.interface';
import { FeatureConfigService } from 'src/common/features/services/feature-config.service';
import {
    FeatureConfigAdminCacheListDoc,
    FeatureConfigAdminCacheReloadDoc,
    FeatureConfigAdminListDoc,
} from '@common/features/docs/feature-config.admin.doc';
import { Response } from '@common/response/decorators/response.decorator';
import { FeatureConfigListResponseDto } from '@common/features/dtos/response/feature-config.list.response.dto';
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

@ApiTags('common.admin.feature')
@Controller({
    version: '1',
    path: '/features',
})
export class FeatureConfigAdminController {
    constructor(private readonly featureSettingService: FeatureConfigService) {}

    @FeatureConfigAdminListDoc()
    @Get('/')
    @Response('feature.list')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.FEATURES,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    async list(): Promise<IResponse<FeatureConfigListResponseDto[]>> {
        const appSettings = await this.featureSettingService.findAll();
        const output = this.featureSettingService.mapList(appSettings);
        return {
            data: output,
        };
    }

    @FeatureConfigAdminCacheListDoc()
    @Get('/cache')
    @Response('feature.list')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.FEATURES,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    async listCache(): Promise<IResponse<Record<string, any>>> {
        const appSettings = this.featureSettingService.findAllCache();
        return {
            data: appSettings,
        };
    }

    @FeatureConfigAdminCacheReloadDoc()
    @Get('/cache/reload')
    @Response('feature.reload')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.FEATURES,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    async reload(): Promise<IResponse<Record<string, any>>> {
        await this.featureSettingService.reloadAllKeysFromDb();
        const appSettings = this.featureSettingService.findAllCache();
        return {
            data: appSettings,
        };
    }
}
