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
import { AwsSesNotConfiguredException } from '@common/aws/exceptions/aws.ses-not-configured.exception';
import { AwsSesService } from '@common/aws/services/aws.ses.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { DatabaseWriteConflictCode } from '@common/database/constants/database.constant';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumProjectMemberRole,
    EnumWorkspaceInviteStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type {
    Project,
    Workspace,
    WorkspaceInvite,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { FeatureFlagNotConfiguredException } from '@modules/feature-flag/exceptions/feature-flag.not-configured.exception';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import {
    EnumNotificationEmailProcess,
    EnumNotificationKind,
    EnumNotificationProcess,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { EnumUserCreateWorkspaceContextType } from '@modules/user/enums/user.enum';
import type { IUserCreateWorkspaceInvite } from '@modules/user/interfaces/user.interface';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceInviteAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.invite-already-processed.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceInviteInvalidException } from '@modules/workspace/exceptions/workspace.invite-invalid.exception';
import { WorkspaceInviteNotFoundException } from '@modules/workspace/exceptions/workspace.invite-not-found.exception';
import { WorkspaceInviteProjectMismatchException } from '@modules/workspace/exceptions/workspace.invite-project-mismatch.exception';
import { WorkspaceInviteRoleRequiredException } from '@modules/workspace/exceptions/workspace.invite-role-required.exception';
import { WorkspaceMemberAlreadyExistsException } from '@modules/workspace/exceptions/workspace.member-already-exists.exception';
import type {
    IWorkspaceInviteCreate,
    IWorkspaceInviteNotice,
    IWorkspaceInvitePrepared,
    IWorkspaceInvitePreview,
    IWorkspaceInviteTokenData,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceInviteRepository } from '@modules/workspace/repositories/workspace.invite.repository';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
    buildUser,
    buildUserContext,
    buildWorkspace,
    buildWorkspaceMember,
} from '@test/unit/helpers/test.unit.request.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { buildPrismaKnownRequestError } from '@test/unit/helpers/test.unit.database.helper';
import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';

describe('WorkspaceInviteService', () => {
    const workspaceInviteRepository: MockProxy<WorkspaceInviteRepository> =
        mock<WorkspaceInviteRepository>();
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const featureFlagService: MockProxy<FeatureFlagService> =
        mock<FeatureFlagService>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const notificationEmailQueue: MockProxy<NotificationEmailQueue> =
        mock<NotificationEmailQueue>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    let databaseUtil: DatabaseUtil;
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const awsSesService: MockProxy<AwsSesService> = mock<AwsSesService>();
    const tx: IDatabaseTransactionClient = mock<IDatabaseTransactionClient>();
    let helperStringService: HelperStringService;

    const configValues: Record<string, unknown> = {
        'frontend.baseUrl': 'https://app.example.com',
        'workspace.invite.tokenLength': 40,
        'workspace.invite.referencePrefix': 'WIN',
        'workspace.invite.referenceRandomLength': 6,
        'workspace.invite.linkPattern':
            '{frontendBaseUrl}/workspace/invites?inviteToken={token}',
        'workspace.invite.signUpLinkPattern':
            '{frontendBaseUrl}/sign-up/{token}',
        'message.availableLanguages': ['en'],
    };

    const workspace: Workspace = buildWorkspace();

    const pendingNonce =
        '28dbd2a5ea6f78b33ac88d3e3f462b41490294c060bcc2552d4a4afe45e7949f';
    const rawTokenHash =
        '34d328009b123fbbb0dc93f18b3e6de1ecf7b1a5783c33dff7ffe1926f09e943';
    const tokenValueHash =
        'e6c02a5742ea9d4de588eb9b9de7bed43dc17011552186bed3e98b2c5958ff4a';

    const baseInvite: WorkspaceInvite = {
        id: 'invite-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: 'user-1',
        workspaceId: 'workspace-1',
        email: 'invitee@example.com',
        token: 'hashed-token',
        workspaceRole: EnumWorkspaceMemberRole.member,
        projectId: null,
        projectRole: null,
        reference: 'WIN-abc123',
        expiredAt: new Date('2026-02-01T00:00:00.000Z'),
        status: EnumWorkspaceInviteStatus.pending,
        invitedByUserId: 'user-1',
        acceptedAt: null,
        acceptedByUserId: null,
        nonce: pendingNonce,
    };

    const previewInvite: IWorkspaceInvitePreview = {
        ...baseInvite,
        workspace,
        invitedBy: { name: 'Bramble', username: 'bramble', deletedAt: null },
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
        hashedToken: tokenValueHash,
        reference: 'WIN-abc123',
        expiredAt: new Date('2026-02-01T00:00:00.000Z'),
        claimLink:
            'https://app.example.com/workspace/invites?inviteToken=token-value',
        signUpLink: 'https://app.example.com/sign-up/token-value',
    };

    const baseCreate: IWorkspaceInviteCreate = {
        email: 'invitee@example.com' as Lowercase<string>,
        workspaceRole: EnumWorkspaceMemberRole.member,
        projectId: null,
        projectRole: null,
        expiryDuration: null,
    };

    const unregisteredNotice: IWorkspaceInviteNotice = {
        workspaceName: 'Acme',
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

    beforeAll(() => {
        vi.useFakeTimers();
    });

    beforeEach(async () => {
        featureFlagService.getMetadataNumber.mockResolvedValue(7);
        activityLogQueue.recordEffect
            .mockReturnValueOnce(actorEntry)
            .mockReturnValueOnce(inviteeEntry);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceInviteService,
                {
                    provide: WorkspaceInviteRepository,
                    useValue: workspaceInviteRepository,
                },
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
                { provide: FeatureFlagService, useValue: featureFlagService },
                { provide: NotificationQueue, useValue: notificationQueue },
                {
                    provide: NotificationEmailQueue,
                    useValue: notificationEmailQueue,
                },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                ...TestUnitKitProviders,
                { provide: OutboxService, useValue: outboxService },
                { provide: AwsSesService, useValue: awsSesService },
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                        ...configValues,
                    }),
                },
            ],
        }).compile();

        service = module.get(WorkspaceInviteService);
        databaseUtil = module.get(DatabaseUtil);
        helperStringService = module.get(HelperStringService);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    describe('assertEmailDeliverable', () => {
        it('throws AwsSesNotConfiguredException when SES is not initialized', () => {
            awsSesService.isInitialized.mockReturnValue(false);

            expect(() => service.assertEmailDeliverable()).toThrow(
                AwsSesNotConfiguredException
            );
        });

        it('returns when SES is initialized', () => {
            awsSesService.isInitialized.mockReturnValue(true);

            expect(() => service.assertEmailDeliverable()).not.toThrow();
        });
    });

    describe('validateInviteToken', () => {
        it('starts the invite read while the invitation gate is still pending', async () => {
            const gate = buildDeferred<void>();
            featureFlagService.validateFeatureFlagMetadata.mockReturnValue(
                gate.promise
            );
            workspaceInviteRepository.findPendingByHashedToken.mockResolvedValue(
                previewInvite
            );

            const pending = service.validateInviteToken('raw-token');
            expect(
                workspaceInviteRepository.findPendingByHashedToken
            ).toHaveBeenCalledWith(rawTokenHash);
            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.invitationAllowed
            );

            gate.resolve();

            await expect(pending).resolves.toBe(previewInvite);
        });

        it('throws FeatureFlagDisabledException when workspace invitations are off', async () => {
            featureFlagService.validateFeatureFlagMetadata.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                service.validateInviteToken('raw-token')
            ).rejects.toMatchObject({
                statusCode: EnumFeatureFlagStatusCodeError.disabled,

                constructor: FeatureFlagDisabledException,
                module: 'featureFlag',
            });
            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.invitationAllowed
            );
        });

        it('throws WorkspaceInviteInvalidException when no pending invite matches the token', async () => {
            workspaceInviteRepository.findPendingByHashedToken.mockResolvedValue(
                null
            );

            await expect(
                service.validateInviteToken('raw-token')
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteInvalidException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteInvalid,
            });
            expect(
                workspaceInviteRepository.findPendingByHashedToken
            ).toHaveBeenCalledWith(rawTokenHash);
        });

        it('throws WorkspaceNotFoundException when the invite workspace is soft-deleted', async () => {
            workspaceInviteRepository.findPendingByHashedToken.mockResolvedValue(
                {
                    ...previewInvite,
                    workspace: {
                        ...workspace,
                        deletedAt: new Date('2026-01-02T00:00:00.000Z'),
                    },
                }
            );

            await expect(
                service.validateInviteToken('raw-token')
            ).rejects.toMatchObject({
                constructor: WorkspaceNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.notFound,
            });
        });

        it('returns the pending invite matching the token', async () => {
            workspaceInviteRepository.findPendingByHashedToken.mockResolvedValue(
                previewInvite
            );

            const result = await service.validateInviteToken('raw-token');

            expect(result).toBe(previewInvite);
            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.invitationAllowed
            );
            expect(
                workspaceInviteRepository.findPendingByHashedToken
            ).toHaveBeenCalledWith(rawTokenHash);
        });
    });

    describe('validateInviteForEmail', () => {
        it('throws FeatureFlagDisabledException when workspace invitations are off', async () => {
            featureFlagService.validateFeatureFlagMetadata.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                service.validateInviteForEmail('raw-token', 'user@example.com')
            ).rejects.toMatchObject({
                statusCode: EnumFeatureFlagStatusCodeError.disabled,

                constructor: FeatureFlagDisabledException,
                module: 'featureFlag',
            });
            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.invitationAllowed
            );
        });

        it('throws WorkspaceInviteInvalidException when no pending invite matches the token', async () => {
            workspaceInviteRepository.findPendingByHashedToken.mockResolvedValue(
                null
            );

            await expect(
                service.validateInviteForEmail('raw-token', 'user@example.com')
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteInvalidException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteInvalid,
            });
        });

        it('throws WorkspaceInviteInvalidException when the invite email does not match', async () => {
            workspaceInviteRepository.findPendingByHashedToken.mockResolvedValue(
                { ...previewInvite, email: 'other@example.com' }
            );

            await expect(
                service.validateInviteForEmail('raw-token', 'USER@example.com')
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteInvalidException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteInvalid,
            });
        });

        it('returns the pending invite when its email matches', async () => {
            workspaceInviteRepository.findPendingByHashedToken.mockResolvedValue(
                previewInvite
            );

            const result = await service.validateInviteForEmail(
                'raw-token',
                'invitee@example.com'
            );

            expect(result).toBe(previewInvite);
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
            workspaceInviteRepository.findPendingByHashedToken.mockResolvedValue(
                previewInvite
            );

            const result = await service.getSignUpInvite(
                'raw-token',
                'invitee@example.com'
            );

            expect(result).toBe(previewInvite);
            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.invitationAllowed
            );
        });
    });

    describe('assertInviteeNotMember', () => {
        const member: WorkspaceMember = buildWorkspaceMember('user-2');

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

            await service.revokePendingByWorkspaceInTx(
                tx,
                'workspace-1',
                'user-1'
            );

            expect(
                workspaceInviteRepository.revokePendingByWorkspaceInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1', 'user-1');
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
                'invitee@example.com',
                'user-1'
            );

            expect(
                workspaceInviteRepository.revokeAllPendingByEmailInTx
            ).toHaveBeenCalledWith(tx, 'invitee@example.com', 'user-1');
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

        it('starts the page read while the invitation gate is still pending', async () => {
            const gate = buildDeferred<void>();
            featureFlagService.validateFeatureFlagMetadata.mockReturnValue(
                gate.promise
            );
            workspaceInviteRepository.findWithPaginationCursor.mockResolvedValue(
                page
            );

            const pending = service.getInvitesList('workspace-1', pagination);
            expect(
                workspaceInviteRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith('workspace-1', pagination, null);
            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.invitationAllowed
            );

            gate.resolve();

            await expect(pending).resolves.toBe(page);
        });

        it('throws FeatureFlagDisabledException when workspace invitations are off', async () => {
            featureFlagService.validateFeatureFlagMetadata.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                service.getInvitesList('workspace-1', pagination)
            ).rejects.toMatchObject({
                statusCode: EnumFeatureFlagStatusCodeError.disabled,

                constructor: FeatureFlagDisabledException,
                module: 'featureFlag',
            });
            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.invitationAllowed
            );
        });

        it('gates on the invitation flag and delegates to the repository with a null status filter', async () => {
            workspaceInviteRepository.findWithPaginationCursor.mockResolvedValue(
                page
            );

            const result = await service.getInvitesList(
                'workspace-1',
                pagination
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
            ).toHaveBeenCalledWith('workspace-1', pagination, null);
        });

        it('forwards the status filter to the repository', async () => {
            const status = { status: { in: ['pending'] } };
            workspaceInviteRepository.findWithPaginationCursor.mockResolvedValue(
                page
            );

            const result = await service.getInvitesList(
                'workspace-1',
                pagination,
                status
            );

            expect(result).toBe(page);
            expect(
                workspaceInviteRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith('workspace-1', pagination, status);
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
            });
        });

        it('throws WorkspaceInviteRoleRequiredException when only projectRole is given', async () => {
            await expect(
                service.assertProjectRolePaired({
                    ...baseCreate,
                    projectRole: EnumProjectMemberRole.member,
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
                    projectRole: EnumProjectMemberRole.member,
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
            projectRole: EnumProjectMemberRole.member,
        };

        it('throws WorkspaceInviteProjectMismatchException when the project is not active in the workspace', () => {
            expect(() => service.assertCreatable(pairedCreate, null)).toThrow(
                expect.objectContaining({
                    constructor: WorkspaceInviteProjectMismatchException,
                    module: 'workspace',
                    statusCode:
                        EnumWorkspaceStatusCodeError.inviteProjectMismatch,
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

    describe('resolveExpiresInDays', () => {
        it('returns the requested lifetime and reads no flag', async () => {
            await expect(service.resolveExpiresInDays(14)).resolves.toBe(14);
            expect(featureFlagService.getMetadataNumber).not.toHaveBeenCalled();
        });

        it('reads inviteExpiresInDays when the request sends no lifetime', async () => {
            featureFlagService.getMetadataNumber.mockResolvedValue(9);

            await expect(service.resolveExpiresInDays(null)).resolves.toBe(9);
            expect(featureFlagService.getMetadataNumber).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.inviteExpiresInDays
            );
        });

        it('propagates FeatureFlagNotConfiguredException from the read', async () => {
            const notConfigured = new FeatureFlagNotConfiguredException(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.inviteExpiresInDays
            );
            featureFlagService.getMetadataNumber.mockRejectedValue(
                notConfigured
            );

            await expect(service.resolveExpiresInDays(null)).rejects.toBe(
                notConfigured
            );
        });
    });

    describe('prepareInvite', () => {
        beforeEach(() => {
            vi.spyOn(databaseUtil, 'createId').mockReturnValue('invite-new');
        });

        it('returns the new invite id, the hashed nonce of workspace and email, and the requested lifetime', async () => {
            await expect(
                service.prepareInvite('workspace-1', {
                    ...baseCreate,
                    expiryDuration: 14,
                })
            ).resolves.toEqual({
                workspaceInviteId: 'invite-new',
                nonce: pendingNonce,
                expiresInDays: 14,
            });
            expect(featureFlagService.getMetadataNumber).not.toHaveBeenCalled();
        });

        it('returns inviteExpiresInDays when the request sends no lifetime', async () => {
            featureFlagService.getMetadataNumber.mockResolvedValue(9);

            const result = await service.prepareInvite(
                'workspace-1',
                baseCreate
            );

            expect(result.expiresInDays).toBe(9);
            expect(featureFlagService.getMetadataNumber).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.inviteExpiresInDays
            );
        });

        it('propagates FeatureFlagNotConfiguredException from the read', async () => {
            const notConfigured = new FeatureFlagNotConfiguredException(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.inviteExpiresInDays
            );
            featureFlagService.getMetadataNumber.mockRejectedValue(
                notConfigured
            );

            await expect(
                service.prepareInvite('workspace-1', baseCreate)
            ).rejects.toBe(notConfigured);
        });
    });

    describe('createInviteInTx', () => {
        const prepared: IWorkspaceInvitePrepared = {
            workspaceInviteId: 'invite-new',
            nonce: pendingNonce,
            expiresInDays: 14,
        };
        const issuedTokenData: IWorkspaceInviteTokenData = {
            ...tokenData,
            expiredAt: new Date('2026-01-15T00:00:00.000Z'),
        };

        it('creates the pending invite on the tx given with the prepared id and nonce and the drawn token data', async () => {
            workspaceInviteRepository.createPendingInTx.mockResolvedValue(
                baseInvite
            );

            const result = await service.createInviteInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                {
                    ...baseCreate,
                    projectId: 'project-1',
                    projectRole: EnumProjectMemberRole.member,
                },
                prepared,
                issuedTokenData,
                unregisteredNotice
            );

            expect(result).toBe(baseInvite);
            expect(
                workspaceInviteRepository.createPendingInTx
            ).toHaveBeenCalledWith(tx, {
                workspaceInviteId: 'invite-new',
                workspaceId: 'workspace-1',
                email: 'invitee@example.com',
                workspaceRole: EnumWorkspaceMemberRole.member,
                projectId: 'project-1',
                projectRole: EnumProjectMemberRole.member,
                hashedToken: tokenValueHash,
                reference: 'WIN-abc123',
                expiredAt: new Date('2026-01-15T00:00:00.000Z'),
                invitedByUserId: 'user-1',
                nonce: pendingNonce,
            });
        });

        it('adds the notify effect for an invitee with an account on the invite tx', async () => {
            workspaceInviteRepository.createPendingInTx.mockResolvedValue(
                baseInvite
            );
            notificationQueue.notify.mockReturnValue(notifyEffect);

            await service.createInviteInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                baseCreate,
                prepared,
                issuedTokenData,
                registeredNotice
            );

            expect(notificationQueue.notify).toHaveBeenCalledWith(
                EnumNotificationKind.workspaceInvite,
                {
                    userId: 'user-2',
                    proceedBy: 'user-1',
                    workspaceId: 'workspace-1',
                    workspaceName: 'Acme',
                    inviterName: 'Bramble',
                    reference: 'WIN-abc123',
                    workspaceMemberRole: EnumWorkspaceMemberRole.member,
                    expiredAt: expiredAtIso,
                    inviteAcceptLink: tokenData.claimLink,
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                notifyEffect,
                actorEntry,
                inviteeEntry,
            ]);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.notifyUnregisteredInvite
            ).not.toHaveBeenCalled();
        });

        it('adds the unregistered invite effect with the sign-up link for an invitee with no account', async () => {
            workspaceInviteRepository.createPendingInTx.mockResolvedValue(
                baseInvite
            );
            notificationEmailQueue.notifyUnregisteredInvite.mockReturnValue(
                unregisteredEffect
            );

            await service.createInviteInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                baseCreate,
                prepared,
                issuedTokenData,
                unregisteredNotice
            );

            expect(
                notificationEmailQueue.notifyUnregisteredInvite
            ).toHaveBeenCalledWith('invitee@example.com', {
                workspaceId: 'workspace-1',
                workspaceName: 'Acme',
                inviterName: 'Bramble',
                reference: 'WIN-abc123',
                workspaceMemberRole: EnumWorkspaceMemberRole.member,
                expiredAt: expiredAtIso,
                inviteAcceptLink: tokenData.signUpLink,
            });
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                unregisteredEffect,
                actorEntry,
            ]);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
            expect(notificationQueue.notify).not.toHaveBeenCalled();
        });

        it('adds the creator entry and the invitee entry after the write on the invite tx for an invitee with an account', async () => {
            workspaceInviteRepository.createPendingInTx.mockResolvedValue(
                baseInvite
            );
            notificationQueue.notify.mockReturnValue(notifyEffect);

            await service.createInviteInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                baseCreate,
                prepared,
                issuedTokenData,
                registeredNotice
            );

            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
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
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
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
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                notifyEffect,
                actorEntry,
                inviteeEntry,
            ]);
            expect(
                workspaceInviteRepository.createPendingInTx
            ).toHaveBeenCalledBefore(activityLogQueue.recordEffect);
        });

        it('adds only the creator entry on the invite tx for an invitee with no account', async () => {
            workspaceInviteRepository.createPendingInTx.mockResolvedValue(
                baseInvite
            );
            notificationEmailQueue.notifyUnregisteredInvite.mockReturnValue(
                unregisteredEffect
            );

            await service.createInviteInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                baseCreate,
                prepared,
                issuedTokenData,
                unregisteredNotice
            );

            expect(activityLogQueue.recordEffect).toHaveBeenCalledTimes(1);
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
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
                unregisteredEffect,
                actorEntry,
            ]);
        });

        it('adds only the creator entry when the invitee is the creator', async () => {
            workspaceInviteRepository.createPendingInTx.mockResolvedValue(
                baseInvite
            );
            notificationQueue.notify.mockReturnValue(notifyEffect);

            await service.createInviteInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContextOfUser2,
                'workspace-1',
                baseCreate,
                prepared,
                issuedTokenData,
                registeredNotice
            );

            expect(activityLogQueue.recordEffect).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                notifyEffect,
                actorEntry,
            ]);
        });

        it('lets a write failure reach the caller and adds no effect', async () => {
            const collision = buildPrismaKnownRequestError('P2002', 'nonce');
            workspaceInviteRepository.createPendingInTx.mockRejectedValue(
                collision
            );

            await expect(
                service.createInviteInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    baseCreate,
                    prepared,
                    issuedTokenData,
                    unregisteredNotice
                )
            ).rejects.toBe(collision);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });
    });

    describe('getPendingById', () => {
        it('starts the invite read while the invitation gate is still pending', async () => {
            const gate = buildDeferred<void>();
            featureFlagService.validateFeatureFlagMetadata.mockReturnValue(
                gate.promise
            );
            workspaceInviteRepository.findByIdAndWorkspace.mockResolvedValue(
                baseInvite
            );

            const pending = service.getPendingById('invite-1', 'workspace-1');
            expect(
                workspaceInviteRepository.findByIdAndWorkspace
            ).toHaveBeenCalledWith('invite-1', 'workspace-1');
            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.invitationAllowed
            );

            gate.resolve();

            await expect(pending).resolves.toBe(baseInvite);
        });

        it('throws FeatureFlagDisabledException when workspace invitations are off', async () => {
            featureFlagService.validateFeatureFlagMetadata.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                service.getPendingById('invite-1', 'workspace-1')
            ).rejects.toMatchObject({
                statusCode: EnumFeatureFlagStatusCodeError.disabled,

                constructor: FeatureFlagDisabledException,
                module: 'featureFlag',
            });
            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.invitationAllowed
            );
        });

        it('throws WorkspaceInviteNotFoundException when the invite does not exist', async () => {
            workspaceInviteRepository.findByIdAndWorkspace.mockResolvedValue(
                null
            );

            await expect(
                service.getPendingById('invite-1', 'workspace-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteNotFound,
            });
        });

        it('throws WorkspaceInviteAlreadyProcessedException when the invite is no longer pending', async () => {
            workspaceInviteRepository.findByIdAndWorkspace.mockResolvedValue({
                ...baseInvite,
                status: EnumWorkspaceInviteStatus.accepted,
            });

            await expect(
                service.getPendingById('invite-1', 'workspace-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteAlreadyProcessedException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteAlreadyProcessed,
            });
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('returns the pending invite', async () => {
            workspaceInviteRepository.findByIdAndWorkspace.mockResolvedValue(
                baseInvite
            );

            const result = await service.getPendingById(
                'invite-1',
                'workspace-1'
            );

            expect(result).toBe(baseInvite);
            expect(
                workspaceInviteRepository.findByIdAndWorkspace
            ).toHaveBeenCalledWith('invite-1', 'workspace-1');
        });
    });

    describe('getResendableById', () => {
        it('throws WorkspaceInviteInvalidException when the pending invite reached its expiry', async () => {
            workspaceInviteRepository.findByIdAndWorkspace.mockResolvedValue(
                baseInvite
            );
            vi.setSystemTime(baseInvite.expiredAt);

            await expect(
                service.getResendableById('invite-1', 'workspace-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteInvalidException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteInvalid,
            });
        });

        it('throws WorkspaceInviteAlreadyProcessedException when the invite is no longer pending', async () => {
            workspaceInviteRepository.findByIdAndWorkspace.mockResolvedValue({
                ...baseInvite,
                status: EnumWorkspaceInviteStatus.expired,
            });

            await expect(
                service.getResendableById('invite-1', 'workspace-1')
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
            vi.setSystemTime(new Date('2026-01-31T23:59:59.000Z'));

            const result = await service.getResendableById(
                'invite-1',
                'workspace-1'
            );

            expect(result).toBe(baseInvite);
            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledTimes(1);
        });
    });

    describe('resendInviteInTx', () => {
        const resentAt = new Date('2026-01-15T00:00:00.000Z');
        const rotatedTokenData: IWorkspaceInviteTokenData = {
            ...tokenData,
            expiredAt: new Date('2026-01-29T00:00:00.000Z'),
        };

        beforeEach(() => {
            vi.setSystemTime(resentAt);
        });

        it('rotates the token on the tx given with the drawn token data and the resend time and returns the rotated invite', async () => {
            workspaceInviteRepository.rotateForResendInTx.mockResolvedValue(
                baseInvite
            );

            const result = await service.resendInviteInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'invite-1',
                rotatedTokenData,
                unregisteredNotice
            );

            expect(result).toBe(baseInvite);
            expect(
                workspaceInviteRepository.rotateForResendInTx
            ).toHaveBeenCalledWith(
                tx,
                'invite-1',
                tokenValueHash,
                'WIN-abc123',
                new Date('2026-01-29T00:00:00.000Z'),
                resentAt
            );
        });

        it('adds the invite effect on the rotation tx', async () => {
            workspaceInviteRepository.rotateForResendInTx.mockResolvedValue(
                baseInvite
            );
            notificationQueue.notify.mockReturnValue(notifyEffect);

            await service.resendInviteInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'invite-1',
                rotatedTokenData,
                registeredNotice
            );

            expect(notificationQueue.notify).toHaveBeenCalledWith(
                EnumNotificationKind.workspaceInvite,
                expect.objectContaining({
                    userId: 'user-2',
                    proceedBy: 'user-1',
                    reference: 'WIN-abc123',
                    inviteAcceptLink: tokenData.claimLink,
                })
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                notifyEffect,
                actorEntry,
                inviteeEntry,
            ]);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('adds the sender entry and the invitee entry after the rotation on the tx for an invitee with an account', async () => {
            workspaceInviteRepository.rotateForResendInTx.mockResolvedValue(
                baseInvite
            );
            notificationQueue.notify.mockReturnValue(notifyEffect);

            await service.resendInviteInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'invite-1',
                rotatedTokenData,
                registeredNotice
            );

            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
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
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
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
                notifyEffect,
                actorEntry,
                inviteeEntry,
            ]);
            expect(
                workspaceInviteRepository.rotateForResendInTx
            ).toHaveBeenCalledBefore(activityLogQueue.recordEffect);
        });

        it('adds only the sender entry for an invitee with no account', async () => {
            workspaceInviteRepository.rotateForResendInTx.mockResolvedValue(
                baseInvite
            );
            notificationEmailQueue.notifyUnregisteredInvite.mockReturnValue(
                unregisteredEffect
            );

            await service.resendInviteInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'invite-1',
                rotatedTokenData,
                unregisteredNotice
            );

            expect(activityLogQueue.recordEffect).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                unregisteredEffect,
                actorEntry,
            ]);
        });

        it('throws WorkspaceInviteAlreadyProcessedException and adds no effect when the guarded rotation misses', async () => {
            workspaceInviteRepository.rotateForResendInTx.mockResolvedValue(
                null
            );

            await expect(
                service.resendInviteInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'invite-1',
                    rotatedTokenData,
                    unregisteredNotice
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteAlreadyProcessedException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteAlreadyProcessed,
            });
            expect(outboxService.addInTx).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('lets a write failure reach the caller', async () => {
            const collision = buildPrismaKnownRequestError('P2002', 'token');
            workspaceInviteRepository.rotateForResendInTx.mockRejectedValue(
                collision
            );

            await expect(
                service.resendInviteInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'invite-1',
                    rotatedTokenData,
                    unregisteredNotice
                )
            ).rejects.toBe(collision);
        });
    });

    describe('revokeInviteInTx', () => {
        it('revokes the invite and adds the revoker entry and the invitee entry after the write on one tx', async () => {
            workspaceInviteRepository.revokeInTx.mockResolvedValue(true);

            await service.revokeInviteInTx(
                tx,
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
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
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
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
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
            expect(workspaceInviteRepository.revokeInTx).toHaveBeenCalledBefore(
                activityLogQueue.recordEffect
            );
        });

        it('adds only the revoker entry for an invitee with no account', async () => {
            workspaceInviteRepository.revokeInTx.mockResolvedValue(true);

            await service.revokeInviteInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'invite-1',
                'workspace-1',
                null
            );

            expect(activityLogQueue.recordEffect).toHaveBeenCalledTimes(1);
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
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
                service.revokeInviteInTx(
                    tx,
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
            });
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
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
        });

        it('throws WorkspaceInviteAlreadyProcessedException when the guarded accept matches no pending invite', async () => {
            workspaceInviteRepository.acceptInTx.mockResolvedValue(false);

            await expect(
                service.acceptPendingInTx(tx, 'invite-1', 'user-2', acceptedAt)
            ).rejects.toMatchObject({
                module: 'workspace',

                constructor: WorkspaceInviteAlreadyProcessedException,
                statusCode: EnumWorkspaceStatusCodeError.inviteAlreadyProcessed,
            });
        });

        it('rejects with the raw write conflict the accept rejects with', async () => {
            const conflict = buildPrismaKnownRequestError(
                DatabaseWriteConflictCode
            );
            workspaceInviteRepository.acceptInTx.mockRejectedValue(conflict);

            await expect(
                service.acceptPendingInTx(tx, 'invite-1', 'user-2', acceptedAt)
            ).rejects.toBe(conflict);
        });
    });

    describe('acceptOnSignUpInTx', () => {
        const tx = {} as IDatabaseTransactionClient;
        const inviteContext: IUserCreateWorkspaceInvite = {
            type: EnumUserCreateWorkspaceContextType.invite,
            workspaceId: 'workspace-1',
            workspaceInviteId: 'invite-1',
            invitedByUserId: 'user-1',
            workspaceMemberRole: EnumWorkspaceMemberRole.member,
            projectId: 'project-1',
            projectMemberRole: EnumProjectMemberRole.member,
        };

        beforeEach(() => {
            workspaceInviteRepository.acceptInTx.mockResolvedValue(true);
            vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
        });

        it('throws WorkspaceInviteAlreadyProcessedException when the guarded accept matches no pending invite', async () => {
            workspaceInviteRepository.acceptInTx.mockResolvedValue(false);

            await expect(
                service.acceptOnSignUpInTx(tx, 'user-2', inviteContext)
            ).rejects.toMatchObject({
                module: 'workspace',

                constructor: WorkspaceInviteAlreadyProcessedException,
                statusCode: EnumWorkspaceStatusCodeError.inviteAlreadyProcessed,
            });
        });

        it('accepts the invite, then creates the workspace membership on the same transaction', async () => {
            await service.acceptOnSignUpInTx(tx, 'user-2', inviteContext);

            expect(workspaceMemberService.createInTx).toHaveBeenCalledWith(
                tx,
                'workspace-1',
                'user-2',
                EnumWorkspaceMemberRole.member,
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

    describe('mapInvitePreview', () => {
        it('answers the given inviter name for a live inviter', () => {
            const result = service.mapInvitePreview(
                previewInvite,
                'Ada Lovelace'
            );

            expect(result).toEqual({
                workspaceName: 'Acme',
                inviterName: 'Ada Lovelace',
                workspaceRole: EnumWorkspaceMemberRole.member,
                expiredAt: baseInvite.expiredAt,
            });
        });

        it('answers the workspace name as the inviter name when the inviter is self-deleted', () => {
            const result = service.mapInvitePreview(
                {
                    ...previewInvite,
                    invitedBy: {
                        ...previewInvite.invitedBy,
                        deletedAt: new Date('2026-01-02T00:00:00.000Z'),
                    },
                },
                'Ada Lovelace'
            );

            expect(result.inviterName).toBe('Acme');
        });
    });

    describe('createInviteTokenData', () => {
        beforeEach(() => {
            vi.spyOn(helperStringService, 'random')
                .mockReturnValueOnce('token-value')
                .mockReturnValueOnce('reference-suffix');
            vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
        });

        it('builds token data expiring after the given days', () => {
            const result = service.createInviteTokenData(7);

            expect(result).toEqual({
                token: 'token-value',
                hashedToken: tokenValueHash,
                reference: 'WIN-reference-suffix',
                expiredAt: new Date('2026-01-08T00:00:00.000Z'),
                claimLink:
                    'https://app.example.com/workspace/invites?inviteToken=token-value',
                signUpLink: 'https://app.example.com/sign-up/token-value',
            });
            expect(helperStringService.random).toHaveBeenNthCalledWith(1, 40);
            expect(helperStringService.random).toHaveBeenNthCalledWith(2, 6);
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
