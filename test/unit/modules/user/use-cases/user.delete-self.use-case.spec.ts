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
import { UserService } from '@modules/user/services/user.service';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { DeviceService } from '@modules/device/services/device.service';
import { SessionService } from '@modules/session/services/session.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { SessionQueue } from '@modules/session/queues/session.queue';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import { ProjectService } from '@modules/project/services/project.service';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceOwnerTransferRequiredException } from '@modules/workspace/exceptions/workspace.owner-transfer-required.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserDeleteSelfForbiddenException } from '@modules/user/exceptions/user.delete-self-forbidden.exception';
import { UserPasswordAttemptMaxException } from '@modules/user/exceptions/user.password-attempt-max.exception';
import { UserPasswordExpiredException } from '@modules/user/exceptions/user.password-expired.exception';
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';
import type { UserDeleteSelfRequestDto } from '@modules/user/dtos/request/user.delete-self.request.dto';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { UserDeleteSelfUseCase } from '@modules/user/use-cases/user.delete-self.use-case';

describe('UserDeleteSelfUseCase', () => {
    const userService: MockProxy<UserService> = mock<UserService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const sessionQueue: MockProxy<SessionQueue> = mock<SessionQueue>();
    const userProfileService: MockProxy<UserProfileService> =
        mock<UserProfileService>();
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const userPasswordService: MockProxy<UserPasswordService> =
        mock<UserPasswordService>();
    const userTwoFactorService: MockProxy<UserTwoFactorService> =
        mock<UserTwoFactorService>();
    const userMobileNumberService: MockProxy<UserMobileNumberService> =
        mock<UserMobileNumberService>();
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const workspaceInviteService: MockProxy<WorkspaceInviteService> =
        mock<WorkspaceInviteService>();
    const workspaceJoinRequestService: MockProxy<WorkspaceJoinRequestService> =
        mock<WorkspaceJoinRequestService>();
    const projectService: MockProxy<ProjectService> = mock<ProjectService>();
    const projectMemberService: MockProxy<ProjectMemberService> =
        mock<ProjectMemberService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();

    let useCase: UserDeleteSelfUseCase;

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-05T00:00:00.000Z');
    const configValues: Record<string, unknown> = {
        'user.deleteSelf.timeoutInMs': 30000,
    };
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
                UserDeleteSelfUseCase,
                { provide: UserService, useValue: userService },
                { provide: SessionService, useValue: sessionService },
                { provide: DeviceService, useValue: deviceService },
                { provide: DatabaseService, useValue: databaseService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: SessionQueue, useValue: sessionQueue },
                { provide: UserProfileService, useValue: userProfileService },
                { provide: UserAuthService, useValue: userAuthService },
                { provide: UserPasswordService, useValue: userPasswordService },
                {
                    provide: UserTwoFactorService,
                    useValue: userTwoFactorService,
                },
                {
                    provide: UserMobileNumberService,
                    useValue: userMobileNumberService,
                },
                { provide: WorkspaceService, useValue: workspaceService },
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
                {
                    provide: WorkspaceInviteService,
                    useValue: workspaceInviteService,
                },
                {
                    provide: WorkspaceJoinRequestService,
                    useValue: workspaceJoinRequestService,
                },
                { provide: ProjectService, useValue: projectService },
                {
                    provide: ProjectMemberService,
                    useValue: projectMemberService,
                },
                { provide: DatabaseUtil, useValue: databaseUtil },
                {
                    provide: ConfigService,
                    useValue: buildConfigService(configValues),
                },
            ],
        }).compile();
        useCase = module.get(UserDeleteSelfUseCase);
    });

    describe('execute', () => {
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
            lockoutStages: [],
        };

        beforeEach(() => {
            activityLogService.prepare.mockReturnValue(activityLog);
            userPasswordService.countPasswordAttempt.mockResolvedValue(counted);
            workspaceService.softDeleteOwnedByUserInTx.mockResolvedValue([]);
            userService.deleteSelfInTx.mockResolvedValue({
                ...baseUser,
                photo: null,
            });
            sessionService.revokeActiveByUserInTx.mockResolvedValue(revoked);
        });

        it('throws UserDeleteSelfForbiddenException for a superAdmin before the password check', async () => {
            const superAdmin: IUser = {
                ...baseUser,
                role: { ...baseUser.role, type: EnumRoleType.superAdmin },
            };
            const failure = new UserDeleteSelfForbiddenException();
            userService.assertSelfDeletable.mockImplementation(() => {
                throw failure;
            });

            await expect(useCase.execute(superAdmin, dto)).rejects.toBe(
                failure
            );

            expect(userService.assertSelfDeletable).toHaveBeenCalledWith(
                superAdmin
            );
            expect(activityLogService.prepare).not.toHaveBeenCalled();
            expect(
                userPasswordService.countPasswordAttempt
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
            userPasswordService.countPasswordAttempt.mockImplementation(
                async () => {
                    calls.push('countAttempt');

                    return counted;
                }
            );
            userAuthService.assertPasswordAttempt.mockImplementation(
                async () => {
                    calls.push('verifyPassword');
                }
            );
            workspaceService.assertOwnedHasNoOtherMembersInTx.mockImplementation(
                async () => {
                    calls.push('assertNoOtherMembers');
                }
            );
            workspaceService.softDeleteOwnedByUserInTx.mockImplementationOnce(
                async () => {
                    calls.push('softDeleteWorkspaces');

                    return ['workspace-one', 'workspace-two'];
                }
            );
            projectService.softDeleteByWorkspaceInTx.mockImplementation(
                async (_tx, workspaceId) => {
                    calls.push(`projects:${workspaceId}`);
                }
            );
            workspaceInviteService.revokePendingByWorkspaceInTx.mockImplementation(
                async (_tx, workspaceId) => {
                    calls.push(`invites:${workspaceId}`);
                }
            );
            workspaceJoinRequestService.cancelPendingByWorkspaceInTx.mockImplementation(
                async (_tx, workspaceId) => {
                    calls.push(`joinRequests:${workspaceId}`);
                }
            );
            workspaceJoinRequestService.cancelPendingByRequesterInTx.mockImplementation(
                async () => {
                    calls.push('cancelOwnJoinRequests');
                }
            );
            workspaceInviteService.revokeAllPendingByEmailInTx.mockImplementation(
                async () => {
                    calls.push('revokeOwnInvites');
                }
            );
            workspaceMemberService.removeByUserInTx.mockImplementation(
                async () => {
                    calls.push('removeMemberships');

                    return 2;
                }
            );
            projectMemberService.removeByUserInTx.mockImplementation(
                async () => {
                    calls.push('removeProjectMemberships');

                    return 1;
                }
            );
            userMobileNumberService.removeByUserInTx.mockImplementation(
                async () => {
                    calls.push('removeMobileNumbers');
                }
            );
            userTwoFactorService.removeInTx.mockImplementation(async () => {
                calls.push('removeTwoFactor');
            });
            sessionService.revokeActiveByUserInTx.mockImplementation(
                async () => {
                    calls.push('revokeSessions');

                    return revoked;
                }
            );
            deviceService.revokeAllByUserInTx.mockImplementation(async () => {
                calls.push('revokeDevices');
            });
            userService.deleteSelfInTx.mockImplementation(async () => {
                calls.push('deleteUser');

                return { ...baseUser, photo: null };
            });
            sessionQueue.purgeLogins.mockImplementation(async () => {
                calls.push('purge');
            });

            await expect(useCase.execute(baseUser, dto)).resolves.toEqual({});

            expect(userAuthService.assertPasswordAttempt).toHaveBeenCalledWith(
                counted,
                'plain-password'
            );
            expect(
                workspaceService.softDeleteOwnedByUserInTx
            ).toHaveBeenCalledWith(tx, 'user-cinder', now);
            expect(
                projectService.softDeleteByWorkspaceInTx
            ).toHaveBeenCalledWith(tx, 'workspace-one', now, 'user-cinder');
            expect(
                projectService.softDeleteByWorkspaceInTx
            ).toHaveBeenCalledWith(tx, 'workspace-two', now, 'user-cinder');
            expect(
                workspaceMemberService.removeByUserInTx
            ).toHaveBeenCalledWith(tx, 'user-cinder');
            expect(projectMemberService.removeByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-cinder'
            );
            expect(
                userMobileNumberService.removeByUserInTx
            ).toHaveBeenCalledWith(tx, 'user-cinder');
            expect(userTwoFactorService.removeInTx).toHaveBeenCalledWith(
                tx,
                'user-cinder'
            );
            expect(sessionService.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-cinder',
                'user-cinder',
                now
            );
            expect(deviceService.revokeAllByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-cinder',
                'user-cinder',
                now
            );
            expect(
                workspaceInviteService.revokeAllPendingByEmailInTx
            ).toHaveBeenCalledWith(tx, 'cinder@example.com');
            expect(userService.deleteSelfInTx).toHaveBeenCalledWith(
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
            expect(userProfileService.deleteOwnedPhoto).toHaveBeenCalledWith(
                'user-cinder',
                null
            );
            expect(activityLogService.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.userRevokeAllSessions,
                userId: 'user-cinder',
                createdBy: 'user-cinder',
            });
            expect(activityLogService.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.userDeleteSelf,
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                activityLog,
                activityLog,
                activityLog,
                activityLog,
            ]);
        });

        it('throws WorkspaceOwnerTransferRequiredException and writes nothing when an owned workspace has another member', async () => {
            const failure = new WorkspaceOwnerTransferRequiredException();
            workspaceService.assertOwnedHasNoOtherMembersInTx.mockRejectedValue(
                failure
            );

            await expect(useCase.execute(baseUser, dto)).rejects.toBe(failure);

            expect(
                workspaceService.softDeleteOwnedByUserInTx
            ).not.toHaveBeenCalled();
            expect(userService.deleteSelfInTx).not.toHaveBeenCalled();
            expect(databaseUtil.toException).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(
                activityLogService.stagePrepared
            ).toHaveBeenCalledExactlyOnceWith([]);
        });

        it('cascades a workspace with no other member', async () => {
            workspaceService.softDeleteOwnedByUserInTx.mockResolvedValue([
                'workspace-one',
            ]);

            await expect(useCase.execute(baseUser, dto)).resolves.toEqual({});

            expect(
                workspaceService.assertOwnedHasNoOtherMembersInTx
            ).toHaveBeenCalledWith(tx, 'user-cinder');
            expect(
                projectService.softDeleteByWorkspaceInTx
            ).toHaveBeenCalledWith(tx, 'workspace-one', now, 'user-cinder');
            expect(
                workspaceInviteService.revokePendingByWorkspaceInTx
            ).toHaveBeenCalledWith(tx, 'workspace-one');
            expect(
                workspaceJoinRequestService.cancelPendingByWorkspaceInTx
            ).toHaveBeenCalledWith(tx, 'workspace-one');
        });

        it("cancels the user's own pending join requests on the same tx", async () => {
            await useCase.execute(baseUser, dto);

            expect(
                workspaceJoinRequestService.cancelPendingByRequesterInTx
            ).toHaveBeenCalledWith(tx, 'user-cinder');
        });

        it("revokes the pending invites to the user's email on the same tx before the soft delete", async () => {
            await useCase.execute(baseUser, dto);

            expect(
                workspaceInviteService.revokeAllPendingByEmailInTx
            ).toHaveBeenCalledWith(tx, 'cinder@example.com');
            expect(
                workspaceInviteService.revokeAllPendingByEmailInTx
            ).toHaveBeenCalledBefore(userService.deleteSelfInTx);
        });

        it('opens the transaction with user.deleteSelf.timeoutInMs', async () => {
            await useCase.execute(baseUser, dto);

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

            await expect(useCase.execute(baseUser, dto)).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                messagePath: 'user.error.notFound',
            });

            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(
                activityLogService.stagePrepared
            ).toHaveBeenCalledExactlyOnceWith([]);
        });

        it('stages one workspaceDeleted row per deleted workspace after the purge', async () => {
            const calls: string[] = [];
            workspaceService.softDeleteOwnedByUserInTx.mockResolvedValueOnce([
                'workspace-one',
                'workspace-two',
            ]);
            sessionQueue.purgeLogins.mockImplementation(async () => {
                calls.push('purge');
            });
            activityLogService.prepare.mockImplementation(input => {
                calls.push(`prepare:${input.action}`);

                return activityLog;
            });
            activityLogService.stagePrepared.mockImplementation(() => {
                calls.push('stage');
            });

            await useCase.execute(baseUser, dto);

            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceDeleted,
                userId: 'user-cinder',
                createdBy: 'user-cinder',
                workspaceId: 'workspace-one',
            });
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceDeleted,
                userId: 'user-cinder',
                createdBy: 'user-cinder',
                workspaceId: 'workspace-two',
            });
            expect(calls).toEqual([
                `prepare:${EnumActivityLogAction.userRevokeAllSessions}`,
                `prepare:${EnumActivityLogAction.userDeleteSelf}`,
                'stage',
                'purge',
                `prepare:${EnumActivityLogAction.workspaceDeleted}`,
                `prepare:${EnumActivityLogAction.workspaceDeleted}`,
                'stage',
            ]);
            expect(activityLogService.stagePrepared).toHaveBeenCalledTimes(2);
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                activityLog,
                activityLog,
                activityLog,
                activityLog,
            ]);
        });

        it('cascades no workspace when the user owns none', async () => {
            await useCase.execute(baseUser, dto);

            expect(
                projectService.softDeleteByWorkspaceInTx
            ).not.toHaveBeenCalled();
            expect(
                workspaceInviteService.revokePendingByWorkspaceInTx
            ).not.toHaveBeenCalled();
            expect(
                workspaceJoinRequestService.cancelPendingByWorkspaceInTx
            ).not.toHaveBeenCalled();
            expect(
                workspaceMemberService.removeByUserInTx
            ).toHaveBeenCalledTimes(1);
        });

        it('skips the password check for a passwordless account', async () => {
            const passwordless: IUser = { ...baseUser, password: null };
            userPasswordService.countPasswordAttempt.mockResolvedValue(null);

            await expect(useCase.execute(passwordless, {})).resolves.toEqual(
                {}
            );

            expect(
                userPasswordService.countPasswordAttempt
            ).toHaveBeenCalledWith(passwordless);
            expect(
                userAuthService.assertPasswordAttempt
            ).not.toHaveBeenCalled();
            expect(userService.deleteSelfInTx).toHaveBeenCalledTimes(1);
        });

        it('counts an attempt and throws UserPasswordNotMatchException when the password is absent', async () => {
            userAuthService.assertPasswordAttempt.mockRejectedValue(
                new UserPasswordNotMatchException()
            );

            await expect(useCase.execute(baseUser, {})).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordNotMatch,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordNotMatch
                    ],
                messagePath: 'user.error.passwordNotMatch',
            });

            expect(
                userPasswordService.countPasswordAttempt
            ).toHaveBeenCalledWith(baseUser);
            expect(userAuthService.assertPasswordAttempt).toHaveBeenCalledWith(
                counted,
                null
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('rejects an expired password after a match', async () => {
            const failure = new UserPasswordExpiredException();
            userAuthService.assertPasswordAttempt.mockRejectedValue(failure);

            await expect(useCase.execute(baseUser, dto)).rejects.toBe(failure);

            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(userService.deleteSelfInTx).not.toHaveBeenCalled();
        });

        it('deletes nothing and stages no row when the password does not match', async () => {
            const failure = new UserPasswordNotMatchException();
            userAuthService.assertPasswordAttempt.mockRejectedValue(failure);

            await expect(useCase.execute(baseUser, dto)).rejects.toBe(failure);

            expect(userAuthService.assertPasswordAttempt).toHaveBeenCalledWith(
                counted,
                'plain-password'
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(
                activityLogService.stagePrepared
            ).toHaveBeenCalledExactlyOnceWith([]);
            expect(activityLogService.stagePrepared).toHaveBeenCalledBefore(
                userAuthService.assertPasswordAttempt
            );
        });

        it('stages both lockout rows after the spent attempt is counted and before the attempt limit is answered, deleting nothing', async () => {
            const calls: string[] = [];
            const failure = new UserPasswordAttemptMaxException();
            const spent = {
                ...counted,
                isAttemptCounted: false,
                lockoutStages: [
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
                ],
            };
            userPasswordService.countPasswordAttempt.mockImplementation(
                async () => {
                    calls.push('countAttempt');

                    return spent;
                }
            );
            userAuthService.assertPasswordAttempt.mockImplementation(
                async () => {
                    calls.push('assert');

                    throw failure;
                }
            );
            activityLogService.stagePrepared.mockImplementation(() => {
                calls.push('stage');
            });

            await expect(useCase.execute(baseUser, dto)).rejects.toBe(failure);
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRevokeAllSessions,
                userId: 'user-cinder',
                createdBy: 'user-cinder',
            });
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userReachMaxPasswordAttempt,
                userId: 'user-cinder',
                createdBy: 'user-cinder',
            });
            expect(
                activityLogService.stagePrepared
            ).toHaveBeenCalledExactlyOnceWith([activityLog, activityLog]);
            expect(calls).toEqual(['countAttempt', 'stage', 'assert']);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(userAuthService.assertPasswordAttempt).toHaveBeenCalledWith(
                spent,
                'plain-password'
            );
            expect(userService.deleteSelfInTx).not.toHaveBeenCalled();
            expect(
                workspaceService.softDeleteOwnedByUserInTx
            ).not.toHaveBeenCalled();
        });

        it('hands the stored photo to the profile domain', async () => {
            userService.deleteSelfInTx.mockResolvedValue({
                ...baseUser,
                photo,
            });

            await useCase.execute(baseUser, dto);

            expect(userProfileService.deleteOwnedPhoto).toHaveBeenCalledWith(
                'user-cinder',
                photo
            );
        });

        it('wraps an unknown error in AppUnknownException', async () => {
            const cause = new Error('database exploded');
            databaseService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(useCase.execute(baseUser, dto)).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(userProfileService.deleteOwnedPhoto).not.toHaveBeenCalled();
            expect(
                activityLogService.stagePrepared
            ).toHaveBeenCalledExactlyOnceWith([]);
        });
    });
});
