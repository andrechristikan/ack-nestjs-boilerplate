import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type { User } from '@generated/prisma-client';
import { NotificationAccountDomain } from '@modules/notification/domains/notification.account.domain';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { UserDomain } from '@modules/user/domains/user.domain';

describe('NotificationAccountDomain', () => {
    const notificationRepository: MockProxy<NotificationRepository> =
        mock<NotificationRepository>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const notificationEmailQueue: MockProxy<NotificationEmailQueue> =
        mock<NotificationEmailQueue>();
    const service = new NotificationAccountDomain(
        notificationRepository,
        userDomain,
        helperStringService,
        databaseUtil,
        notificationEmailQueue
    );
    const user = mock<User>({
        id: 'user-id',
        email: 'user@example.com',
        username: 'user',
    });
    const welcomeByAdmin = {
        encryptedPassword: 'ciphertext',
        passwordCreatedAt: '2026-01-01T00:00:00.000Z',
        passwordExpiredAt: '2026-02-01T00:00:00.000Z',
    };
    const verification = {
        encryptedLink: 'ciphertext',
        expiredAt: '2026-01-01T01:00:00.000Z',
        reference: 'VE-REF',
        expiredInMinutes: 60,
    };
    const verifiedEmail = { reference: 'VE-REF' };
    const verifiedMobile = {
        mobileNumber: '+3900000000',
        reference: 'VM-REF',
        resendInMinutes: 5,
    };
    const cases = [
        [
            'welcome by admin',
            () =>
                service.processWelcomeByAdmin(
                    user.id,
                    'admin-id',
                    welcomeByAdmin
                ),
        ],
        ['welcome', () => service.processWelcome(user.id, verification)],
        ['social welcome', () => service.processWelcomeSocial(user.id)],
        [
            'verified email',
            () => service.processVerifiedEmail(user.id, verifiedEmail),
        ],
        [
            'verification email',
            () => service.processVerificationEmail(user.id, verification),
        ],
        [
            'verified mobile number',
            () => service.processVerifiedMobileNumber(user.id, verifiedMobile),
        ],
    ] as const;

    beforeEach(() => {
        vi.resetAllMocks();
        userDomain.getOneActive.mockResolvedValue(user);
        databaseUtil.createId.mockReturnValue('notification-id');
        helperStringService.censor.mockReturnValue('+39******00');
    });

    it.each(cases)(
        'skips %s when the user is unavailable',
        async (_name, process) => {
            userDomain.getOneActive.mockResolvedValue(null);
            const result = await process();
            expect(result.message).toContain('User not found');
            expect(notificationRepository.create).not.toHaveBeenCalled();
            expect(notificationRepository.createMany).not.toHaveBeenCalled();
        }
    );

    it.each(cases)(
        'persists and sends %s with settled partial failures',
        async (_name, process) => {
            notificationRepository.create.mockRejectedValue(
                new Error('database down')
            );
            notificationRepository.createMany.mockRejectedValue(
                new Error('database down')
            );
            const result = await process();
            expect(result.message).toContain('processed');
            expect(result.results).toBeDefined();
            expect(result.results).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ status: 'rejected' }),
                ])
            );
        }
    );

    it('censors mobile data before persistence and sends the original delivery payload', async () => {
        await service.processVerifiedMobileNumber(user.id, verifiedMobile);
        expect(helperStringService.censor).toHaveBeenCalledWith(
            verifiedMobile.mobileNumber
        );
        expect(notificationRepository.create).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                metadata: expect.objectContaining({
                    mobileNumber: '+39******00',
                }),
            })
        );
        expect(
            notificationEmailQueue.sendVerifiedMobileNumber
        ).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: user.id,
                email: user.email,
                notificationId: 'notification-id',
            }),
            verifiedMobile
        );
    });

    it('creates two independent notification ids for welcome and verification delivery', async () => {
        databaseUtil.createId
            .mockReturnValueOnce('welcome-id')
            .mockReturnValueOnce('verification-id');
        await service.processWelcome(user.id, verification);
        expect(notificationRepository.createMany).toHaveBeenCalledWith([
            expect.objectContaining({
                payload: expect.objectContaining({ id: 'welcome-id' }),
            }),
            expect.objectContaining({
                payload: expect.objectContaining({ id: 'verification-id' }),
            }),
        ]);
        expect(
            notificationEmailQueue.sendVerificationEmail
        ).toHaveBeenCalledWith(
            expect.objectContaining({ notificationId: 'verification-id' }),
            verification
        );
    });
});
