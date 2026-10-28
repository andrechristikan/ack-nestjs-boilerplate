import { DeviceDomain } from '@modules/device/domains/device.domain';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationUserSettingRepository } from '@modules/notification/repositories/notification.user-setting.repository';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import type { IUserRecipient } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationRecipientDomain {
    constructor(
        private readonly notificationUserSettingRepository: NotificationUserSettingRepository,
        private readonly deviceDomain: DeviceDomain,
        private readonly notificationUtil: NotificationUtil
    ) {}

    /**
     * Snapshots the delivery targets of a user for a kind: identity, distinct push tokens, and the channels the user settings leave enabled.
     */
    async getRecipient(
        { id, email, username }: IUserRecipient,
        kind: EnumNotificationKind
    ): Promise<INotificationRecipient> {
        const [settings, ownerships] = await Promise.all([
            this.notificationUserSettingRepository.findUserSetting(id),
            this.deviceDomain.getOwnershipsWithNotificationToken(id),
        ]);
        const tokens = ownerships
            .map(ownership => ownership.device.notificationToken)
            .filter((token): token is string => token !== null);

        const channels = this.notificationUtil.resolveChannels(kind, settings);

        return {
            userId: id,
            email,
            username,
            notificationTokens: [...new Set(tokens)],
            channels,
        };
    }
    /**
     * Snapshots the delivery targets of a user the write just created from the values it stored: no device token, no setting row, so every channel of the kind.
     */
    buildNewUserRecipient(
        { id, email, username }: IUserRecipient,
        kind: EnumNotificationKind
    ): INotificationRecipient {
        const channels = this.notificationUtil.resolveChannels(kind, []);

        return {
            userId: id,
            email,
            username,
            notificationTokens: [],
            channels,
        };
    }
}
