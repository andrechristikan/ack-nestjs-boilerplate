import { DatabaseService } from '@common/database/services/database.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { FeatureFlagUpdateMetadataRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-metadata.request.dto';
import type { IFeatureFlag } from '@modules/feature-flag/interfaces/feature-flag.interface';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class FeatureFlagUpdateMetadataByAdminUseCase implements IAppUseCase<
    [string, FeatureFlagUpdateMetadataRequestDto],
    IResponseReturn<IFeatureFlag>
> {
    constructor(
        private readonly featureFlagService: FeatureFlagService,
        private readonly databaseService: DatabaseService
    ) {}

    async execute(
        id: string,
        body: FeatureFlagUpdateMetadataRequestDto
    ): Promise<IResponseReturn<IFeatureFlag>> {
        // Sequential by design: a write after its checks
        const featureFlag = await this.featureFlagService.getOneById(id);
        this.featureFlagService.assertMetadataValid(featureFlag, body);

        const updated = await this.databaseService.withTransaction(tx =>
            this.featureFlagService.updateMetadataByAdminInTx(tx, id, body)
        );

        return {
            data: updated,
        };
    }
}
