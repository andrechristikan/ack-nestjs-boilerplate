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
    Prisma,
} from '@generated/prisma-client/client';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IPaginationQueryFilterResult } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    SessionCursorAvailableOrderBy,
    SessionDefaultAvailableOrderBy,
} from '@modules/session/constants/session.list.constant';
import type { SessionAdminListRequestDto } from '@modules/session/dtos/request/session.admin-list.request.dto';
import type { SessionSharedListRequestDto } from '@modules/session/dtos/request/session.shared-list.request.dto';
import type { ISessionList } from '@modules/session/interfaces/session.interface';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { RoleRankForbiddenException } from '@modules/role/exceptions/role.rank-forbidden.exception';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { SessionNotFoundException } from '@modules/session/exceptions/session.not-found.exception';
import type {
    ISession,
    ISessionRef,
} from '@modules/session/interfaces/session.interface';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { SessionUtil } from '@modules/session/utils/session.util';
import { UserNotSelfException } from '@modules/user/exceptions/user.not-self.exception';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { SessionHttpService } from '@modules/session/services/http/session.http.service';

describe('SessionHttpService', () => {
    const sessionDomain: MockProxy<SessionDomain> = mock<SessionDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const roleDomain: MockProxy<RoleDomain> = mock<RoleDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const sessionQueue: MockProxy<SessionQueue> = mock<SessionQueue>();
    const sessionUtil: MockProxy<SessionUtil> = mock<SessionUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    const revokedAt = new Date('2026-01-05T00:00:00.000Z');
    const userRole: IRole = {
        id: 'role-user',
        name: 'user',
        type: EnumRoleType.user,
    };
    const superAdminRole: IRole = {
        id: 'role-root',
        name: 'superadmin',
        type: EnumRoleType.superAdmin,
    };
    const selfActivityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.userRevokeSession,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };
    const session: ISession = {
        id: 'session-1',
        userId: 'user-1',
        deviceOwnershipId: 'device-ownership-1',
        jti: 'jti-value',
        ipAddress: '127.0.0.1',
        userAgent: {
            ua: null,
            browser: null,
            cpu: null,
            device: null,
            engine: null,
            os: null,
        },
        geoLocation: null,
        expiredAt: new Date('2026-02-01T00:00:00.000Z'),
        revokedAt: null,
        isRevoked: false,
        revokedById: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        user: {
            id: 'user-1',
            name: 'Jane Doe',
            username: 'jane',
            photo: null,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            deletedAt: null,
            deletedBy: null,
        },
        revokedBy: null,
    };

    const admin: IUser = {
        id: 'admin-1',
        name: 'Admin One',
        username: 'admin.main',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'admin@example.com',
        roleId: 'role-admin',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-1',
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
            id: 'role-admin',
            name: 'admin',
            description: null,
            type: EnumRoleType.admin,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };

    const superAdmin: IUser = {
        ...admin,
        id: 'root-1',
        roleId: 'role-root',
        role: { ...admin.role, id: 'role-root', type: EnumRoleType.superAdmin },
    };

    let service: SessionHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionHttpService,
                { provide: SessionDomain, useValue: sessionDomain },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
                { provide: RoleDomain, useValue: roleDomain },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: SessionQueue, useValue: sessionQueue },
                { provide: SessionUtil, useValue: sessionUtil },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        service = module.get(SessionHttpService);
    });

    describe('getListOffsetByAdmin', () => {
        it('merges no revoked filter into the store when the query carries none', async () => {
            const query: SessionAdminListRequestDto = {};
            const params = { limit: 20, skip: 0, orderBy: [] };
            const storePatch = {
                page: 1,
                perPage: 20,
                availableSearch: [],
            };
            paginationQueryUtil.offset.mockReturnValue({ params, storePatch });
            paginationQueryUtil.equalBoolean.mockReturnValue(null);
            const paginationResult: IResponsePaginationReturn<ISessionList> = {
                type: EnumPaginationType.offset,
                count: 0,
                perPage: 20,
                hasNext: false,
                hasPrevious: false,
                page: 1,
                totalPage: 0,
                data: [],
            };
            sessionDomain.getListOffsetByAdmin.mockResolvedValue(
                paginationResult
            );

            const result = await service.getListOffsetByAdmin('user-1', query);

            expect(result).toEqual({
                data: [],
                type: EnumPaginationType.offset,
                count: 0,
                perPage: 20,
                hasNext: false,
                hasPrevious: false,
                page: 1,
                totalPage: 0,
            });
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(query, {
                availableOrderBy: SessionDefaultAvailableOrderBy,
            });
            expect(paginationQueryUtil.equalBoolean).toHaveBeenCalledWith(
                Prisma.SessionScalarFieldEnum.isRevoked,
                undefined
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { ...storePatch, filters: {} }
            );
            expect(sessionDomain.getListOffsetByAdmin).toHaveBeenCalledWith(
                'user-1',
                params,
                undefined
            );
        });

        it('merges the revoked filter into the store when the query carries one', async () => {
            const query: SessionAdminListRequestDto = { isRevoked: true };
            const params = { limit: 20, skip: 0, orderBy: [] };
            const storePatch = { page: 1, perPage: 20 };
            paginationQueryUtil.offset.mockReturnValue({ params, storePatch });
            const isRevokedResult: IPaginationQueryFilterResult<{
                isRevoked: { equals: boolean };
            }> = {
                where: { isRevoked: { equals: true } },
                storeFilter: { isRevoked: true },
            };
            paginationQueryUtil.equalBoolean.mockReturnValue(isRevokedResult);
            sessionDomain.getListOffsetByAdmin.mockResolvedValue({
                type: EnumPaginationType.offset,
                count: 0,
                perPage: 20,
                hasNext: false,
                hasPrevious: false,
                page: 1,
                totalPage: 0,
                data: [],
            });

            await service.getListOffsetByAdmin('user-1', query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { ...storePatch, filters: { isRevoked: true } }
            );
            expect(sessionDomain.getListOffsetByAdmin).toHaveBeenCalledWith(
                'user-1',
                params,
                { isRevoked: { equals: true } }
            );
        });
    });

    describe('getListCursor', () => {
        it('delegates to the domain with the cursor pagination params', async () => {
            const query: SessionSharedListRequestDto = {};
            const params = {
                limit: 20,
                orderBy: [],
                firstPageAt: new Date('2026-01-01T00:00:00.000Z'),
            };
            const storePatch = { perPage: 20 };
            paginationQueryUtil.cursor.mockReturnValue({ params, storePatch });
            const paginationResult: IResponsePaginationReturn<ISessionList> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            sessionDomain.getListCursor.mockResolvedValue(paginationResult);

            const result = await service.getListCursor('user-1', query);

            expect(result).toEqual({
                data: [],
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
            });
            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                availableOrderBy: SessionCursorAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                storePatch
            );
            expect(sessionDomain.getListCursor).toHaveBeenCalledWith(
                'user-1',
                params
            );
        });
    });

    describe('revoke', () => {
        it('prepares the activity log, revokes, purges the login and stages the row', async () => {
            activityLogDomain.prepare.mockReturnValue(selfActivityLog);
            sessionDomain.revoke.mockResolvedValue();

            const result = await service.revoke('user-1', 'session-1');

            expect(result).toEqual({});
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRevokeSession,
            });
            expect(sessionDomain.revoke).toHaveBeenCalledWith(
                'user-1',
                'session-1'
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith('user-1', [
                { id: 'session-1' },
            ]);
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                selfActivityLog,
            ]);
        });

        it('purges and stages nothing when the domain throws', async () => {
            activityLogDomain.prepare.mockReturnValue(selfActivityLog);
            const failure = new SessionNotFoundException();
            sessionDomain.revoke.mockRejectedValue(failure);

            const rejection = service.revoke('user-1', 'session-1');

            await expect(rejection).rejects.toBe(failure);
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('revokeByAdmin', () => {
        it('checks rank, revokes, purges and stages the actor row alone when the admin revokes their own session', async () => {
            roleDomain.getOneByUserId.mockResolvedValue(superAdminRole);
            helperDateService.create.mockReturnValue(revokedAt);
            sessionDomain.revokeByAdmin.mockResolvedValue(session);
            const actorMetadata = { targetUserId: 'root-1' };
            sessionUtil.mapActivityLogActorMetadata.mockReturnValue(
                actorMetadata
            );
            const actorActivityLog = {
                ...selfActivityLog,
                action: EnumActivityLogAction.adminSessionRevoke,
                metadata: actorMetadata,
            };
            activityLogDomain.prepare.mockReturnValue(actorActivityLog);

            const result = await service.revokeByAdmin(
                'root-1',
                'session-1',
                superAdmin
            );

            expect(result).toEqual({});
            expect(roleDomain.getOneByUserId).toHaveBeenCalledWith('root-1');
            expect(roleDomain.assertActorOutranks).toHaveBeenCalledWith(
                EnumRoleType.superAdmin,
                EnumRoleType.superAdmin
            );
            expect(sessionDomain.revokeByAdmin).toHaveBeenCalledWith(
                'root-1',
                'session-1',
                'root-1',
                revokedAt
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith('root-1', [
                { id: 'session-1' },
            ]);
            expect(activityLogDomain.prepare).toHaveBeenCalledTimes(1);
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                actorActivityLog,
            ]);
        });

        it('stages the actor and target rows when the admin revokes another user session', async () => {
            roleDomain.getOneByUserId.mockResolvedValue(userRole);
            helperDateService.create.mockReturnValue(revokedAt);
            sessionDomain.revokeByAdmin.mockResolvedValue(session);
            const actorMetadata = { targetUserId: 'user-1' };
            const targetMetadata = { actorUserId: 'admin-1' };
            sessionUtil.mapActivityLogActorMetadata.mockReturnValue(
                actorMetadata
            );
            sessionUtil.mapActivityLogTargetMetadata.mockReturnValue(
                targetMetadata
            );
            const actorActivityLog = {
                ...selfActivityLog,
                action: EnumActivityLogAction.adminSessionRevoke,
            };
            const targetActivityLog = {
                ...selfActivityLog,
                action: EnumActivityLogAction.userRevokeSessionByAdmin,
            };
            activityLogDomain.prepare
                .mockReturnValueOnce(actorActivityLog)
                .mockReturnValueOnce(targetActivityLog);

            await service.revokeByAdmin('user-1', 'session-1', admin);

            expect(
                sessionUtil.mapActivityLogActorMetadata
            ).toHaveBeenCalledWith(session, revokedAt);
            expect(
                sessionUtil.mapActivityLogTargetMetadata
            ).toHaveBeenCalledWith(session, 'admin-1', revokedAt);
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.adminSessionRevoke,
                metadata: actorMetadata,
            });
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.userRevokeSessionByAdmin,
                userId: 'user-1',
                createdBy: 'admin-1',
                metadata: targetMetadata,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                actorActivityLog,
                targetActivityLog,
            ]);
        });

        it('rethrows the rank exception and reads no session when the actor does not outrank the target', async () => {
            roleDomain.getOneByUserId.mockResolvedValue(superAdminRole);
            const rankForbidden = new RoleRankForbiddenException();
            roleDomain.assertActorOutranks.mockImplementation(() => {
                throw rankForbidden;
            });

            const rejection = service.revokeByAdmin(
                'root-1',
                'session-1',
                admin
            );

            await expect(rejection).rejects.toBe(rankForbidden);
            expect(sessionDomain.revokeByAdmin).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('purges and stages nothing when the domain throws', async () => {
            roleDomain.getOneByUserId.mockResolvedValue(userRole);
            helperDateService.create.mockReturnValue(revokedAt);
            const failure = new SessionNotFoundException();
            sessionDomain.revokeByAdmin.mockRejectedValue(failure);

            const rejection = service.revokeByAdmin(
                'user-1',
                'session-1',
                admin
            );

            await expect(rejection).rejects.toBe(failure);
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('revokeAllByAdmin', () => {
        it('asserts not self before the rank gate', async () => {
            const notSelf = new UserNotSelfException();
            sessionDomain.assertNotSelf.mockImplementation(() => {
                throw notSelf;
            });

            const rejection = service.revokeAllByAdmin('admin-1', admin);

            await expect(rejection).rejects.toBe(notSelf);
            expect(roleDomain.getOneByUserId).not.toHaveBeenCalled();
            expect(sessionDomain.revokeAllByAdmin).not.toHaveBeenCalled();
        });

        it('rethrows the rank exception and revokes nothing when the actor does not outrank the target', async () => {
            roleDomain.getOneByUserId.mockResolvedValue(superAdminRole);
            const rankForbidden = new RoleRankForbiddenException();
            roleDomain.assertActorOutranks.mockImplementation(() => {
                throw rankForbidden;
            });

            const rejection = service.revokeAllByAdmin('root-1', admin);

            await expect(rejection).rejects.toBe(rankForbidden);
            expect(roleDomain.assertActorOutranks).toHaveBeenCalledWith(
                EnumRoleType.admin,
                EnumRoleType.superAdmin
            );
            expect(sessionDomain.revokeAllByAdmin).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
        });

        it('revokes, prepares the revoke-all rows from the count, purges and stages them', async () => {
            roleDomain.getOneByUserId.mockResolvedValue(userRole);
            helperDateService.create.mockReturnValue(revokedAt);
            const refs: ISessionRef[] = [
                { id: 'session-1' },
                { id: 'session-2' },
            ];
            sessionDomain.revokeAllByAdmin.mockResolvedValue(refs);
            const actorMetadata = { targetUserId: 'user-1', sessionCount: 2 };
            const targetMetadata = { actorUserId: 'admin-1', sessionCount: 2 };
            sessionUtil.mapActivityLogRevokeAllActorMetadata.mockReturnValue(
                actorMetadata
            );
            sessionUtil.mapActivityLogRevokeAllTargetMetadata.mockReturnValue(
                targetMetadata
            );
            const actorActivityLog = {
                ...selfActivityLog,
                action: EnumActivityLogAction.adminSessionRevokeAll,
            };
            const targetActivityLog = {
                ...selfActivityLog,
                action: EnumActivityLogAction.userRevokeAllSessionsByAdmin,
            };
            activityLogDomain.prepare
                .mockReturnValueOnce(actorActivityLog)
                .mockReturnValueOnce(targetActivityLog);

            const result = await service.revokeAllByAdmin('user-1', admin);

            expect(result).toEqual({});
            expect(sessionDomain.assertNotSelf).toHaveBeenCalledWith(
                'user-1',
                'admin-1'
            );
            expect(roleDomain.assertActorOutranks).toHaveBeenCalledWith(
                EnumRoleType.admin,
                EnumRoleType.user
            );
            expect(sessionDomain.revokeAllByAdmin).toHaveBeenCalledWith(
                'user-1',
                'admin-1',
                revokedAt
            );
            expect(
                sessionUtil.mapActivityLogRevokeAllActorMetadata
            ).toHaveBeenCalledWith('user-1', 2);
            expect(
                sessionUtil.mapActivityLogRevokeAllTargetMetadata
            ).toHaveBeenCalledWith('admin-1', 2);
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.adminSessionRevokeAll,
                metadata: actorMetadata,
            });
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.userRevokeAllSessionsByAdmin,
                userId: 'user-1',
                createdBy: 'admin-1',
                metadata: targetMetadata,
            });
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-1',
                refs
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                actorActivityLog,
                targetActivityLog,
            ]);
        });

        it('purges and stages nothing when the domain throws', async () => {
            roleDomain.getOneByUserId.mockResolvedValue(userRole);
            helperDateService.create.mockReturnValue(revokedAt);
            const failure = new SessionNotFoundException();
            sessionDomain.revokeAllByAdmin.mockRejectedValue(failure);

            const rejection = service.revokeAllByAdmin('user-1', admin);

            await expect(rejection).rejects.toBe(failure);
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
