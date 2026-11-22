import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { FeatureFlag } from '@generated/prisma-client/client';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class FeatureFlagRemoveTargetUserByAdminUseCase implements IAppUseCase<
    [string, string],
    IResponseReturn<FeatureFlag>
> {
    constructor(private readonly featureFlagService: FeatureFlagService) {}

    async execute(
        featureFlagId: string,
        userId: string
    ): Promise<IResponseReturn<FeatureFlag>> {
        const updated = await this.featureFlagService.removeTargetUserByAdmin(
            featureFlagId,
            userId
        );
        return { data: updated };
    }
}
