import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import type { User, Verification } from '@generated/prisma-client/client';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { AccountDomain } from '@modules/account/domains/account.domain';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import type { UserSendEmailVerificationRequestDto } from '@modules/user/dtos/request/user.send-email-verification.request.dto';
import type { UserVerifyEmailRequestDto } from '@modules/user/dtos/request/user.verify-email.request.dto';
import type { IUserVerificationEmailCreate } from '@modules/user/interfaces/user.interface';
import { UserVerificationHttpService } from '@modules/user/services/user.verification.http.service';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';

describe('UserVerificationHttpService', () => {
    const userVerificationDomain: MockProxy<UserVerificationDomain> =
        mock<UserVerificationDomain>();
    const userVerificationUtil: MockProxy<UserVerificationUtil> =
        mock<UserVerificationUtil>();
    const accountDomain: MockProxy<AccountDomain> = mock<AccountDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    let service: UserVerificationHttpService;

    const activityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.userVerifiedEmail,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };
    const recipient: INotificationRecipient = {
        ...TestRecipient,
        userId: 'user-wren',
    };
    const verification: Verification = {
        id: 'verification-wren',
        userId: 'user-wren',
        mobileNumberId: null,
        to: 'wren@example.com',
        type: EnumVerificationType.email,
        token: 'hashed-token',
        expiredAt: new Date('2026-03-05T00:00:00.000Z'),
        verifiedAt: null,
        isUsed: false,
        reference: 'VRF-wren',
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
        createdBy: null,
    };
    const user = {
        id: 'user-wren',
        email: 'wren@example.com',
    } as User;
    const emailVerification: IUserVerificationEmailCreate = {
        type: 'email',
        reference: 'VRF-new',
        expiredAt: new Date('2026-03-05T00:00:00.000Z'),
        expiredInMinutes: 15,
        resendInMinutes: 5,
        token: 'random-token',
        hashedToken: 'hashed-new',
        link: 'https://example.com/verify?token=random-token',
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogDomain.prepare.mockReturnValue(activityLog);
        accountDomain.getNotificationRecipientOfUser.mockResolvedValue(
            recipient
        );
        userVerificationDomain.getOneActiveByEmailToken.mockResolvedValue({
            verification,
            user,
        });
        userVerificationDomain.getOneForResendByEmail.mockResolvedValue(user);
        userVerificationUtil.createEmail.mockReturnValue(emailVerification);
        helperDateService.formatToIso.mockReturnValue(
            '2026-03-05T00:00:00.000Z'
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserVerificationHttpService,
                {
                    provide: UserVerificationDomain,
                    useValue: userVerificationDomain,
                },
                {
                    provide: UserVerificationUtil,
                    useValue: userVerificationUtil,
                },
                { provide: AccountDomain, useValue: accountDomain },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        service = module.get(UserVerificationHttpService);
    });

    describe('verifyEmail', () => {
        it('verifies the token, stages the activity row, and notifies the recipient', async () => {
            const dto: UserVerifyEmailRequestDto = { token: 'raw-token' };

            const result = await service.verifyEmail(dto);

            expect(result).toEqual({});
            expect(
                userVerificationDomain.getOneActiveByEmailToken
            ).toHaveBeenCalledWith('raw-token');
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userVerifiedEmail,
                userId: 'user-wren',
                createdBy: 'user-wren',
            });
            expect(
                accountDomain.getNotificationRecipientOfUser
            ).toHaveBeenCalledWith(user, EnumNotificationKind.verifiedEmail);
            expect(userVerificationDomain.verifyEmail).toHaveBeenCalledWith(
                verification
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
            expect(notificationQueue.sendVerifiedEmail).toHaveBeenCalledWith(
                recipient,
                { reference: 'VRF-wren' }
            );
        });

        it('writes nothing when the recipient read rejects', async () => {
            accountDomain.getNotificationRecipientOfUser.mockRejectedValue(
                new Error('recipient-unavailable')
            );

            await expect(
                service.verifyEmail({ token: 'raw-token' })
            ).rejects.toThrow('recipient-unavailable');

            expect(userVerificationDomain.verifyEmail).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
            expect(notificationQueue.sendVerifiedEmail).not.toHaveBeenCalled();
        });

        it('stages nothing and notifies nothing when the verify write rejects', async () => {
            userVerificationDomain.verifyEmail.mockRejectedValue(
                new Error('boom')
            );

            await expect(
                service.verifyEmail({ token: 'raw-token' })
            ).rejects.toThrow('boom');

            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
            expect(notificationQueue.sendVerifiedEmail).not.toHaveBeenCalled();
        });
    });

    describe('sendVerificationEmail', () => {
        const dto: UserSendEmailVerificationRequestDto = {
            email: 'wren@example.com',
        };

        it('persists a fresh verification, stages the activity row, and notifies', async () => {
            const result = await service.sendVerificationEmail(dto);

            expect(result).toEqual({});
            expect(
                userVerificationDomain.getOneForResendByEmail
            ).toHaveBeenCalledWith('wren@example.com');
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userSendVerificationEmail,
                userId: 'user-wren',
                createdBy: 'user-wren',
            });
            expect(
                accountDomain.getNotificationRecipientOfUser
            ).toHaveBeenCalledWith(
                user,
                EnumNotificationKind.verificationEmail
            );
            expect(
                userVerificationDomain.persistVerificationEmail
            ).toHaveBeenCalledWith(
                'user-wren',
                'wren@example.com',
                emailVerification
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
            expect(
                notificationQueue.sendVerificationEmail
            ).toHaveBeenCalledWith(recipient, {
                expiredAt: '2026-03-05T00:00:00.000Z',
                reference: 'VRF-new',
                link: 'https://example.com/verify?token=random-token',
                expiredInMinutes: 15,
            });
        });

        it('writes nothing when the recipient read rejects', async () => {
            accountDomain.getNotificationRecipientOfUser.mockRejectedValue(
                new Error('recipient-unavailable')
            );

            await expect(service.sendVerificationEmail(dto)).rejects.toThrow(
                'recipient-unavailable'
            );

            expect(
                userVerificationDomain.persistVerificationEmail
            ).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendVerificationEmail
            ).not.toHaveBeenCalled();
        });
    });
});
