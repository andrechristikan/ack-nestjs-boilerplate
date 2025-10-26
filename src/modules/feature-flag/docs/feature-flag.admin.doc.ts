import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@common/doc/enums/doc.enum';
import {
    FeatureFlagDocParamsId,
    FeatureFlagDocQueryList,
} from '@modules/feature-flag/constants/feature-flag.doc';
import { FeatureFlagUpdateStatusRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-status.request';
import { FeatureFlagUpdateRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update.request';
import { FeatureFlagResponseDto } from '@modules/feature-flag/dtos/response/feature-flag.response';
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
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<FeatureFlagResponseDto>('featureFlag.list', {
            dto: FeatureFlagResponseDto,
        })
    );
}

export function FeatureFlagAdminUpdateStatusDoc(): MethodDecorator {
    return applyDecorators(
        Doc({}),
        DocRequest({
            params: FeatureFlagDocParamsId,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: FeatureFlagUpdateStatusRequestDto,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse<FeatureFlagResponseDto>('featureFlag.updateStatus', {
            dto: FeatureFlagResponseDto,
        })
    );
}

export function FeatureFlagAdminUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({}),
        DocRequest({
            params: FeatureFlagDocParamsId,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: FeatureFlagUpdateRequestDto,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse<FeatureFlagResponseDto>('featureFlag.update', {
            dto: FeatureFlagResponseDto,
        })
    );
}
