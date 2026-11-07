import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationService } from '@modules/notification/services/notification.service';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import type { TermPolicyAcceptRequestDto } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class TermPolicyUserAcceptUseCase implements IAppUseCase<
    [IUser, TermPolicyAcceptRequestDto],
    IResponseReturn<void>
> {
    constructor(
        private readonly termPolicyAcceptanceService: TermPolicyAcceptanceService,
        private readonly activityLogService: ActivityLogService,
        private readonly notificationService: NotificationService,
        private readonly notificationQueue: NotificationQueue
    ) {}

    async execute(
        user: IUser,
        { type }: TermPolicyAcceptRequestDto
    ): Promise<IResponseReturn<void>> {
        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userAcceptTermPolicy,
            }),
        ];
        const recipient = await this.notificationService.getRecipient(
            user,
            EnumNotificationKind.userAcceptTermPolicy
        );
        // Sequential by design: write must not run if an earlier step throws
        const accepted = await this.termPolicyAcceptanceService.userAccept(
            user.id,
            type
        );
        this.activityLogService.stagePrepared(activityLogs);

        await this.notificationQueue.sendUserAcceptTermPolicy(recipient, {
            termPolicyId: accepted.id,
            type: accepted.type,
            version: accepted.version,
        });

        return {};
    }
}
