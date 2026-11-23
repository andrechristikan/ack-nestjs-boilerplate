import type { IWorkspaceMemberWithRole } from '@modules/workspace/interfaces/workspace.interface';
import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import type {
    INotificationEmailSendUnregisteredEffect,
    INotificationNotifyEffect,
} from '@modules/notification/interfaces/notification.interface';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { Duration } from 'luxon';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumWorkspaceInviteStatus,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import type {
    Project,
    Workspace,
    WorkspaceInvite,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { FeatureFlagNotConfiguredException } from '@modules/feature-flag/exceptions/feature-flag.not-configured.exception';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import { NotificationService } from '@modules/notification/services/notification.service';
import {
    EnumNotificationEmailProcess,
    EnumNotificationKind,
    EnumNotificationProcess,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { UserService } from '@modules/user/services/user.service';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import type {
    IUserName,
    IUserSignUpWorkspaceInvite,
} from '@modules/user/interfaces/user.interface';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceInviteNoncePattern } from '@modules/workspace/constants/workspace.constant';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceInviteAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.invite-already-processed.exception';
import { WorkspaceInviteDuplicateException } from '@modules/workspace/exceptions/workspace.invite-duplicate.exception';
import { WorkspaceInviteInvalidException } from '@modules/workspace/exceptions/workspace.invite-invalid.exception';
import { WorkspaceInviteNotFoundException } from '@modules/workspace/exceptions/workspace.invite-not-found.exception';
import { WorkspaceInviteProjectMismatchException } from '@modules/workspace/exceptions/workspace.invite-project-mismatch.exception';
import { WorkspaceInviteRoleRequiredException } from '@modules/workspace/exceptions/workspace.invite-role-required.exception';
import { WorkspaceMemberAlreadyExistsException } from '@modules/workspace/exceptions/workspace.member-already-exists.exception';
import type {
    IWorkspaceInviteCreate,
    IWorkspaceInviteNotice,
    IWorkspaceInviteTokenData,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceInviteRepository } from '@modules/workspace/repositories/workspace.invite.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';

describe('WorkspaceInviteService', () => {
    const workspaceInviteRepository: MockProxy<WorkspaceInviteRepository> =
        mock<WorkspaceInviteRepository>();
    const workspaceRepository: MockProxy<WorkspaceRepository> =
        mock<WorkspaceRepository>();
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const featureFlagService: MockProxy<FeatureFlagService> =
        mock<FeatureFlagService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const tx: IDatabaseTransactionClient = mock<IDatabaseTransactionClient>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const configGet = vi.fn<(key: string) => unknown>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    const configValues: Record<string, unknown> = {
        'workspace.invite.referenceMaxAttempts': 5,
        'frontend.baseUrl': 'https://app.example.com',
        'workspace.invite.tokenLength': 40,
        'workspace.invite.referencePrefix': 'WIN',
        'workspace.invite.referenceRandomLength': 6,
        'workspace.invite.linkPattern':
            '{frontendBaseUrl}/workspace/invites?inviteToken={token}',
        'workspace.invite.signUpLinkPattern':
            '{frontendBaseUrl}/sign-up/{token}',
    };

    const workspace: Workspace = {
        id: 'workspace-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: 'user-1',
        deletedAt: null,
        deletedBy: null,
        name: 'Acme',
        slug: 'acme-team',
        description: null,
        isPublic: false,
    };

    const pendingNonce = 'a'.repeat(64);

    const baseInvite: WorkspaceInvite = {
        id: 'invite-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: 'user-1',
        workspaceId: 'workspace-1',
        email: 'invitee@example.com',
        token: 'hashed-token',
        workspaceRoleId: 'role-workspace-member',
        projectId: null,
        projectRoleId: null,
        reference: 'WIN-abc123',
        expiredAt: new Date('2026-02-01T00:00:00.000Z'),
        status: EnumWorkspaceInviteStatus.pending,
        invitedByUserId: 'user-1',
        acceptedAt: null,
        acceptedByUserId: null,
        nonce: pendingNonce,
    };

    const baseProject: Project = {
        id: 'project-1',
        workspaceId: 'workspace-1',
        name: 'Launch',
        slug: 'launch',
        description: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: 'user-1',
        deletedAt: null,
        deletedBy: null,
    };

    const tokenData: IWorkspaceInviteTokenData = {
        token: 'token-value',
        hashedToken: 'hashed-token',
        reference: 'WIN-abc123',
        expiredAt: new Date('2026-02-01T00:00:00.000Z'),
        claimLink:
            'https://app.example.com/workspace/invites?inviteToken=token-value',
        signUpLink: 'https://app.example.com/sign-up/token-value',
    };

    const filledPatterns: Record<string, string> = {
        [WorkspaceInviteNoncePattern]: 'workspace-1:invitee@example.com',
        '{frontendBaseUrl}/workspace/invites?inviteToken={token}':
            tokenData.claimLink,
        '{frontendBaseUrl}/sign-up/{token}': tokenData.signUpLink,
    };

    const baseCreate: IWorkspaceInviteCreate = {
        email: 'invitee@example.com' as Lowercase<string>,
        workspaceRoleId: 'role-workspace-member',
        projectId: null,
        projectRoleId: null,
        expiryDuration: null,
    };

    const unregisteredNotice: IWorkspaceInviteNotice = {
        workspaceName: 'Acme',
        workspaceRoleName: 'Member',
        inviterName: 'Bramble',
        inviteeUserId: null,
    };

    const registeredNotice: IWorkspaceInviteNotice = {
        ...unregisteredNotice,
        inviteeUserId: 'user-2',
    };

    const notifyEffect: INotificationNotifyEffect = {
        queue: EnumNotificationQueue.notification,
        name: EnumNotificationProcess.notify,
        data: {
            kind: EnumNotificationKind.workspaceInvite,
            context: {
                userId: 'user-2',
                proceedBy: 'user-1',
                snapshot: null,
                verificationId: null,
            },
            recipient: null,
            notificationId: null,
        },
        priority: EnumQueuePriority.medium,
        idempotencyKey: 'workspaceInvite-WIN-abc123',
    };

    const unregisteredEffect: INotificationEmailSendUnregisteredEffect = {
        queue: EnumNotificationQueue.notificationEmail,
        name: EnumNotificationEmailProcess.sendUnregistered,
        data: {
            encryptedEmail: 'encrypted-email',
            context: { reference: 'WIN-abc123' },
        },
        priority: EnumQueuePriority.medium,
        idempotencyKey: 'sendUnregistered-WIN-abc123',
    };

    const expiredAtIso = '2026-02-01T00:00:00.000Z';
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-1', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const authContextOfUser2 = { ...authContext, userId: 'user-2' };
    const actorEntry = buildActivityLogCreateManyEffect('actor-entry');
    const inviteeEntry = buildActivityLogCreateManyEffect('invitee-entry');

    let service: WorkspaceInviteService;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation((key: string) => configValues[key]);
        featureFlagService.getMetadataNumber.mockResolvedValue(7);
        outboxService.withTransaction.mockImplementation(async fn => fn(tx));
        activityLogService.recordEffect
            .mockReturnValueOnce(actorEntry)
            .mockReturnValueOnce(inviteeEntry);
        helperStringService.fillPattern.mockImplementation(
            pattern => filledPatterns[pattern] ?? ''
        );
        helperHashService.sha256Hash.mockImplementation(value =>
            value === 'workspace-1:invitee@example.com'
                ? pendingNonce
                : 'hashed-token'
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceInviteService,
                {
                    provide: WorkspaceInviteRepository,
                    useValue: workspaceInviteRepository,
                },
                { provide: WorkspaceRepository, useValue: workspaceRepository },
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
                { provide: FeatureFlagService, useValue: featureFlagService },
                { provide: UserService, useValue: userService },
                { provide: NotificationService, useValue: notificationService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: OutboxService, useValue: outboxService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: HelperHashService, useValue: helperHashService },
                { provide: HelperStringService, useValue: helperStringService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        service = module.get(WorkspaceInviteService);
    });

    describe('getInviterName', () => {
        it("resolves the inviter's name against the workspace", async () => {
            const inviter: IUserName = {
                name: 'Bramble',
                username: 'bramble',
            };
            userService.getNameById.mockResolvedValue(inviter);

            await expect(
                service.getInviterName(workspace, 'user-1')
            ).resolves.toBe('Bramble');
            expect(userService.getNameById).toHaveBeenCalledWith('user-1');
        });
    });

    describe('validateInviteToken', () => {
        it('throws FeatureFlagDisabledException and reads no invite when workspace invitations are off', async () => {
            featureFlagService.validateFeatureFlagMetadata.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                service.validateInviteToken('raw-token')
            ).rejects.toMatchObject({
                statusCode: EnumFeatureFlagStatusCodeError.disabled,

                constructor: FeatureFlagDisabledException,
                module: 'featureFlag',
                messagePath: 'featureFlag.error.disabled',
            });
            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.invitationAllowed
            );
            expect(
                workspaceInviteRepository.findPendingByHashedToken
            ).not.toHaveBeenCalled();
        });

        it('throws WorkspaceInviteInvalidException when no pending invite matches the token', async () => {
            workspaceInviteRepository.findPendingByHashedToken.mockResolvedValue(
                null
            );
            helperHashService.sha256Hash.mockReturnValue('hashed-token');

            await expect(
                service.validateInviteToken('raw-token')
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteInvalidException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteInvalid,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.inviteInvalid
                    ],
                messagePath: 'workspace.error.inviteInvalid',
            });
            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                'raw-token'
            );
        });

        it('returns the pending invite matching the token', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            workspaceInviteRepository.findPendingByHashedToken.mockResolvedValue(
                baseInvite
            );

            const result = await service.validateInviteToken('raw-token');

            expect(result).toBe(baseInvite);
            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.invitationAllowed
            );
            expect(
                workspaceInviteRepository.findPendingByHashedToken
            ).toHaveBeenCalledWith('hashed-token');
        });
    });

    describe('validateInviteForEmail', () => {
        it('throws FeatureFlagDisabledException and reads no invite when workspace invitations are off', async () => {
            featureFlagService.validateFeatureFlagMetadata.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                service.validateInviteForEmail('raw-token', 'user@example.com')
            ).rejects.toMatchObject({
                statusCode: EnumFeatureFlagStatusCodeError.disabled,

                constructor: FeatureFlagDisabledException,
                module: 'featureFlag',
                messagePath: 'featureFlag.error.disabled',
            });
            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.invitationAllowed
            );
            expect(
                workspaceInviteRepository.findPendingByHashedToken
            ).not.toHaveBeenCalled();
        });

        it('throws WorkspaceInviteInvalidException when no pending invite matches the token', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            workspaceInviteRepository.findPendingByHashedToken.mockResolvedValue(
                null
            );

            await expect(
                service.validateInviteForEmail('raw-token', 'user@example.com')
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteInvalidException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteInvalid,
                messagePath: 'workspace.error.inviteInvalid',
            });
        });

        it('throws WorkspaceInviteInvalidException when the invite email does not match', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            workspaceInviteRepository.findPendingByHashedToken.mockResolvedValue(
                { ...baseInvite, email: 'other@example.com' }
            );

            await expect(
                service.validateInviteForEmail('raw-token', 'USER@example.com')
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteInvalidException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteInvalid,
                messagePath: 'workspace.error.inviteInvalid',
            });
        });

        it('returns the pending invite when its email matches', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            workspaceInviteRepository.findPendingByHashedToken.mockResolvedValue(
                baseInvite
            );

            const result = await service.validateInviteForEmail(
                'raw-token',
                'invitee@example.com'
            );

            expect(result).toBe(baseInvite);
            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledTimes(1);
        });
    });

    describe('getSignUpInvite', () => {
        it('returns null and gates nothing when the sign-up carries no invite token', async () => {
            const result = await service.getSignUpInvite(
                null,
                'invitee@example.com'
            );

            expect(result).toBeNull();
            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).not.toHaveBeenCalled();
            expect(
                workspaceInviteRepository.findPendingByHashedToken
            ).not.toHaveBeenCalled();
        });

        it('gates on the invitation flag and returns the pending invite of the sign-up email', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            workspaceInviteRepository.findPendingByHashedToken.mockResolvedValue(
                baseInvite
            );

            const result = await service.getSignUpInvite(
                'raw-token',
                'invitee@example.com'
            );

            expect(result).toBe(baseInvite);
            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.invitationAllowed
            );
        });
    });

    describe('assertInviteeNotMember', () => {
        const member: IWorkspaceMemberWithRole = {
            id: 'member-1',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            workspaceId: 'workspace-1',
            userId: 'user-2',
            roleId: 'role-workspace-member',
            role: {
                id: 'role-workspace-member',
                scope: EnumRoleScope.workspace,
                key: 'member',
                name: 'member',
                policyRevision: 0,
            },
            joinedAt: new Date('2026-01-01T00:00:00.000Z'),
        };

        it('resolves when the user is not a member of the workspace', async () => {
            workspaceMemberService.getOneByWorkspaceAndUser.mockResolvedValue(
                null
            );

            await expect(
                service.assertInviteeNotMember('workspace-1', 'user-2')
            ).resolves.toBeUndefined();
            expect(
                workspaceMemberService.getOneByWorkspaceAndUser
            ).toHaveBeenCalledWith('workspace-1', 'user-2');
        });

        it('throws WorkspaceMemberAlreadyExistsException when the user already belongs to the workspace', async () => {
            workspaceMemberService.getOneByWorkspaceAndUser.mockResolvedValue(
                member
            );

            await expect(
                service.assertInviteeNotMember('workspace-1', 'user-2')
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberAlreadyExistsException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberAlreadyExists,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.memberAlreadyExists
                    ],
                messagePath: 'workspace.error.memberAlreadyExists',
            });
        });
    });

    describe('expireStalePending', () => {
        it('delegates to the repository', async () => {
            workspaceInviteRepository.expireStalePending.mockResolvedValue(3);

            const result = await service.expireStalePending();

            expect(result).toBe(3);
        });
    });

    describe('revokePendingByWorkspaceInTx', () => {
        it('revokes the pending invites of the workspace on the given transaction', async () => {
            const tx = {} as IDatabaseTransactionClient;

            await service.revokePendingByWorkspaceInTx(tx, 'workspace-1');

            expect(
                workspaceInviteRepository.revokePendingByWorkspaceInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1');
        });
    });

    describe('revokePendingByEmailInTx', () => {
        it('revokes the pending invite of the workspace and email on the given transaction', async () => {
            const tx = {} as IDatabaseTransactionClient;

            await service.revokePendingByEmailInTx(
                tx,
                'workspace-1',
                'invitee@example.com'
            );

            expect(
                workspaceInviteRepository.revokePendingByEmailInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1', 'invitee@example.com');
        });
    });

    describe('revokeAllPendingByEmailInTx', () => {
        it('revokes the pending invites to the email in every workspace on the given transaction', async () => {
            const tx = {} as IDatabaseTransactionClient;

            await service.revokeAllPendingByEmailInTx(
                tx,
                'invitee@example.com'
            );

            expect(
                workspaceInviteRepository.revokeAllPendingByEmailInTx
            ).toHaveBeenCalledWith(tx, 'invitee@example.com');
        });
    });

    describe('clearProjectInTx', () => {
        it('clears the project from the pending invites on the given transaction', async () => {
            const tx = {} as IDatabaseTransactionClient;

            await service.clearProjectInTx(tx, 'project-1');

            expect(
                workspaceInviteRepository.clearProjectInTx
            ).toHaveBeenCalledWith(tx, 'project-1');
        });
    });

    describe('getInvitesList', () => {
        const pagination: IPaginationQueryCursorParams = {
            fingerprint: 'aaaaaaaaaaaaaaaa',
            limit: 20,
            orderBy: [],
        };
        const page: IResponsePaginationReturn<never> = {
            type: EnumPaginationType.cursor,
            perPage: 20,
            hasNext: false,
            data: [],
        };

        it('throws FeatureFlagDisabledException and reads no page when workspace invitations are off', async () => {
            featureFlagService.validateFeatureFlagMetadata.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                service.getInvitesList('workspace-1', pagination, null, null)
            ).rejects.toMatchObject({
                statusCode: EnumFeatureFlagStatusCodeError.disabled,

                constructor: FeatureFlagDisabledException,
                module: 'featureFlag',
                messagePath: 'featureFlag.error.disabled',
            });
            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.invitationAllowed
            );
            expect(
                workspaceInviteRepository.findWithPaginationCursor
            ).not.toHaveBeenCalled();
        });

        it('gates on the invitation flag and delegates to the repository with a null status filter', async () => {
            workspaceInviteRepository.findWithPaginationCursor.mockResolvedValue(
                page
            );

            const result = await service.getInvitesList(
                'workspace-1',
                pagination,
                null,
                null
            );

            expect(result).toBe(page);
            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.invitationAllowed
            );
            expect(
                workspaceInviteRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith('workspace-1', pagination, null, null);
        });

        it('forwards the status filter to the repository', async () => {
            const status = { status: { in: ['pending'] } };
            workspaceInviteRepository.findWithPaginationCursor.mockResolvedValue(
                page
            );

            const result = await service.getInvitesList(
                'workspace-1',
                pagination,
                status,
                null
            );

            expect(result).toBe(page);
            expect(
                workspaceInviteRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith('workspace-1', pagination, status, null);
        });
    });

    describe('assertProjectRolePaired', () => {
        it('throws FeatureFlagDisabledException before the pairing check when workspace invitations are off', async () => {
            featureFlagService.validateFeatureFlagMetadata.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                service.assertProjectRolePaired({
                    ...baseCreate,
                    projectId: 'project-1',
                })
            ).rejects.toMatchObject({
                statusCode: EnumFeatureFlagStatusCodeError.disabled,

                constructor: FeatureFlagDisabledException,
                module: 'featureFlag',
                messagePath: 'featureFlag.error.disabled',
            });
            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.invitationAllowed
            );
        });

        it('throws WorkspaceInviteRoleRequiredException when only projectId is given', async () => {
            await expect(
                service.assertProjectRolePaired({
                    ...baseCreate,
                    projectId: 'project-1',
                })
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteRoleRequiredException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteRoleRequired,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.inviteRoleRequired
                    ],
                messagePath: 'workspace.error.inviteRoleRequired',
            });
        });

        it('throws WorkspaceInviteRoleRequiredException when only projectRole is given', async () => {
            await expect(
                service.assertProjectRolePaired({
                    ...baseCreate,
                    projectRoleId: 'role-project-member',
                })
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteRoleRequired,

                constructor: WorkspaceInviteRoleRequiredException,
            });
        });

        it('gates on the invitation flag and passes when both or neither are given', async () => {
            await expect(
                service.assertProjectRolePaired(baseCreate)
            ).resolves.toBeUndefined();
            await expect(
                service.assertProjectRolePaired({
                    ...baseCreate,
                    projectId: 'project-1',
                    projectRoleId: 'role-project-member',
                })
            ).resolves.toBeUndefined();
            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.invitationAllowed
            );
        });
    });

    describe('assertCreatable', () => {
        const pairedCreate = {
            ...baseCreate,
            projectId: 'project-1',
            projectRoleId: 'role-project-member',
        };

        it('throws WorkspaceInviteProjectMismatchException when the project is not active in the workspace', () => {
            expect(() => service.assertCreatable(pairedCreate, null)).toThrow(
                expect.objectContaining({
                    constructor: WorkspaceInviteProjectMismatchException,
                    module: 'workspace',
                    statusCode:
                        EnumWorkspaceStatusCodeError.inviteProjectMismatch,
                    statusCodeKey:
                        EnumWorkspaceStatusCodeError[
                            EnumWorkspaceStatusCodeError.inviteProjectMismatch
                        ],
                    messagePath: 'workspace.error.inviteProjectMismatch',
                })
            );
        });

        it('passes when no project is requested', () => {
            expect(() =>
                service.assertCreatable(baseCreate, null)
            ).not.toThrow();
        });

        it('passes when the requested project is active in the workspace', () => {
            expect(() =>
                service.assertCreatable(pairedCreate, baseProject)
            ).not.toThrow();
        });
    });

    describe('createInvite', () => {
        const nonceCollision = new Error('nonce');
        const tokenCollision = new Error('token');
        const referenceCollision = new Error('reference');
        const retriedTokenData: IWorkspaceInviteTokenData = {
            ...tokenData,
            hashedToken: 'hashed-token-2',
            reference: 'WIN-def456',
        };
        const createdAt = new Date('2026-01-01T00:00:00.000Z');

        beforeEach(() => {
            databaseUtil.createId.mockReturnValue('invite-new');
            helperStringService.random.mockImplementation(length =>
                length === 40 ? 'token-value' : 'abc123'
            );
            helperDateService.create.mockReturnValue(createdAt);
            helperDateService.forward.mockReturnValue(tokenData.expiredAt);
        });

        it('draws the token data and creates the pending invite with the hashed nonce of workspace and email', async () => {
            workspaceInviteRepository.createPendingInTx.mockResolvedValue(
                baseInvite
            );

            const result = await service.createInvite(
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                {
                    ...baseCreate,
                    projectId: 'project-1',
                    projectRoleId: 'role-project-member',
                    expiryDuration: 14,
                },
                unregisteredNotice
            );

            expect(result).toEqual({ invite: baseInvite, tokenData });
            expect(helperDateService.forward).toHaveBeenCalledWith(
                createdAt,
                Duration.fromObject({ days: 14 })
            );
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                WorkspaceInviteNoncePattern,
                { workspaceId: 'workspace-1', email: 'invitee@example.com' }
            );
            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                'workspace-1:invitee@example.com'
            );
            expect(
                workspaceInviteRepository.createPendingInTx
            ).toHaveBeenCalledWith(tx, {
                workspaceInviteId: 'invite-new',
                workspaceId: 'workspace-1',
                email: 'invitee@example.com',
                workspaceRoleId: 'role-workspace-member',
                projectId: 'project-1',
                projectRoleId: 'role-project-member',
                hashedToken: 'hashed-token',
                reference: 'WIN-abc123',
                expiredAt: tokenData.expiredAt,
                invitedByUserId: 'user-1',
                nonce: pendingNonce,
            });
        });

        it('expires the invite after inviteExpiresInDays when the request sends no lifetime', async () => {
            workspaceInviteRepository.createPendingInTx.mockResolvedValue(
                baseInvite
            );
            featureFlagService.getMetadataNumber.mockResolvedValue(9);

            await service.createInvite(
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                baseCreate,
                unregisteredNotice
            );

            expect(featureFlagService.getMetadataNumber).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.inviteExpiresInDays
            );
            expect(helperDateService.forward).toHaveBeenCalledWith(
                createdAt,
                Duration.fromObject({ days: 9 })
            );
        });

        it('does not read the flag when the request sends a lifetime', async () => {
            workspaceInviteRepository.createPendingInTx.mockResolvedValue(
                baseInvite
            );

            await service.createInvite(
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                { ...baseCreate, expiryDuration: 14 },
                unregisteredNotice
            );

            expect(featureFlagService.getMetadataNumber).not.toHaveBeenCalled();
        });

        it('propagates FeatureFlagNotConfiguredException from the read and opens no transaction', async () => {
            const notConfigured = new FeatureFlagNotConfiguredException(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.inviteExpiresInDays
            );
            featureFlagService.getMetadataNumber.mockRejectedValue(
                notConfigured
            );

            await expect(
                service.createInvite(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    baseCreate,
                    unregisteredNotice
                )
            ).rejects.toBe(notConfigured);
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(
                workspaceInviteRepository.createPendingInTx
            ).not.toHaveBeenCalled();
        });

        it('adds the notify effect for an invitee with an account on the invite tx', async () => {
            workspaceInviteRepository.createPendingInTx.mockResolvedValue(
                baseInvite
            );
            helperDateService.formatToIso.mockReturnValue(expiredAtIso);
            notificationService.notify.mockReturnValue(notifyEffect);

            await service.createInvite(
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                baseCreate,
                registeredNotice
            );

            expect(helperDateService.formatToIso).toHaveBeenCalledWith(
                baseInvite.expiredAt
            );
            expect(notificationService.notify).toHaveBeenCalledWith(
                EnumNotificationKind.workspaceInvite,
                {
                    userId: 'user-2',
                    proceedBy: 'user-1',
                    workspaceId: 'workspace-1',
                    workspaceName: 'Acme',
                    inviterName: 'Bramble',
                    reference: 'WIN-abc123',
                    workspaceMemberRole: 'Member',
                    expiredAt: expiredAtIso,
                    inviteAcceptLink: tokenData.claimLink,
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(
                tx,
                notifyEffect
            );
            expect(
                notificationService.notifyUnregisteredInvite
            ).not.toHaveBeenCalled();
        });

        it('adds the unregistered invite effect with the sign-up link for an invitee with no account', async () => {
            workspaceInviteRepository.createPendingInTx.mockResolvedValue(
                baseInvite
            );
            helperDateService.formatToIso.mockReturnValue(expiredAtIso);
            notificationService.notifyUnregisteredInvite.mockReturnValue(
                unregisteredEffect
            );

            await service.createInvite(
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                baseCreate,
                unregisteredNotice
            );

            expect(
                notificationService.notifyUnregisteredInvite
            ).toHaveBeenCalledWith('invitee@example.com', {
                workspaceId: 'workspace-1',
                workspaceName: 'Acme',
                inviterName: 'Bramble',
                reference: 'WIN-abc123',
                workspaceMemberRole: 'Member',
                expiredAt: expiredAtIso,
                inviteAcceptLink: tokenData.signUpLink,
            });
            expect(outboxService.addInTx).toHaveBeenCalledWith(
                tx,
                unregisteredEffect
            );
            expect(notificationService.notify).not.toHaveBeenCalled();
        });

        it('adds the creator entry and the invitee entry beside the notify effect on the invite tx for an invitee with an account', async () => {
            workspaceInviteRepository.createPendingInTx.mockResolvedValue(
                baseInvite
            );
            notificationService.notify.mockReturnValue(notifyEffect);

            await service.createInvite(
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                baseCreate,
                registeredNotice
            );

            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.workspaceInviteCreated,
                    userId: 'user-1',
                    createdBy: 'user-1',
                    workspaceId: 'workspace-1',
                    metadata: {
                        workspaceInviteId: 'invite-1',
                        targetUserId: 'user-2',
                    },
                }
            );
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                2,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.workspaceInviteCreatedByAdmin,
                    userId: 'user-2',
                    createdBy: 'user-1',
                    workspaceId: 'workspace-1',
                    metadata: { actorUserId: 'user-1' },
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(
                tx,
                notifyEffect
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                actorEntry,
                inviteeEntry,
            ]);
        });

        it('adds only the creator entry on the invite tx for an invitee with no account', async () => {
            workspaceInviteRepository.createPendingInTx.mockResolvedValue(
                baseInvite
            );
            notificationService.notifyUnregisteredInvite.mockReturnValue(
                unregisteredEffect
            );

            await service.createInvite(
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                baseCreate,
                unregisteredNotice
            );

            expect(activityLogService.recordEffect).toHaveBeenCalledTimes(1);
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.workspaceInviteCreated,
                    userId: 'user-1',
                    createdBy: 'user-1',
                    workspaceId: 'workspace-1',
                    metadata: { workspaceInviteId: 'invite-1' },
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                actorEntry,
            ]);
        });

        it('adds only the creator entry when the invitee is the creator', async () => {
            workspaceInviteRepository.createPendingInTx.mockResolvedValue(
                baseInvite
            );
            notificationService.notify.mockReturnValue(notifyEffect);

            await service.createInvite(
                requestContext,
                apiKeyContext,
                authContextOfUser2,
                'workspace-1',
                baseCreate,
                registeredNotice
            );

            expect(activityLogService.recordEffect).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                actorEntry,
            ]);
        });

        it('throws WorkspaceInviteDuplicateException when the nonce collides', async () => {
            workspaceInviteRepository.createPendingInTx.mockRejectedValue(
                nonceCollision
            );
            databaseUtil.isUniqueCollision.mockImplementation(
                (_error, target) => target === 'nonce'
            );

            await expect(
                service.createInvite(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    baseCreate,
                    unregisteredNotice
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteDuplicateException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteDuplicate,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.inviteDuplicate
                    ],
                messagePath: 'workspace.error.inviteDuplicate',
            });
            expect(
                workspaceInviteRepository.createPendingInTx
            ).toHaveBeenCalledTimes(1);
        });

        it('draws a fresh token and retries when the token collides, returning the stored token data', async () => {
            helperStringService.random
                .mockReturnValueOnce('token-value')
                .mockReturnValueOnce('abc123')
                .mockReturnValueOnce('token-value')
                .mockReturnValueOnce('def456');
            helperHashService.sha256Hash
                .mockReturnValueOnce(pendingNonce)
                .mockReturnValueOnce('hashed-token')
                .mockReturnValueOnce('hashed-token-2');
            workspaceInviteRepository.createPendingInTx
                .mockRejectedValueOnce(tokenCollision)
                .mockResolvedValueOnce(baseInvite);
            databaseUtil.isUniqueCollision.mockImplementation(
                (_error, target) => target === 'token'
            );

            const result = await service.createInvite(
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                baseCreate,
                unregisteredNotice
            );

            expect(result).toEqual({
                invite: baseInvite,
                tokenData: retriedTokenData,
            });
            expect(
                workspaceInviteRepository.createPendingInTx
            ).toHaveBeenNthCalledWith(
                2,
                tx,
                expect.objectContaining({
                    hashedToken: 'hashed-token-2',
                    reference: 'WIN-def456',
                })
            );
        });

        it('draws a fresh reference and retries when the reference collides', async () => {
            helperStringService.random
                .mockReturnValueOnce('token-value')
                .mockReturnValueOnce('abc123')
                .mockReturnValueOnce('token-value')
                .mockReturnValueOnce('def456');
            helperHashService.sha256Hash
                .mockReturnValueOnce(pendingNonce)
                .mockReturnValueOnce('hashed-token')
                .mockReturnValueOnce('hashed-token-2');
            workspaceInviteRepository.createPendingInTx
                .mockRejectedValueOnce(referenceCollision)
                .mockResolvedValueOnce(baseInvite);
            databaseUtil.isUniqueCollision.mockImplementation(
                (_error, target) => target === 'reference'
            );

            const result = await service.createInvite(
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                baseCreate,
                unregisteredNotice
            );

            expect(result.tokenData).toEqual(retriedTokenData);
            expect(
                workspaceInviteRepository.createPendingInTx
            ).toHaveBeenCalledTimes(2);
        });

        it('throws DatabaseUniqueValueGenerationFailedException once the attempt budget is spent', async () => {
            workspaceInviteRepository.createPendingInTx.mockRejectedValue(
                tokenCollision
            );
            databaseUtil.isUniqueCollision.mockImplementation(
                (_error, target) => target === 'token'
            );

            await expect(
                service.createInvite(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    baseCreate,
                    unregisteredNotice
                )
            ).rejects.toBeInstanceOf(
                DatabaseUniqueValueGenerationFailedException
            );
            expect(
                workspaceInviteRepository.createPendingInTx
            ).toHaveBeenCalledTimes(5);
        });

        it('rethrows an application exception unchanged', async () => {
            const failure = new WorkspaceInviteInvalidException();
            workspaceInviteRepository.createPendingInTx.mockRejectedValue(
                failure
            );
            databaseUtil.isUniqueCollision.mockReturnValue(false);

            await expect(
                service.createInvite(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    baseCreate,
                    unregisteredNotice
                )
            ).rejects.toBe(failure);
        });

        it('throws WorkspaceInviteDuplicateException on a write conflict without retrying', async () => {
            const conflict = new Error('write-conflict');
            workspaceInviteRepository.createPendingInTx.mockRejectedValue(
                conflict
            );
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.createInvite(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    baseCreate,
                    unregisteredNotice
                )
            ).rejects.toMatchObject({
                module: 'workspace',

                constructor: WorkspaceInviteDuplicateException,
                statusCode: EnumWorkspaceStatusCodeError.inviteDuplicate,
                messagePath: 'workspace.error.inviteDuplicate',
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(
                workspaceInviteRepository.createPendingInTx
            ).toHaveBeenCalledTimes(1);
        });

        it('wraps another failure in AppUnknownException without retrying', async () => {
            const cause = new Error('db-down');
            workspaceInviteRepository.createPendingInTx.mockRejectedValue(
                cause
            );
            databaseUtil.isUniqueCollision.mockReturnValue(false);

            await expect(
                service.createInvite(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    baseCreate,
                    unregisteredNotice
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
            expect(
                workspaceInviteRepository.createPendingInTx
            ).toHaveBeenCalledTimes(1);
        });
    });

    describe('getPendingById', () => {
        it('throws FeatureFlagDisabledException and reads no invite when workspace invitations are off', async () => {
            featureFlagService.validateFeatureFlagMetadata.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                service.getPendingById('invite-1', 'workspace-1', null)
            ).rejects.toMatchObject({
                statusCode: EnumFeatureFlagStatusCodeError.disabled,

                constructor: FeatureFlagDisabledException,
                module: 'featureFlag',
                messagePath: 'featureFlag.error.disabled',
            });
            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.invitationAllowed
            );
            expect(
                workspaceInviteRepository.findByIdAndWorkspace
            ).not.toHaveBeenCalled();
        });

        it('throws WorkspaceInviteNotFoundException when the invite does not exist', async () => {
            workspaceInviteRepository.findByIdAndWorkspace.mockResolvedValue(
                null
            );

            await expect(
                service.getPendingById('invite-1', 'workspace-1', null)
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteNotFound,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.inviteNotFound
                    ],
                messagePath: 'workspace.error.inviteNotFound',
            });
        });

        it('throws WorkspaceInviteAlreadyProcessedException when the invite is no longer pending', async () => {
            workspaceInviteRepository.findByIdAndWorkspace.mockResolvedValue({
                ...baseInvite,
                status: EnumWorkspaceInviteStatus.accepted,
            });

            await expect(
                service.getPendingById('invite-1', 'workspace-1', null)
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteAlreadyProcessedException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteAlreadyProcessed,
                messagePath: 'workspace.error.inviteAlreadyProcessed',
            });
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('returns the pending invite', async () => {
            workspaceInviteRepository.findByIdAndWorkspace.mockResolvedValue(
                baseInvite
            );

            const additionalWhere = { workspaceId: 'workspace-1' };

            const result = await service.getPendingById(
                'invite-1',
                'workspace-1',
                additionalWhere
            );

            expect(result).toBe(baseInvite);
            expect(
                workspaceInviteRepository.findByIdAndWorkspace
            ).toHaveBeenCalledWith('invite-1', 'workspace-1', additionalWhere);
        });
    });

    describe('getResendableById', () => {
        it('throws WorkspaceInviteInvalidException when the pending invite reached its expiry', async () => {
            workspaceInviteRepository.findByIdAndWorkspace.mockResolvedValue(
                baseInvite
            );
            helperDateService.create.mockReturnValue(baseInvite.expiredAt);

            await expect(
                service.getResendableById('invite-1', 'workspace-1', null)
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteInvalidException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteInvalid,
                messagePath: 'workspace.error.inviteInvalid',
            });
        });

        it('throws WorkspaceInviteAlreadyProcessedException when the invite is no longer pending', async () => {
            workspaceInviteRepository.findByIdAndWorkspace.mockResolvedValue({
                ...baseInvite,
                status: EnumWorkspaceInviteStatus.expired,
            });

            await expect(
                service.getResendableById('invite-1', 'workspace-1', null)
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteAlreadyProcessed,

                constructor: WorkspaceInviteAlreadyProcessedException,
            });
        });

        it('returns the pending invite before its expiry', async () => {
            workspaceInviteRepository.findByIdAndWorkspace.mockResolvedValue(
                baseInvite
            );
            helperDateService.create.mockReturnValue(
                new Date('2026-01-31T23:59:59.000Z')
            );

            const additionalWhere = { workspaceId: 'workspace-1' };

            const result = await service.getResendableById(
                'invite-1',
                'workspace-1',
                additionalWhere
            );

            expect(result).toBe(baseInvite);
            expect(
                workspaceInviteRepository.findByIdAndWorkspace
            ).toHaveBeenCalledWith('invite-1', 'workspace-1', additionalWhere);
            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledTimes(1);
        });
    });

    describe('resendInvite', () => {
        const retriedTokenData: IWorkspaceInviteTokenData = {
            ...tokenData,
            hashedToken: 'hashed-token-2',
            reference: 'WIN-def456',
        };
        const resentAt = new Date('2026-01-15T00:00:00.000Z');

        beforeEach(() => {
            helperStringService.random.mockImplementation(length =>
                length === 40 ? 'token-value' : 'abc123'
            );
            helperDateService.create.mockReturnValue(resentAt);
            helperDateService.forward.mockReturnValue(tokenData.expiredAt);
        });

        it('draws the token data, rotates the token, and returns the rotated invite with the stored token data', async () => {
            workspaceInviteRepository.rotateForResendInTx.mockResolvedValue(
                baseInvite
            );

            const result = await service.resendInvite(
                requestContext,
                apiKeyContext,
                authContext,
                'invite-1',
                14,
                unregisteredNotice
            );

            expect(result).toEqual({ invite: baseInvite, tokenData });
            expect(helperDateService.forward).toHaveBeenCalledWith(
                resentAt,
                Duration.fromObject({ days: 14 })
            );
            expect(
                workspaceInviteRepository.rotateForResendInTx
            ).toHaveBeenCalledWith(
                tx,
                'invite-1',
                'hashed-token',
                'WIN-abc123',
                tokenData.expiredAt,
                resentAt
            );
        });

        it('expires the invite after inviteExpiresInDays when the request sends no lifetime', async () => {
            workspaceInviteRepository.rotateForResendInTx.mockResolvedValue(
                baseInvite
            );
            featureFlagService.getMetadataNumber.mockResolvedValue(9);

            await service.resendInvite(
                requestContext,
                apiKeyContext,
                authContext,
                'invite-1',
                null,
                unregisteredNotice
            );

            expect(featureFlagService.getMetadataNumber).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.inviteExpiresInDays
            );
            expect(helperDateService.forward).toHaveBeenCalledWith(
                resentAt,
                Duration.fromObject({ days: 9 })
            );
        });

        it('does not read the flag when the request sends a lifetime', async () => {
            workspaceInviteRepository.rotateForResendInTx.mockResolvedValue(
                baseInvite
            );

            await service.resendInvite(
                requestContext,
                apiKeyContext,
                authContext,
                'invite-1',
                14,
                unregisteredNotice
            );

            expect(featureFlagService.getMetadataNumber).not.toHaveBeenCalled();
        });

        it('propagates FeatureFlagNotConfiguredException from the read and opens no transaction', async () => {
            const notConfigured = new FeatureFlagNotConfiguredException(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.inviteExpiresInDays
            );
            featureFlagService.getMetadataNumber.mockRejectedValue(
                notConfigured
            );

            await expect(
                service.resendInvite(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'invite-1',
                    null,
                    unregisteredNotice
                )
            ).rejects.toBe(notConfigured);
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(
                workspaceInviteRepository.rotateForResendInTx
            ).not.toHaveBeenCalled();
        });

        it('adds the invite effect on the rotation tx', async () => {
            workspaceInviteRepository.rotateForResendInTx.mockResolvedValue(
                baseInvite
            );
            helperDateService.formatToIso.mockReturnValue(expiredAtIso);
            notificationService.notify.mockReturnValue(notifyEffect);

            await service.resendInvite(
                requestContext,
                apiKeyContext,
                authContext,
                'invite-1',
                null,
                registeredNotice
            );

            expect(notificationService.notify).toHaveBeenCalledWith(
                EnumNotificationKind.workspaceInvite,
                expect.objectContaining({
                    userId: 'user-2',
                    proceedBy: 'user-1',
                    reference: 'WIN-abc123',
                    inviteAcceptLink: tokenData.claimLink,
                })
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(
                tx,
                notifyEffect
            );
        });

        it('adds the sender entry and the invitee entry on the rotation tx for an invitee with an account', async () => {
            workspaceInviteRepository.rotateForResendInTx.mockResolvedValue(
                baseInvite
            );
            notificationService.notify.mockReturnValue(notifyEffect);

            await service.resendInvite(
                requestContext,
                apiKeyContext,
                authContext,
                'invite-1',
                null,
                registeredNotice
            );

            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.workspaceInviteResent,
                    userId: 'user-1',
                    createdBy: 'user-1',
                    workspaceId: 'workspace-1',
                    metadata: {
                        workspaceInviteId: 'invite-1',
                        targetUserId: 'user-2',
                    },
                }
            );
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                2,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.workspaceInviteResentByAdmin,
                    userId: 'user-2',
                    createdBy: 'user-1',
                    workspaceId: 'workspace-1',
                    metadata: { actorUserId: 'user-1' },
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                actorEntry,
                inviteeEntry,
            ]);
        });

        it('adds only the sender entry for an invitee with no account', async () => {
            workspaceInviteRepository.rotateForResendInTx.mockResolvedValue(
                baseInvite
            );
            notificationService.notifyUnregisteredInvite.mockReturnValue(
                unregisteredEffect
            );

            await service.resendInvite(
                requestContext,
                apiKeyContext,
                authContext,
                'invite-1',
                null,
                unregisteredNotice
            );

            expect(activityLogService.recordEffect).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                actorEntry,
            ]);
        });

        it('throws WorkspaceInviteAlreadyProcessedException when the guarded rotation misses', async () => {
            workspaceInviteRepository.rotateForResendInTx.mockResolvedValue(
                null
            );

            await expect(
                service.resendInvite(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'invite-1',
                    null,
                    unregisteredNotice
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteAlreadyProcessedException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteAlreadyProcessed,
                messagePath: 'workspace.error.inviteAlreadyProcessed',
            });
        });

        it('draws a fresh token and retries when the token or reference collides, returning the stored token data', async () => {
            const collision = new Error('token');
            helperStringService.random
                .mockReturnValueOnce('token-value')
                .mockReturnValueOnce('abc123')
                .mockReturnValueOnce('token-value')
                .mockReturnValueOnce('def456');
            helperHashService.sha256Hash
                .mockReturnValueOnce('hashed-token')
                .mockReturnValueOnce('hashed-token-2');
            workspaceInviteRepository.rotateForResendInTx
                .mockRejectedValueOnce(collision)
                .mockResolvedValueOnce(baseInvite);
            databaseUtil.isUniqueCollision.mockImplementation(
                (_error, target) => target === 'token'
            );

            const result = await service.resendInvite(
                requestContext,
                apiKeyContext,
                authContext,
                'invite-1',
                null,
                unregisteredNotice
            );

            expect(result).toEqual({
                invite: baseInvite,
                tokenData: retriedTokenData,
            });
            expect(
                workspaceInviteRepository.rotateForResendInTx
            ).toHaveBeenNthCalledWith(
                2,
                tx,
                'invite-1',
                'hashed-token-2',
                'WIN-def456',
                tokenData.expiredAt,
                resentAt
            );
        });

        it('throws DatabaseUniqueValueGenerationFailedException once the attempt budget is spent', async () => {
            workspaceInviteRepository.rotateForResendInTx.mockRejectedValue(
                new Error('reference')
            );
            databaseUtil.isUniqueCollision.mockImplementation(
                (_error, target) => target === 'reference'
            );

            await expect(
                service.resendInvite(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'invite-1',
                    null,
                    unregisteredNotice
                )
            ).rejects.toBeInstanceOf(
                DatabaseUniqueValueGenerationFailedException
            );
            expect(
                workspaceInviteRepository.rotateForResendInTx
            ).toHaveBeenCalledTimes(5);
        });

        it('maps a write conflict on the rotation to WorkspaceInviteAlreadyProcessedException', async () => {
            const conflict = new Error('conflict');
            workspaceInviteRepository.rotateForResendInTx.mockRejectedValue(
                conflict
            );
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.resendInvite(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'invite-1',
                    null,
                    unregisteredNotice
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteAlreadyProcessed,

                constructor: WorkspaceInviteAlreadyProcessedException,
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('wraps another rotation failure in AppUnknownException', async () => {
            const cause = new Error('db-down');
            workspaceInviteRepository.rotateForResendInTx.mockRejectedValue(
                cause
            );
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                service.resendInvite(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'invite-1',
                    null,
                    unregisteredNotice
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });

    describe('revokeInvite', () => {
        it('revokes the invite and adds the revoker entry and the invitee entry on one tx', async () => {
            workspaceInviteRepository.revokeInTx.mockResolvedValue(true);

            await service.revokeInvite(
                requestContext,
                apiKeyContext,
                authContext,
                'invite-1',
                'workspace-1',
                'user-2'
            );

            expect(workspaceInviteRepository.revokeInTx).toHaveBeenCalledWith(
                tx,
                'invite-1'
            );
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.workspaceInviteRevoked,
                    userId: 'user-1',
                    createdBy: 'user-1',
                    workspaceId: 'workspace-1',
                    metadata: {
                        workspaceInviteId: 'invite-1',
                        targetUserId: 'user-2',
                    },
                }
            );
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                2,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.workspaceInviteRevokedByAdmin,
                    userId: 'user-2',
                    createdBy: 'user-1',
                    workspaceId: 'workspace-1',
                    metadata: { actorUserId: 'user-1' },
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                actorEntry,
                inviteeEntry,
            ]);
        });

        it('adds only the revoker entry for an invitee with no account', async () => {
            workspaceInviteRepository.revokeInTx.mockResolvedValue(true);

            await service.revokeInvite(
                requestContext,
                apiKeyContext,
                authContext,
                'invite-1',
                'workspace-1',
                null
            );

            expect(activityLogService.recordEffect).toHaveBeenCalledTimes(1);
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.workspaceInviteRevoked,
                    userId: 'user-1',
                    createdBy: 'user-1',
                    workspaceId: 'workspace-1',
                    metadata: { workspaceInviteId: 'invite-1' },
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                actorEntry,
            ]);
        });

        it('throws WorkspaceInviteAlreadyProcessedException and adds no entry when the guarded revoke matches no pending invite', async () => {
            workspaceInviteRepository.revokeInTx.mockResolvedValue(false);

            await expect(
                service.revokeInvite(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'invite-1',
                    'workspace-1',
                    null
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteAlreadyProcessedException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteAlreadyProcessed,
                messagePath: 'workspace.error.inviteAlreadyProcessed',
            });
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('maps a write conflict to WorkspaceInviteAlreadyProcessedException', async () => {
            const conflict = new Error('conflict');
            workspaceInviteRepository.revokeInTx.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.revokeInvite(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'invite-1',
                    'workspace-1',
                    null
                )
            ).rejects.toBeInstanceOf(WorkspaceInviteAlreadyProcessedException);
        });

        it('wraps an unknown failure in AppUnknownException', async () => {
            const failure = new Error('boom');
            workspaceInviteRepository.revokeInTx.mockRejectedValue(failure);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                service.revokeInvite(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'invite-1',
                    'workspace-1',
                    null
                )
            ).rejects.toBeInstanceOf(AppUnknownException);
        });
    });

    describe('acceptPendingInTx', () => {
        const tx = {} as IDatabaseTransactionClient;
        const acceptedAt = new Date('2026-01-01T00:00:00.000Z');

        it('accepts the invite on the given transaction', async () => {
            workspaceInviteRepository.acceptInTx.mockResolvedValue(true);

            await service.acceptPendingInTx(
                tx,
                'invite-1',
                'user-2',
                acceptedAt
            );

            expect(workspaceInviteRepository.acceptInTx).toHaveBeenCalledWith(
                tx,
                'invite-1',
                'user-2',
                acceptedAt
            );
            expect(helperHashService.sha256Hash).not.toHaveBeenCalledWith(
                'invite-1'
            );
        });

        it('throws WorkspaceInviteAlreadyProcessedException when the guarded accept matches no pending invite', async () => {
            workspaceInviteRepository.acceptInTx.mockResolvedValue(false);

            await expect(
                service.acceptPendingInTx(tx, 'invite-1', 'user-2', acceptedAt)
            ).rejects.toMatchObject({
                module: 'workspace',

                constructor: WorkspaceInviteAlreadyProcessedException,
                statusCode: EnumWorkspaceStatusCodeError.inviteAlreadyProcessed,
                messagePath: 'workspace.error.inviteAlreadyProcessed',
            });
        });

        it('maps a write conflict on the accept to WorkspaceInviteAlreadyProcessedException', async () => {
            const conflict = new Error('conflict');
            workspaceInviteRepository.acceptInTx.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.acceptPendingInTx(tx, 'invite-1', 'user-2', acceptedAt)
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteAlreadyProcessed,

                constructor: WorkspaceInviteAlreadyProcessedException,
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('wraps another accept failure in AppUnknownException', async () => {
            const cause = new Error('db-down');
            workspaceInviteRepository.acceptInTx.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                service.acceptPendingInTx(tx, 'invite-1', 'user-2', acceptedAt)
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });

    describe('acceptOnSignUpInTx', () => {
        const tx = {} as IDatabaseTransactionClient;
        const inviteContext: IUserSignUpWorkspaceInvite = {
            type: EnumUserSignUpWorkspaceContextType.invite,
            workspaceId: 'workspace-1',
            workspaceInviteId: 'invite-1',
            invitedByUserId: 'user-1',
            workspaceMemberRoleId: 'role-workspace-member',
            projectId: 'project-1',
            projectMemberRoleId: 'role-project-member',
        };

        beforeEach(() => {
            workspaceInviteRepository.acceptInTx.mockResolvedValue(true);
            helperDateService.create.mockReturnValue(
                new Date('2026-01-01T00:00:00.000Z')
            );
        });

        it('throws WorkspaceInviteAlreadyProcessedException when the guarded accept matches no pending invite', async () => {
            workspaceInviteRepository.acceptInTx.mockResolvedValue(false);

            await expect(
                service.acceptOnSignUpInTx(tx, 'user-2', inviteContext)
            ).rejects.toMatchObject({
                module: 'workspace',

                constructor: WorkspaceInviteAlreadyProcessedException,
                statusCode: EnumWorkspaceStatusCodeError.inviteAlreadyProcessed,
                messagePath: 'workspace.error.inviteAlreadyProcessed',
            });
        });

        it('accepts the invite, then creates the workspace membership on the same transaction', async () => {
            await service.acceptOnSignUpInTx(tx, 'user-2', inviteContext);

            expect(workspaceMemberService.createInTx).toHaveBeenCalledWith(
                tx,
                'workspace-1',
                'user-2',
                'role-workspace-member',
                'user-2'
            );
            expect(workspaceInviteRepository.acceptInTx).toHaveBeenCalledWith(
                tx,
                'invite-1',
                'user-2',
                new Date('2026-01-01T00:00:00.000Z')
            );
            expect(workspaceInviteRepository.acceptInTx).toHaveBeenCalledBefore(
                workspaceMemberService.createInTx
            );
        });
    });

    describe('getWorkspaceOfInvite', () => {
        it('throws WorkspaceInviteInvalidException when the workspace is not active', async () => {
            workspaceRepository.findActiveById.mockResolvedValue(null);

            await expect(
                service.getWorkspaceOfInvite(baseInvite)
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteInvalidException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteInvalid,
                messagePath: 'workspace.error.inviteInvalid',
            });
        });

        it('returns the active workspace of the invite', async () => {
            workspaceRepository.findActiveById.mockResolvedValue(workspace);

            const result = await service.getWorkspaceOfInvite(baseInvite);

            expect(result).toBe(workspace);
            expect(workspaceRepository.findActiveById).toHaveBeenCalledWith(
                'workspace-1'
            );
        });
    });

    describe('mapInvitePreview', () => {
        const workspaceRoleRef = {
            id: 'role-workspace-member',
            scope: EnumRoleScope.workspace,
            key: 'member',
            name: 'Member',
            policyRevision: 0,
        };

        it('uses the inviter name when present', () => {
            const inviter: IUserName = {
                name: 'Jane Doe',
                username: 'jane',
            };

            const result = service.mapInvitePreview(
                workspace,
                baseInvite,
                inviter,
                workspaceRoleRef
            );

            expect(result).toEqual({
                workspaceName: 'Acme',
                inviterName: 'Jane Doe',
                workspaceRole: workspaceRoleRef,
                expiredAt: baseInvite.expiredAt,
            });
        });

        it('falls back to the inviter username when the name is null', () => {
            const inviter: IUserName = {
                name: null,
                username: 'jane',
            };

            const result = service.mapInvitePreview(
                workspace,
                baseInvite,
                inviter,
                workspaceRoleRef
            );

            expect(result.inviterName).toBe('jane');
        });

        it('falls back to the workspace name when the inviter is null', () => {
            const result = service.mapInvitePreview(
                workspace,
                baseInvite,
                null,
                workspaceRoleRef
            );

            expect(result.inviterName).toBe('Acme');
        });
    });

    describe('resolveInviterName', () => {
        it('returns the inviter name', () => {
            expect(
                service['resolveInviterName'](
                    { name: 'Jane Doe', username: 'jane' },
                    workspace
                )
            ).toBe('Jane Doe');
        });

        it('falls back to the inviter username when the name is null', () => {
            expect(
                service['resolveInviterName'](
                    { name: null, username: 'jane' },
                    workspace
                )
            ).toBe('jane');
        });

        it('falls back to the workspace name when the inviter is missing', () => {
            expect(service['resolveInviterName'](null, workspace)).toBe('Acme');
        });
    });

    describe('createInviteTokenData', () => {
        beforeEach(() => {
            helperStringService.random
                .mockReturnValueOnce('token-value')
                .mockReturnValueOnce('reference-suffix');
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            helperDateService.create.mockReturnValue(
                new Date('2026-01-01T00:00:00.000Z')
            );
            helperDateService.forward.mockReturnValue(
                new Date('2026-01-08T00:00:00.000Z')
            );
            helperStringService.fillPattern
                .mockReturnValueOnce(
                    'https://app.example.com/workspace/invites?inviteToken=token-value'
                )
                .mockReturnValueOnce(
                    'https://app.example.com/sign-up/token-value'
                );
        });

        it('builds token data expiring after the given days', () => {
            const result = service['createInviteTokenData'](7);

            expect(result).toEqual({
                token: 'token-value',
                hashedToken: 'hashed-token',
                reference: 'WIN-reference-suffix',
                expiredAt: new Date('2026-01-08T00:00:00.000Z'),
                claimLink:
                    'https://app.example.com/workspace/invites?inviteToken=token-value',
                signUpLink: 'https://app.example.com/sign-up/token-value',
            });
            expect(helperStringService.random).toHaveBeenNthCalledWith(1, 40);
            expect(helperStringService.random).toHaveBeenNthCalledWith(2, 6);
            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                'token-value'
            );
            expect(helperDateService.forward).toHaveBeenCalledWith(
                new Date('2026-01-01T00:00:00.000Z'),
                Duration.fromObject({ days: 7 })
            );
            expect(helperStringService.fillPattern).toHaveBeenNthCalledWith(
                1,
                '{frontendBaseUrl}/workspace/invites?inviteToken={token}',
                {
                    frontendBaseUrl: 'https://app.example.com',
                    token: 'token-value',
                }
            );
            expect(helperStringService.fillPattern).toHaveBeenNthCalledWith(
                2,
                '{frontendBaseUrl}/sign-up/{token}',
                {
                    frontendBaseUrl: 'https://app.example.com',
                    token: 'token-value',
                }
            );
        });
    });

    describe('isInviteEmailMatch', () => {
        it('returns true for the same email in a different case', () => {
            expect(
                service['isInviteEmailMatch'](
                    'Invitee@Example.com',
                    'invitee@example.com'
                )
            ).toBe(true);
        });

        it('returns false for a different email', () => {
            expect(
                service['isInviteEmailMatch'](
                    'invitee@example.com',
                    'other@example.com'
                )
            ).toBe(false);
        });
    });
});
