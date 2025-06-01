import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { FeatureConfigListResponseDto } from '@common/features/dtos/response/feature-config.list.response.dto';

export function FeatureConfigAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'return list of all feature configurations from database',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        // FIXME: How can we return a list of DTOs without Pagination ?
        DocResponse<FeatureConfigListResponseDto>('feature.list', {
            dto: FeatureConfigListResponseDto,
        })
    );
}
export function FeatureConfigAdminCacheListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'return list of all feature configurations from in-memory cache',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        // FIXME: How can we return a list of DTOs without Pagination ?
        DocResponse<FeatureConfigListResponseDto>('feature.list', {
            dto: FeatureConfigListResponseDto,
        })
    );
}

export function FeatureConfigAdminCacheReloadDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'reload in-memory feature configurations from database',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        // FIXME: How can we return a list of DTOs without Pagination ?
        DocResponse<FeatureConfigListResponseDto>('feature.reload', {
            dto: FeatureConfigListResponseDto,
        })
    );
}
