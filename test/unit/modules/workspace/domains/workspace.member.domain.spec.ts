import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import type {
    Prisma,
    Workspace,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceLastOwnerException } from '@modules/workspace/exceptions/workspace.last-owner.exception';
import { WorkspaceMemberForbiddenException } from '@modules/workspace/exceptions/workspace.member-forbidden.exception';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { WorkspaceMemberPeerForbiddenException } from '@modules/workspace/exceptions/workspace.member-peer-forbidden.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceRoleForbiddenException } from '@modules/workspace/exceptions/workspace.role-forbidden.exception';
import { WorkspaceSelfTransferException } from '@modules/workspace/exceptions/workspace.self-transfer.exception';
import type { IWorkspaceMember } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';

describe('WorkspaceMemberDomain', () => {
    const workspaceMemberRepository: MockProxy<WorkspaceMemberRepository> =
        mock<WorkspaceMemberRepository>();
    const workspaceRepository: MockProxy<WorkspaceRepository> =
        mock<WorkspaceRepository>();
    const workspaceUtil: MockProxy<WorkspaceUtil> = mock<WorkspaceUtil>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    let domain: WorkspaceMemberDomain;

    const baseMember: WorkspaceMember = {
        id: 'member-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        workspaceId: 'workspace-1',
        userId: 'user-1',
        role: EnumWorkspaceMemberRole.member,
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        workspaceMemberRepository.updateRole.mockResolvedValue(true);
        workspaceMemberRepository.removeMemberInTx.mockResolvedValue(true);
        workspaceMemberRepository.transferOwnership.mockResolvedValue(true);
        workspaceUtil.isPeerActionAllowed.mockReturnValue(true);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceMemberDomain,
                {
                    provide: WorkspaceMemberRepository,
                    useValue: workspaceMemberRepository,
                },
                { provide: WorkspaceRepository, useValue: workspaceRepository },
                { provide: WorkspaceUtil, useValue: workspaceUtil },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();

        domain = module.get(WorkspaceMemberDomain);
    });

    describe('validateWorkspaceMemberGuard', () => {
        it('throws WorkspaceMemberForbiddenException when no membership is found', async () => {
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                null
            );

            await expect(
                domain.validateWorkspaceMemberGuard('workspace-1', 'user-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberForbiddenException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberForbidden,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.memberForbidden
                    ],
                messagePath: 'workspace.error.memberForbidden',
            });
        });

        it('returns the resolved membership', async () => {
            const member = baseMember;
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                member
            );

            const result = await domain.validateWorkspaceMemberGuard(
                'workspace-1',
                'user-1'
            );

            expect(result).toBe(member);
            expect(
                workspaceMemberRepository.findOneByWorkspaceAndUser
            ).toHaveBeenCalledWith('workspace-1', 'user-1');
        });
    });
    describe('validateWorkspaceRoleGuard', () => {
        it('returns the member when the util reports the role as allowed', () => {
            const admin = {
                ...baseMember,
                role: EnumWorkspaceMemberRole.admin,
            };
            workspaceUtil.hasRole.mockReturnValue(true);

            const result = domain.validateWorkspaceRoleGuard(admin, [
                EnumWorkspaceMemberRole.admin,
            ]);

            expect(result).toBe(admin);
            expect(workspaceUtil.hasRole).toHaveBeenCalledWith(admin, [
                EnumWorkspaceMemberRole.admin,
            ]);
        });

        it('throws WorkspaceRoleForbiddenException when the util reports the role as not allowed', () => {
            workspaceUtil.hasRole.mockReturnValue(false);

            let thrown: unknown;
            try {
                domain.validateWorkspaceRoleGuard(baseMember, [
                    EnumWorkspaceMemberRole.admin,
                ]);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                constructor: WorkspaceRoleForbiddenException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.roleForbidden,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.roleForbidden
                    ],
                messagePath: 'workspace.error.roleForbidden',
            });
        });
    });

    describe('getOneByWorkspaceAndUser', () => {
        it('delegates to the repository', async () => {
            const member = baseMember;
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                member
            );

            const result = await domain.getOneByWorkspaceAndUser(
                'workspace-1',
                'user-1'
            );

            expect(result).toBe(member);
            expect(
                workspaceMemberRepository.findOneByWorkspaceAndUser
            ).toHaveBeenCalledWith('workspace-1', 'user-1');
        });
    });

    describe('createInTx', () => {
        it('delegates to the repository', async () => {
            const tx = {} as IDatabaseTransactionClient;
            const member = baseMember;
            workspaceMemberRepository.createInTx.mockResolvedValue(member);

            const result = await domain.createInTx(
                tx,
                'workspace-1',
                'user-1',
                EnumWorkspaceMemberRole.member,
                'actor-1'
            );

            expect(result).toBe(member);
            expect(workspaceMemberRepository.createInTx).toHaveBeenCalledWith(
                tx,
                'workspace-1',
                'user-1',
                EnumWorkspaceMemberRole.member,
                'actor-1'
            );
        });
    });
    describe('getReviewerUserIds', () => {
        it('returns the user ids of the workspace reviewers', async () => {
            workspaceMemberRepository.findReviewersByWorkspace.mockResolvedValue(
                [{ userId: 'user-1' }, { userId: 'user-2' }]
            );

            const result = await domain.getReviewerUserIds('workspace-1');

            expect(result).toEqual(['user-1', 'user-2']);
            expect(
                workspaceMemberRepository.findReviewersByWorkspace
            ).toHaveBeenCalledWith('workspace-1');
        });
    });

    describe('transferOwnership', () => {
        const actor = { ...baseMember, id: 'member-1', userId: 'user-1' };
        const target = { ...baseMember, id: 'member-2', userId: 'user-2' };

        it('throws WorkspaceSelfTransferException when the target is the actor', async () => {
            await expect(
                domain.transferOwnership('workspace-1', actor, 'user-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceSelfTransferException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.selfTransfer,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.selfTransfer
                    ],
                messagePath: 'workspace.error.selfTransfer',
            });
        });

        it('throws WorkspaceMemberNotFoundException when the target is not a member', async () => {
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                null
            );

            await expect(
                domain.transferOwnership('workspace-1', actor, 'user-2')
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
                messagePath: 'workspace.error.memberNotFound',
            });
            expect(
                workspaceMemberRepository.transferOwnership
            ).not.toHaveBeenCalled();
        });

        it('swaps the ownership between the two member rows', async () => {
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                target
            );

            await domain.transferOwnership('workspace-1', actor, 'user-2');

            expect(
                workspaceMemberRepository.findOneByWorkspaceAndUser
            ).toHaveBeenCalledWith('workspace-1', 'user-2');
            expect(
                workspaceMemberRepository.transferOwnership
            ).toHaveBeenCalledWith('workspace-1', 'member-1', 'member-2');
        });

        it('throws WorkspaceMemberPeerForbiddenException when a guarded row no longer matches', async () => {
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                target
            );
            workspaceMemberRepository.transferOwnership.mockResolvedValue(
                false
            );

            await expect(
                domain.transferOwnership('workspace-1', actor, 'user-2')
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberPeerForbiddenException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberPeerForbidden,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.memberPeerForbidden
                    ],
                messagePath: 'workspace.error.memberPeerForbidden',
            });
        });

        it('maps a write conflict in the ownership swap to WorkspaceMemberPeerForbiddenException', async () => {
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                target
            );
            const conflict = new Error('write-conflict');
            workspaceMemberRepository.transferOwnership.mockRejectedValue(
                conflict
            );
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                domain.transferOwnership('workspace-1', actor, 'user-2')
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberPeerForbiddenException,
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('wraps any other transaction error in AppUnknownException', async () => {
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                target
            );
            workspaceMemberRepository.transferOwnership.mockRejectedValue(
                new Error('boom')
            );
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                domain.transferOwnership('workspace-1', actor, 'user-2')
            ).rejects.toBeInstanceOf(AppUnknownException);
        });
    });

    describe('removeByUserInTx', () => {
        it('removes every membership of the user on the given transaction', async () => {
            const tx = {} as IDatabaseTransactionClient;
            workspaceMemberRepository.removeByUserInTx.mockResolvedValue(3);

            await expect(domain.removeByUserInTx(tx, 'user-1')).resolves.toBe(
                3
            );

            expect(
                workspaceMemberRepository.removeByUserInTx
            ).toHaveBeenCalledWith(tx, 'user-1');
        });
    });

    describe('leaveWorkspaceInTx', () => {
        const tx = {} as IDatabaseTransactionClient;

        it('throws WorkspaceLastOwnerException when the owner is the only one left', async () => {
            const owner = {
                ...baseMember,
                role: EnumWorkspaceMemberRole.owner,
            };
            workspaceMemberRepository.countOwnersInTx.mockResolvedValue(1);

            await expect(
                domain.leaveWorkspaceInTx(tx, 'workspace-1', owner)
            ).rejects.toMatchObject({
                constructor: WorkspaceLastOwnerException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.lastOwner,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.lastOwner
                    ],
                messagePath: 'workspace.error.lastOwner',
            });
            expect(
                workspaceMemberRepository.removeMemberInTx
            ).not.toHaveBeenCalled();
        });

        it('lets an owner leave when another owner remains, counting and deleting on tx', async () => {
            const owner = {
                ...baseMember,
                role: EnumWorkspaceMemberRole.owner,
            };
            workspaceMemberRepository.countOwnersInTx.mockResolvedValue(2);

            await domain.leaveWorkspaceInTx(tx, 'workspace-1', owner);

            expect(
                workspaceMemberRepository.countOwnersInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1');
            expect(
                workspaceMemberRepository.removeMemberInTx
            ).toHaveBeenCalledWith(
                tx,
                'member-1',
                EnumWorkspaceMemberRole.owner
            );
        });

        it('lets a non-owner leave without checking the owner count', async () => {
            await domain.leaveWorkspaceInTx(tx, 'workspace-1', baseMember);

            expect(
                workspaceMemberRepository.countOwnersInTx
            ).not.toHaveBeenCalled();
            expect(
                workspaceMemberRepository.removeMemberInTx
            ).toHaveBeenCalledWith(
                tx,
                'member-1',
                EnumWorkspaceMemberRole.member
            );
        });

        it('throws WorkspaceMemberNotFoundException when the guarded delete matches no row', async () => {
            workspaceMemberRepository.removeMemberInTx.mockResolvedValue(false);

            await expect(
                domain.leaveWorkspaceInTx(tx, 'workspace-1', baseMember)
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
                messagePath: 'workspace.error.memberNotFound',
            });
        });
    });

    describe('getMembersList', () => {
        it('delegates to the repository cursor listing', async () => {
            const pagination: IPaginationQueryCursorParams<Prisma.WorkspaceMemberWhereInput> =
                { limit: 20, orderBy: [] };
            const page: IResponsePaginationReturn<IWorkspaceMember> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            workspaceMemberRepository.findWithPaginationCursor.mockResolvedValue(
                page
            );

            const result = await domain.getMembersList(
                'workspace-1',
                pagination,
                { role: { in: [EnumWorkspaceMemberRole.admin] } }
            );

            expect(result).toBe(page);
            expect(
                workspaceMemberRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith('workspace-1', pagination, {
                role: { in: [EnumWorkspaceMemberRole.admin] },
            });
        });

        it('passes a null role filter when none is given', async () => {
            const pagination: IPaginationQueryCursorParams<Prisma.WorkspaceMemberWhereInput> =
                { limit: 20, orderBy: [] };
            const page: IResponsePaginationReturn<IWorkspaceMember> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            workspaceMemberRepository.findWithPaginationCursor.mockResolvedValue(
                page
            );

            const result = await domain.getMembersList(
                'workspace-1',
                pagination
            );

            expect(result).toBe(page);
            expect(
                workspaceMemberRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith('workspace-1', pagination, null);
        });
    });

    describe('updateMemberRole', () => {
        const actor = {
            ...baseMember,
            id: 'member-1',
            userId: 'user-1',
            role: EnumWorkspaceMemberRole.admin,
        };
        const target = {
            ...baseMember,
            id: 'member-2',
            userId: 'user-2',
            role: EnumWorkspaceMemberRole.member,
        };

        it('throws WorkspaceMemberNotFoundException when the target member does not exist', async () => {
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue(
                null
            );

            await expect(
                domain.updateMemberRole(
                    'workspace-1',
                    actor,
                    'member-2',
                    EnumWorkspaceMemberRole.admin
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
                messagePath: 'workspace.error.memberNotFound',
            });
            expect(workspaceMemberRepository.updateRole).not.toHaveBeenCalled();
        });

        it('throws WorkspaceMemberPeerForbiddenException when the actor targets itself', async () => {
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue({
                ...target,
                userId: 'user-1',
            });

            await expect(
                domain.updateMemberRole(
                    'workspace-1',
                    actor,
                    'member-2',
                    EnumWorkspaceMemberRole.admin
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberPeerForbiddenException,
            });
            expect(workspaceUtil.isPeerActionAllowed).not.toHaveBeenCalled();
            expect(workspaceMemberRepository.updateRole).not.toHaveBeenCalled();
        });

        it('throws WorkspaceMemberPeerForbiddenException when the util forbids the peer action', async () => {
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue(
                target
            );
            workspaceUtil.isPeerActionAllowed.mockReturnValue(false);

            await expect(
                domain.updateMemberRole(
                    'workspace-1',
                    actor,
                    'member-2',
                    EnumWorkspaceMemberRole.admin
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberPeerForbiddenException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberPeerForbidden,
                messagePath: 'workspace.error.memberPeerForbidden',
            });
            expect(workspaceUtil.isPeerActionAllowed).toHaveBeenCalledWith(
                EnumWorkspaceMemberRole.admin,
                EnumWorkspaceMemberRole.member
            );
            expect(workspaceMemberRepository.updateRole).not.toHaveBeenCalled();
        });

        it('updates the role guarded by the role read and returns the target member', async () => {
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue(
                target
            );

            const result = await domain.updateMemberRole(
                'workspace-1',
                actor,
                'member-2',
                EnumWorkspaceMemberRole.admin
            );

            expect(result).toBe(target);
            expect(
                workspaceMemberRepository.findByIdAndWorkspace
            ).toHaveBeenCalledWith('member-2', 'workspace-1');
            expect(workspaceMemberRepository.updateRole).toHaveBeenCalledWith(
                'member-2',
                EnumWorkspaceMemberRole.member,
                EnumWorkspaceMemberRole.admin
            );
        });

        it('throws WorkspaceMemberPeerForbiddenException when the target role changed since it was read', async () => {
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue(
                target
            );
            workspaceMemberRepository.updateRole.mockResolvedValue(false);

            await expect(
                domain.updateMemberRole(
                    'workspace-1',
                    actor,
                    'member-2',
                    EnumWorkspaceMemberRole.admin
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberPeerForbiddenException,
            });
        });
    });

    describe('removeMemberInTx', () => {
        const tx = {} as IDatabaseTransactionClient;
        const actor = {
            ...baseMember,
            id: 'member-1',
            userId: 'user-1',
            role: EnumWorkspaceMemberRole.admin,
        };
        const target = {
            ...baseMember,
            id: 'member-2',
            userId: 'user-2',
            role: EnumWorkspaceMemberRole.member,
        };

        it('throws WorkspaceMemberNotFoundException when the target member does not exist', async () => {
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue(
                null
            );

            await expect(
                domain.removeMemberInTx(tx, 'workspace-1', actor, 'member-2')
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
                messagePath: 'workspace.error.memberNotFound',
            });
            expect(
                workspaceMemberRepository.removeMemberInTx
            ).not.toHaveBeenCalled();
        });

        it('throws WorkspaceMemberPeerForbiddenException when the target is the actor itself', async () => {
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue({
                ...target,
                userId: 'user-1',
            });

            await expect(
                domain.removeMemberInTx(tx, 'workspace-1', actor, 'member-2')
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberPeerForbiddenException,
            });
            expect(
                workspaceMemberRepository.removeMemberInTx
            ).not.toHaveBeenCalled();
        });

        it('throws WorkspaceMemberPeerForbiddenException when the util forbids the peer action', async () => {
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue(
                target
            );
            workspaceUtil.isPeerActionAllowed.mockReturnValue(false);

            await expect(
                domain.removeMemberInTx(tx, 'workspace-1', actor, 'member-2')
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberPeerForbiddenException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberPeerForbidden,
                messagePath: 'workspace.error.memberPeerForbidden',
            });
            expect(
                workspaceMemberRepository.removeMemberInTx
            ).not.toHaveBeenCalled();
        });

        it('removes the target member and returns it', async () => {
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue(
                target
            );

            const result = await domain.removeMemberInTx(
                tx,
                'workspace-1',
                actor,
                'member-2'
            );

            expect(result).toBe(target);
            expect(
                workspaceMemberRepository.removeMemberInTx
            ).toHaveBeenCalledWith(
                tx,
                'member-2',
                EnumWorkspaceMemberRole.member
            );
        });

        it('throws WorkspaceMemberPeerForbiddenException when the target role changed since it was read', async () => {
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue(
                target
            );
            workspaceMemberRepository.removeMemberInTx.mockResolvedValue(false);

            await expect(
                domain.removeMemberInTx(tx, 'workspace-1', actor, 'member-2')
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberPeerForbiddenException,
            });
        });
    });

    describe('getMembersListByAdmin', () => {
        const workspace: Workspace = {
            id: 'workspace-1',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            deletedAt: null,
            deletedBy: null,
            name: 'Acme',
            slug: 'acme-team',
            description: null,
            isPublic: false,
        };
        const pagination: IPaginationQueryOffsetParams<Prisma.WorkspaceMemberWhereInput> =
            { limit: 20, skip: 0, orderBy: [] };

        it('throws WorkspaceNotFoundException when the workspace does not exist', async () => {
            workspaceRepository.findByIdByAdmin.mockResolvedValue(null);
            workspaceMemberRepository.findWithPaginationOffset.mockResolvedValue(
                {
                    type: EnumPaginationType.offset,
                    count: 0,
                    perPage: 20,
                    page: 1,
                    totalPage: 0,
                    hasNext: false,
                    hasPrevious: false,
                    data: [],
                }
            );

            await expect(
                domain.getMembersListByAdmin('workspace-1', pagination)
            ).rejects.toMatchObject({
                constructor: WorkspaceNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.notFound,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.notFound
                    ],
                messagePath: 'workspace.error.notFound',
            });
        });

        it('returns the paginated members when the workspace exists', async () => {
            workspaceRepository.findByIdByAdmin.mockResolvedValue(workspace);
            const page: IResponsePaginationReturn<IWorkspaceMember> = {
                type: EnumPaginationType.offset,
                count: 1,
                perPage: 20,
                page: 1,
                totalPage: 1,
                hasNext: false,
                hasPrevious: false,
                data: [],
            };
            workspaceMemberRepository.findWithPaginationOffset.mockResolvedValue(
                page
            );

            const result = await domain.getMembersListByAdmin(
                'workspace-1',
                pagination
            );

            expect(result).toBe(page);
            expect(
                workspaceMemberRepository.findWithPaginationOffset
            ).toHaveBeenCalledWith('workspace-1', pagination, null);
        });
    });
});
