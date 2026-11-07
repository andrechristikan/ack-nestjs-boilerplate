import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
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
    EnumProjectMemberRole,
    EnumWorkspaceInviteStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type {
    Prisma,
    Project,
    Workspace,
    WorkspaceInvite,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import type { IUserSignUpWorkspaceInvite } from '@modules/user/interfaces/user.interface';
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
    IWorkspaceInviteTokenData,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceInviteRepository } from '@modules/workspace/repositories/workspace.invite.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';

describe('WorkspaceInviteService', () => {
    const workspaceInviteRepository: MockProxy<WorkspaceInviteRepository> =
        mock<WorkspaceInviteRepository>();
    const workspaceRepository: MockProxy<WorkspaceRepository> =
        mock<WorkspaceRepository>();
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const featureFlagService: MockProxy<FeatureFlagService> =
        mock<FeatureFlagService>();
    const workspaceUtil: MockProxy<WorkspaceUtil> = mock<WorkspaceUtil>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
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

    const baseCreate: IWorkspaceInviteCreate = {
        email: 'invitee@example.com' as Lowercase<string>,
        workspaceRole: EnumWorkspaceMemberRole.member,
        projectId: null,
        projectRole: null,
        expiryDuration: null,
    };

    let service: WorkspaceInviteService;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation((key: string) => configValues[key]);
        helperStringService.fillPattern.mockReturnValue(
            'workspace-1:invitee@example.com'
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
                { provide: WorkspaceUtil, useValue: workspaceUtil },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: HelperHashService, useValue: helperHashService },
                { provide: HelperStringService, useValue: helperStringService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        service = module.get(WorkspaceInviteService);
    });

    describe('validateInviteToken', () => {
        it('throws FeatureFlagDisabledException and reads no invite when workspace invitations are off', async () => {
            featureFlagService.validateFeatureFlagMetadata.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                service.validateInviteToken('raw-token')
            ).rejects.toMatchObject({
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
            expect(workspaceUtil.isInviteEmailMatch).not.toHaveBeenCalled();
        });

        it('throws WorkspaceInviteInvalidException when the util reports the invite email as a mismatch', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            workspaceInviteRepository.findPendingByHashedToken.mockResolvedValue(
                { ...baseInvite, email: 'other@example.com' }
            );
            workspaceUtil.isInviteEmailMatch.mockReturnValue(false);

            await expect(
                service.validateInviteForEmail('raw-token', 'USER@example.com')
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteInvalidException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteInvalid,
                messagePath: 'workspace.error.inviteInvalid',
            });
            expect(workspaceUtil.isInviteEmailMatch).toHaveBeenCalledWith(
                'other@example.com',
                'USER@example.com'
            );
        });

        it('returns the pending invite when its email matches', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            workspaceInviteRepository.findPendingByHashedToken.mockResolvedValue(
                baseInvite
            );
            workspaceUtil.isInviteEmailMatch.mockReturnValue(true);

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
            workspaceUtil.isInviteEmailMatch.mockReturnValue(true);

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
            expect(workspaceUtil.isInviteEmailMatch).toHaveBeenCalledWith(
                'invitee@example.com',
                'invitee@example.com'
            );
        });
    });

    describe('assertInviteeNotMember', () => {
        const member: WorkspaceMember = {
            id: 'member-1',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            workspaceId: 'workspace-1',
            userId: 'user-2',
            role: EnumWorkspaceMemberRole.member,
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
        const pagination: IPaginationQueryCursorParams<Prisma.WorkspaceInviteWhereInput> =
            {
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
                service.getInvitesList('workspace-1', pagination)
            ).rejects.toMatchObject({
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
                    projectRole: EnumProjectMemberRole.member,
                })
            ).rejects.toMatchObject({
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

        beforeEach(() => {
            databaseUtil.createId.mockReturnValue('invite-new');
            workspaceUtil.createInviteTokenData.mockReturnValue(tokenData);
        });

        it('draws the token data and creates the pending invite with the hashed nonce of workspace and email', async () => {
            workspaceInviteRepository.createPending.mockResolvedValue(
                baseInvite
            );

            const result = await service.createInvite('workspace-1', 'user-1', {
                ...baseCreate,
                projectId: 'project-1',
                projectRole: EnumProjectMemberRole.member,
                expiryDuration: 14,
            });

            expect(result).toEqual({ invite: baseInvite, tokenData });
            expect(workspaceUtil.createInviteTokenData).toHaveBeenCalledWith(
                14
            );
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                WorkspaceInviteNoncePattern,
                { workspaceId: 'workspace-1', email: 'invitee@example.com' }
            );
            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                'workspace-1:invitee@example.com'
            );
            expect(
                workspaceInviteRepository.createPending
            ).toHaveBeenCalledWith({
                workspaceInviteId: 'invite-new',
                workspaceId: 'workspace-1',
                email: 'invitee@example.com',
                workspaceRole: EnumWorkspaceMemberRole.member,
                projectId: 'project-1',
                projectRole: EnumProjectMemberRole.member,
                hashedToken: 'hashed-token',
                reference: 'WIN-abc123',
                expiredAt: tokenData.expiredAt,
                invitedByUserId: 'user-1',
                nonce: pendingNonce,
            });
        });

        it('throws WorkspaceInviteDuplicateException when the nonce collides', async () => {
            workspaceInviteRepository.createPending.mockRejectedValue(
                nonceCollision
            );
            databaseUtil.isUniqueCollision.mockImplementation(
                (_error, target) => target === 'nonce'
            );

            await expect(
                service.createInvite('workspace-1', 'user-1', baseCreate)
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
                workspaceInviteRepository.createPending
            ).toHaveBeenCalledTimes(1);
        });

        it('draws a fresh token and retries when the token collides, returning the stored token data', async () => {
            workspaceUtil.createInviteTokenData
                .mockReturnValueOnce(tokenData)
                .mockReturnValueOnce(retriedTokenData);
            workspaceInviteRepository.createPending
                .mockRejectedValueOnce(tokenCollision)
                .mockResolvedValueOnce(baseInvite);
            databaseUtil.isUniqueCollision.mockImplementation(
                (_error, target) => target === 'token'
            );

            const result = await service.createInvite(
                'workspace-1',
                'user-1',
                baseCreate
            );

            expect(result).toEqual({
                invite: baseInvite,
                tokenData: retriedTokenData,
            });
            expect(
                workspaceInviteRepository.createPending
            ).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({
                    hashedToken: 'hashed-token-2',
                    reference: 'WIN-def456',
                })
            );
        });

        it('draws a fresh reference and retries when the reference collides', async () => {
            workspaceUtil.createInviteTokenData
                .mockReturnValueOnce(tokenData)
                .mockReturnValueOnce(retriedTokenData);
            workspaceInviteRepository.createPending
                .mockRejectedValueOnce(referenceCollision)
                .mockResolvedValueOnce(baseInvite);
            databaseUtil.isUniqueCollision.mockImplementation(
                (_error, target) => target === 'reference'
            );

            const result = await service.createInvite(
                'workspace-1',
                'user-1',
                baseCreate
            );

            expect(result.tokenData).toBe(retriedTokenData);
            expect(
                workspaceInviteRepository.createPending
            ).toHaveBeenCalledTimes(2);
        });

        it('throws DatabaseUniqueValueGenerationFailedException once the attempt budget is spent', async () => {
            workspaceInviteRepository.createPending.mockRejectedValue(
                tokenCollision
            );
            databaseUtil.isUniqueCollision.mockImplementation(
                (_error, target) => target === 'token'
            );

            await expect(
                service.createInvite('workspace-1', 'user-1', baseCreate)
            ).rejects.toBeInstanceOf(
                DatabaseUniqueValueGenerationFailedException
            );
            expect(
                workspaceInviteRepository.createPending
            ).toHaveBeenCalledTimes(5);
        });

        it('rethrows an application exception unchanged', async () => {
            const failure = new WorkspaceInviteInvalidException();
            workspaceInviteRepository.createPending.mockRejectedValue(failure);
            databaseUtil.isUniqueCollision.mockReturnValue(false);

            await expect(
                service.createInvite('workspace-1', 'user-1', baseCreate)
            ).rejects.toBe(failure);
        });

        it('throws WorkspaceInviteDuplicateException on a write conflict without retrying', async () => {
            const conflict = new Error('write-conflict');
            workspaceInviteRepository.createPending.mockRejectedValue(conflict);
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.createInvite('workspace-1', 'user-1', baseCreate)
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteDuplicateException,
                statusCode: EnumWorkspaceStatusCodeError.inviteDuplicate,
                messagePath: 'workspace.error.inviteDuplicate',
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(
                workspaceInviteRepository.createPending
            ).toHaveBeenCalledTimes(1);
        });

        it('wraps another failure in AppUnknownException without retrying', async () => {
            const cause = new Error('db-down');
            workspaceInviteRepository.createPending.mockRejectedValue(cause);
            databaseUtil.isUniqueCollision.mockReturnValue(false);

            await expect(
                service.createInvite('workspace-1', 'user-1', baseCreate)
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
            expect(
                workspaceInviteRepository.createPending
            ).toHaveBeenCalledTimes(1);
        });
    });

    describe('getPendingById', () => {
        it('throws FeatureFlagDisabledException and reads no invite when workspace invitations are off', async () => {
            featureFlagService.validateFeatureFlagMetadata.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                service.getPendingById('invite-1', 'workspace-1')
            ).rejects.toMatchObject({
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
                service.getPendingById('invite-1', 'workspace-1')
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
                service.getPendingById('invite-1', 'workspace-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteAlreadyProcessedException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteAlreadyProcessed,
                messagePath: 'workspace.error.inviteAlreadyProcessed',
            });
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
            helperDateService.create.mockReturnValue(baseInvite.expiredAt);

            await expect(
                service.getResendableById('invite-1', 'workspace-1')
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
                service.getResendableById('invite-1', 'workspace-1')
            ).rejects.toMatchObject({
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

    describe('resendInvite', () => {
        const retriedTokenData: IWorkspaceInviteTokenData = {
            ...tokenData,
            hashedToken: 'hashed-token-2',
            reference: 'WIN-def456',
        };
        const resentAt = new Date('2026-01-15T00:00:00.000Z');

        beforeEach(() => {
            workspaceUtil.createInviteTokenData.mockReturnValue(tokenData);
            helperDateService.create.mockReturnValue(resentAt);
        });

        it('draws the token data, rotates the token, and returns the rotated invite with the stored token data', async () => {
            workspaceInviteRepository.rotateForResend.mockResolvedValue(
                baseInvite
            );

            const result = await service.resendInvite('invite-1', 14);

            expect(result).toEqual({ invite: baseInvite, tokenData });
            expect(workspaceUtil.createInviteTokenData).toHaveBeenCalledWith(
                14
            );
            expect(
                workspaceInviteRepository.rotateForResend
            ).toHaveBeenCalledWith(
                'invite-1',
                'hashed-token',
                'WIN-abc123',
                tokenData.expiredAt,
                resentAt
            );
        });

        it('throws WorkspaceInviteAlreadyProcessedException when the guarded rotation misses', async () => {
            workspaceInviteRepository.rotateForResend.mockResolvedValue(null);

            await expect(
                service.resendInvite('invite-1', null)
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteAlreadyProcessedException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteAlreadyProcessed,
                messagePath: 'workspace.error.inviteAlreadyProcessed',
            });
        });

        it('draws a fresh token and retries when the token or reference collides, returning the stored token data', async () => {
            const collision = new Error('token');
            workspaceUtil.createInviteTokenData
                .mockReturnValueOnce(tokenData)
                .mockReturnValueOnce(retriedTokenData);
            workspaceInviteRepository.rotateForResend
                .mockRejectedValueOnce(collision)
                .mockResolvedValueOnce(baseInvite);
            databaseUtil.isUniqueCollision.mockImplementation(
                (_error, target) => target === 'token'
            );

            const result = await service.resendInvite('invite-1', null);

            expect(result).toEqual({
                invite: baseInvite,
                tokenData: retriedTokenData,
            });
            expect(
                workspaceInviteRepository.rotateForResend
            ).toHaveBeenNthCalledWith(
                2,
                'invite-1',
                'hashed-token-2',
                'WIN-def456',
                tokenData.expiredAt,
                resentAt
            );
        });

        it('throws DatabaseUniqueValueGenerationFailedException once the attempt budget is spent', async () => {
            workspaceInviteRepository.rotateForResend.mockRejectedValue(
                new Error('reference')
            );
            databaseUtil.isUniqueCollision.mockImplementation(
                (_error, target) => target === 'reference'
            );

            await expect(
                service.resendInvite('invite-1', null)
            ).rejects.toBeInstanceOf(
                DatabaseUniqueValueGenerationFailedException
            );
            expect(
                workspaceInviteRepository.rotateForResend
            ).toHaveBeenCalledTimes(5);
        });

        it('maps a write conflict on the rotation to WorkspaceInviteAlreadyProcessedException', async () => {
            const conflict = new Error('conflict');
            workspaceInviteRepository.rotateForResend.mockRejectedValue(
                conflict
            );
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.resendInvite('invite-1', null)
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteAlreadyProcessedException,
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('wraps another rotation failure in AppUnknownException', async () => {
            const cause = new Error('db-down');
            workspaceInviteRepository.rotateForResend.mockRejectedValue(cause);
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                service.resendInvite('invite-1', null)
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });

    describe('revokeInvite', () => {
        it('revokes the invite', async () => {
            workspaceInviteRepository.revoke.mockResolvedValue(true);

            await service.revokeInvite('invite-1');

            expect(workspaceInviteRepository.revoke).toHaveBeenCalledWith(
                'invite-1'
            );
            expect(helperHashService.sha256Hash).not.toHaveBeenCalledWith(
                'invite-1'
            );
        });

        it('throws WorkspaceInviteAlreadyProcessedException when the guarded revoke matches no pending invite', async () => {
            workspaceInviteRepository.revoke.mockResolvedValue(false);

            await expect(
                service.revokeInvite('invite-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteAlreadyProcessedException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteAlreadyProcessed,
                messagePath: 'workspace.error.inviteAlreadyProcessed',
            });
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
            workspaceMemberRole: EnumWorkspaceMemberRole.member,
            projectId: 'project-1',
            projectMemberRole: EnumProjectMemberRole.member,
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
});
