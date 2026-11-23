import {
    buildPolicyAbility,
    buildPolicyContext,
} from '@test/unit/helpers/test.unit.policy.helper';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import { EnumRolePlatformKey } from '@modules/role/enums/role.enum';
import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import { UserService } from '@modules/user/services/user.service';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { SessionService } from '@modules/session/services/session.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { RoleService } from '@modules/role/services/role.service';
import { SessionUtil } from '@modules/session/utils/session.util';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { UserUtil } from '@modules/user/utils/user.util';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserStatusInvalidException } from '@modules/user/exceptions/user.status-invalid.exception';
import type { UserUpdateStatusRequestDto } from '@modules/user/dtos/request/user.update-status.request.dto';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserUpdateStatusByAdminUseCase } from '@modules/user/use-cases/user.update-status-by-admin.use-case';
import {
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';
import type { IPolicyWhereInput } from '@modules/policy/interfaces/policy.interface';

describe('UserUpdateStatusByAdminUseCase', () => {
    const policyContext = buildPolicyContext(buildPolicyAbility([]));
    const policyAbilityService: MockProxy<PolicyAbilityService> =
        mock<PolicyAbilityService>();
    const scoped: IPolicyWhereInput<'User'> = { id: 'scoped-1' };
    const userService: MockProxy<UserService> = mock<UserService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const sessionUtil: MockProxy<SessionUtil> = mock<SessionUtil>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();

    let useCase: UserUpdateStatusByAdminUseCase;

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-05T00:00:00.000Z');
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
        passwordLockedUntil: null,
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
            scope: EnumRoleScope.platform,
            key: 'user',
            name: 'user',
            policyRevision: 0,
        },
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        policyAbilityService.scope.mockReturnValue(scoped);
        helperDateService.create.mockReturnValue(now);
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                {
                    provide: PolicyAbilityService,
                    useValue: policyAbilityService,
                },
                UserUpdateStatusByAdminUseCase,
                { provide: UserService, useValue: userService },
                { provide: SessionService, useValue: sessionService },
                { provide: OutboxService, useValue: outboxService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: RoleService, useValue: roleService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: SessionUtil, useValue: sessionUtil },
                { provide: UserUtil, useValue: userUtil },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();
        useCase = module.get(UserUpdateStatusByAdminUseCase);
    });

    describe('execute', () => {
        const revoked: ISessionRef[] = [{ id: 'session-one' }];

        const row = {
            ...baseUser,
            status: EnumUserStatus.inactive,
        };

        const admin: IUser = {
            ...baseUser,
            id: 'admin-cinder',
            role: { ...baseUser.role, key: EnumRolePlatformKey.admin },
        };
        const requestContext = buildRequestContext();
        const apiKeyContext = buildApiKeyContext();
        const userContext = buildUserContext(admin);
        const authContext = buildAuthJwtAccessContext(admin.id);

        beforeEach(() => {
            activityLogService.recordEffect.mockImplementation(
                (
                    _requestContext,
                    _apiKeyContext,
                    _authContext,
                    _workspaceContext,
                    input
                ) => buildActivityLogCreateManyEffect(input.action)
            );
            userService.getOneWithRole.mockResolvedValue({
                ...baseUser,
                passwordAttempt: 3,
                passwordLockedUntil: null,
            });
            userService.revokesSessionsOn.mockReturnValue(true);
            userService.resolveStatusActivityLogAction.mockReturnValue(
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

        it('gates the rank, writes the status and the revoke on one transaction and adds the revoke-all entries before the status entries on it', async () => {
            const calls: string[] = [];
            outboxService.withTransaction.mockImplementation(async fn => {
                calls.push('begin');
                const value = await fn(tx);
                calls.push('commit');

                return value as never;
            });
            userService.updateStatusByAdminInTx.mockImplementation(async () => {
                calls.push('updateStatus');

                return row;
            });
            sessionService.revokeActiveByUserInTx.mockImplementation(
                async () => {
                    calls.push('revokeSessions');

                    return revoked;
                }
            );
            userService.resolveStatusActivityLogAction.mockReturnValue(
                EnumActivityLogAction.userBlocked
            );
            const dto: UserUpdateStatusRequestDto = {
                status: EnumUserStatus.blocked,
            };

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    policyContext,
                    'user-cinder',
                    dto
                )
            ).resolves.toEqual({});

            expect(policyAbilityService.scope).toHaveBeenCalledWith(
                policyContext,
                EnumPolicyAction.update,
                EnumPolicySubject.User
            );
            expect(userService.getOneWithRole).toHaveBeenCalledWith(
                expect.any(String),
                scoped
            );
            expect(userService.assertNotSelf).toHaveBeenCalledWith(
                'user-cinder',
                'admin-cinder'
            );
            expect(roleService.assertActorOutranks).toHaveBeenCalledWith(
                EnumRolePlatformKey.admin,
                expect.objectContaining({
                    scope: EnumRoleScope.platform,
                    key: EnumRolePlatformKey.user,
                })
            );
            expect(userService.updateStatusByAdminInTx).toHaveBeenCalledWith(
                tx,
                { ...baseUser, passwordAttempt: 3 },
                EnumUserStatus.blocked
            );
            expect(sessionService.revokeActiveByUserInTx).toHaveBeenCalledWith(
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
            ]);
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminSessionRevokeAll,
                    metadata: { targetUserId: 'user-cinder', sessionCount: 1 },
                }
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.userRevokeAllSessionsByAdmin,
                    userId: 'user-cinder',
                    createdBy: 'admin-cinder',
                    metadata: { actorUserId: 'admin-cinder', sessionCount: 1 },
                }
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminUserUpdateStatus,
                    metadata: { targetUserId: 'user-cinder' },
                }
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.userBlocked,
                    userId: 'user-cinder',
                    createdBy: 'admin-cinder',
                    metadata: { actorUserId: 'admin-cinder' },
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                buildActivityLogCreateManyEffect(
                    EnumActivityLogAction.adminSessionRevokeAll
                ),
                buildActivityLogCreateManyEffect(
                    EnumActivityLogAction.userRevokeAllSessionsByAdmin
                ),
                buildActivityLogCreateManyEffect(
                    EnumActivityLogAction.adminUserUpdateStatus
                ),
                buildActivityLogCreateManyEffect(
                    EnumActivityLogAction.userBlocked
                ),
            ]);
        });

        it('reads the actor id from the context actorUserId', async () => {
            userService.updateStatusByAdminInTx.mockResolvedValue(row);
            sessionService.revokeActiveByUserInTx.mockResolvedValue(revoked);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                { ...authContext, userId: 'admin-other' },
                userContext,
                policyContext,
                'user-cinder',
                { status: EnumUserStatus.blocked }
            );

            expect(userService.assertNotSelf).toHaveBeenCalledWith(
                'user-cinder',
                'admin-other'
            );
            expect(sessionService.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-cinder',
                'admin-other',
                now
            );
        });

        it('records the plain status action for a status other than blocked', async () => {
            userService.updateStatusByAdminInTx.mockResolvedValue(row);
            sessionService.revokeActiveByUserInTx.mockResolvedValue(revoked);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                policyContext,
                'user-cinder',
                {
                    status: EnumUserStatus.inactive,
                }
            );

            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                expect.objectContaining({
                    action: EnumActivityLogAction.userUpdateStatus,
                })
            );
        });

        it('adds no revoke-all entry when no session was open', async () => {
            userService.updateStatusByAdminInTx.mockResolvedValue(row);
            sessionService.revokeActiveByUserInTx.mockResolvedValue([]);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                policyContext,
                'user-cinder',
                {
                    status: EnumUserStatus.inactive,
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                buildActivityLogCreateManyEffect(
                    EnumActivityLogAction.adminUserUpdateStatus
                ),
                buildActivityLogCreateManyEffect(
                    EnumActivityLogAction.userUpdateStatus
                ),
            ]);
        });

        it('revokes no session when the status becomes active', async () => {
            userService.revokesSessionsOn.mockReturnValue(false);
            userService.updateStatusByAdminInTx.mockResolvedValue(row);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                policyContext,
                'user-cinder',
                {
                    status: EnumUserStatus.active,
                }
            );

            expect(userService.revokesSessionsOn).toHaveBeenCalledWith(
                EnumUserStatus.active
            );
            expect(
                sessionService.revokeActiveByUserInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).toHaveBeenCalledTimes(1);
        });

        it('revokes sessions when the status becomes blocked and records userBlocked', async () => {
            userService.resolveStatusActivityLogAction.mockReturnValue(
                EnumActivityLogAction.userBlocked
            );
            userService.updateStatusByAdminInTx.mockResolvedValue(row);
            sessionService.revokeActiveByUserInTx.mockResolvedValue(revoked);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                policyContext,
                'user-cinder',
                {
                    status: EnumUserStatus.blocked,
                }
            );

            expect(userService.revokesSessionsOn).toHaveBeenCalledWith(
                EnumUserStatus.blocked
            );
            expect(
                userService.resolveStatusActivityLogAction
            ).toHaveBeenCalledWith(EnumUserStatus.blocked);
            expect(sessionService.revokeActiveByUserInTx).toHaveBeenCalledTimes(
                1
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                expect.objectContaining({
                    action: EnumActivityLogAction.userBlocked,
                })
            );
        });

        it('adds nothing and wraps the failure when the transaction fails', async () => {
            const cause = new Error('database exploded');
            outboxService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    policyContext,
                    'user-cinder',
                    {
                        status: EnumUserStatus.blocked,
                    }
                )
            ).rejects.toMatchObject({ rawError: cause });
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('rethrows the status exception of the guarded write unchanged', async () => {
            const failure = new UserStatusInvalidException();
            outboxService.withTransaction.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    policyContext,
                    'user-cinder',
                    {
                        status: EnumUserStatus.blocked,
                    }
                )
            ).rejects.toBe(failure);
            expect(databaseUtil.toException).not.toHaveBeenCalled();
        });

        it('answers UserStatusInvalidException when the guarded write conflicts', async () => {
            const conflict = new Error('write-conflict');
            outboxService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    policyContext,
                    'user-cinder',
                    {
                        status: EnumUserStatus.blocked,
                    }
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.statusInvalid,
                messagePath: 'user.error.statusInvalid',
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('stops at the rank gate before the blocked gate', async () => {
            roleService.assertActorOutranks.mockImplementation(() => {
                throw new Error('rank');
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    policyContext,
                    'user-cinder',
                    {
                        status: EnumUserStatus.blocked,
                    }
                )
            ).rejects.toThrow('rank');
            expect(userService.assertUnblocked).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });
    });
});
