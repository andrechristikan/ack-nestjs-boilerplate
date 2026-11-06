import { ConfigService } from '@nestjs/config';
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
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserProfileDomain } from '@modules/user/domains/user.profile.domain';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { SessionUtil } from '@modules/session/utils/session.util';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { UserUtil } from '@modules/user/utils/user.util';
import { UserAuthDomain } from '@modules/user/domains/user.auth.domain';
import { UserMobileNumberDomain } from '@modules/user/domains/user.mobile-number.domain';
import { UserPasswordDomain } from '@modules/user/domains/user.password.domain';
import { UserTwoFactorDomain } from '@modules/user/domains/user.two-factor.domain';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { WorkspaceJoinRequestDomain } from '@modules/workspace/domains/workspace.join-request.domain';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { WorkspaceOwnerTransferRequiredException } from '@modules/workspace/exceptions/workspace.owner-transfer-required.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserDeleteSelfForbiddenException } from '@modules/user/exceptions/user.delete-self-forbidden.exception';
import { UserPasswordAttemptMaxException } from '@modules/user/exceptions/user.password-attempt-max.exception';
import { UserPasswordExpiredException } from '@modules/user/exceptions/user.password-expired.exception';
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';
import { UserStatusInvalidException } from '@modules/user/exceptions/user.status-invalid.exception';
import { UserHttpService } from '@modules/user/services/http/user.http.service';
import type { UserCheckEmailRequestDto } from '@modules/user/dtos/request/user.check-email.request.dto';
import type { UserCheckUsernameRequestDto } from '@modules/user/dtos/request/user.check-username.request.dto';
import type { UserListRequestDto } from '@modules/user/dtos/request/user.list.request.dto';
import type { UserUpdateStatusRequestDto } from '@modules/user/dtos/request/user.update-status.request.dto';
import type { UserDeleteSelfRequestDto } from '@modules/user/dtos/request/user.delete-self.request.dto';
import type { IUser, IUserList } from '@modules/user/interfaces/user.interface';
import {
    UserDefaultAvailableOrderBy,
    UserDefaultAvailableSearch,
} from '@modules/user/constants/user.list.constant';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('UserHttpService', () => {
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const paginationFilterUtil: MockProxy<PaginationFilterUtil> =
        mock<PaginationFilterUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const sessionDomain: MockProxy<SessionDomain> = mock<SessionDomain>();
    const deviceDomain: MockProxy<DeviceDomain> = mock<DeviceDomain>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-05T00:00:00.000Z');
    const roleDomain: MockProxy<RoleDomain> = mock<RoleDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const sessionQueue: MockProxy<SessionQueue> = mock<SessionQueue>();
    const sessionUtil: MockProxy<SessionUtil> = mock<SessionUtil>();
    const userProfileDomain: MockProxy<UserProfileDomain> =
        mock<UserProfileDomain>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const userAuthDomain: MockProxy<UserAuthDomain> = mock<UserAuthDomain>();
    const userPasswordDomain: MockProxy<UserPasswordDomain> =
        mock<UserPasswordDomain>();
    const userTwoFactorDomain: MockProxy<UserTwoFactorDomain> =
        mock<UserTwoFactorDomain>();
    const userMobileNumberDomain: MockProxy<UserMobileNumberDomain> =
        mock<UserMobileNumberDomain>();
    const workspaceDomain: MockProxy<WorkspaceDomain> = mock<WorkspaceDomain>();
    const workspaceMemberDomain: MockProxy<WorkspaceMemberDomain> =
        mock<WorkspaceMemberDomain>();
    const workspaceInviteDomain: MockProxy<WorkspaceInviteDomain> =
        mock<WorkspaceInviteDomain>();
    const workspaceJoinRequestDomain: MockProxy<WorkspaceJoinRequestDomain> =
        mock<WorkspaceJoinRequestDomain>();
    const projectDomain: MockProxy<ProjectDomain> = mock<ProjectDomain>();
    const projectMemberDomain: MockProxy<ProjectMemberDomain> =
        mock<ProjectMemberDomain>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const configValues: Record<string, unknown> = {
        'user.deleteSelf.timeoutInMs': 30000,
    };

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
            isImmutable: false,
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
        helperDateService.create.mockReturnValue(now);
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserHttpService,
                { provide: UserDomain, useValue: userDomain },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                {
                    provide: PaginationFilterUtil,
                    useValue: paginationFilterUtil,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
                { provide: SessionDomain, useValue: sessionDomain },
                { provide: DeviceDomain, useValue: deviceDomain },
                { provide: DatabaseService, useValue: databaseService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: RoleDomain, useValue: roleDomain },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: SessionQueue, useValue: sessionQueue },
                { provide: SessionUtil, useValue: sessionUtil },
                { provide: UserProfileDomain, useValue: userProfileDomain },
                { provide: UserUtil, useValue: userUtil },
                { provide: UserAuthDomain, useValue: userAuthDomain },
                { provide: UserPasswordDomain, useValue: userPasswordDomain },
                {
                    provide: UserTwoFactorDomain,
                    useValue: userTwoFactorDomain,
                },
                {
                    provide: UserMobileNumberDomain,
                    useValue: userMobileNumberDomain,
                },
                { provide: WorkspaceDomain, useValue: workspaceDomain },
                {
                    provide: WorkspaceMemberDomain,
                    useValue: workspaceMemberDomain,
                },
                {
                    provide: WorkspaceInviteDomain,
                    useValue: workspaceInviteDomain,
                },
                {
                    provide: WorkspaceJoinRequestDomain,
                    useValue: workspaceJoinRequestDomain,
                },
                { provide: ProjectDomain, useValue: projectDomain },
                {
                    provide: ProjectMemberDomain,
                    useValue: projectMemberDomain,
                },
                { provide: DatabaseUtil, useValue: databaseUtil },
                {
                    provide: ConfigService,
                    useValue: buildConfigService(configValues),
                },
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
            paginationFilterUtil.inEnum.mockReturnValue({
                where: { status: { in: [EnumUserStatus.active] } },
                storeFilter: { status: [EnumUserStatus.active] },
            });
            paginationFilterUtil.equalString
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
            paginationFilterUtil.inEnum.mockReturnValue(null);
            paginationFilterUtil.equalString.mockReturnValue(null);
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
            userUtil.revokesSessionsOn.mockReturnValue(true);
            userUtil.resolveStatusActivityLogAction.mockReturnValue(
                EnumActivityLogAction.userUpdateStatus
            );
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

        it('gates the rank, writes the status and the revoke on one transaction, purges after commit, and stages the revoke-all rows before the status rows', async () => {
            const calls: string[] = [];
            databaseService.withTransaction.mockImplementation(async fn => {
                calls.push('begin');
                const value = await fn(tx);
                calls.push('commit');

                return value as never;
            });
            userDomain.updateStatusByAdminInTx.mockImplementation(async () => {
                calls.push('updateStatus');

                return row;
            });
            sessionDomain.revokeActiveByUserInTx.mockImplementation(
                async () => {
                    calls.push('revokeSessions');

                    return revoked;
                }
            );
            sessionQueue.purgeLogins.mockImplementation(async () => {
                calls.push('purge');
            });
            userUtil.resolveStatusActivityLogAction.mockReturnValue(
                EnumActivityLogAction.userBlocked
            );
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
            expect(userDomain.updateStatusByAdminInTx).toHaveBeenCalledWith(
                tx,
                { ...baseUser, passwordAttempt: 3 },
                EnumUserStatus.blocked
            );
            expect(sessionDomain.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-cinder',
                'admin-cinder',
                now
            );
            expect(calls).toEqual([
                'begin',
                'updateStatus',
                'revokeSessions',
                'commit',
                'purge',
            ]);
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
            userDomain.updateStatusByAdminInTx.mockResolvedValue(row);
            sessionDomain.revokeActiveByUserInTx.mockResolvedValue(revoked);

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
            userDomain.updateStatusByAdminInTx.mockResolvedValue(row);
            sessionDomain.revokeActiveByUserInTx.mockResolvedValue([]);

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

        it('updateStatusByAdmin to active revokes no session', async () => {
            userUtil.revokesSessionsOn.mockReturnValue(false);
            userDomain.updateStatusByAdminInTx.mockResolvedValue(row);

            await service.updateStatusByAdmin(
                'user-cinder',
                { status: EnumUserStatus.active },
                admin
            );

            expect(userUtil.revokesSessionsOn).toHaveBeenCalledWith(
                EnumUserStatus.active
            );
            expect(sessionDomain.revokeActiveByUserInTx).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledTimes(1);
        });

        it('updateStatusByAdmin to blocked revokes sessions and stages userBlocked', async () => {
            userUtil.resolveStatusActivityLogAction.mockReturnValue(
                EnumActivityLogAction.userBlocked
            );
            userDomain.updateStatusByAdminInTx.mockResolvedValue(row);
            sessionDomain.revokeActiveByUserInTx.mockResolvedValue(revoked);

            await service.updateStatusByAdmin(
                'user-cinder',
                { status: EnumUserStatus.blocked },
                admin
            );

            expect(userUtil.revokesSessionsOn).toHaveBeenCalledWith(
                EnumUserStatus.blocked
            );
            expect(
                userUtil.resolveStatusActivityLogAction
            ).toHaveBeenCalledWith(EnumUserStatus.blocked);
            expect(sessionDomain.revokeActiveByUserInTx).toHaveBeenCalledTimes(
                1
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-cinder',
                revoked
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: EnumActivityLogAction.userBlocked,
                })
            );
        });

        it('purges and stages nothing and wraps the failure when the transaction fails', async () => {
            const cause = new Error('database exploded');
            databaseService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                service.updateStatusByAdmin(
                    'user-cinder',
                    { status: EnumUserStatus.blocked },
                    admin
                )
            ).rejects.toMatchObject({ rawError: cause });
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('rethrows the status exception of the guarded write unchanged', async () => {
            const failure = new UserStatusInvalidException();
            databaseService.withTransaction.mockRejectedValue(failure);

            await expect(
                service.updateStatusByAdmin(
                    'user-cinder',
                    { status: EnumUserStatus.blocked },
                    admin
                )
            ).rejects.toBe(failure);
            expect(databaseUtil.toException).not.toHaveBeenCalled();
        });

        it('answers UserStatusInvalidException when the guarded write conflicts', async () => {
            const conflict = new Error('write-conflict');
            databaseService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.updateStatusByAdmin(
                    'user-cinder',
                    { status: EnumUserStatus.blocked },
                    admin
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.statusInvalid,
                messagePath: 'user.error.statusInvalid',
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
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
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
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
        const dto: UserDeleteSelfRequestDto = { password: 'plain-password' };
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
        const counted = {
            user: baseUser,
            hashedPassword: 'hashed-password',
            isAttemptCounted: true,
        };

        beforeEach(() => {
            activityLogDomain.prepare.mockReturnValue(activityLog);
            userPasswordDomain.countPasswordAttempt.mockResolvedValue(counted);
            workspaceDomain.softDeleteOwnedByUserInTx.mockResolvedValue([]);
            userDomain.deleteSelfInTx.mockResolvedValue({
                ...baseUser,
                photo: null,
            });
            sessionDomain.revokeActiveByUserInTx.mockResolvedValue(revoked);
        });

        it('throws UserDeleteSelfForbiddenException for a superAdmin before the password check', async () => {
            const superAdmin: IUser = {
                ...baseUser,
                role: { ...baseUser.role, type: EnumRoleType.superAdmin },
            };
            const failure = new UserDeleteSelfForbiddenException();
            userDomain.assertSelfDeletable.mockImplementation(() => {
                throw failure;
            });

            await expect(service.deleteSelf(superAdmin, dto)).rejects.toBe(
                failure
            );

            expect(userDomain.assertSelfDeletable).toHaveBeenCalledWith(
                superAdmin
            );
            expect(activityLogDomain.prepare).not.toHaveBeenCalled();
            expect(
                userPasswordDomain.countPasswordAttempt
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('verifies the password, cascades the owned workspaces and every membership on one transaction, purges after commit, and stages the revoke-all row before the delete row', async () => {
            const calls: string[] = [];
            databaseService.withTransaction.mockImplementation(async fn => {
                calls.push('begin');
                const value = await fn(tx);
                calls.push('commit');

                return value as never;
            });
            userPasswordDomain.countPasswordAttempt.mockImplementation(
                async () => {
                    calls.push('countAttempt');

                    return counted;
                }
            );
            userAuthDomain.assertPasswordAttempt.mockImplementation(
                async () => {
                    calls.push('verifyPassword');
                }
            );
            workspaceDomain.assertOwnedHasNoOtherMembersInTx.mockImplementation(
                async () => {
                    calls.push('assertNoOtherMembers');
                }
            );
            workspaceDomain.softDeleteOwnedByUserInTx.mockImplementationOnce(
                async () => {
                    calls.push('softDeleteWorkspaces');

                    return ['workspace-one', 'workspace-two'];
                }
            );
            projectDomain.softDeleteByWorkspaceInTx.mockImplementation(
                async (_tx, workspaceId) => {
                    calls.push(`projects:${workspaceId}`);
                }
            );
            workspaceInviteDomain.revokePendingByWorkspaceInTx.mockImplementation(
                async (_tx, workspaceId) => {
                    calls.push(`invites:${workspaceId}`);
                }
            );
            workspaceJoinRequestDomain.cancelPendingByWorkspaceInTx.mockImplementation(
                async (_tx, workspaceId) => {
                    calls.push(`joinRequests:${workspaceId}`);
                }
            );
            workspaceJoinRequestDomain.cancelPendingByRequesterInTx.mockImplementation(
                async () => {
                    calls.push('cancelOwnJoinRequests');
                }
            );
            workspaceInviteDomain.revokeAllPendingByEmailInTx.mockImplementation(
                async () => {
                    calls.push('revokeOwnInvites');
                }
            );
            workspaceMemberDomain.removeByUserInTx.mockImplementation(
                async () => {
                    calls.push('removeMemberships');

                    return 2;
                }
            );
            projectMemberDomain.removeByUserInTx.mockImplementation(
                async () => {
                    calls.push('removeProjectMemberships');

                    return 1;
                }
            );
            userMobileNumberDomain.removeByUserInTx.mockImplementation(
                async () => {
                    calls.push('removeMobileNumbers');
                }
            );
            userTwoFactorDomain.removeInTx.mockImplementation(async () => {
                calls.push('removeTwoFactor');
            });
            sessionDomain.revokeActiveByUserInTx.mockImplementation(
                async () => {
                    calls.push('revokeSessions');

                    return revoked;
                }
            );
            deviceDomain.revokeAllByUserInTx.mockImplementation(async () => {
                calls.push('revokeDevices');
            });
            userDomain.deleteSelfInTx.mockImplementation(async () => {
                calls.push('deleteUser');

                return { ...baseUser, photo: null };
            });
            sessionQueue.purgeLogins.mockImplementation(async () => {
                calls.push('purge');
            });

            await expect(service.deleteSelf(baseUser, dto)).resolves.toEqual(
                {}
            );

            expect(userAuthDomain.assertPasswordAttempt).toHaveBeenCalledWith(
                counted,
                'plain-password'
            );
            expect(
                workspaceDomain.softDeleteOwnedByUserInTx
            ).toHaveBeenCalledWith(tx, 'user-cinder', now);
            expect(
                projectDomain.softDeleteByWorkspaceInTx
            ).toHaveBeenCalledWith(tx, 'workspace-one', now, 'user-cinder');
            expect(
                projectDomain.softDeleteByWorkspaceInTx
            ).toHaveBeenCalledWith(tx, 'workspace-two', now, 'user-cinder');
            expect(workspaceMemberDomain.removeByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-cinder'
            );
            expect(projectMemberDomain.removeByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-cinder'
            );
            expect(
                userMobileNumberDomain.removeByUserInTx
            ).toHaveBeenCalledWith(tx, 'user-cinder');
            expect(userTwoFactorDomain.removeInTx).toHaveBeenCalledWith(
                tx,
                'user-cinder'
            );
            expect(sessionDomain.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-cinder',
                'user-cinder',
                now
            );
            expect(deviceDomain.revokeAllByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-cinder',
                'user-cinder',
                now
            );
            expect(
                workspaceInviteDomain.revokeAllPendingByEmailInTx
            ).toHaveBeenCalledWith(tx, 'cinder@example.com');
            expect(userDomain.deleteSelfInTx).toHaveBeenCalledWith(
                tx,
                baseUser,
                now
            );
            expect(calls).toEqual([
                'countAttempt',
                'verifyPassword',
                'begin',
                'assertNoOtherMembers',
                'softDeleteWorkspaces',
                'projects:workspace-one',
                'invites:workspace-one',
                'joinRequests:workspace-one',
                'projects:workspace-two',
                'invites:workspace-two',
                'joinRequests:workspace-two',
                'cancelOwnJoinRequests',
                'revokeOwnInvites',
                'removeMemberships',
                'removeProjectMemberships',
                'removeMobileNumbers',
                'removeTwoFactor',
                'revokeSessions',
                'revokeDevices',
                'deleteUser',
                'commit',
                'purge',
            ]);
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
                activityLog,
                activityLog,
            ]);
        });

        it('throws WorkspaceOwnerTransferRequiredException and writes nothing when an owned workspace has another member', async () => {
            const failure = new WorkspaceOwnerTransferRequiredException();
            workspaceDomain.assertOwnedHasNoOtherMembersInTx.mockRejectedValue(
                failure
            );

            await expect(service.deleteSelf(baseUser, dto)).rejects.toBe(
                failure
            );

            expect(
                workspaceDomain.softDeleteOwnedByUserInTx
            ).not.toHaveBeenCalled();
            expect(userDomain.deleteSelfInTx).not.toHaveBeenCalled();
            expect(databaseUtil.toException).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('cascades a workspace with no other member', async () => {
            workspaceDomain.softDeleteOwnedByUserInTx.mockResolvedValue([
                'workspace-one',
            ]);

            await expect(service.deleteSelf(baseUser, dto)).resolves.toEqual(
                {}
            );

            expect(
                workspaceDomain.assertOwnedHasNoOtherMembersInTx
            ).toHaveBeenCalledWith(tx, 'user-cinder');
            expect(
                projectDomain.softDeleteByWorkspaceInTx
            ).toHaveBeenCalledWith(tx, 'workspace-one', now, 'user-cinder');
            expect(
                workspaceInviteDomain.revokePendingByWorkspaceInTx
            ).toHaveBeenCalledWith(tx, 'workspace-one');
            expect(
                workspaceJoinRequestDomain.cancelPendingByWorkspaceInTx
            ).toHaveBeenCalledWith(tx, 'workspace-one');
        });

        it("cancels the user's own pending join requests on the same tx", async () => {
            await service.deleteSelf(baseUser, dto);

            expect(
                workspaceJoinRequestDomain.cancelPendingByRequesterInTx
            ).toHaveBeenCalledWith(tx, 'user-cinder');
        });

        it("revokes the pending invites to the user's email on the same tx before the soft delete", async () => {
            await service.deleteSelf(baseUser, dto);

            expect(
                workspaceInviteDomain.revokeAllPendingByEmailInTx
            ).toHaveBeenCalledWith(tx, 'cinder@example.com');
            expect(
                workspaceInviteDomain.revokeAllPendingByEmailInTx
            ).toHaveBeenCalledBefore(userDomain.deleteSelfInTx);
        });

        it('opens the transaction with user.deleteSelf.timeoutInMs', async () => {
            await service.deleteSelf(baseUser, dto);

            expect(databaseService.withTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 30000 }
            );
        });

        it('answers UserNotFoundException on a write conflict', async () => {
            const conflict = new Error('write-conflict');
            databaseService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.deleteSelf(baseUser, dto)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                messagePath: 'user.error.notFound',
            });

            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('stages one workspaceDeleted row per deleted workspace after the purge', async () => {
            const calls: string[] = [];
            workspaceDomain.softDeleteOwnedByUserInTx.mockResolvedValueOnce([
                'workspace-one',
                'workspace-two',
            ]);
            sessionQueue.purgeLogins.mockImplementation(async () => {
                calls.push('purge');
            });
            activityLogDomain.prepare.mockImplementation(input => {
                calls.push(`prepare:${input.action}`);

                return activityLog;
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                calls.push('stage');
            });

            await service.deleteSelf(baseUser, dto);

            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceDeleted,
                userId: 'user-cinder',
                createdBy: 'user-cinder',
                workspaceId: 'workspace-one',
            });
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceDeleted,
                userId: 'user-cinder',
                createdBy: 'user-cinder',
                workspaceId: 'workspace-two',
            });
            expect(calls).toEqual([
                `prepare:${EnumActivityLogAction.userRevokeAllSessions}`,
                `prepare:${EnumActivityLogAction.userDeleteSelf}`,
                'purge',
                `prepare:${EnumActivityLogAction.workspaceDeleted}`,
                `prepare:${EnumActivityLogAction.workspaceDeleted}`,
                'stage',
            ]);
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledTimes(1);
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
                activityLog,
                activityLog,
                activityLog,
            ]);
        });

        it('cascades no workspace when the user owns none', async () => {
            await service.deleteSelf(baseUser, dto);

            expect(
                projectDomain.softDeleteByWorkspaceInTx
            ).not.toHaveBeenCalled();
            expect(
                workspaceInviteDomain.revokePendingByWorkspaceInTx
            ).not.toHaveBeenCalled();
            expect(
                workspaceJoinRequestDomain.cancelPendingByWorkspaceInTx
            ).not.toHaveBeenCalled();
            expect(
                workspaceMemberDomain.removeByUserInTx
            ).toHaveBeenCalledTimes(1);
        });

        it('skips the password check for a passwordless account', async () => {
            const passwordless: IUser = { ...baseUser, password: null };
            userPasswordDomain.countPasswordAttempt.mockResolvedValue(null);

            await expect(service.deleteSelf(passwordless, {})).resolves.toEqual(
                {}
            );

            expect(
                userPasswordDomain.countPasswordAttempt
            ).toHaveBeenCalledWith(passwordless);
            expect(userAuthDomain.assertPasswordAttempt).not.toHaveBeenCalled();
            expect(userDomain.deleteSelfInTx).toHaveBeenCalledTimes(1);
        });

        it('counts an attempt and throws UserPasswordNotMatchException when the password is absent', async () => {
            userAuthDomain.assertPasswordAttempt.mockRejectedValue(
                new UserPasswordNotMatchException()
            );

            await expect(
                service.deleteSelf(baseUser, {})
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordNotMatch,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordNotMatch
                    ],
                messagePath: 'user.error.passwordNotMatch',
            });

            expect(
                userPasswordDomain.countPasswordAttempt
            ).toHaveBeenCalledWith(baseUser);
            expect(userAuthDomain.assertPasswordAttempt).toHaveBeenCalledWith(
                counted,
                null
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('rejects an expired password after a match', async () => {
            const failure = new UserPasswordExpiredException();
            userAuthDomain.assertPasswordAttempt.mockRejectedValue(failure);

            await expect(service.deleteSelf(baseUser, dto)).rejects.toBe(
                failure
            );

            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(userDomain.deleteSelfInTx).not.toHaveBeenCalled();
        });

        it('deletes nothing and stages nothing when the password does not match', async () => {
            const failure = new UserPasswordNotMatchException();
            userAuthDomain.assertPasswordAttempt.mockRejectedValue(failure);

            await expect(service.deleteSelf(baseUser, dto)).rejects.toBe(
                failure
            );

            expect(userAuthDomain.assertPasswordAttempt).toHaveBeenCalledWith(
                counted,
                'plain-password'
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('stages both lockout rows after the spent attempt is counted and before the attempt limit is answered, deleting nothing', async () => {
            const calls: string[] = [];
            const failure = new UserPasswordAttemptMaxException();
            userPasswordDomain.countPasswordAttempt.mockImplementation(
                async () => {
                    calls.push('countAttempt');

                    return { ...counted, isAttemptCounted: false };
                }
            );
            userUtil.buildPasswordLockoutStages.mockReturnValue([
                {
                    action: EnumActivityLogAction.userRevokeAllSessions,
                    userId: 'user-cinder',
                    createdBy: 'user-cinder',
                },
                {
                    action: EnumActivityLogAction.userReachMaxPasswordAttempt,
                    userId: 'user-cinder',
                    createdBy: 'user-cinder',
                },
            ]);
            userAuthDomain.assertPasswordAttempt.mockImplementation(
                async () => {
                    calls.push('assert');

                    throw failure;
                }
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                calls.push('stage');
            });

            await expect(service.deleteSelf(baseUser, dto)).rejects.toBe(
                failure
            );

            expect(userUtil.buildPasswordLockoutStages).toHaveBeenCalledWith(
                'user-cinder'
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRevokeAllSessions,
                userId: 'user-cinder',
                createdBy: 'user-cinder',
            });
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userReachMaxPasswordAttempt,
                userId: 'user-cinder',
                createdBy: 'user-cinder',
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledTimes(1);
            expect(calls).toEqual(['countAttempt', 'stage', 'assert']);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(userAuthDomain.assertPasswordAttempt).toHaveBeenCalledWith(
                { ...counted, isAttemptCounted: false },
                'plain-password'
            );
            expect(userDomain.deleteSelfInTx).not.toHaveBeenCalled();
            expect(
                workspaceDomain.softDeleteOwnedByUserInTx
            ).not.toHaveBeenCalled();
        });

        it('hands the stored photo to the profile domain', async () => {
            userDomain.deleteSelfInTx.mockResolvedValue({
                ...baseUser,
                photo,
            });

            await service.deleteSelf(baseUser, dto);

            expect(userProfileDomain.deleteOwnedPhoto).toHaveBeenCalledWith(
                'user-cinder',
                photo
            );
        });

        it('wraps an unknown error in AppUnknownException', async () => {
            const cause = new Error('database exploded');
            databaseService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                service.deleteSelf(baseUser, dto)
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(userProfileDomain.deleteOwnedPhoto).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
