import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { Duration } from 'luxon';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
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
import { WorkspaceJoinRequestNoncePattern } from '@modules/workspace/constants/workspace.constant';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
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

describe('WorkspaceJoinRequestService', () => {
    const workspaceJoinRequestRepository: MockProxy<WorkspaceJoinRequestRepository> =
        mock<WorkspaceJoinRequestRepository>();
    const workspaceMemberRepository: MockProxy<WorkspaceMemberRepository> =
        mock<WorkspaceMemberRepository>();
    const workspaceRepository: MockProxy<WorkspaceRepository> =
        mock<WorkspaceRepository>();
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();
    const configGet = vi.fn<(key: string) => unknown>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const pendingNonce = 'a'.repeat(64);
    const expiredAt = new Date('2026-01-09T00:00:00.000Z');

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
        expiredAt,
        nonce: pendingNonce,
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

    let service: WorkspaceJoinRequestService;

    beforeEach(async () => {
        vi.resetAllMocks();
        helperDateService.create.mockReturnValue(reviewedAt);
        helperStringService.fillPattern.mockReturnValue('workspace-1:user-2');
        helperHashService.sha256Hash.mockReturnValue(pendingNonce);
        configGet.mockImplementation((key: string) =>
            key === 'workspace.joinRequest.expiresInMs' ? 604800000 : null
        );
        helperDateService.forward.mockReturnValue(expiredAt);
        helperDateService.createDuration.mockReturnValue(
            Duration.fromMillis(604800000)
        );
        databaseService.withTransaction.mockImplementation(async fn => fn(tx));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceJoinRequestService,
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
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
                { provide: DatabaseService, useValue: databaseService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: HelperStringService, useValue: helperStringService },
                { provide: HelperHashService, useValue: helperHashService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        service = module.get(WorkspaceJoinRequestService);
    });

    describe('getJoinableWorkspace', () => {
        it('throws WorkspaceNotFoundException when the workspace does not exist', async () => {
            workspaceRepository.findActiveById.mockResolvedValue(null);

            await expect(
                service.getJoinableWorkspace('user-2', 'workspace-1')
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
                service.getJoinableWorkspace('user-2', 'workspace-1')
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

            await expect(
                service.getJoinableWorkspace('user-2', 'workspace-1')
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

        it('returns the public workspace when the caller is not a member', async () => {
            workspaceRepository.findActiveById.mockResolvedValue(workspace);
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                null
            );

            const result = await service.getJoinableWorkspace(
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
        });
    });

    describe('createJoinRequest', () => {
        it('creates the pending join request with the hashed nonce and the configured expiry', async () => {
            const create: IWorkspaceJoinRequestCreate = {
                workspaceId: 'workspace-1',
                message: 'Please let me in',
            };
            workspaceJoinRequestRepository.createPending.mockResolvedValue(
                baseJoinRequest
            );

            const result = await service.createJoinRequest('user-2', create);

            expect(result).toBe(baseJoinRequest);
            expect(
                workspaceJoinRequestRepository.createPending
            ).toHaveBeenCalledWith({
                workspaceId: 'workspace-1',
                userId: 'user-2',
                message: 'Please let me in',
                expiredAt,
                nonce: pendingNonce,
            });
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                WorkspaceJoinRequestNoncePattern,
                { workspaceId: 'workspace-1', userId: 'user-2' }
            );
            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                'workspace-1:user-2'
            );
            expect(helperDateService.createDuration).toHaveBeenCalledWith({
                milliseconds: 604800000,
            });
            expect(helperDateService.forward).toHaveBeenCalledWith(
                reviewedAt,
                Duration.fromMillis(604800000)
            );
        });

        it('throws WorkspaceJoinRequestDuplicateException when the nonce collides', async () => {
            const collision = new Error('nonce');
            workspaceJoinRequestRepository.createPending.mockRejectedValue(
                collision
            );
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            await expect(
                service.createJoinRequest('user-2', {
                    workspaceId: 'workspace-1',
                    message: null,
                })
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
            expect(databaseUtil.isUniqueCollision).toHaveBeenCalledWith(
                collision,
                'nonce'
            );
        });

        it('throws WorkspaceJoinRequestDuplicateException on a write conflict', async () => {
            const conflict = new Error('write-conflict');
            workspaceJoinRequestRepository.createPending.mockRejectedValue(
                conflict
            );
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.createJoinRequest('user-2', {
                    workspaceId: 'workspace-1',
                    message: null,
                })
            ).rejects.toMatchObject({
                constructor: WorkspaceJoinRequestDuplicateException,
                statusCode: EnumWorkspaceStatusCodeError.joinRequestDuplicate,
                messagePath: 'workspace.error.joinRequestDuplicate',
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('wraps another create failure in AppUnknownException', async () => {
            const cause = new Error('db-down');
            workspaceJoinRequestRepository.createPending.mockRejectedValue(
                cause
            );
            databaseUtil.isUniqueCollision.mockReturnValue(false);

            await expect(
                service.createJoinRequest('user-2', {
                    workspaceId: 'workspace-1',
                    message: null,
                })
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });

    describe('getJoinRequestsList', () => {
        const pagination: IPaginationQueryCursorParams<Prisma.WorkspaceJoinRequestWhereInput> =
            {
                fingerprint: 'aaaaaaaaaaaaaaaa',
                limit: 20,
                orderBy: [],
            };
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

            const result = await service.getJoinRequestsList(
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

            const result = await service.getJoinRequestsList(
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
                service.getPendingById('join-request-1', 'workspace-1')
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
                service.getPendingById('join-request-1', 'workspace-1')
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

            const result = await service.getPendingById(
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
            workspaceMemberService.createInTx.mockImplementation(async () => {
                calls.push('createMember');

                return workspaceMember;
            });

            await service.acceptJoinRequest(baseJoinRequest, 'reviewer-1');

            expect(calls).toEqual(['accept', 'createMember']);
            expect(
                workspaceJoinRequestRepository.acceptInTx
            ).toHaveBeenCalledWith(
                tx,
                'join-request-1',
                'reviewer-1',
                reviewedAt
            );
            expect(workspaceMemberService.createInTx).toHaveBeenCalledWith(
                tx,
                'workspace-1',
                'user-2',
                EnumWorkspaceMemberRole.member,
                'reviewer-1'
            );
            expect(helperHashService.sha256Hash).not.toHaveBeenCalledWith(
                'join-request-1'
            );
        });

        it('throws WorkspaceJoinRequestAlreadyProcessedException before the member insert when the guarded accept matches no pending request', async () => {
            workspaceJoinRequestRepository.acceptInTx.mockResolvedValue(false);

            await expect(
                service.acceptJoinRequest(baseJoinRequest, 'reviewer-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceJoinRequestAlreadyProcessedException,
                module: 'workspace',
                statusCode:
                    EnumWorkspaceStatusCodeError.joinRequestAlreadyProcessed,
                messagePath: 'workspace.error.joinRequestAlreadyProcessed',
            });
            expect(workspaceMemberService.createInTx).not.toHaveBeenCalled();
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
                service.acceptJoinRequest(baseJoinRequest, 'reviewer-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceJoinRequestAlreadyProcessedException,
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('maps a unique collision on the member insert to WorkspaceJoinRequestAlreadyMemberException', async () => {
            workspaceJoinRequestRepository.acceptInTx.mockResolvedValue(true);
            const collision = new Error('unique');
            workspaceMemberService.createInTx.mockRejectedValue(collision);
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            await expect(
                service.acceptJoinRequest(baseJoinRequest, 'reviewer-1')
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
                service.acceptJoinRequest(baseJoinRequest, 'reviewer-1')
            ).rejects.toBeInstanceOf(AppUnknownException);
        });
    });

    describe('rejectJoinRequest', () => {
        it('rejects the request with the reason and the review time', async () => {
            workspaceJoinRequestRepository.reject.mockResolvedValue(true);

            await service.rejectJoinRequest(
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
            expect(helperHashService.sha256Hash).not.toHaveBeenCalledWith(
                'join-request-1'
            );
        });

        it('throws WorkspaceJoinRequestAlreadyProcessedException when the guarded reject matches no pending request', async () => {
            workspaceJoinRequestRepository.reject.mockResolvedValue(false);

            await expect(
                service.rejectJoinRequest(
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

    describe('expireStalePending', () => {
        it('returns the count the repository sweep expired', async () => {
            workspaceJoinRequestRepository.expireStalePending.mockResolvedValue(
                3
            );

            const result = await service.expireStalePending();

            expect(result).toBe(3);
            expect(
                workspaceJoinRequestRepository.expireStalePending
            ).toHaveBeenCalledWith();
        });
    });

    describe('cancelPendingByWorkspaceInTx', () => {
        it('cancels the pending requests of the workspace on the given transaction', async () => {
            await service.cancelPendingByWorkspaceInTx(tx, 'workspace-1');

            expect(
                workspaceJoinRequestRepository.cancelPendingByWorkspaceInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1');
        });
    });

    describe('cancelPendingByUserInTx', () => {
        it('cancels the pending request of the user in the workspace on the given transaction and returns the count', async () => {
            workspaceJoinRequestRepository.cancelPendingByUserInTx.mockResolvedValue(
                1
            );

            const result = await service.cancelPendingByUserInTx(
                tx,
                'workspace-1',
                'user-1'
            );

            expect(result).toBe(1);
            expect(
                workspaceJoinRequestRepository.cancelPendingByUserInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1', 'user-1');
        });
    });

    describe('cancelPendingByRequesterInTx', () => {
        it('cancels every pending request of the requester on the given transaction', async () => {
            await service.cancelPendingByRequesterInTx(tx, 'user-1');

            expect(
                workspaceJoinRequestRepository.cancelPendingByRequesterInTx
            ).toHaveBeenCalledWith(tx, 'user-1');
        });
    });
});
