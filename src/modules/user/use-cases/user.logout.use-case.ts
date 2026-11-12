import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { DeviceService } from '@modules/device/services/device.service';
import { SessionService } from '@modules/session/services/session.service';
import { SessionNotFoundException } from '@modules/session/exceptions/session.not-found.exception';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserLogoutUseCase implements IAppUseCase<
    [string, string, string, IRequestContext],
    IResponseReturn<void>
> {
    constructor(
        private readonly deviceService: DeviceService,
        private readonly sessionService: SessionService,
        private readonly activityLogService: ActivityLogService,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    async execute(
        userId: string,
        sessionId: string,
        deviceOwnershipId: string,
        context: IRequestContext
    ): Promise<IResponseReturn<void>> {
        const now = this.helperDateService.create();
        try {
            await this.outboxService.withTransaction(async tx => {
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
                const entry = this.activityLogService.recordEffect(
                    { action: EnumActivityLogAction.userLogout },
                    context
                );
                await this.outboxService.addInTx(tx, entry);
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

        return {};
    }
}
