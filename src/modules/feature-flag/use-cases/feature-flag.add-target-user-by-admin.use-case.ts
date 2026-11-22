import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { FeatureFlag } from '@generated/prisma-client/client';
import type { FeatureFlagTargetUserRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.target-user.request.dto';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class FeatureFlagAddTargetUserByAdminUseCase implements IAppUseCase<
    [string, FeatureFlagTargetUserRequestDto],
    IResponseReturn<FeatureFlag>
> {
    constructor(private readonly featureFlagService: FeatureFlagService) {}

    async execute(
        featureFlagId: string,
        body: FeatureFlagTargetUserRequestDto
    ): Promise<IResponseReturn<FeatureFlag>> {
        const updated = await this.featureFlagService.addTargetUserByAdmin(
            featureFlagId,
            body.userId
        );
        return { data: updated };
    }
}
