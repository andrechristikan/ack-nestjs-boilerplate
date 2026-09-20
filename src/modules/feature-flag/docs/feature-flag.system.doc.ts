import {
    Doc,
    DocAuth,
    DocResponsePagination,
} from '@common/doc/decorators/doc.decorator';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import {
    FeatureFlagDefaultAvailableOrderBy,
    FeatureFlagDefaultAvailableSearch,
} from '@modules/feature-flag/constants/feature-flag.list.constant';
import { FeatureFlagResponseSchema } from '@modules/feature-flag/dtos/response/feature-flag.response.dto';
import type { FeatureFlagResponseDto } from '@modules/feature-flag/dtos/response/feature-flag.response.dto';
import { applyDecorators } from '@nestjs/common';

export function FeatureFlagSystemListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all of active feature flags',
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponsePagination<FeatureFlagResponseDto>('featureFlag.list', {
            schema: FeatureFlagResponseSchema,
            availableSearch: FeatureFlagDefaultAvailableSearch,
            availableOrderBy: FeatureFlagDefaultAvailableOrderBy,
            type: EnumPaginationType.cursor,
        })
    );
}
