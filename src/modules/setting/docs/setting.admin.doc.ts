import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocResponse,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { SettingFeatureListResponseDto } from '@modules/setting/dtos/response/setting-feature.list.response.dto';

export function SettingAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'return list of all feature settings',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({
            policy: true,
            role: true,
        }),
        DocResponsePaging<SettingFeatureListResponseDto>('setting.list', {
            dto: SettingFeatureListResponseDto,
        })
    );
}

export function SettingAdminCacheReloadDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'reload feature settings',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({
            policy: true,
            role: true,
        }),
        DocResponse('setting.reload')
    );
}
