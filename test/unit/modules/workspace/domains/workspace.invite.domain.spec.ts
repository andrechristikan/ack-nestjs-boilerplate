import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
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
} from '@generated/prisma-client/client';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import type { IUserSignUpWorkspaceInvite } from '@modules/user/interfaces/user.interface';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceInviteAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.invite-already-processed.exception';
import { WorkspaceInviteDuplicateException } from '@modules/workspace/exceptions/workspace.invite-duplicate.exception';
import { WorkspaceInviteInvalidException } from '@modules/workspace/exceptions/workspace.invite-invalid.exception';
import { WorkspaceInviteNotFoundException } from '@modules/workspace/exceptions/workspace.invite-not-found.exception';
import { WorkspaceInviteProjectMismatchException } from '@modules/workspace/exceptions/workspace.invite-project-mismatch.exception';
import { WorkspaceInviteRoleRequiredException } from '@modules/workspace/exceptions/workspace.invite-role-required.exception';
import type {
    IWorkspaceInviteCreate,
    IWorkspaceInviteTokenData,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceInviteRepository } from '@modules/workspace/repositories/workspace.invite.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';

describe('WorkspaceInviteDomain', () => {
    const workspaceInviteRepository: MockProxy<WorkspaceInviteRepository> =
        mock<WorkspaceInviteRepository>();
    const workspaceRepository: MockProxy<WorkspaceRepository> =
        mock<WorkspaceRepository>();
    const workspaceMemberDomain: MockProxy<WorkspaceMemberDomain> =
        mock<WorkspaceMemberDomain>();
    const workspaceUtil: MockProxy<WorkspaceUtil> = mock<WorkspaceUtil>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();

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

    let domain: WorkspaceInviteDomain;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceInviteDomain,
                {
                    provide: WorkspaceInviteRepository,
                    useValue: workspaceInviteRepository,
                },
                { provide: WorkspaceRepository, useValue: workspaceRepository },
                {
                    provide: WorkspaceMemberDomain,
                    useValue: workspaceMemberDomain,
                },
                { provide: WorkspaceUtil, useValue: workspaceUtil },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: HelperHashService, useValue: helperHashService },
            ],
        }).compile();

        domain = module.get(WorkspaceInviteDomain);
    });

    describe('validateInviteToken', () => {
        it('throws WorkspaceInviteInvalidException when no pending invite matches the token', async () => {
            workspaceInviteRepository.findPendingByHashedToken.mockResolvedValue(
                null
            );
            helperHashService.sha256Hash.mockReturnValue('hashed-token');

            await expect(
                domain.validateInviteToken('raw-token')
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

            const result = await domain.validateInviteToken('raw-token');

            expect(result).toBe(baseInvite);
            expect(
                workspaceInviteRepository.findPendingByHashedToken
            ).toHaveBeenCalledWith('hashed-token');
        });
    });

    describe('validateInviteForEmail', () => {
        it('throws WorkspaceInviteInvalidException when no pending invite matches the token', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            workspaceInviteRepository.findPendingByHashedToken.mockResolvedValue(
                null
            );

            await expect(
                domain.validateInviteForEmail('raw-token', 'user@example.com')
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
                domain.validateInviteForEmail('raw-token', 'USER@example.com')
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

            const result = await domain.validateInviteForEmail(
                'raw-token',
                'invitee@example.com'
            );

            expect(result).toBe(baseInvite);
        });
    });

    describe('expireStalePending', () => {
        it('delegates to the repository', async () => {
            workspaceInviteRepository.expireStalePending.mockResolvedValue(3);

            const result = await domain.expireStalePending();

            expect(result).toBe(3);
        });
    });

    describe('expirePendingByWorkspaceInTx', () => {
        it('expires the pending invites of the workspace on the given transaction', async () => {
            const tx = {} as IDatabaseTransactionClient;

            await domain.expirePendingByWorkspaceInTx(tx, 'workspace-1');

            expect(
                workspaceInviteRepository.expirePendingByWorkspaceInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1');
        });
    });

    describe('getInvitesList', () => {
        const pagination: IPaginationQueryCursorParams<Prisma.WorkspaceInviteWhereInput> =
            { limit: 20, orderBy: [] };
        const page: IResponsePaginationReturn<never> = {
            type: EnumPaginationType.cursor,
            perPage: 20,
            hasNext: false,
            data: [],
        };

        it('delegates to the repository with a null status filter', async () => {
            workspaceInviteRepository.findWithPaginationCursor.mockResolvedValue(
                page
            );

            const result = await domain.getInvitesList(
                'workspace-1',
                pagination
            );

            expect(result).toBe(page);
            expect(
                workspaceInviteRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith('workspace-1', pagination, null);
        });

        it('forwards the status filter to the repository', async () => {
            const status = { status: { in: ['pending'] } };
            workspaceInviteRepository.findWithPaginationCursor.mockResolvedValue(
                page
            );

            const result = await domain.getInvitesList(
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
        it('throws WorkspaceInviteRoleRequiredException when only projectId is given', () => {
            expect(() =>
                domain.assertProjectRolePaired({
                    ...baseCreate,
                    projectId: 'project-1',
                })
            ).toThrow(
                expect.objectContaining({
                    constructor: WorkspaceInviteRoleRequiredException,
                    module: 'workspace',
                    statusCode: EnumWorkspaceStatusCodeError.inviteRoleRequired,
                    statusCodeKey:
                        EnumWorkspaceStatusCodeError[
                            EnumWorkspaceStatusCodeError.inviteRoleRequired
                        ],
                    messagePath: 'workspace.error.inviteRoleRequired',
                })
            );
        });

        it('throws WorkspaceInviteRoleRequiredException when only projectRole is given', () => {
            expect(() =>
                domain.assertProjectRolePaired({
                    ...baseCreate,
                    projectRole: EnumProjectMemberRole.member,
                })
            ).toThrow(
                expect.objectContaining({
                    constructor: WorkspaceInviteRoleRequiredException,
                })
            );
        });

        it('passes when both or neither are given', () => {
            expect(() =>
                domain.assertProjectRolePaired(baseCreate)
            ).not.toThrow();
            expect(() =>
                domain.assertProjectRolePaired({
                    ...baseCreate,
                    projectId: 'project-1',
                    projectRole: EnumProjectMemberRole.member,
                })
            ).not.toThrow();
        });
    });

    describe('existsPendingByEmail', () => {
        it('delegates the pending-invite existence read to the repository', async () => {
            workspaceInviteRepository.existsPendingByWorkspaceAndEmail.mockResolvedValue(
                true
            );

            await expect(
                domain.existsPendingByEmail(
                    'workspace-1',
                    'invitee@example.com'
                )
            ).resolves.toBe(true);
            expect(
                workspaceInviteRepository.existsPendingByWorkspaceAndEmail
            ).toHaveBeenCalledWith('workspace-1', 'invitee@example.com');
        });
    });

    describe('assertCreatable', () => {
        const pairedCreate = {
            ...baseCreate,
            projectId: 'project-1',
            projectRole: EnumProjectMemberRole.member,
        };

        it('throws WorkspaceInviteProjectMismatchException when the project is not active in the workspace', () => {
            expect(() =>
                domain.assertCreatable(pairedCreate, null, true)
            ).toThrow(
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

        it('throws WorkspaceInviteDuplicateException when a pending invite already exists', () => {
            expect(() =>
                domain.assertCreatable(baseCreate, null, true)
            ).toThrow(
                expect.objectContaining({
                    constructor: WorkspaceInviteDuplicateException,
                    module: 'workspace',
                    statusCode: EnumWorkspaceStatusCodeError.inviteDuplicate,
                    statusCodeKey:
                        EnumWorkspaceStatusCodeError[
                            EnumWorkspaceStatusCodeError.inviteDuplicate
                        ],
                    messagePath: 'workspace.error.inviteDuplicate',
                })
            );
        });

        it('passes when no project is requested and no invite is pending', () => {
            expect(() =>
                domain.assertCreatable(baseCreate, null, false)
            ).not.toThrow();
        });

        it('passes when the requested project is active in the workspace', () => {
            expect(() =>
                domain.assertCreatable(pairedCreate, baseProject, false)
            ).not.toThrow();
        });
    });

    describe('createInvite', () => {
        it('creates the pending invite from the token data under a fresh id', async () => {
            databaseUtil.createId.mockReturnValue('invite-new');
            workspaceInviteRepository.createPending.mockResolvedValue(
                baseInvite
            );

            const result = await domain.createInvite(
                'workspace-1',
                'user-1',
                {
                    ...baseCreate,
                    projectId: 'project-1',
                    projectRole: EnumProjectMemberRole.member,
                },
                tokenData
            );

            expect(result).toBe(baseInvite);
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
            });
        });
    });

    describe('getPendingById', () => {
        it('throws WorkspaceInviteNotFoundException when the invite does not exist', async () => {
            workspaceInviteRepository.findByIdAndWorkspace.mockResolvedValue(
                null
            );

            await expect(
                domain.getPendingById('invite-1', 'workspace-1')
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
                domain.getPendingById('invite-1', 'workspace-1')
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

            const result = await domain.getPendingById(
                'invite-1',
                'workspace-1'
            );

            expect(result).toBe(baseInvite);
            expect(
                workspaceInviteRepository.findByIdAndWorkspace
            ).toHaveBeenCalledWith('invite-1', 'workspace-1');
        });
    });

    describe('resendInvite', () => {
        it('rotates the token and returns the rotated invite', async () => {
            workspaceInviteRepository.rotateForResend.mockResolvedValue(
                baseInvite
            );

            const result = await domain.resendInvite('invite-1', tokenData);

            expect(result).toBe(baseInvite);
            expect(
                workspaceInviteRepository.rotateForResend
            ).toHaveBeenCalledWith(
                'invite-1',
                'hashed-token',
                'WIN-abc123',
                tokenData.expiredAt
            );
        });

        it('throws WorkspaceInviteAlreadyProcessedException when the guarded rotation misses', async () => {
            workspaceInviteRepository.rotateForResend.mockResolvedValue(null);

            await expect(
                domain.resendInvite('invite-1', tokenData)
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteAlreadyProcessedException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteAlreadyProcessed,
                messagePath: 'workspace.error.inviteAlreadyProcessed',
            });
        });

        it('maps a write conflict on the rotation to WorkspaceInviteAlreadyProcessedException', async () => {
            const conflict = new Error('conflict');
            workspaceInviteRepository.rotateForResend.mockRejectedValue(
                conflict
            );
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                domain.resendInvite('invite-1', tokenData)
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteAlreadyProcessedException,
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('wraps another rotation failure in AppUnknownException', async () => {
            const cause = new Error('db-down');
            workspaceInviteRepository.rotateForResend.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                domain.resendInvite('invite-1', tokenData)
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });

    describe('revokeInvite', () => {
        it('revokes the invite', async () => {
            workspaceInviteRepository.revoke.mockResolvedValue(true);

            await domain.revokeInvite('invite-1');

            expect(workspaceInviteRepository.revoke).toHaveBeenCalledWith(
                'invite-1'
            );
        });

        it('throws WorkspaceInviteAlreadyProcessedException when the guarded revoke matches no pending invite', async () => {
            workspaceInviteRepository.revoke.mockResolvedValue(false);

            await expect(domain.revokeInvite('invite-1')).rejects.toMatchObject(
                {
                    constructor: WorkspaceInviteAlreadyProcessedException,
                    module: 'workspace',
                    statusCode:
                        EnumWorkspaceStatusCodeError.inviteAlreadyProcessed,
                    messagePath: 'workspace.error.inviteAlreadyProcessed',
                }
            );
        });
    });

    describe('acceptPendingInTx', () => {
        const tx = {} as IDatabaseTransactionClient;
        const acceptedAt = new Date('2026-01-01T00:00:00.000Z');

        it('accepts the invite on the given transaction', async () => {
            workspaceInviteRepository.acceptInTx.mockResolvedValue(true);

            await domain.acceptPendingInTx(
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
                domain.acceptPendingInTx(tx, 'invite-1', 'user-2', acceptedAt)
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
                domain.acceptPendingInTx(tx, 'invite-1', 'user-2', acceptedAt)
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
                domain.acceptPendingInTx(tx, 'invite-1', 'user-2', acceptedAt)
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
                domain.acceptOnSignUpInTx(tx, 'user-2', inviteContext)
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteAlreadyProcessedException,
                statusCode: EnumWorkspaceStatusCodeError.inviteAlreadyProcessed,
                messagePath: 'workspace.error.inviteAlreadyProcessed',
            });
        });

        it('creates the workspace membership, then accepts the invite on the same transaction', async () => {
            await domain.acceptOnSignUpInTx(tx, 'user-2', inviteContext);

            expect(workspaceMemberDomain.createInTx).toHaveBeenCalledWith(
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
            expect(workspaceMemberDomain.createInTx).toHaveBeenCalledBefore(
                workspaceInviteRepository.acceptInTx
            );
        });
    });

    describe('getWorkspaceOfInvite', () => {
        it('throws WorkspaceInviteInvalidException when the workspace is not active', async () => {
            workspaceRepository.findActiveById.mockResolvedValue(null);

            await expect(
                domain.getWorkspaceOfInvite(baseInvite)
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteInvalidException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteInvalid,
                messagePath: 'workspace.error.inviteInvalid',
            });
        });

        it('returns the active workspace of the invite', async () => {
            workspaceRepository.findActiveById.mockResolvedValue(workspace);

            const result = await domain.getWorkspaceOfInvite(baseInvite);

            expect(result).toBe(workspace);
            expect(workspaceRepository.findActiveById).toHaveBeenCalledWith(
                'workspace-1'
            );
        });
    });
});
