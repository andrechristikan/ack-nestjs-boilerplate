import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import type { UserForgotPasswordRequestDto } from '@modules/user/dtos/request/user.forgot-password.request.dto';
import type {
    IUser,
    IUserForgotPasswordCreate,
} from '@modules/user/interfaces/user.interface';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import { UserForgotPasswordUseCase } from '@modules/user/use-cases/user.forgot-password.use-case';

describe('UserForgotPasswordUseCase', () => {
    const userPasswordService: MockProxy<UserPasswordService> =
        mock<UserPasswordService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const featureFlagService: MockProxy<FeatureFlagService> =
        mock<FeatureFlagService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    let useCase: UserForgotPasswordUseCase;

    const user: IUser = {
        id: 'user-linden',
        name: 'Linden Frost',
        username: 'lindenFrost',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'linden@example.com',
        roleId: 'role-linden',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-linden',
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
        role: {
            id: 'role-linden',
            name: 'user',
            description: null,
            type: EnumRoleType.user,
            isImmutable: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };
    const activityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.userChangePassword,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };
    const recipient: INotificationRecipient = {
        ...TestRecipient,
        userId: user.id,
    };
    const now = new Date('2026-03-05T00:00:00.000Z');
    const forgot: IUserForgotPasswordCreate = {
        reference: 'FGT-linden',
        expiredAt: new Date('2026-03-05T00:00:00.000Z'),
        token: 'raw-token',
        hashedToken: 'hashed-token',
        expiredInMinutes: 15,
        resendInMinutes: 5,
        link: 'https://example.com/reset?token=raw-token',
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.prepare.mockReturnValue(activityLog);
        helperDateService.create.mockReturnValue(now);
        helperDateService.formatToIso.mockReturnValue(
            '2026-03-01T00:00:00.000Z'
        );
        notificationService.getRecipient.mockResolvedValue(recipient);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserForgotPasswordUseCase,
                { provide: UserPasswordService, useValue: userPasswordService },
                {
                    provide: NotificationService,
                    useValue: notificationService,
                },
                { provide: FeatureFlagService, useValue: featureFlagService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        useCase = module.get(UserForgotPasswordUseCase);
    });

    describe('execute', () => {
        const dto: UserForgotPasswordRequestDto = {
            email: 'linden@example.com',
        };

        beforeEach(() => {
            userPasswordService.prepareForgotPassword.mockResolvedValue({
                user,
                forgot,
            });
        });

        it('gates the flag, creates the request, stages the row, then notifies', async () => {
            const calls: string[] = [];
            userPasswordService.createForgotPassword.mockImplementation(
                async () => {
                    calls.push('create');
                }
            );
            activityLogService.stagePrepared.mockImplementation(() => {
                calls.push('stage');
            });
            notificationQueue.sendForgotPassword.mockImplementation(
                async () => {
                    calls.push('notify');
                }
            );

            await expect(useCase.execute(dto)).resolves.toEqual({});

            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith(
                EnumFeatureFlagKey.changePassword,
                EnumFeatureFlagMetadataKey.forgotAllowed
            );
            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledBefore(userPasswordService.prepareForgotPassword);
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userForgotPassword,
                userId: 'user-linden',
                createdBy: 'user-linden',
            });
            expect(notificationService.getRecipient).toHaveBeenCalledWith(
                user,
                EnumNotificationKind.forgotPassword
            );
            expect(
                userPasswordService.createForgotPassword
            ).toHaveBeenCalledWith('user-linden', 'linden@example.com', forgot);
            expect(notificationQueue.sendForgotPassword).toHaveBeenCalledWith(
                recipient,
                {
                    expiredAt: '2026-03-01T00:00:00.000Z',
                    link: forgot.link,
                    reference: 'FGT-linden',
                    expiredInMinutes: 15,
                    resendInMinutes: 5,
                }
            );
            expect(calls).toEqual(['create', 'stage', 'notify']);
        });

        it('answers empty and sends nothing when no active user holds the email', async () => {
            userPasswordService.prepareForgotPassword.mockResolvedValue(null);

            await expect(useCase.execute(dto)).resolves.toEqual({});

            expect(
                userPasswordService.createForgotPassword
            ).not.toHaveBeenCalled();
            expect(notificationQueue.sendForgotPassword).not.toHaveBeenCalled();
            expect(notificationService.getRecipient).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('creates nothing when the recipient read rejects', async () => {
            notificationService.getRecipient.mockRejectedValue(
                new Error('read')
            );

            await expect(useCase.execute(dto)).rejects.toThrow('read');
            expect(
                userPasswordService.createForgotPassword
            ).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('reads nothing when the flag gate rejects', async () => {
            featureFlagService.validateFeatureFlagMetadata.mockRejectedValue(
                new Error('flag')
            );

            await expect(useCase.execute(dto)).rejects.toThrow('flag');
            expect(
                userPasswordService.prepareForgotPassword
            ).not.toHaveBeenCalled();
        });
    });
});
