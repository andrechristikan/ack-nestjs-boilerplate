import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import type { User, Verification } from '@generated/prisma-client/client';
import { NotificationDomain } from '@modules/notification/domains/notification.domain';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type {
    INotificationRecipient,
    INotificationVerificationEmailPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import type { UserSendEmailVerificationRequestDto } from '@modules/user/dtos/request/user.send-email-verification.request.dto';
import type { UserVerifyEmailRequestDto } from '@modules/user/dtos/request/user.verify-email.request.dto';
import type { IUserVerificationEmailCreate } from '@modules/user/interfaces/user.interface';
import { UserVerificationHttpService } from '@modules/user/services/http/user.verification.http.service';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';

describe('UserVerificationHttpService', () => {
    const userVerificationDomain: MockProxy<UserVerificationDomain> =
        mock<UserVerificationDomain>();
    const userVerificationUtil: MockProxy<UserVerificationUtil> =
        mock<UserVerificationUtil>();
    const notificationDomain: MockProxy<NotificationDomain> =
        mock<NotificationDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();

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
    const user: User = {
        id: 'user-wren',
        name: 'Wren',
        username: 'wren',
        isVerified: false,
        verifiedAt: null,
        email: 'wren@example.com',
        roleId: 'role-1',
        password: null,
        passwordExpired: null,
        passwordCreated: null,
        passwordAttempt: null,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-1',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: EnumUserLoginFrom.website,
        lastLoginWith: EnumUserLoginWith.credential,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
    };
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
    const emailPayload: INotificationVerificationEmailPayload = {
        link: 'https://example.com/verify?token=random-token',
        expiredAt: '2026-03-05T00:00:00.000Z',
        expiredInMinutes: 15,
        reference: 'VRF-new',
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogDomain.prepare.mockReturnValue(activityLog);
        notificationDomain.getRecipient.mockResolvedValue(recipient);
        userVerificationDomain.getOneActiveByEmailToken.mockResolvedValue({
            verification,
            user,
        });
        userVerificationDomain.getOneForResendByEmail.mockResolvedValue(user);
        userVerificationDomain.createEmail.mockResolvedValue(emailVerification);
        userVerificationUtil.mapEmailPayload.mockReturnValue(emailPayload);

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
                {
                    provide: NotificationDomain,
                    useValue: notificationDomain,
                },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: NotificationQueue, useValue: notificationQueue },
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
            expect(notificationDomain.getRecipient).toHaveBeenCalledWith(
                user,
                EnumNotificationKind.verifiedEmail
            );
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
            notificationDomain.getRecipient.mockRejectedValue(
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

        it('creates a fresh verification, stages the activity row, and notifies', async () => {
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
            expect(notificationDomain.getRecipient).toHaveBeenCalledWith(
                user,
                EnumNotificationKind.verificationEmail
            );
            expect(userVerificationDomain.createEmail).toHaveBeenCalledWith(
                'user-wren',
                'wren@example.com'
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
            expect(userVerificationUtil.mapEmailPayload).toHaveBeenCalledWith(
                emailVerification
            );
            expect(
                notificationQueue.sendVerificationEmail
            ).toHaveBeenCalledWith(recipient, emailPayload);
        });

        it('reads the gate, the recipient, writes, stages, then enqueues in order', async () => {
            const callOrder: string[] = [];
            userVerificationDomain.getOneForResendByEmail.mockImplementation(
                async () => {
                    callOrder.push('getOneForResendByEmail');

                    return user;
                }
            );
            notificationDomain.getRecipient.mockImplementation(async () => {
                callOrder.push('getRecipient');

                return recipient;
            });
            userVerificationDomain.createEmail.mockImplementation(async () => {
                callOrder.push('createEmail');

                return emailVerification;
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });
            notificationQueue.sendVerificationEmail.mockImplementation(
                async () => {
                    callOrder.push('sendVerificationEmail');
                }
            );

            await service.sendVerificationEmail(dto);

            expect(callOrder).toEqual([
                'getOneForResendByEmail',
                'getRecipient',
                'createEmail',
                'stagePrepared',
                'sendVerificationEmail',
            ]);
        });

        it('answers empty and sends nothing when the account is missing, inactive, or already verified', async () => {
            userVerificationDomain.getOneForResendByEmail.mockResolvedValue(
                null
            );

            await expect(service.sendVerificationEmail(dto)).resolves.toEqual(
                {}
            );

            expect(userVerificationDomain.createEmail).not.toHaveBeenCalled();
            expect(notificationDomain.getRecipient).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendVerificationEmail
            ).not.toHaveBeenCalled();
        });

        it('writes nothing when the recipient read rejects', async () => {
            notificationDomain.getRecipient.mockRejectedValue(
                new Error('recipient-unavailable')
            );

            await expect(service.sendVerificationEmail(dto)).rejects.toThrow(
                'recipient-unavailable'
            );

            expect(userVerificationDomain.createEmail).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendVerificationEmail
            ).not.toHaveBeenCalled();
        });
    });
});
