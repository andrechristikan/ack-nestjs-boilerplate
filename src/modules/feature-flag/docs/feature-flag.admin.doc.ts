import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import {
    FeatureFlagDocParamsId,
    FeatureFlagDocParamsTargetUser,
    FeatureFlagDocQueryList,
} from '@modules/feature-flag/constants/feature-flag.doc';
import {
    FeatureFlagDefaultAvailableOrderBy,
    FeatureFlagDefaultAvailableSearch,
} from '@modules/feature-flag/constants/feature-flag.list.constant';
import {
    FeatureFlagResponseDto,
    FeatureFlagResponseSchema,
} from '@modules/feature-flag/dtos/response/feature-flag.response.dto';
import { applyDecorators } from '@nestjs/common';

export function FeatureFlagAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'admin get all Feature Flags',
        }),
        DocRequest({
            queries: FeatureFlagDocQueryList,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponsePaging<FeatureFlagResponseDto>('featureFlag.list', {
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
            params: FeatureFlagDocParamsId,
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponse<FeatureFlagResponseDto>('featureFlag.updateStatus', {
            schema: FeatureFlagResponseSchema,
        })
    );
}

export function FeatureFlagAdminUpdateMetadataDoc(): MethodDecorator {
    return applyDecorators(
        Doc({}),
        DocRequest({
            params: FeatureFlagDocParamsId,
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponse<FeatureFlagResponseDto>('featureFlag.updateMetadata', {
            schema: FeatureFlagResponseSchema,
        })
    );
}

export function FeatureFlagAdminAddTargetUserDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'admin add target user to Feature Flag',
        }),
        DocRequest({
            params: FeatureFlagDocParamsId,
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponse<FeatureFlagResponseDto>('featureFlag.addTargetUser', {
            schema: FeatureFlagResponseSchema,
        })
    );
}

export function FeatureFlagAdminRemoveTargetUserDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'admin remove target user from Feature Flag',
        }),
        DocRequest({
            params: FeatureFlagDocParamsTargetUser,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponse<FeatureFlagResponseDto>('featureFlag.removeTargetUser', {
            schema: FeatureFlagResponseSchema,
        })
    );
}
