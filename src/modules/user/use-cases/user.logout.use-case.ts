import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { DeviceService } from '@modules/device/services/device.service';
import { SessionService } from '@modules/session/services/session.service';
import { SessionNotFoundException } from '@modules/session/exceptions/session.not-found.exception';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserLogoutUseCase implements IAppUseCase<
    [string, string, string],
    IResponseReturn<void>
> {
    constructor(
        private readonly deviceService: DeviceService,
        private readonly sessionService: SessionService,
        private readonly activityLogService: ActivityLogService,
        private readonly sessionQueue: SessionQueue,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    async execute(
        userId: string,
        sessionId: string,
        deviceOwnershipId: string
    ): Promise<IResponseReturn<void>> {
        const logoutLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userLogout,
            }),
        ];
        const now = this.helperDateService.create();
        try {
            await this.databaseService.withTransaction(async tx => {
                await this.sessionService.revokeInTx(
                    tx,
                    userId,
                    sessionId,
                    userId,
                    now
                );
                await this.deviceService.clearNotificationInTx(
                    tx,
                    userId,
                    deviceOwnershipId,
                    userId,
                    now
                );
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new SessionNotFoundException();
            }

            throw new AppUnknownException(err);
        }

        await this.sessionQueue.purgeLogins(userId, [{ id: sessionId }]);

        this.activityLogService.stagePrepared(logoutLogs);

        return {};
    }
}
