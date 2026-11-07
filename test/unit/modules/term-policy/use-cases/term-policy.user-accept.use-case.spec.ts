import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumTermPolicyType,
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationService } from '@modules/notification/services/notification.service';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { TermPolicyUserAcceptUseCase } from '@modules/term-policy/use-cases/term-policy.user-accept.use-case';
import type { ITermPolicyRef } from '@modules/term-policy/interfaces/term-policy.interface';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';

describe('TermPolicyUserAcceptUseCase', () => {
    const termPolicyAcceptanceService: MockProxy<TermPolicyAcceptanceService> =
        mock<TermPolicyAcceptanceService>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();

    const timestamp = new Date('2026-01-01T00:00:00.000Z');
    const user: IUser = {
        id: 'user-1',
        name: 'Andre Christi',
        username: 'johnSmith123',
        isVerified: true,
        verifiedAt: timestamp,
        email: 'andre@example.com',
        roleId: 'role-1',
        password: 'hashed-password',
        passwordExpired: null,
        passwordCreated: timestamp,
        passwordAttempt: 0,
        signUpAt: timestamp,
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: EnumUserGender.male,
        countryId: 'country-1',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        photo: null,
        createdAt: timestamp,
        createdBy: null,
        updatedAt: timestamp,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: {
            id: 'role-1',
            name: 'User',
            description: null,
            type: EnumRoleType.user,
            isImmutable: false,
            createdAt: timestamp,
            createdBy: null,
            updatedAt: timestamp,
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };

    let useCase: TermPolicyUserAcceptUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyUserAcceptUseCase,
                {
                    provide: TermPolicyAcceptanceService,
                    useValue: termPolicyAcceptanceService,
                },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: NotificationService, useValue: notificationService },
                { provide: NotificationQueue, useValue: notificationQueue },
            ],
        }).compile();

        useCase = module.get(TermPolicyUserAcceptUseCase);
    });

    describe('execute', () => {
        const recipient: INotificationRecipient = {
            ...TestRecipient,
            userId: 'user-1',
        };
        const accepted: ITermPolicyRef = {
            id: 'term-policy-1',
            type: EnumTermPolicyType.privacy,
            version: 1,
        };
        const preparedActivityLog: IActivityLogStaged = {
            action: EnumActivityLogAction.userAcceptTermPolicy,
            metadata: {},
            userId: null,
            createdBy: null,
            workspaceId: null,
        };

        beforeEach(() => {
            activityLogService.prepare.mockReturnValue(preparedActivityLog);
            notificationService.getRecipient.mockResolvedValue(recipient);
            notificationQueue.sendUserAcceptTermPolicy.mockResolvedValue();
        });

        it('reads the recipient, accepts, stages the activity log, then queues the notification', async () => {
            const calls: string[] = [];
            notificationService.getRecipient.mockImplementation(async () => {
                calls.push('recipient');
                return recipient;
            });
            termPolicyAcceptanceService.userAccept.mockImplementation(
                async () => {
                    calls.push('accept');
                    return accepted;
                }
            );
            activityLogService.stagePrepared.mockImplementation(() => {
                calls.push('stage');
            });
            notificationQueue.sendUserAcceptTermPolicy.mockImplementation(
                async () => {
                    calls.push('enqueue');
                }
            );

            const result = await useCase.execute(user, {
                type: EnumTermPolicyType.privacy,
            });

            expect(result).toEqual({});
            expect(calls).toEqual(['recipient', 'accept', 'stage', 'enqueue']);
            expect(notificationService.getRecipient).toHaveBeenCalledWith(
                user,
                EnumNotificationKind.userAcceptTermPolicy
            );
            expect(termPolicyAcceptanceService.userAccept).toHaveBeenCalledWith(
                'user-1',
                EnumTermPolicyType.privacy
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userAcceptTermPolicy,
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                preparedActivityLog,
            ]);
            expect(
                notificationQueue.sendUserAcceptTermPolicy
            ).toHaveBeenCalledWith(recipient, {
                termPolicyId: 'term-policy-1',
                type: EnumTermPolicyType.privacy,
                version: 1,
            });
        });

        it('accepts nothing when the recipient read rejects', async () => {
            const error = new Error('recipient-unavailable');
            notificationService.getRecipient.mockRejectedValue(error);

            const promise = useCase.execute(user, {
                type: EnumTermPolicyType.privacy,
            });

            await expect(promise).rejects.toBe(error);
            expect(
                termPolicyAcceptanceService.userAccept
            ).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendUserAcceptTermPolicy
            ).not.toHaveBeenCalled();
        });

        it('stages and queues nothing when the domain rejects', async () => {
            const error = new Error('already accepted');
            termPolicyAcceptanceService.userAccept.mockRejectedValue(error);

            const promise = useCase.execute(user, {
                type: EnumTermPolicyType.privacy,
            });

            await expect(promise).rejects.toBe(error);
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendUserAcceptTermPolicy
            ).not.toHaveBeenCalled();
        });
    });
});
