import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { INotificationUserSettingUpdate } from '@modules/notification/interfaces/notification.interface';
import type { NotificationUserSetting } from '@generated/prisma-client/client';

export interface INotificationUserSettingRepository {
    findUserSetting(userId: string): Promise<NotificationUserSetting[]>;
    createDefaultsInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void>;
    updateUserSettingInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        { channel, type, isActive }: INotificationUserSettingUpdate
    ): Promise<NotificationUserSetting>;
}
