import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePagination,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import {
    FeatureFlagDefaultAvailableOrderBy,
    FeatureFlagDefaultAvailableSearch,
} from '@modules/feature-flag/constants/feature-flag.list.constant';
import { FeatureFlagResponseSchema } from '@modules/feature-flag/dtos/response/feature-flag.response.dto';
import type { FeatureFlagResponseDto } from '@modules/feature-flag/dtos/response/feature-flag.response.dto';
import { applyDecorators } from '@nestjs/common';

export function FeatureFlagAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'admin get all Feature Flags',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true, user: true }),
        DocResponsePagination<FeatureFlagResponseDto>('featureFlag.list', {
            schema: FeatureFlagResponseSchema,
            availableSearch: FeatureFlagDefaultAvailableSearch,
            availableOrderBy: FeatureFlagDefaultAvailableOrderBy,
            type: EnumPaginationType.offset,
        })
    );
}

export function FeatureFlagAdminUpdateStatusDoc(): MethodDecorator {
    return applyDecorators(
        Doc({}),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true, user: true }),
        DocResponse<FeatureFlagResponseDto>('featureFlag.updateStatus', {
            schema: FeatureFlagResponseSchema,
        })
    );
}

export function FeatureFlagAdminUpdateMetadataDoc(): MethodDecorator {
    return applyDecorators(
        Doc({}),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true, user: true }),
        DocResponse<FeatureFlagResponseDto>('featureFlag.updateMetadata', {
            schema: FeatureFlagResponseSchema,
        })
    );
}
