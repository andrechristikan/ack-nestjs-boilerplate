import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { FeatureFlag } from '@generated/prisma-client/client';
import type { FeatureFlagUpdateStatusRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-status.request.dto';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class FeatureFlagUpdateStatusByAdminUseCase implements IAppUseCase<
    [string, FeatureFlagUpdateStatusRequestDto],
    IResponseReturn<FeatureFlag>
> {
    constructor(private readonly featureFlagService: FeatureFlagService) {}

    async execute(
        id: string,
        body: FeatureFlagUpdateStatusRequestDto
    ): Promise<IResponseReturn<FeatureFlag>> {
        const updated = await this.featureFlagService.updateStatusByAdmin(id, {
            isEnable: body.isEnable,
            rolloutPercent: body.rolloutPercent,
            targetUserIds: body.targetUserIds,
        });

        return {
            data: updated,
        };
    }
}
