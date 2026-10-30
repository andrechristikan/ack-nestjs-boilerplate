import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceJoinRequestStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type {
    Prisma,
    Workspace,
    WorkspaceJoinRequest,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import { WorkspaceJoinRequestDomain } from '@modules/workspace/domains/workspace.join-request.domain';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceJoinRequestAlreadyMemberException } from '@modules/workspace/exceptions/workspace.join-request-already-member.exception';
import { WorkspaceJoinRequestAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.join-request-already-processed.exception';
import { WorkspaceJoinRequestDuplicateException } from '@modules/workspace/exceptions/workspace.join-request-duplicate.exception';
import { WorkspaceJoinRequestNotFoundException } from '@modules/workspace/exceptions/workspace.join-request-not-found.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceNotPublicException } from '@modules/workspace/exceptions/workspace.not-public.exception';
import type { IWorkspaceJoinRequestCreate } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceJoinRequestRepository } from '@modules/workspace/repositories/workspace.join-request.repository';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';

describe('WorkspaceJoinRequestDomain', () => {
    const workspaceJoinRequestRepository: MockProxy<WorkspaceJoinRequestRepository> =
        mock<WorkspaceJoinRequestRepository>();
    const workspaceMemberRepository: MockProxy<WorkspaceMemberRepository> =
        mock<WorkspaceMemberRepository>();
    const workspaceRepository: MockProxy<WorkspaceRepository> =
        mock<WorkspaceRepository>();
    const workspaceMemberDomain: MockProxy<WorkspaceMemberDomain> =
        mock<WorkspaceMemberDomain>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    const tx: IDatabaseTransactionClient = mock<IDatabaseTransactionClient>();
    const reviewedAt = new Date('2026-01-02T00:00:00.000Z');

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
        isPublic: true,
    };

    const baseJoinRequest: WorkspaceJoinRequest = {
        id: 'join-request-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-2',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: 'user-2',
        workspaceId: 'workspace-1',
        userId: 'user-2',
        status: EnumWorkspaceJoinRequestStatus.pending,
        message: 'Please let me in',
        rejectReasonCode: null,
        reviewedByUserId: null,
        reviewedAt: null,
    };

    const workspaceMember: WorkspaceMember = {
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

    let domain: WorkspaceJoinRequestDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        helperDateService.create.mockReturnValue(reviewedAt);
        databaseService.withTransaction.mockImplementation(async fn => fn(tx));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceJoinRequestDomain,
                {
                    provide: WorkspaceJoinRequestRepository,
                    useValue: workspaceJoinRequestRepository,
                },
                {
                    provide: WorkspaceMemberRepository,
                    useValue: workspaceMemberRepository,
                },
                { provide: WorkspaceRepository, useValue: workspaceRepository },
                {
                    provide: WorkspaceMemberDomain,
                    useValue: workspaceMemberDomain,
                },
                { provide: DatabaseService, useValue: databaseService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        domain = module.get(WorkspaceJoinRequestDomain);
    });

    describe('getJoinableWorkspace', () => {
        it('throws WorkspaceNotFoundException when the workspace does not exist', async () => {
            workspaceRepository.findActiveById.mockResolvedValue(null);

            await expect(
                domain.getJoinableWorkspace('user-2', 'workspace-1')
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
            expect(
                workspaceMemberRepository.findOneByWorkspaceAndUser
            ).not.toHaveBeenCalled();
        });

        it('throws WorkspaceNotPublicException when the workspace is not public', async () => {
            workspaceRepository.findActiveById.mockResolvedValue({
                ...workspace,
                isPublic: false,
            });

            await expect(
                domain.getJoinableWorkspace('user-2', 'workspace-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceNotPublicException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.notPublic,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.notPublic
                    ],
                messagePath: 'workspace.error.notPublic',
            });
        });

        it('throws WorkspaceJoinRequestAlreadyMemberException when the caller is already a member', async () => {
            workspaceRepository.findActiveById.mockResolvedValue(workspace);
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                workspaceMember
            );
            workspaceJoinRequestRepository.existsPendingByWorkspaceAndUser.mockResolvedValue(
                true
            );

            await expect(
                domain.getJoinableWorkspace('user-2', 'workspace-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceJoinRequestAlreadyMemberException,
                module: 'workspace',
                statusCode:
                    EnumWorkspaceStatusCodeError.joinRequestAlreadyMember,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.joinRequestAlreadyMember
                    ],
                messagePath: 'workspace.error.joinRequestAlreadyMember',
            });
        });

        it('throws WorkspaceJoinRequestDuplicateException when a pending request already exists', async () => {
            workspaceRepository.findActiveById.mockResolvedValue(workspace);
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                null
            );
            workspaceJoinRequestRepository.existsPendingByWorkspaceAndUser.mockResolvedValue(
                true
            );

            await expect(
                domain.getJoinableWorkspace('user-2', 'workspace-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceJoinRequestDuplicateException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.joinRequestDuplicate,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.joinRequestDuplicate
                    ],
                messagePath: 'workspace.error.joinRequestDuplicate',
            });
        });

        it('returns the public workspace when the caller is not a member and has no pending request', async () => {
            workspaceRepository.findActiveById.mockResolvedValue(workspace);
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                null
            );
            workspaceJoinRequestRepository.existsPendingByWorkspaceAndUser.mockResolvedValue(
                false
            );

            const result = await domain.getJoinableWorkspace(
                'user-2',
                'workspace-1'
            );

            expect(result).toBe(workspace);
            expect(workspaceRepository.findActiveById).toHaveBeenCalledWith(
                'workspace-1'
            );
            expect(
                workspaceMemberRepository.findOneByWorkspaceAndUser
            ).toHaveBeenCalledWith('workspace-1', 'user-2');
            expect(
                workspaceJoinRequestRepository.existsPendingByWorkspaceAndUser
            ).toHaveBeenCalledWith('workspace-1', 'user-2');
        });
    });

    describe('createJoinRequest', () => {
        it('creates the pending join request', async () => {
            const create: IWorkspaceJoinRequestCreate = {
                workspaceId: 'workspace-1',
                message: 'Please let me in',
            };
            workspaceJoinRequestRepository.createPending.mockResolvedValue(
                baseJoinRequest
            );

            const result = await domain.createJoinRequest('user-2', create);

            expect(result).toBe(baseJoinRequest);
            expect(
                workspaceJoinRequestRepository.createPending
            ).toHaveBeenCalledWith({
                workspaceId: 'workspace-1',
                userId: 'user-2',
                message: 'Please let me in',
            });
        });
    });

    describe('getJoinRequestsList', () => {
        const pagination: IPaginationQueryCursorParams<Prisma.WorkspaceJoinRequestWhereInput> =
            { limit: 20, orderBy: [] };
        const page: IResponsePaginationReturn<WorkspaceJoinRequest> = {
            type: EnumPaginationType.cursor,
            perPage: 20,
            hasNext: false,
            data: [],
        };

        it('delegates to the repository with a null status filter', async () => {
            workspaceJoinRequestRepository.findWithPaginationCursor.mockResolvedValue(
                page
            );

            const result = await domain.getJoinRequestsList(
                'workspace-1',
                pagination
            );

            expect(result).toBe(page);
            expect(
                workspaceJoinRequestRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith('workspace-1', pagination, null);
        });

        it('forwards the status filter to the repository', async () => {
            const status = { status: { in: ['pending'] } };
            workspaceJoinRequestRepository.findWithPaginationCursor.mockResolvedValue(
                page
            );

            const result = await domain.getJoinRequestsList(
                'workspace-1',
                pagination,
                status
            );

            expect(result).toBe(page);
            expect(
                workspaceJoinRequestRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith('workspace-1', pagination, status);
        });
    });

    describe('getPendingById', () => {
        it('throws WorkspaceJoinRequestNotFoundException when no request matches', async () => {
            workspaceJoinRequestRepository.findByIdAndWorkspace.mockResolvedValue(
                null
            );

            await expect(
                domain.getPendingById('join-request-1', 'workspace-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceJoinRequestNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.joinRequestNotFound,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.joinRequestNotFound
                    ],
                messagePath: 'workspace.error.joinRequestNotFound',
            });
        });

        it('throws WorkspaceJoinRequestAlreadyProcessedException when the request is not pending', async () => {
            workspaceJoinRequestRepository.findByIdAndWorkspace.mockResolvedValue(
                {
                    ...baseJoinRequest,
                    status: EnumWorkspaceJoinRequestStatus.accepted,
                }
            );

            await expect(
                domain.getPendingById('join-request-1', 'workspace-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceJoinRequestAlreadyProcessedException,
                module: 'workspace',
                statusCode:
                    EnumWorkspaceStatusCodeError.joinRequestAlreadyProcessed,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.joinRequestAlreadyProcessed
                    ],
                messagePath: 'workspace.error.joinRequestAlreadyProcessed',
            });
        });

        it('returns the pending request', async () => {
            workspaceJoinRequestRepository.findByIdAndWorkspace.mockResolvedValue(
                baseJoinRequest
            );

            const result = await domain.getPendingById(
                'join-request-1',
                'workspace-1'
            );

            expect(result).toBe(baseJoinRequest);
            expect(
                workspaceJoinRequestRepository.findByIdAndWorkspace
            ).toHaveBeenCalledWith('join-request-1', 'workspace-1');
        });
    });

    describe('acceptJoinRequest', () => {
        it('accepts the request then creates the member on one transaction', async () => {
            const calls: string[] = [];
            workspaceJoinRequestRepository.acceptInTx.mockImplementation(
                async () => {
                    calls.push('accept');

                    return true;
                }
            );
            workspaceMemberDomain.createInTx.mockImplementation(async () => {
                calls.push('createMember');

                return workspaceMember;
            });

            await domain.acceptJoinRequest(baseJoinRequest, 'reviewer-1');

            expect(calls).toEqual(['accept', 'createMember']);
            expect(
                workspaceJoinRequestRepository.acceptInTx
            ).toHaveBeenCalledWith(
                tx,
                'join-request-1',
                'reviewer-1',
                reviewedAt
            );
            expect(workspaceMemberDomain.createInTx).toHaveBeenCalledWith(
                tx,
                'workspace-1',
                'user-2',
                EnumWorkspaceMemberRole.member,
                'reviewer-1'
            );
        });

        it('throws WorkspaceJoinRequestAlreadyProcessedException before the member insert when the guarded accept matches no pending request', async () => {
            workspaceJoinRequestRepository.acceptInTx.mockResolvedValue(false);

            await expect(
                domain.acceptJoinRequest(baseJoinRequest, 'reviewer-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceJoinRequestAlreadyProcessedException,
                module: 'workspace',
                statusCode:
                    EnumWorkspaceStatusCodeError.joinRequestAlreadyProcessed,
                messagePath: 'workspace.error.joinRequestAlreadyProcessed',
            });
            expect(workspaceMemberDomain.createInTx).not.toHaveBeenCalled();
        });

        it('maps a write conflict in the transaction to WorkspaceJoinRequestAlreadyProcessedException', async () => {
            const conflict = new Error('write-conflict');
            workspaceJoinRequestRepository.acceptInTx.mockRejectedValue(
                conflict
            );
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                domain.acceptJoinRequest(baseJoinRequest, 'reviewer-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceJoinRequestAlreadyProcessedException,
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('maps a unique collision on the member insert to WorkspaceJoinRequestAlreadyMemberException', async () => {
            workspaceJoinRequestRepository.acceptInTx.mockResolvedValue(true);
            const collision = new Error('unique');
            workspaceMemberDomain.createInTx.mockRejectedValue(collision);
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            await expect(
                domain.acceptJoinRequest(baseJoinRequest, 'reviewer-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceJoinRequestAlreadyMemberException,
                module: 'workspace',
                statusCode:
                    EnumWorkspaceStatusCodeError.joinRequestAlreadyMember,
                messagePath: 'workspace.error.joinRequestAlreadyMember',
            });
            expect(databaseUtil.isUniqueCollision).toHaveBeenCalledWith(
                collision,
                'userId'
            );
        });

        it('wraps any other transaction error in AppUnknownException', async () => {
            workspaceJoinRequestRepository.acceptInTx.mockRejectedValue(
                new Error('boom')
            );
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                domain.acceptJoinRequest(baseJoinRequest, 'reviewer-1')
            ).rejects.toBeInstanceOf(AppUnknownException);
        });
    });

    describe('rejectJoinRequest', () => {
        it('rejects the request with the reason and the review time', async () => {
            workspaceJoinRequestRepository.reject.mockResolvedValue(true);

            await domain.rejectJoinRequest(
                'join-request-1',
                'reviewer-1',
                EnumWorkspaceJoinRejectReason.wrongWorkspace
            );

            expect(workspaceJoinRequestRepository.reject).toHaveBeenCalledWith(
                'join-request-1',
                'reviewer-1',
                EnumWorkspaceJoinRejectReason.wrongWorkspace,
                reviewedAt
            );
        });

        it('throws WorkspaceJoinRequestAlreadyProcessedException when the guarded reject matches no pending request', async () => {
            workspaceJoinRequestRepository.reject.mockResolvedValue(false);

            await expect(
                domain.rejectJoinRequest(
                    'join-request-1',
                    'reviewer-1',
                    EnumWorkspaceJoinRejectReason.wrongWorkspace
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceJoinRequestAlreadyProcessedException,
                module: 'workspace',
                statusCode:
                    EnumWorkspaceStatusCodeError.joinRequestAlreadyProcessed,
                messagePath: 'workspace.error.joinRequestAlreadyProcessed',
            });
        });
    });

    describe('cancelPendingByWorkspaceInTx', () => {
        it('cancels the pending requests of the workspace on the given transaction', async () => {
            await domain.cancelPendingByWorkspaceInTx(tx, 'workspace-1');

            expect(
                workspaceJoinRequestRepository.cancelPendingByWorkspaceInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1');
        });
    });
});
