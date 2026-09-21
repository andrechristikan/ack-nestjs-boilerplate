import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RequestContextService } from '@common/request/services/request.context.service';
import type { User } from '@generated/prisma-client';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import type { IDeviceOwnershipWithDevice } from '@modules/device/interfaces/device.interface';
import type {
    INotificationForgotPasswordEncryptedPayload,
    INotificationNewDeviceLoginPayload,
    INotificationTemporaryPasswordEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationSecurityDomain } from '@modules/notification/domains/notification.security.domain';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { UserDomain } from '@modules/user/domains/user.domain';

describe('NotificationSecurityDomain', () => {
    const notificationRepository: MockProxy<NotificationRepository> =
        mock<NotificationRepository>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const deviceDomain: MockProxy<DeviceDomain> = mock<DeviceDomain>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const requestContextService: MockProxy<RequestContextService> =
        mock<RequestContextService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const notificationEmailQueue: MockProxy<NotificationEmailQueue> =
        mock<NotificationEmailQueue>();
    const notificationPushQueue: MockProxy<NotificationPushQueue> =
        mock<NotificationPushQueue>();
    const service = new NotificationSecurityDomain(
        notificationRepository,
        userDomain,
        deviceDomain,
        helperDateService,
        requestContextService,
        databaseUtil,
        notificationEmailQueue,
        notificationPushQueue
    );
    const user = mock<User>({
        id: 'user-id',
        email: 'user@example.com',
        username: 'user',
    });
    const temporary = mock<INotificationTemporaryPasswordEncryptedPayload>({
        encryptedPassword: 'ciphertext',
        passwordCreatedAt: '2026-01-01T00:00:00.000Z',
        passwordExpiredAt: '2026-02-01T00:00:00.000Z',
    });
    const forgot = mock<INotificationForgotPasswordEncryptedPayload>({
        encryptedLink: 'ciphertext',
    });
    const newDevice = mock<INotificationNewDeviceLoginPayload>({
        loginAt: '2026-01-01T00:00:00.000Z',
    });
    const cases = [
        [
            'temporary password',
            () =>
                service.processTemporaryPasswordByAdmin(
                    user.id,
                    'admin-id',
                    temporary
                ),
        ],
        ['changed password', () => service.processChangePassword(user.id)],
        [
            'forgot password',
            () => service.processForgotPassword(user.id, forgot),
        ],
        ['reset password', () => service.processResetPassword(user.id)],
        [
            'reset two-factor',
            () => service.processResetTwoFactorByAdmin(user.id, 'admin-id'),
        ],
        [
            'new device login',
            () => service.processNewDeviceLogin(user.id, newDevice),
        ],
    ] as const;

    beforeEach(() => {
        vi.resetAllMocks();
        userDomain.getOneActive.mockResolvedValue(user);
        deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([]);
        databaseUtil.createId.mockReturnValue('notification-id');
        helperDateService.createFromIso.mockReturnValue(
            new Date('2026-02-01T00:00:00.000Z')
        );
        requestContextService.resolveDevice.mockReturnValue('Browser');
        requestContextService.resolveCity.mockReturnValue('Rome');
    });

    it.each(cases)(
        'skips %s when the user is unavailable',
        async (_name, process) => {
            userDomain.getOneActive.mockResolvedValue(null);
            const result = await process();
            expect(result.message).toContain('User not found');
            expect(notificationRepository.create).not.toHaveBeenCalled();
        }
    );

    it.each(cases)(
        'persists and sends %s without a push recipient',
        async (_name, process) => {
            const result = await process();
            expect(result.message).toContain('processed');
            expect(result.results).toBeDefined();
        }
    );

    it.each(cases)(
        'settles partial provider failures for %s',
        async (_name, process) => {
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                mock<IDeviceOwnershipWithDevice>({
                    device: mock({ notificationToken: 'push-token' }),
                }),
                mock<IDeviceOwnershipWithDevice>({
                    device: mock({ notificationToken: null }),
                }),
            ]);
            notificationRepository.create.mockRejectedValue(
                new Error('database down')
            );
            const result = await process();
            expect(result.results).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ status: 'rejected' }),
                ])
            );
        }
    );

    it('keeps the encrypted temporary password out of push payload data', async () => {
        deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
            mock<IDeviceOwnershipWithDevice>({
                device: mock({ notificationToken: 'push-token' }),
            }),
        ]);
        await service.processTemporaryPasswordByAdmin(
            user.id,
            'admin-id',
            temporary
        );
        expect(
            notificationEmailQueue.sendTemporaryPasswordByAdmin
        ).toHaveBeenCalledWith(expect.any(Object), temporary);
        expect(
            notificationPushQueue.sendTemporaryPasswordByAdmin
        ).toHaveBeenCalledWith(
            expect.objectContaining({ notificationTokens: ['push-token'] }),
            {
                passwordCreatedAt: temporary.passwordCreatedAt,
                passwordExpiredAt: temporary.passwordExpiredAt,
            }
        );
        expect(
            notificationPushQueue.sendTemporaryPasswordByAdmin
        ).toHaveBeenCalledWith(
            expect.any(Object),
            expect.not.objectContaining({
                encryptedPassword: temporary.encryptedPassword,
            })
        );
    });
});
