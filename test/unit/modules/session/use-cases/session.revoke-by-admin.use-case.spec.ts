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
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { SessionService } from '@modules/session/services/session.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { RoleService } from '@modules/role/services/role.service';
import { RoleRankForbiddenException } from '@modules/role/exceptions/role.rank-forbidden.exception';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { SessionNotFoundException } from '@modules/session/exceptions/session.not-found.exception';
import type { ISession } from '@modules/session/interfaces/session.interface';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { SessionUtil } from '@modules/session/utils/session.util';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { SessionRevokeByAdminUseCase } from '@modules/session/use-cases/session.revoke-by-admin.use-case';

describe('SessionRevokeByAdminUseCase', () => {
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const sessionQueue: MockProxy<SessionQueue> = mock<SessionQueue>();
    const sessionUtil: MockProxy<SessionUtil> = mock<SessionUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const revokedAt = new Date('2026-01-05T00:00:00.000Z');
    const userRole: IRole = {
        id: 'role-user',
        name: 'user',
        type: EnumRoleType.user,
        isImmutable: false,
    };
    const superAdminRole: IRole = {
        id: 'role-root',
        name: 'superadmin',
        type: EnumRoleType.superAdmin,
        isImmutable: false,
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
            isImmutable: false,
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
    let useCase: SessionRevokeByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionRevokeByAdminUseCase,
                { provide: SessionService, useValue: sessionService },
                { provide: RoleService, useValue: roleService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: SessionQueue, useValue: sessionQueue },
                { provide: SessionUtil, useValue: sessionUtil },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        useCase = module.get(SessionRevokeByAdminUseCase);
    });

    describe('execute', () => {
        it('checks rank, revokes, purges and stages the actor row alone when the admin revokes their own session', async () => {
            roleService.getOneByUserId.mockResolvedValue(superAdminRole);
            helperDateService.create.mockReturnValue(revokedAt);
            sessionService.revokeByAdmin.mockResolvedValue(session);
            const actorMetadata = { targetUserId: 'root-1' };
            sessionUtil.mapActivityLogActorMetadata.mockReturnValue(
                actorMetadata
            );
            const actorActivityLog = {
                ...selfActivityLog,
                action: EnumActivityLogAction.adminSessionRevoke,
                metadata: actorMetadata,
            };
            activityLogService.prepare.mockReturnValue(actorActivityLog);

            const result = await useCase.execute(
                'root-1',
                'session-1',
                superAdmin
            );

            expect(result).toEqual({});
            expect(roleService.getOneByUserId).toHaveBeenCalledWith('root-1');
            expect(roleService.assertActorOutranks).toHaveBeenCalledWith(
                EnumRoleType.superAdmin,
                EnumRoleType.superAdmin
            );
            expect(sessionService.revokeByAdmin).toHaveBeenCalledWith(
                'root-1',
                'session-1',
                'root-1',
                revokedAt
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith('root-1', [
                { id: 'session-1' },
            ]);
            expect(activityLogService.prepare).toHaveBeenCalledTimes(1);
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                actorActivityLog,
            ]);
        });

        it('stages the actor and target rows when the admin revokes another user session', async () => {
            roleService.getOneByUserId.mockResolvedValue(userRole);
            helperDateService.create.mockReturnValue(revokedAt);
            sessionService.revokeByAdmin.mockResolvedValue(session);
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
            activityLogService.prepare
                .mockReturnValueOnce(actorActivityLog)
                .mockReturnValueOnce(targetActivityLog);

            await useCase.execute('user-1', 'session-1', admin);

            expect(
                sessionUtil.mapActivityLogActorMetadata
            ).toHaveBeenCalledWith(session, revokedAt);
            expect(
                sessionUtil.mapActivityLogTargetMetadata
            ).toHaveBeenCalledWith(session, 'admin-1', revokedAt);
            expect(activityLogService.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.adminSessionRevoke,
                metadata: actorMetadata,
            });
            expect(activityLogService.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.userRevokeSessionByAdmin,
                userId: 'user-1',
                createdBy: 'admin-1',
                metadata: targetMetadata,
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                actorActivityLog,
                targetActivityLog,
            ]);
        });

        it('rethrows the rank exception and reads no session when the actor does not outrank the target', async () => {
            roleService.getOneByUserId.mockResolvedValue(superAdminRole);
            const rankForbidden = new RoleRankForbiddenException();
            roleService.assertActorOutranks.mockImplementation(() => {
                throw rankForbidden;
            });

            const rejection = useCase.execute('root-1', 'session-1', admin);

            await expect(rejection).rejects.toBe(rankForbidden);
            expect(sessionService.revokeByAdmin).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('purges and stages nothing when the domain throws', async () => {
            roleService.getOneByUserId.mockResolvedValue(userRole);
            helperDateService.create.mockReturnValue(revokedAt);
            const failure = new SessionNotFoundException();
            sessionService.revokeByAdmin.mockRejectedValue(failure);

            const rejection = useCase.execute('user-1', 'session-1', admin);

            await expect(rejection).rejects.toBe(failure);
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
