import type { IRequestContextUser } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { CountryService } from '@modules/country/services/country.service';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import type { UserUpdateProfileRequestDto } from '@modules/user/dtos/request/user.update-profile.request.dto';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserUpdateProfileUseCase implements IAppUseCase<
    [IRequestContextUser, UserUpdateProfileRequestDto],
    IResponseReturn<void>
> {
    constructor(
        private readonly userProfileService: UserProfileService,
        private readonly countryService: CountryService,
        private readonly activityLogService: ActivityLogService,
        private readonly outboxService: OutboxService
    ) {}

    async execute(
        context: IRequestContextUser,
        { countryId, gender, name }: UserUpdateProfileRequestDto
    ): Promise<IResponseReturn<void>> {
        // Sequential by design: gate before the work it guards
        await this.countryService.getOne(countryId);

        await this.outboxService.withTransaction(async tx => {
            await this.userProfileService.updateProfileInTx(
                tx,
                context.user.id,
                {
                    countryId,
                    gender,
                    name,
                }
            );
            const entry = this.activityLogService.recordEffect(
                context.snapshot,
                {
                    action: EnumActivityLogAction.userUpdateProfile,
                }
            );
            await this.outboxService.addInTx(tx, entry);
        });

        return {};
    }
}
