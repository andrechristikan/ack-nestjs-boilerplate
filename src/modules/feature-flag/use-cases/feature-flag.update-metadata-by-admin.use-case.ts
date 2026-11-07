import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { FeatureFlag } from '@generated/prisma-client/client';
import type { FeatureFlagUpdateMetadataRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-metadata.request.dto';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class FeatureFlagUpdateMetadataByAdminUseCase implements IAppUseCase<
    [string, FeatureFlagUpdateMetadataRequestDto],
    IResponseReturn<FeatureFlag>
> {
    constructor(private readonly featureFlagService: FeatureFlagService) {}

    async execute(
        id: string,
        body: FeatureFlagUpdateMetadataRequestDto
    ): Promise<IResponseReturn<FeatureFlag>> {
        const updated = await this.featureFlagService.updateMetadataByAdmin(
            id,
            body
        );

        return {
            data: updated,
        };
    }
}
