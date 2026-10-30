import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserProfileDomain } from '@modules/user/domains/user.profile.domain';
import { AccountDomain } from '@modules/account/domains/account.domain';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { SessionUtil } from '@modules/session/utils/session.util';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { UserOnboardingUtil } from '@modules/user/utils/user.onboarding.util';
import { UserUtil } from '@modules/user/utils/user.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import {
    EnumUserCreateMode,
    EnumUserSignUpWorkspaceContextType,
} from '@modules/user/enums/user.enum';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import { OnboardingDomain } from '@modules/onboarding/domains/onboarding.domain';
import { UserHttpService } from '@modules/user/services/user.http.service';
import type { UserCheckEmailRequestDto } from '@modules/user/dtos/request/user.check-email.request.dto';
import type { UserCheckUsernameRequestDto } from '@modules/user/dtos/request/user.check-username.request.dto';
import type { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import type { UserListRequestDto } from '@modules/user/dtos/request/user.list.request.dto';
import type { UserUpdateStatusRequestDto } from '@modules/user/dtos/request/user.update-status.request.dto';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
    IUserList,
} from '@modules/user/interfaces/user.interface';
import {
    UserDefaultAvailableOrderBy,
    UserDefaultAvailableSearch,
} from '@modules/user/constants/user.list.constant';

describe('UserHttpService', () => {
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const onboardingDomain: MockProxy<OnboardingDomain> =
        mock<OnboardingDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const accountDomain: MockProxy<AccountDomain> = mock<AccountDomain>();
    const roleDomain: MockProxy<RoleDomain> = mock<RoleDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const sessionQueue: MockProxy<SessionQueue> = mock<SessionQueue>();
    const sessionUtil: MockProxy<SessionUtil> = mock<SessionUtil>();
    const userProfileDomain: MockProxy<UserProfileDomain> =
        mock<UserProfileDomain>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const userOnboardingUtil: MockProxy<UserOnboardingUtil> =
        mock<UserOnboardingUtil>();
    const notificationUtil: MockProxy<NotificationUtil> =
        mock<NotificationUtil>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    let service: UserHttpService;

    const baseUser: IUser = {
        id: 'user-cinder',
        name: 'Cinder Wolfe',
        username: 'cinder2wolfe',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'cinder@example.com',
        roleId: 'role-cinder',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-cinder',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
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
            id: 'role-cinder',
            name: 'user',
            description: null,
            type: EnumRoleType.user,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserHttpService,
                { provide: UserDomain, useValue: userDomain },
                { provide: OnboardingDomain, useValue: onboardingDomain },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
                { provide: AccountDomain, useValue: accountDomain },
                { provide: RoleDomain, useValue: roleDomain },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: SessionQueue, useValue: sessionQueue },
                { provide: SessionUtil, useValue: sessionUtil },
                { provide: UserProfileDomain, useValue: userProfileDomain },
                { provide: UserUtil, useValue: userUtil },
                { provide: UserOnboardingUtil, useValue: userOnboardingUtil },
                { provide: NotificationUtil, useValue: notificationUtil },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        service = module.get(UserHttpService);
    });

    describe('getListOffsetByAdmin', () => {
        const query: UserListRequestDto = { page: 1, perPage: 20 };
        const response: IResponsePaginationReturn<IUserList> = {
            type: EnumPaginationType.offset,
            count: 0,
            perPage: 20,
            page: 1,
            totalPage: 0,
            hasNext: false,
            hasPrevious: false,
            data: [],
        };

        it('merges every filter into the pagination store and calls the domain with each where', async () => {
            const params = { skip: 0, limit: 20, orderBy: [] };
            paginationQueryUtil.offset.mockReturnValue({
                params,
                storePatch: { filters: {} },
            });
            paginationQueryUtil.inEnum.mockReturnValue({
                where: { status: { in: [EnumUserStatus.active] } },
                storeFilter: { status: [EnumUserStatus.active] },
            });
            paginationQueryUtil.equalString
                .mockReturnValueOnce({
                    where: { roleId: { equals: 'role-cinder' } },
                    storeFilter: { roleId: 'role-cinder' },
                })
                .mockReturnValueOnce({
                    where: { countryId: { equals: 'country-cinder' } },
                    storeFilter: { countryId: 'country-cinder' },
                });
            userDomain.getListOffsetByAdmin.mockResolvedValue(response);

            await expect(service.getListOffsetByAdmin(query)).resolves.toBe(
                response
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                expect.objectContaining({
                    filters: expect.objectContaining({
                        status: [EnumUserStatus.active],
                        roleId: 'role-cinder',
                        countryId: 'country-cinder',
                    }),
                })
            );
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(query, {
                availableSearch: UserDefaultAvailableSearch,
                availableOrderBy: UserDefaultAvailableOrderBy,
            });
            expect(userDomain.getListOffsetByAdmin).toHaveBeenCalledWith(
                params,
                { status: { in: [EnumUserStatus.active] } },
                { roleId: { equals: 'role-cinder' } },
                { countryId: { equals: 'country-cinder' } }
            );
        });

        it('calls the domain with undefined wheres when no filter applies', async () => {
            const params = { skip: 0, limit: 20, orderBy: [] };
            paginationQueryUtil.offset.mockReturnValue({
                params,
                storePatch: { filters: {} },
            });
            paginationQueryUtil.inEnum.mockReturnValue(null);
            paginationQueryUtil.equalString.mockReturnValue(null);
            userDomain.getListOffsetByAdmin.mockResolvedValue(response);

            await service.getListOffsetByAdmin(query);

            expect(userDomain.getListOffsetByAdmin).toHaveBeenCalledWith(
                params,
                undefined,
                undefined,
                undefined
            );
        });
    });

    describe('getOne', () => {
        it('wraps the user in a response envelope', async () => {
            const user = baseUser;
            userDomain.getOne.mockResolvedValue({
                ...user,
                mobileNumbers: [],
                country: {
                    id: user.countryId,
                    name: 'Cinder Coast',
                    alpha2Code: 'CD',
                    alpha3Code: 'CDL',
                    phoneCode: ['+1'],
                    continent: 'Atlantis',
                    timezone: 'UTC',
                    createdAt: new Date('2026-01-01T00:00:00.000Z'),
                    createdBy: null,
                    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                    updatedBy: null,
                },
            });

            await expect(service.getOne(user.id)).resolves.toMatchObject({
                data: { id: user.id },
            });
        });
    });

    describe('createByAdmin', () => {
        const dto: UserCreateRequestDto = {
            username: 'cinder2wolfe',
            email: 'cinder@example.com' as Lowercase<string>,
            roleId: 'role-cinder',
            countryId: 'country-cinder',
        };

        const adminUser: IUser = {
            ...baseUser,
            id: 'admin-cinder',
            roleId: 'role-admin-cinder',
            role: {
                ...baseUser.role,
                id: 'role-admin-cinder',
                type: EnumRoleType.admin,
            },
        };

        const password: IAuthPassword = {
            passwordHash: 'hashed',
            passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
            passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
            passwordPeriodExpired: new Date('2026-04-01T00:00:00.000Z'),
        };
        const input: IUserCreateWithWorkspaceInput = {
            userId: 'user-cinder',
            email: 'cinder@example.com',
            name: null,
            username: 'cinder2wolfe',
            countryId: 'country-cinder',
            roleId: 'role-cinder',
            signUpFrom: EnumUserSignUpFrom.admin,
            signUpWith: EnumUserSignUpWith.credential,
            isVerified: false,
            acceptedTermPolicyTypes: [],
            password,
            passwordHistoryType: null,
            verification: null,
            workspaceContext: {
                type: EnumUserSignUpWorkspaceContextType.personal,
                workspaceId: 'workspace-cinder',
                slugCandidates: ['w-cinder'],
                name: "cinder2wolfe's Workspace",
            },
            createdBy: 'admin-cinder',
        };
        const stageInput = {
            action: EnumActivityLogAction.adminUserCreate,
            metadata: {},
        };
        const recipient: INotificationRecipient = {
            ...TestRecipient,
            userId: 'user-cinder',
        };
        const activityLog: IActivityLogStaged = {
            action: EnumActivityLogAction.adminUserCreate,
            metadata: {},
            userId: null,
            createdBy: null,
            workspaceId: null,
        };

        beforeEach(() => {
            onboardingDomain.createByAdmin.mockResolvedValue({
                inputs: [input],
                users: [baseUser],
                passwordString: 'random-password',
            });
            userOnboardingUtil.buildActivityStages.mockReturnValue([
                stageInput,
            ]);
            activityLogDomain.prepare.mockReturnValue(activityLog);
            notificationUtil.mapRecipient.mockReturnValue(recipient);
            helperDateService.formatToIso
                .mockReturnValueOnce('2026-01-01T00:00:00.000Z')
                .mockReturnValueOnce('2026-06-01T00:00:00.000Z');
        });

        it('delegates creation to OnboardingDomain, stages the rows, enqueues the welcome, and returns the id', async () => {
            const result = await service.createByAdmin(dto, adminUser);

            expect(result).toEqual({ data: { id: 'user-cinder' } });
            expect(onboardingDomain.createByAdmin).toHaveBeenCalledWith(
                {
                    username: dto.username,
                    email: dto.email,
                    name: null,
                    roleId: dto.roleId,
                    countryId: dto.countryId,
                },
                'admin-cinder',
                { roleId: 'role-admin-cinder', roleType: EnumRoleType.admin }
            );
            expect(userOnboardingUtil.buildActivityStages).toHaveBeenCalledWith(
                EnumUserCreateMode.admin,
                [input],
                [baseUser],
                EnumActivityLogAction.adminUserCreate
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith(stageInput);
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
            expect(notificationUtil.mapRecipient).toHaveBeenCalledWith(
                baseUser,
                EnumNotificationKind.welcomeByAdmin,
                [],
                []
            );
            expect(notificationQueue.sendWelcomeByAdmin).toHaveBeenCalledWith(
                recipient,
                {
                    password: 'random-password',
                    passwordCreatedAt: '2026-01-01T00:00:00.000Z',
                    passwordExpiredAt: '2026-06-01T00:00:00.000Z',
                },
                'admin-cinder'
            );
        });

        it('skips the welcome when no password was generated', async () => {
            onboardingDomain.createByAdmin.mockResolvedValue({
                inputs: [{ ...input, password: null }],
                users: [baseUser],
                passwordString: 'random-password',
            });

            await service.createByAdmin(dto, adminUser);

            expect(notificationQueue.sendWelcomeByAdmin).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });

        it('forwards the name when the dto carries one', async () => {
            await service.createByAdmin(
                { ...dto, name: 'Cinder Wolfe' },
                adminUser
            );

            expect(onboardingDomain.createByAdmin).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'Cinder Wolfe' }),
                'admin-cinder',
                { roleId: 'role-admin-cinder', roleType: EnumRoleType.admin }
            );
        });

        it('stages nothing and enqueues nothing when onboarding throws', async () => {
            const failure = new Error('create failed');
            onboardingDomain.createByAdmin.mockRejectedValue(failure);

            await expect(service.createByAdmin(dto, adminUser)).rejects.toBe(
                failure
            );
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
            expect(notificationQueue.sendWelcomeByAdmin).not.toHaveBeenCalled();
        });
    });

    describe('updateStatusByAdmin', () => {
        const activityLog: IActivityLogStaged = {
            action: EnumActivityLogAction.userUpdateStatus,
            metadata: {},
            userId: null,
            createdBy: null,
            workspaceId: null,
        };
        const revoked: ISessionRef[] = [{ id: 'session-one' }];
        const row = {
            ...baseUser,
            status: EnumUserStatus.inactive,
        };
        const admin: IUser = {
            ...baseUser,
            id: 'admin-cinder',
            role: { ...baseUser.role, type: EnumRoleType.admin },
        };

        beforeEach(() => {
            activityLogDomain.prepare.mockReturnValue(activityLog);
            userDomain.getOneWithRole.mockResolvedValue({
                ...baseUser,
                passwordAttempt: 3,
            });
            userUtil.mapActivityLogActorMetadata.mockReturnValue({
                targetUserId: 'user-cinder',
            });
            userUtil.mapActivityLogTargetMetadata.mockReturnValue({
                actorUserId: 'admin-cinder',
            });
            sessionUtil.mapActivityLogRevokeAllActorMetadata.mockReturnValue({
                targetUserId: 'user-cinder',
                sessionCount: 1,
            });
            sessionUtil.mapActivityLogRevokeAllTargetMetadata.mockReturnValue({
                actorUserId: 'admin-cinder',
                sessionCount: 1,
            });
        });

        it('gates the rank, writes, purges, and stages the revoke-all rows before the status rows', async () => {
            accountDomain.updateStatusByAdmin.mockResolvedValue({
                user: row,
                revoked,
            });
            const dto: UserUpdateStatusRequestDto = {
                status: EnumUserStatus.blocked,
            };

            await expect(
                service.updateStatusByAdmin('user-cinder', dto, admin)
            ).resolves.toEqual({});

            expect(userDomain.assertNotSelf).toHaveBeenCalledWith(
                'user-cinder',
                'admin-cinder'
            );
            expect(roleDomain.assertActorOutranks).toHaveBeenCalledWith(
                EnumRoleType.admin,
                EnumRoleType.user
            );
            expect(accountDomain.updateStatusByAdmin).toHaveBeenCalledWith(
                'user-cinder',
                EnumUserStatus.blocked,
                3,
                'admin-cinder'
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-cinder',
                revoked
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminSessionRevokeAll,
                metadata: { targetUserId: 'user-cinder', sessionCount: 1 },
            });
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRevokeAllSessionsByAdmin,
                userId: 'user-cinder',
                createdBy: 'admin-cinder',
                metadata: { actorUserId: 'admin-cinder', sessionCount: 1 },
            });
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminUserUpdateStatus,
                metadata: { targetUserId: 'user-cinder' },
            });
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userBlocked,
                userId: 'user-cinder',
                createdBy: 'admin-cinder',
                metadata: { actorUserId: 'admin-cinder' },
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledTimes(2);
            expect(activityLogDomain.stagePrepared).toHaveBeenNthCalledWith(1, [
                activityLog,
                activityLog,
            ]);
            expect(activityLogDomain.stagePrepared).toHaveBeenNthCalledWith(2, [
                activityLog,
                activityLog,
            ]);
        });

        it('records the plain status action for a status other than blocked', async () => {
            accountDomain.updateStatusByAdmin.mockResolvedValue({
                user: row,
                revoked,
            });

            await service.updateStatusByAdmin(
                'user-cinder',
                { status: EnumUserStatus.inactive },
                admin
            );

            expect(activityLogDomain.prepare).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: EnumActivityLogAction.userUpdateStatus,
                })
            );
        });

        it('purges an empty list and stages no revoke-all row when no session was open', async () => {
            accountDomain.updateStatusByAdmin.mockResolvedValue({
                user: row,
                revoked: [],
            });

            await service.updateStatusByAdmin(
                'user-cinder',
                { status: EnumUserStatus.inactive },
                admin
            );

            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-cinder',
                []
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledTimes(1);
        });

        it('purges and revokes nothing when the status keeps access', async () => {
            accountDomain.updateStatusByAdmin.mockResolvedValue({
                user: row,
                revoked: null,
            });

            await service.updateStatusByAdmin(
                'user-cinder',
                { status: EnumUserStatus.active },
                admin
            );

            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledTimes(1);
        });

        it('stops at the rank gate before the blocked gate', async () => {
            roleDomain.assertActorOutranks.mockImplementation(() => {
                throw new Error('rank');
            });

            await expect(
                service.updateStatusByAdmin(
                    'user-cinder',
                    { status: EnumUserStatus.blocked },
                    admin
                )
            ).rejects.toThrow('rank');
            expect(userDomain.assertUnblocked).not.toHaveBeenCalled();
            expect(accountDomain.updateStatusByAdmin).not.toHaveBeenCalled();
        });
    });

    describe('checkUsername', () => {
        it('wraps the check in a response envelope', async () => {
            const dto: UserCheckUsernameRequestDto = {
                username: 'cinder2wolfe' as Lowercase<string>,
            };
            userDomain.checkUsername.mockResolvedValue({
                badWord: false,
                exist: false,
                pattern: false,
            });

            await expect(service.checkUsername(dto)).resolves.toEqual({
                data: { badWord: false, exist: false, pattern: false },
            });
        });
    });

    describe('checkEmail', () => {
        it('wraps the check in a response envelope', async () => {
            const dto: UserCheckEmailRequestDto = {
                email: 'cinder@example.com' as Lowercase<string>,
            };
            userDomain.checkEmail.mockResolvedValue({
                badWord: false,
                exist: true,
            });

            await expect(service.checkEmail(dto)).resolves.toEqual({
                data: { badWord: false, exist: true },
            });
        });
    });

    describe('deleteSelf', () => {
        const activityLog: IActivityLogStaged = {
            action: EnumActivityLogAction.userDeleteSelf,
            metadata: {},
            userId: null,
            createdBy: null,
            workspaceId: null,
        };
        const revoked: ISessionRef[] = [{ id: 'session-one' }];
        const photo = {
            bucket: 'bucket',
            key: 'photo-profile/user-cinder/current.png',
            cdnUrl: null,
            completedUrl: 'https://cdn.example.com/current.png',
            mime: 'image/png',
            extension: 'png',
            access: 'public',
        } as const;

        beforeEach(() => {
            activityLogDomain.prepare.mockReturnValue(activityLog);
        });

        it('deletes, purges the revoked logins, and stages the revoke-all row before the delete row', async () => {
            accountDomain.deleteSelf.mockResolvedValue({
                user: { ...baseUser, photo: null },
                revoked,
            });

            await expect(service.deleteSelf('user-cinder')).resolves.toEqual(
                {}
            );

            expect(accountDomain.deleteSelf).toHaveBeenCalledWith(
                'user-cinder'
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-cinder',
                revoked
            );
            expect(userProfileDomain.deleteOwnedPhoto).toHaveBeenCalledWith(
                'user-cinder',
                null
            );
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.userRevokeAllSessions,
                userId: 'user-cinder',
                createdBy: 'user-cinder',
            });
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.userDeleteSelf,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
                activityLog,
            ]);
        });

        it('hands the stored photo to the profile domain', async () => {
            accountDomain.deleteSelf.mockResolvedValue({
                user: { ...baseUser, photo },
                revoked,
            });

            await service.deleteSelf('user-cinder');

            expect(userProfileDomain.deleteOwnedPhoto).toHaveBeenCalledWith(
                'user-cinder',
                photo
            );
        });
    });
});
