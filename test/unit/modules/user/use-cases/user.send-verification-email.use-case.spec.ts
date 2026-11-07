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
import { NotificationService } from '@modules/notification/services/notification.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type {
    INotificationRecipient,
    INotificationVerificationEmailPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import type { UserSendEmailVerificationRequestDto } from '@modules/user/dtos/request/user.send-email-verification.request.dto';
import type { IUserVerificationEmailCreate } from '@modules/user/interfaces/user.interface';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import { UserSendVerificationEmailUseCase } from '@modules/user/use-cases/user.send-verification-email.use-case';

describe('UserSendVerificationEmailUseCase', () => {
    const userVerificationService: MockProxy<UserVerificationService> =
        mock<UserVerificationService>();
    const userVerificationUtil: MockProxy<UserVerificationUtil> =
        mock<UserVerificationUtil>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();

    let useCase: UserSendVerificationEmailUseCase;

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
        activityLogService.prepare.mockReturnValue(activityLog);
        notificationService.getRecipient.mockResolvedValue(recipient);
        userVerificationService.getOneActiveByEmailToken.mockResolvedValue({
            verification,
            user,
        });
        userVerificationService.getOneForResendByEmail.mockResolvedValue(user);
        userVerificationService.createEmail.mockResolvedValue(
            emailVerification
        );
        userVerificationUtil.mapEmailPayload.mockReturnValue(emailPayload);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserSendVerificationEmailUseCase,
                {
                    provide: UserVerificationService,
                    useValue: userVerificationService,
                },
                {
                    provide: UserVerificationUtil,
                    useValue: userVerificationUtil,
                },
                {
                    provide: NotificationService,
                    useValue: notificationService,
                },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: NotificationQueue, useValue: notificationQueue },
            ],
        }).compile();
        useCase = module.get(UserSendVerificationEmailUseCase);
    });

    describe('execute', () => {
        const dto: UserSendEmailVerificationRequestDto = {
            email: 'wren@example.com',
        };

        it('creates a fresh verification, stages the activity row, and notifies', async () => {
            const result = await useCase.execute(dto);

            expect(result).toEqual({});
            expect(
                userVerificationService.getOneForResendByEmail
            ).toHaveBeenCalledWith('wren@example.com');
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userSendVerificationEmail,
                userId: 'user-wren',
                createdBy: 'user-wren',
            });
            expect(notificationService.getRecipient).toHaveBeenCalledWith(
                user,
                EnumNotificationKind.verificationEmail
            );
            expect(userVerificationService.createEmail).toHaveBeenCalledWith(
                'user-wren',
                'wren@example.com'
            );
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
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
            userVerificationService.getOneForResendByEmail.mockImplementation(
                async () => {
                    callOrder.push('getOneForResendByEmail');

                    return user;
                }
            );
            notificationService.getRecipient.mockImplementation(async () => {
                callOrder.push('getRecipient');

                return recipient;
            });
            userVerificationService.createEmail.mockImplementation(async () => {
                callOrder.push('createEmail');

                return emailVerification;
            });
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });
            notificationQueue.sendVerificationEmail.mockImplementation(
                async () => {
                    callOrder.push('sendVerificationEmail');
                }
            );

            await useCase.execute(dto);

            expect(callOrder).toEqual([
                'getOneForResendByEmail',
                'getRecipient',
                'createEmail',
                'stagePrepared',
                'sendVerificationEmail',
            ]);
        });

        it('answers empty and sends nothing when the account is missing, inactive, or already verified', async () => {
            userVerificationService.getOneForResendByEmail.mockResolvedValue(
                null
            );

            await expect(useCase.execute(dto)).resolves.toEqual({});

            expect(userVerificationService.createEmail).not.toHaveBeenCalled();
            expect(notificationService.getRecipient).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendVerificationEmail
            ).not.toHaveBeenCalled();
        });

        it('writes nothing when the recipient read rejects', async () => {
            notificationService.getRecipient.mockRejectedValue(
                new Error('recipient-unavailable')
            );

            await expect(useCase.execute(dto)).rejects.toThrow(
                'recipient-unavailable'
            );

            expect(userVerificationService.createEmail).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendVerificationEmail
            ).not.toHaveBeenCalled();
        });
    });
});
