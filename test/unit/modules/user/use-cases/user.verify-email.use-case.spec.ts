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
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import type { UserVerifyEmailRequestDto } from '@modules/user/dtos/request/user.verify-email.request.dto';
import type { IUserVerificationEmailCreate } from '@modules/user/interfaces/user.interface';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import { UserVerifyEmailUseCase } from '@modules/user/use-cases/user.verify-email.use-case';

describe('UserVerifyEmailUseCase', () => {
    const userVerificationService: MockProxy<UserVerificationService> =
        mock<UserVerificationService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();

    let useCase: UserVerifyEmailUseCase;

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

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserVerifyEmailUseCase,
                {
                    provide: UserVerificationService,
                    useValue: userVerificationService,
                },
                {
                    provide: NotificationService,
                    useValue: notificationService,
                },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: NotificationQueue, useValue: notificationQueue },
            ],
        }).compile();
        useCase = module.get(UserVerifyEmailUseCase);
    });

    describe('execute', () => {
        it('verifies the token, stages the activity row, and notifies the recipient', async () => {
            const dto: UserVerifyEmailRequestDto = { token: 'raw-token' };

            const result = await useCase.execute(dto);

            expect(result).toEqual({});
            expect(
                userVerificationService.getOneActiveByEmailToken
            ).toHaveBeenCalledWith('raw-token');
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userVerifiedEmail,
                userId: 'user-wren',
                createdBy: 'user-wren',
            });
            expect(notificationService.getRecipient).toHaveBeenCalledWith(
                user,
                EnumNotificationKind.verifiedEmail
            );
            expect(userVerificationService.verifyEmail).toHaveBeenCalledWith(
                verification
            );
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
            expect(notificationQueue.sendVerifiedEmail).toHaveBeenCalledWith(
                recipient,
                { reference: 'VRF-wren' }
            );
        });

        it('writes nothing when the recipient read rejects', async () => {
            notificationService.getRecipient.mockRejectedValue(
                new Error('recipient-unavailable')
            );

            await expect(
                useCase.execute({ token: 'raw-token' })
            ).rejects.toThrow('recipient-unavailable');

            expect(userVerificationService.verifyEmail).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
            expect(notificationQueue.sendVerifiedEmail).not.toHaveBeenCalled();
        });

        it('stages nothing and notifies nothing when the verify write rejects', async () => {
            userVerificationService.verifyEmail.mockRejectedValue(
                new Error('boom')
            );

            await expect(
                useCase.execute({ token: 'raw-token' })
            ).rejects.toThrow('boom');

            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
            expect(notificationQueue.sendVerifiedEmail).not.toHaveBeenCalled();
        });
    });
});
