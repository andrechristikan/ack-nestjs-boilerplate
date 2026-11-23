import { EnumRolePlatformKey } from '@modules/role/enums/role.enum';
import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumUserReauthenticationAction,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { UserService } from '@modules/user/services/user.service';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { SessionService } from '@modules/session/services/session.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { UserSocialService } from '@modules/user/services/user.social.service';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
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
import { UserPasswordExpiredException } from '@modules/user/exceptions/user.password-expired.exception';
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';
import type { UserDeleteSelfRequestDto } from '@modules/user/dtos/request/user.delete-self.request.dto';
import type {
    IUser,
    IUserReauthenticationCheck,
} from '@modules/user/interfaces/user.interface';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { UserDeleteSelfUseCase } from '@modules/user/use-cases/user.delete-self.use-case';
import {
    buildRequestContext,
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildUserContext,
} from '@test/unit/helpers/test.unit.request.helper';

const passkeyResponse = {
    id: 'AbC_-123',
    rawId: 'AbC_-123',
    response: {
        clientDataJSON: 'clientDataQuartz',
        authenticatorData: 'authenticatorDataQuartz',
        signature: 'signatureQuartz',
    },
    clientExtensionResults: {},
    type: 'public-key',
} as const;

describe('UserDeleteSelfUseCase', () => {
    const userService: MockProxy<UserService> = mock<UserService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const userProfileService: MockProxy<UserProfileService> =
        mock<UserProfileService>();
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const userMobileNumberService: MockProxy<UserMobileNumberService> =
        mock<UserMobileNumberService>();
    const mfaService: MockProxy<MfaService> = mock<MfaService>();
    const userSocialService: MockProxy<UserSocialService> =
        mock<UserSocialService>();
    const passwordHistoryService: MockProxy<PasswordHistoryService> =
        mock<PasswordHistoryService>();
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
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const authContext = buildAuthJwtAccessContext(baseUser.id);
    const userContext = buildUserContext(baseUser);

    beforeEach(async () => {
        vi.resetAllMocks();
        helperDateService.create.mockReturnValue(now);
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserDeleteSelfUseCase,
                { provide: UserService, useValue: userService },
                { provide: SessionService, useValue: sessionService },
                { provide: OutboxService, useValue: outboxService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: UserProfileService, useValue: userProfileService },
                { provide: UserAuthService, useValue: userAuthService },
                {
                    provide: UserMobileNumberService,
                    useValue: userMobileNumberService,
                },
                { provide: MfaService, useValue: mfaService },
                { provide: UserSocialService, useValue: userSocialService },
                {
                    provide: PasswordHistoryService,
                    useValue: passwordHistoryService,
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

        const entryEffect: IActivityLogCreateManyEffect = {
            queue: EnumActivityLogQueue.activityLog,
            name: EnumActivityLogProcess.createMany,
            data: { rows: [] },
            priority: EnumQueuePriority.low,
            idempotencyKey: null,
        };

        const revoked: ISessionRef[] = [{ id: 'session-one' }];

        const check: IUserReauthenticationCheck = {
            isPasswordChecked: true,
            mfa: null,
            verificationId: null,
            passkeyChallengeToken: null,
        };

        const photo = {
            id: 'photo-cinder',
            userId: 'user-cinder',
            bucket: 'bucket',
            key: 'photo-profile/user-cinder/current.png',
            cdnUrl: null,
            completedUrl: 'https://cdn.example.com/current.png',
            mime: 'image/png',
            extension: 'png',
            access: 'public',
        } as const;

        beforeEach(() => {
            activityLogService.recordEffect.mockReturnValue(entryEffect);
            userAuthService.assertReauthentication.mockResolvedValue(check);
            workspaceService.softDeleteOwnedByUserInTx.mockResolvedValue([]);
            userService.deleteSelfInTx.mockResolvedValue();
            sessionService.revokeAllByUserInTx.mockResolvedValue(revoked);
        });

        it('throws UserDeleteSelfForbiddenException for a superAdmin before the password check', async () => {
            const superAdmin: IUser = {
                ...baseUser,
                role: { ...baseUser.role, key: EnumRolePlatformKey.superAdmin },
            };
            const failure = new UserDeleteSelfForbiddenException();
            userService.assertSelfDeletable.mockImplementation(() => {
                throw failure;
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    buildAuthJwtAccessContext(superAdmin.id),
                    buildUserContext(superAdmin),
                    dto
                )
            ).rejects.toBe(failure);

            expect(userService.assertSelfDeletable).toHaveBeenCalledWith(
                superAdmin
            );
            expect(
                userAuthService.assertReauthentication
            ).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('verifies the password, then cascades the owned workspaces and every membership and adds the entries on one transaction', async () => {
            const calls: string[] = [];
            outboxService.withTransaction.mockImplementation(async fn => {
                calls.push('begin');
                const value = await fn(tx);
                calls.push('commit');

                return value as never;
            });
            userAuthService.assertReauthentication.mockImplementation(
                async () => {
                    calls.push('verifyPassword');

                    return check;
                }
            );
            outboxService.addManyInTx.mockImplementation(async () => {
                calls.push('addEntries');

                return ['outbox-id'];
            });
            userAuthService.completeReauthenticationInTx.mockImplementation(
                async () => {
                    calls.push('resetPasswordAttempt');
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
            userSocialService.removeByUserInTx.mockImplementation(async () => {
                calls.push('removeSocials');

                return 1;
            });
            mfaService.deleteByUserInTx.mockImplementation(async () => {
                calls.push('deleteMfa');
            });
            sessionService.revokeAllByUserInTx.mockImplementation(async () => {
                calls.push('revokeSessions');

                return revoked;
            });
            userService.deleteSelfInTx.mockImplementation(async () => {
                calls.push('deleteUser');
            });
            userProfileService.deleteOwnedPhotoInTx.mockImplementation(
                async () => {
                    calls.push('deletePhotoRow');
                }
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).resolves.toEqual({});

            expect(userAuthService.assertReauthentication).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                baseUser,
                {
                    action: EnumUserReauthenticationAction.deleteSelf,
                    password: 'plain-password',
                    method: null,
                    code: null,
                    backupCode: null,
                    passkeyChallengeToken: null,
                    passkeyResponse: null,
                    otp: null,
                }
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
            expect(userSocialService.removeByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-cinder'
            );
            expect(mfaService.deleteByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-cinder'
            );
            expect(sessionService.revokeAllByUserInTx).toHaveBeenCalledWith(
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
                'verifyPassword',
                'begin',
                'resetPasswordAttempt',
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
                'removeSocials',
                'deleteMfa',
                'revokeSessions',
                'deleteUser',
                'deletePhotoRow',
                'addEntries',
                'commit',
            ]);
            expect(
                userProfileService.deleteOwnedPhotoInTx
            ).toHaveBeenCalledWith(tx, 'user-cinder', null);
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.userRevokeAllSessions,
                    userId: 'user-cinder',
                    createdBy: 'user-cinder',
                }
            );
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                2,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                { action: EnumActivityLogAction.userDeleteSelf }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                entryEffect,
                entryEffect,
                entryEffect,
                entryEffect,
            ]);
        });

        it('completes the re-authentication first on the flow transaction', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                dto
            );

            expect(
                userAuthService.completeReauthenticationInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                check
            );
            expect(
                userAuthService.completeReauthenticationInTx
            ).toHaveBeenCalledBefore(
                workspaceService.assertOwnedHasNoOtherMembersInTx
            );
        });

        it('completes nothing outside the transaction when the main step fails after a correct proof', async () => {
            outboxService.withTransaction.mockRejectedValue(
                new Error('write conflict')
            );
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
            });

            expect(
                userAuthService.completeReauthenticationInTx
            ).not.toHaveBeenCalled();
        });

        it('reads the actor id from the context actorUserId', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                { ...authContext, userId: 'actor-other' },
                userContext,
                dto
            );

            expect(
                workspaceService.assertOwnedHasNoOtherMembersInTx
            ).toHaveBeenCalledWith(tx, 'actor-other');
            expect(
                workspaceMemberService.removeByUserInTx
            ).toHaveBeenCalledWith(tx, 'actor-other');
            expect(sessionService.revokeAllByUserInTx).toHaveBeenCalledWith(
                tx,
                'actor-other',
                'actor-other',
                now
            );
        });

        it('throws WorkspaceOwnerTransferRequiredException and writes nothing when an owned workspace has another member', async () => {
            const failure = new WorkspaceOwnerTransferRequiredException();
            workspaceService.assertOwnedHasNoOtherMembersInTx.mockRejectedValue(
                failure
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toBe(failure);

            expect(
                workspaceService.softDeleteOwnedByUserInTx
            ).not.toHaveBeenCalled();
            expect(userService.deleteSelfInTx).not.toHaveBeenCalled();
            expect(databaseUtil.toException).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('cascades a workspace with no other member', async () => {
            workspaceService.softDeleteOwnedByUserInTx.mockResolvedValue([
                'workspace-one',
            ]);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).resolves.toEqual({});

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
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                dto
            );

            expect(
                workspaceJoinRequestService.cancelPendingByRequesterInTx
            ).toHaveBeenCalledWith(tx, 'user-cinder');
        });

        it("revokes the pending invites to the user's email on the same tx before the soft delete", async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                dto
            );

            expect(
                workspaceInviteService.revokeAllPendingByEmailInTx
            ).toHaveBeenCalledWith(tx, 'cinder@example.com');
            expect(
                workspaceInviteService.revokeAllPendingByEmailInTx
            ).toHaveBeenCalledBefore(userService.deleteSelfInTx);
        });

        it('opens the transaction with user.deleteSelf.timeoutInMs', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                dto
            );

            expect(outboxService.withTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 30000 }
            );
        });

        it('answers UserNotFoundException on a write conflict', async () => {
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
                    dto
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                messagePath: 'user.error.notFound',
            });

            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('adds one workspaceDeleted entry per deleted workspace after the user entries on the same tx', async () => {
            workspaceService.softDeleteOwnedByUserInTx.mockResolvedValueOnce([
                'workspace-one',
                'workspace-two',
            ]);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                dto
            );

            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.workspaceDeleted,
                    userId: 'user-cinder',
                    createdBy: 'user-cinder',
                    workspaceId: 'workspace-one',
                }
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.workspaceDeleted,
                    userId: 'user-cinder',
                    createdBy: 'user-cinder',
                    workspaceId: 'workspace-two',
                }
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledTimes(4);
            expect(outboxService.addManyInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                entryEffect,
                entryEffect,
                entryEffect,
                entryEffect,
            ]);
        });

        it('cascades no workspace when the user owns none', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                dto
            );

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

        it('passes the MFA and email-code fields of the request on', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                {
                    ...dto,
                    method: EnumMfaMethod.backupCode,
                    backupCode: 'BACKUP1',
                    code: '654321',
                    passkeyChallengeToken: 'challenge-quartz',
                    passkeyResponse,
                    otp: '123456',
                }
            );

            expect(userAuthService.assertReauthentication).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                baseUser,
                {
                    action: EnumUserReauthenticationAction.deleteSelf,
                    password: 'plain-password',
                    method: EnumMfaMethod.backupCode,
                    code: '654321',
                    backupCode: 'BACKUP1',
                    passkeyChallengeToken: 'challenge-quartz',
                    passkeyResponse,
                    otp: '123456',
                }
            );
        });

        it('passes a null password for an absent one', async () => {
            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    {}
                )
            ).resolves.toEqual({});

            expect(userAuthService.assertReauthentication).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                baseUser,
                expect.objectContaining({ password: null })
            );
            expect(userService.deleteSelfInTx).toHaveBeenCalledTimes(1);
        });

        it('throws UserPasswordNotMatchException and deletes nothing when the password is absent', async () => {
            userAuthService.assertReauthentication.mockRejectedValue(
                new UserPasswordNotMatchException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    {}
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordNotMatch,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordNotMatch
                    ],
                messagePath: 'user.error.passwordNotMatch',
            });

            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(userService.deleteSelfInTx).not.toHaveBeenCalled();
        });

        it('rejects an expired password after a match', async () => {
            const failure = new UserPasswordExpiredException();
            userAuthService.assertReauthentication.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toBe(failure);

            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(userService.deleteSelfInTx).not.toHaveBeenCalled();
        });

        it('deletes the password history on the same tx', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                dto
            );

            expect(
                passwordHistoryService.removeByUserInTx
            ).toHaveBeenCalledWith(tx, 'user-cinder');
        });

        it('hands the photo held before the write to the profile domain on the same tx', async () => {
            const photoUser: IUser = { ...baseUser, photo };
            userService.deleteSelfInTx.mockResolvedValue();

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                buildUserContext(photoUser),
                dto
            );

            expect(
                userProfileService.deleteOwnedPhotoInTx
            ).toHaveBeenCalledWith(tx, 'user-cinder', photo);
        });

        it('wraps an unknown error in AppUnknownException', async () => {
            const cause = new Error('database exploded');
            outboxService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
            expect(
                userProfileService.deleteOwnedPhotoInTx
            ).not.toHaveBeenCalled();
        });
    });
});
