import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumUserStatus } from '@generated/prisma-client/client';
import type {
    IAccountDeleteSelfResult,
    IAccountStatusUpdateResult,
} from '@modules/account/interfaces/account.interface';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { NotificationDomain } from '@modules/notification/domains/notification.domain';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { SessionDomain } from '@modules/session/domains/session.domain';
import type { IUserRecipient } from '@modules/user/interfaces/user.interface';
import { UserDomain } from '@modules/user/domains/user.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AccountDomain {
    constructor(
        private readonly userDomain: UserDomain,
        private readonly deviceDomain: DeviceDomain,
        private readonly notificationDomain: NotificationDomain,
        private readonly notificationUtil: NotificationUtil,
        private readonly sessionDomain: SessionDomain,
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService
    ) {}

    /**
     * Snapshots the delivery targets of an active user for a kind: identity, distinct push tokens, and the channels the user settings leave enabled.
     */
    async getNotificationRecipient(
        userId: string,
        kind: EnumNotificationKind
    ): Promise<INotificationRecipient | null> {
        const [user, ownerships, settings] = await Promise.all([
            this.userDomain.getOneActive(userId),
            this.deviceDomain.getOwnershipsWithNotificationToken(userId),
            this.notificationDomain.getListUserSetting(userId),
        ]);
        if (user === null) {
            return null;
        }

        const tokens = ownerships.map(ownership => ownership.notificationToken);

        return this.notificationUtil.mapRecipient(user, kind, tokens, settings);
    }

    /**
     * Snapshots the delivery targets of a user the caller already holds, whatever its status, for a kind: identity, distinct push tokens, and the channels the user settings leave enabled.
     */
    async getNotificationRecipientOfUser(
        user: IUserRecipient,
        kind: EnumNotificationKind
    ): Promise<INotificationRecipient> {
        const [ownerships, settings] = await Promise.all([
            this.deviceDomain.getOwnershipsWithNotificationToken(user.id),
            this.notificationDomain.getListUserSetting(user.id),
        ]);
        const tokens = ownerships.map(ownership => ownership.notificationToken);

        return this.notificationUtil.mapRecipient(user, kind, tokens, settings);
    }

    /** Writes the status of a user; a status other than active also revokes its sessions. */
    async updateStatusByAdmin(
        userId: string,
        status: EnumUserStatus,
        passwordAttempt: number | null,
        updatedBy: string
    ): Promise<IAccountStatusUpdateResult> {
        const now = this.helperDateService.create();

        try {
            return await this.databaseService.withTransaction(async tx => {
                const user = await this.userDomain.updateStatusByAdminInTx(
                    tx,
                    userId,
                    status,
                    passwordAttempt
                );
                if (status === EnumUserStatus.active) {
                    return { user, revoked: null };
                }

                const revoked = await this.sessionDomain.revokeActiveByUserInTx(
                    tx,
                    userId,
                    updatedBy,
                    now
                );

                return { user, revoked };
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    /** Soft deletes the user and revokes its sessions and devices. */
    async deleteSelf(userId: string): Promise<IAccountDeleteSelfResult> {
        const now = this.helperDateService.create();

        try {
            return await this.databaseService.withTransaction(async tx => {
                const user = await this.userDomain.deleteSelfInTx(
                    tx,
                    userId,
                    now
                );
                const revoked = await this.sessionDomain.revokeActiveByUserInTx(
                    tx,
                    userId,
                    userId,
                    now
                );
                await this.deviceDomain.revokeAllByUserInTx(
                    tx,
                    userId,
                    userId,
                    now
                );

                return { user, revoked };
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }
}
