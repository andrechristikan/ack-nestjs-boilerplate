import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { SessionService } from '@modules/session/services/session.service';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class SessionRevokeUseCase implements IAppUseCase<
    [string, string],
    IResponseReturn<void>
> {
    constructor(
        private readonly sessionService: SessionService,
        private readonly activityLogService: ActivityLogService,
        private readonly sessionQueue: SessionQueue
    ) {}

    async execute(
        userId: string,
        sessionId: string
    ): Promise<IResponseReturn<void>> {
        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userRevokeSession,
            }),
        ];

        await this.sessionService.revoke(userId, sessionId);
        await this.sessionQueue.purgeLogins(userId, [{ id: sessionId }]);

        this.activityLogService.stagePrepared(activityLogs);

        return {};
    }
}
