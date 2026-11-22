import { DatabaseService } from '@common/database/services/database.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { FeatureFlagUpdateStatusRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-status.request.dto';
import type { IFeatureFlag } from '@modules/feature-flag/interfaces/feature-flag.interface';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { UserService } from '@modules/user/services/user.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class FeatureFlagUpdateStatusByAdminUseCase implements IAppUseCase<
    [string, FeatureFlagUpdateStatusRequestDto],
    IResponseReturn<IFeatureFlag>
> {
    constructor(
        private readonly featureFlagService: FeatureFlagService,
        private readonly userService: UserService,
        private readonly databaseService: DatabaseService
    ) {}

    async execute(
        id: string,
        body: FeatureFlagUpdateStatusRequestDto
    ): Promise<IResponseReturn<IFeatureFlag>> {
        const targetUserIds = [...new Set(body.targetUserIds)];
        await this.userService.assertAllExist(targetUserIds);

        const updated = await this.databaseService.withTransaction(tx =>
            this.featureFlagService.updateStatusByAdminInTx(tx, id, {
                isEnable: body.isEnable,
                rolloutPercent: body.rolloutPercent,
                targetUserIds,
            })
        );

        return {
            data: updated,
        };
    }
}
