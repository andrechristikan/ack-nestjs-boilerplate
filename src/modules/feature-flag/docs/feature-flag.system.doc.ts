import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { FeatureFlagDocQueryList } from '@modules/feature-flag/constants/feature-flag.doc';
import { FeatureFlagResponseDto } from '@modules/feature-flag/dtos/response/feature-flag.response';
import { applyDecorators } from '@nestjs/common';

export function FeatureFlagSystemListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all of active feature flags',
        }),
        DocRequest({
            queries: FeatureFlagDocQueryList,
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponsePaging<FeatureFlagResponseDto>('featureFlag.list', {
            dto: FeatureFlagResponseDto,
            type: EnumPaginationType.cursor,
        })
    );
}
