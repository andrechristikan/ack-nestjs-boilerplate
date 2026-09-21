import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { ConfigService } from '@nestjs/config';

import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import type { IUserContact } from '@modules/user/interfaces/user.interface';
import { NotificationTermPolicyDomain } from '@modules/notification/domains/notification.term-policy.domain';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUserSettingRepository } from '@modules/notification/repositories/notification.user-setting.repository';
import { UserDomain } from '@modules/user/domains/user.domain';

describe('NotificationTermPolicyDomain', () => {
    const notificationRepository: MockProxy<NotificationRepository> =
        mock<NotificationRepository>();
    const settingRepository: MockProxy<NotificationUserSettingRepository> =
        mock<NotificationUserSettingRepository>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const helperArrayService: MockProxy<HelperArrayService> =
        mock<HelperArrayService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const notificationEmailQueue: MockProxy<NotificationEmailQueue> =
        mock<NotificationEmailQueue>();
    const userOne = mock<IUserContact>({
        id: 'user-1',
        email: 'one@example.com',
        username: 'one',
    });
    const userTwo = mock<IUserContact>({
        id: 'user-2',
        email: 'two@example.com',
        username: 'two',
    });
    const data = {
        termPolicyId: 'term-policy-id',
        type: 'privacy',
        version: 2,
    } as const;
    let service: NotificationTermPolicyDomain;

    beforeEach(() => {
        vi.resetAllMocks();
        Reflect.set(configService, 'get', vi.fn().mockReturnValue(1));
        databaseUtil.createId
            .mockReturnValueOnce('notification-1')
            .mockReturnValueOnce('notification-2');
        service = new NotificationTermPolicyDomain(
            notificationRepository,
            settingRepository,
            userDomain,
            configService,
            helperArrayService,
            databaseUtil,
            notificationEmailQueue
        );
    });

    it('returns counts without sending when no user has email enabled', async () => {
        userDomain.getListActive.mockResolvedValue([userOne, userTwo]);
        settingRepository.findActiveUserSettingByType.mockResolvedValue([]);

        await expect(
            service.processPublishTermPolicy('admin-id', data)
        ).resolves.toEqual({
            message: 'No users to send publish term policy notification',
            userCounts: 2,
            filteredUserCounts: 0,
            batches: 0,
        });
    });

    it('chunks eligible recipients and sends matching persisted entries', async () => {
        userDomain.getListActive.mockResolvedValue([userOne, userTwo]);
        settingRepository.findActiveUserSettingByType.mockResolvedValue([
            mock({ userId: userOne.id }),
            mock({ userId: userTwo.id }),
        ]);
        helperArrayService.chunk.mockReturnValue([[userOne], [userTwo]]);

        await expect(
            service.processPublishTermPolicy('admin-id', data)
        ).resolves.toEqual({
            message: 'Publish term policy notification processed',
            userCounts: 2,
            filteredUserCounts: 2,
            batches: 2,
        });
        expect(helperArrayService.chunk).toHaveBeenCalledWith(
            [userOne, userTwo],
            1
        );
        expect(notificationRepository.createMany).toHaveBeenCalledTimes(2);
        expect(
            notificationEmailQueue.sendPublishTermPolicy
        ).toHaveBeenCalledTimes(2);
    });

    it('skips acceptance persistence when the user is unavailable', async () => {
        userDomain.getOneActive.mockResolvedValue(null);
        const result = await service.processUserAcceptTermPolicy(
            'missing',
            data
        );
        expect(result.message).toContain('User not found');
        expect(notificationRepository.create).not.toHaveBeenCalled();
    });

    it('persists user acceptance metadata', async () => {
        userDomain.getOneActive.mockResolvedValue(userOne as never);
        await expect(
            service.processUserAcceptTermPolicy(userOne.id, data)
        ).resolves.toEqual({
            message: 'User accept term policy notification processed',
        });
        expect(notificationRepository.create).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                id: 'notification-1',
                userId: userOne.id,
                metadata: {
                    username: userOne.username,
                    type: data.type,
                    version: data.version,
                },
                createdBy: userOne.id,
            })
        );
    });
});
