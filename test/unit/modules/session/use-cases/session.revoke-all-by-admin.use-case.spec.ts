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
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { SessionUtil } from '@modules/session/utils/session.util';
import { UserNotSelfException } from '@modules/user/exceptions/user.not-self.exception';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { SessionRevokeAllByAdminUseCase } from '@modules/session/use-cases/session.revoke-all-by-admin.use-case';

describe('SessionRevokeAllByAdminUseCase', () => {
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
    let useCase: SessionRevokeAllByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionRevokeAllByAdminUseCase,
                { provide: SessionService, useValue: sessionService },
                { provide: RoleService, useValue: roleService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: SessionQueue, useValue: sessionQueue },
                { provide: SessionUtil, useValue: sessionUtil },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        useCase = module.get(SessionRevokeAllByAdminUseCase);
    });

    describe('execute', () => {
        it('asserts not self before the rank gate', async () => {
            const notSelf = new UserNotSelfException();
            sessionService.assertNotSelf.mockImplementation(() => {
                throw notSelf;
            });

            const rejection = useCase.execute('admin-1', admin);

            await expect(rejection).rejects.toBe(notSelf);
            expect(roleService.getOneByUserId).not.toHaveBeenCalled();
            expect(sessionService.revokeAllByAdmin).not.toHaveBeenCalled();
        });

        it('rethrows the rank exception and revokes nothing when the actor does not outrank the target', async () => {
            roleService.getOneByUserId.mockResolvedValue(superAdminRole);
            const rankForbidden = new RoleRankForbiddenException();
            roleService.assertActorOutranks.mockImplementation(() => {
                throw rankForbidden;
            });

            const rejection = useCase.execute('root-1', admin);

            await expect(rejection).rejects.toBe(rankForbidden);
            expect(roleService.assertActorOutranks).toHaveBeenCalledWith(
                EnumRoleType.admin,
                EnumRoleType.superAdmin
            );
            expect(sessionService.revokeAllByAdmin).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
        });

        it('revokes, prepares the revoke-all rows from the count, purges and stages them', async () => {
            roleService.getOneByUserId.mockResolvedValue(userRole);
            helperDateService.create.mockReturnValue(revokedAt);
            const refs: ISessionRef[] = [
                { id: 'session-1' },
                { id: 'session-2' },
            ];
            sessionService.revokeAllByAdmin.mockResolvedValue(refs);
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
            activityLogService.prepare
                .mockReturnValueOnce(actorActivityLog)
                .mockReturnValueOnce(targetActivityLog);

            const result = await useCase.execute('user-1', admin);

            expect(result).toEqual({});
            expect(sessionService.assertNotSelf).toHaveBeenCalledWith(
                'user-1',
                'admin-1'
            );
            expect(roleService.assertActorOutranks).toHaveBeenCalledWith(
                EnumRoleType.admin,
                EnumRoleType.user
            );
            expect(sessionService.revokeAllByAdmin).toHaveBeenCalledWith(
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
            expect(activityLogService.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.adminSessionRevokeAll,
                metadata: actorMetadata,
            });
            expect(activityLogService.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.userRevokeAllSessionsByAdmin,
                userId: 'user-1',
                createdBy: 'admin-1',
                metadata: targetMetadata,
            });
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-1',
                refs
            );
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                actorActivityLog,
                targetActivityLog,
            ]);
        });

        it('purges and stages nothing when the domain throws', async () => {
            roleService.getOneByUserId.mockResolvedValue(userRole);
            helperDateService.create.mockReturnValue(revokedAt);
            const failure = new SessionNotFoundException();
            sessionService.revokeAllByAdmin.mockRejectedValue(failure);

            const rejection = useCase.execute('user-1', admin);

            await expect(rejection).rejects.toBe(failure);
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
