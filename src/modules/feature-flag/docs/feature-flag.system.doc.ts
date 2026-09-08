import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { FeatureFlagDocQueryList } from '@modules/feature-flag/constants/feature-flag.doc';
import {
    FeatureFlagDefaultAvailableOrderBy,
    FeatureFlagDefaultAvailableSearch,
} from '@modules/feature-flag/constants/feature-flag.list.constant';
import {
    FeatureFlagResponseDto,
    FeatureFlagResponseSchema,
} from '@modules/feature-flag/dtos/response/feature-flag.response.dto';
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
            schema: FeatureFlagResponseSchema,
            availableSearch: FeatureFlagDefaultAvailableSearch,
            availableOrderBy: FeatureFlagDefaultAvailableOrderBy,
            type: EnumPaginationType.cursor,
        })
    );
}
