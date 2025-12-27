import { PaginationCursorQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { ResponsePaging } from '@common/response/decorators/response.decorator';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ApiKeySystemProtected } from '@modules/api-key/decorators/api-key.decorator';
import { FeatureFlagDefaultAvailableSearch } from '@modules/feature-flag/constants/feature-flag.list.constant';
import { FeatureFlagSystemListDoc } from '@modules/feature-flag/docs/feature-flag.system.doc';
import { FeatureFlagResponseDto } from '@modules/feature-flag/dtos/response/feature-flag.response';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.shared.featureFlag')
@Controller({
    version: '1',
    path: '/feature-flag',
})
export class FeatureFlagSystemController {
    constructor(private readonly featureFlagService: FeatureFlagService) {}

    @FeatureFlagSystemListDoc()
    @ResponsePaging('featureFlag.list')
    @ApiKeySystemProtected()
    @Get('/list')
    async list(
        @PaginationCursorQuery({
            availableSearch: FeatureFlagDefaultAvailableSearch,
        })
        pagination: IPaginationQueryCursorParams
    ): Promise<IResponsePagingReturn<FeatureFlagResponseDto>> {
        return this.featureFlagService.getListCursor(pagination);
    }
}
