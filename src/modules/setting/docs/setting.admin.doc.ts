import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { SettingListResponseDto } from '@modules/setting/dtos/response/setting.list.response.dto';

export function SettingAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'return list of all settings from database',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        // FIXME: How can we return a list of DTOs without Pagination ?
        DocResponse<SettingListResponseDto>('setting.list', {
            dto: SettingListResponseDto,
        })
    );
}
export function SettingAdminCacheListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'return list of all settings from redis',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        // FIXME: How can we return a list of DTOs without Pagination ?
        DocResponse<SettingListResponseDto>('setting.list', {
            dto: SettingListResponseDto,
        })
    );
}

export function SettingAdminCacheReloadDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'reload in-memory settings from database',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        // FIXME: How can we return a list of DTOs without Pagination ?
        DocResponse<SettingListResponseDto>('setting.reload', {
            dto: SettingListResponseDto,
        })
    );
}
