import { PaginationCursorQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { ResponsePaging } from '@common/response/decorators/response.decorator';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { FeatureFlag, Prisma } from '@generated/prisma-client';
import { ApiKeySystemProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    FeatureFlagDefaultAvailableOrderBy,
    FeatureFlagDefaultAvailableSearch,
} from '@modules/feature-flag/constants/feature-flag.list.constant';
import { FeatureFlagSystemListDoc } from '@modules/feature-flag/docs/feature-flag.system.doc';
import { FeatureFlagResponseSchema } from '@modules/feature-flag/dtos/response/feature-flag.response.dto';
import { FeatureFlagHttpService } from '@modules/feature-flag/services/feature-flag.http.service';
import { Controller, Get } from '@nestjs/common';
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

    @FeatureFlagSystemListDoc()
    @ResponsePaging('featureFlag.list', {
        schema: FeatureFlagResponseSchema,
    })
    @ApiKeySystemProtected()
    @Get('/list')
    async list(
        @PaginationCursorQuery({
            availableSearch: FeatureFlagDefaultAvailableSearch,
            availableOrderBy: FeatureFlagDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryCursorParams<Prisma.FeatureFlagWhereInput>
    ): Promise<IResponsePagingReturn<FeatureFlag>> {
        return this.featureFlagHttpService.getListCursor(pagination);
    }
}
