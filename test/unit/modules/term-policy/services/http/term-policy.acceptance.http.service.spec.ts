import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumTermPolicyType,
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { NotificationUserSetting } from '@generated/prisma-client/client';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { NotificationDomain } from '@modules/notification/domains/notification.domain';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { TermPolicyAcceptanceDomain } from '@modules/term-policy/domains/term-policy.acceptance.domain';
import { TermPolicyAcceptanceHttpService } from '@modules/term-policy/services/http/term-policy.acceptance.http.service';
import type { TermPolicyAcceptedListRequestDto } from '@modules/term-policy/dtos/request/term-policy.accepted-list.request.dto';
import type {
    ITermPolicyRef,
    ITermPolicyUserAcceptance,
} from '@modules/term-policy/interfaces/term-policy.interface';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { TermPolicyAcceptanceDefaultAvailableOrderBy } from '@modules/term-policy/constants/term-policy.list.constant';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';

describe('TermPolicyAcceptanceHttpService', () => {
    const termPolicyAcceptanceDomain: MockProxy<TermPolicyAcceptanceDomain> =
        mock<TermPolicyAcceptanceDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const deviceDomain: MockProxy<DeviceDomain> = mock<DeviceDomain>();
    const notificationDomain: MockProxy<NotificationDomain> =
        mock<NotificationDomain>();
    const notificationUtil: MockProxy<NotificationUtil> =
        mock<NotificationUtil>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();

    const cursorParams = { limit: 20, orderBy: [] };
    const cursorPage = {
        type: EnumPaginationType.cursor as const,
        perPage: 20,
        hasNext: false,
        data: [] as ITermPolicyUserAcceptance[],
    };
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
            createdAt: timestamp,
            createdBy: null,
            updatedAt: timestamp,
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };

    let service: TermPolicyAcceptanceHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();

        paginationQueryUtil.cursor.mockReturnValue({
            params: cursorParams,
            storePatch: { filters: {} },
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyAcceptanceHttpService,
                {
                    provide: TermPolicyAcceptanceDomain,
                    useValue: termPolicyAcceptanceDomain,
                },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: DeviceDomain, useValue: deviceDomain },
                { provide: NotificationDomain, useValue: notificationDomain },
                { provide: NotificationUtil, useValue: notificationUtil },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
            ],
        }).compile();

        service = module.get(TermPolicyAcceptanceHttpService);
    });

    describe('getListUserAccepted', () => {
        it('merges the pagination store patch and returns the domain page', async () => {
            const query: TermPolicyAcceptedListRequestDto = { perPage: 20 };
            termPolicyAcceptanceDomain.getListUserAccepted.mockResolvedValue(
                cursorPage
            );

            const result = await service.getListUserAccepted('user-1', query);

            expect(result).toEqual(cursorPage);
            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                availableOrderBy: TermPolicyAcceptanceDefaultAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: {} }
            );
            expect(
                termPolicyAcceptanceDomain.getListUserAccepted
            ).toHaveBeenCalledWith('user-1', cursorParams);
        });
    });

    describe('userAccept', () => {
        const recipient: INotificationRecipient = {
            ...TestRecipient,
            userId: 'user-1',
        };
        const notificationTokens = ['token-1'];
        const settings: NotificationUserSetting[] = [];
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
            activityLogDomain.prepare.mockReturnValue(preparedActivityLog);
            deviceDomain.getNotificationTokens.mockResolvedValue(
                notificationTokens
            );
            notificationDomain.getListUserSetting.mockResolvedValue(settings);
            notificationUtil.mapRecipient.mockReturnValue(recipient);
            notificationQueue.sendUserAcceptTermPolicy.mockResolvedValue();
        });

        it('reads the recipient, accepts, stages the activity log, then queues the notification', async () => {
            const calls: string[] = [];
            notificationUtil.mapRecipient.mockImplementation(() => {
                calls.push('recipient');
                return recipient;
            });
            termPolicyAcceptanceDomain.userAccept.mockImplementation(
                async () => {
                    calls.push('accept');
                    return accepted;
                }
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                calls.push('stage');
            });
            notificationQueue.sendUserAcceptTermPolicy.mockImplementation(
                async () => {
                    calls.push('enqueue');
                }
            );

            const result = await service.userAccept(user, {
                type: EnumTermPolicyType.privacy,
            });

            expect(result).toEqual({});
            expect(calls).toEqual(['recipient', 'accept', 'stage', 'enqueue']);
            expect(deviceDomain.getNotificationTokens).toHaveBeenCalledWith(
                'user-1'
            );
            expect(notificationDomain.getListUserSetting).toHaveBeenCalledWith(
                'user-1'
            );
            expect(notificationUtil.mapRecipient).toHaveBeenCalledWith(
                user,
                EnumNotificationKind.userAcceptTermPolicy,
                ['token-1'],
                settings
            );
            expect(termPolicyAcceptanceDomain.userAccept).toHaveBeenCalledWith(
                'user-1',
                EnumTermPolicyType.privacy
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userAcceptTermPolicy,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
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
            deviceDomain.getNotificationTokens.mockRejectedValue(error);

            const promise = service.userAccept(user, {
                type: EnumTermPolicyType.privacy,
            });

            await expect(promise).rejects.toBe(error);
            expect(
                termPolicyAcceptanceDomain.userAccept
            ).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendUserAcceptTermPolicy
            ).not.toHaveBeenCalled();
        });

        it('stages and queues nothing when the domain rejects', async () => {
            const error = new Error('already accepted');
            termPolicyAcceptanceDomain.userAccept.mockRejectedValue(error);

            const promise = service.userAccept(user, {
                type: EnumTermPolicyType.privacy,
            });

            await expect(promise).rejects.toBe(error);
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendUserAcceptTermPolicy
            ).not.toHaveBeenCalled();
        });
    });
});
