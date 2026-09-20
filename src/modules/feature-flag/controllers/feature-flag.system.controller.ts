import type { FeatureFlagSystemListRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.system-list.request.dto';
import { FeatureFlagSystemListRequestSchema } from '@modules/feature-flag/dtos/request/feature-flag.system-list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import { ResponsePagination } from '@common/response/decorators/response.decorator';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';

import type { FeatureFlag } from '@generated/prisma-client/client';
import { ApiKeySystemProtected } from '@modules/api-key/decorators/api-key.decorator';

import { FeatureFlagResponseSchema } from '@modules/feature-flag/dtos/response/feature-flag.response.dto';
import { FeatureFlagHttpService } from '@modules/feature-flag/services/feature-flag.http.service';
import { Controller, Get, Query } from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.system.featureFlag')
@Controller({
    version: '1',
    path: '/feature-flag',
})
export class FeatureFlagSystemController {
    constructor(
        private readonly featureFlagHttpService: FeatureFlagHttpService
    ) {}

    @Doc({ summary: 'get all of active feature flags' })
    @ResponsePagination('featureFlag.list', {
        schema: FeatureFlagResponseSchema,
    })
    @ApiKeySystemProtected()
    @Get('/list')
    async list(
        @Query({ schema: FeatureFlagSystemListRequestSchema })
        query: FeatureFlagSystemListRequestDto
    ): Promise<IResponsePaginationReturn<FeatureFlag>> {
        return this.featureFlagHttpService.getListCursor(query);
    }
}
