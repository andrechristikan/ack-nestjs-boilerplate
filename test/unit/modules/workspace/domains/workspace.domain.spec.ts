import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { Prisma, Workspace } from '@generated/prisma-client/client';
import { WorkspaceCapReachedException } from '@modules/workspace/exceptions/workspace.cap-reached.exception';
import { WorkspaceHeaderMissingException } from '@modules/workspace/exceptions/workspace.header-missing.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceSlugAlreadyExistsException } from '@modules/workspace/exceptions/workspace.slug-already-exists.exception';
import { WorkspaceSlugInvalidException } from '@modules/workspace/exceptions/workspace.slug-invalid.exception';
import type {
    IWorkspaceCreate,
    IWorkspaceOwnedUser,
    IWorkspaceUpdate,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';

describe('WorkspaceDomain', () => {
    const workspaceRepository: MockProxy<WorkspaceRepository> =
        mock<WorkspaceRepository>();
    const workspaceMemberRepository: MockProxy<WorkspaceMemberRepository> =
        mock<WorkspaceMemberRepository>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const workspaceUtil: MockProxy<WorkspaceUtil> = mock<WorkspaceUtil>();
    const configGet = vi.fn<(key: string) => unknown>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    const configValues: Record<string, unknown> = {
        'workspace.maxWorkspacesPerUser': 5,
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

    let domain: WorkspaceDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation((key: string) => configValues[key]);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceDomain,
                { provide: WorkspaceRepository, useValue: workspaceRepository },
                {
                    provide: WorkspaceMemberRepository,
                    useValue: workspaceMemberRepository,
                },
                { provide: DatabaseService, useValue: databaseService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: WorkspaceUtil, useValue: workspaceUtil },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        domain = module.get(WorkspaceDomain);
    });

    describe('validateWorkspaceGuard', () => {
        it('throws WorkspaceHeaderMissingException when the id is null', async () => {
            await expect(
                domain.validateWorkspaceGuard(null)
            ).rejects.toMatchObject({
                constructor: WorkspaceHeaderMissingException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.headerMissing,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.headerMissing
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'workspace.error.headerMissing',
            });
            expect(workspaceRepository.findActiveById).not.toHaveBeenCalled();
        });

        it('throws WorkspaceNotFoundException when no active workspace matches the id', async () => {
            workspaceRepository.findActiveById.mockResolvedValue(null);

            await expect(
                domain.validateWorkspaceGuard('workspace-1')
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

        it('returns the active workspace resolved by id', async () => {
            workspaceRepository.findActiveById.mockResolvedValue(workspace);

            const result = await domain.validateWorkspaceGuard('workspace-1');

            expect(result).toBe(workspace);
            expect(workspaceRepository.findActiveById).toHaveBeenCalledWith(
                'workspace-1'
            );
        });
    });

    describe('getListCursorByMember', () => {
        it('delegates to the repository cursor listing', async () => {
            const pagination: IPaginationQueryCursorParams<Prisma.WorkspaceWhereInput> =
                {
                    fingerprint: 'aaaaaaaaaaaaaaaa',
                    limit: 20,
                    orderBy: [],
                };
            const page: IResponsePaginationReturn<Workspace> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [workspace],
            };
            workspaceRepository.findWithPaginationCursorByMember.mockResolvedValue(
                page
            );

            const result = await domain.getListCursorByMember(
                'user-1',
                pagination
            );

            expect(result).toBe(page);
            expect(
                workspaceRepository.findWithPaginationCursorByMember
            ).toHaveBeenCalledWith('user-1', pagination);
        });
    });

    describe('createInTx', () => {
        it('creates the workspace row and its owner membership', async () => {
            const tx = {} as IDatabaseTransactionClient;
            const create: IWorkspaceCreate = {
                name: 'Acme',
                description: null,
                isPublic: null,
            };
            workspaceRepository.createInTx.mockResolvedValue(workspace);

            const result = await domain.createInTx(
                tx,
                'user-1',
                create,
                'acme-team',
                'workspace-1'
            );

            expect(result).toBe(workspace);
            expect(workspaceRepository.createInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                create,
                'acme-team',
                'workspace-1'
            );
            expect(
                workspaceMemberRepository.createOwnerInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1', 'user-1');
        });
    });

    describe('createPersonalInTx', () => {
        it('creates the workspace with only a name', async () => {
            const tx = {} as IDatabaseTransactionClient;
            workspaceRepository.createInTx.mockResolvedValue(workspace);

            await domain.createPersonalInTx(
                tx,
                'user-1',
                'Acme',
                'acme-team',
                'workspace-1'
            );

            expect(workspaceRepository.createInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                { name: 'Acme', description: null, isPublic: null },
                'acme-team',
                'workspace-1'
            );
        });
    });

    describe('createOwnedForUsersInTx', () => {
        it('does nothing for an empty user list', async () => {
            const tx = {} as IDatabaseTransactionClient;

            await domain.createOwnedForUsersInTx(tx, []);

            expect(workspaceRepository.createInTx).not.toHaveBeenCalled();
        });

        it('creates a personal workspace for every owned user', async () => {
            const tx = {} as IDatabaseTransactionClient;
            const owned: IWorkspaceOwnedUser[] = [
                {
                    userId: 'user-1',
                    workspaceId: 'workspace-1',
                    name: 'User One',
                    slug: 'user-one',
                },
                {
                    userId: 'user-2',
                    workspaceId: 'workspace-2',
                    name: 'User Two',
                    slug: 'user-two',
                },
            ];
            workspaceRepository.createInTx.mockResolvedValue(workspace);

            await domain.createOwnedForUsersInTx(tx, owned);

            expect(workspaceRepository.createInTx).toHaveBeenNthCalledWith(
                1,
                tx,
                'user-1',
                { name: 'User One', description: null, isPublic: null },
                'user-one',
                'workspace-1'
            );
            expect(workspaceRepository.createInTx).toHaveBeenNthCalledWith(
                2,
                tx,
                'user-2',
                { name: 'User Two', description: null, isPublic: null },
                'user-two',
                'workspace-2'
            );
        });
    });

    describe('createWorkspace', () => {
        const create: IWorkspaceCreate = {
            name: 'Acme',
            description: null,
            isPublic: null,
        };
        const tx = {} as IDatabaseTransactionClient;

        beforeEach(() => {
            workspaceUtil.drawSlugCandidates.mockReturnValue([
                'ws-aaa',
                'ws-bbb',
                'ws-ccc',
            ]);
            databaseUtil.createId.mockReturnValue('workspace-1');
        });

        it('throws WorkspaceCapReachedException from inside the transaction when the owner already meets the cap', async () => {
            databaseService.withTransaction.mockImplementation(fn => fn(tx));
            workspaceRepository.countByOwnerInTx.mockResolvedValue(5);

            await expect(
                domain.createWorkspace('user-1', create)
            ).rejects.toMatchObject({
                constructor: WorkspaceCapReachedException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.capReached,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.capReached
                    ],
                messagePath: 'workspace.error.capReached',
            });
            expect(workspaceRepository.countByOwnerInTx).toHaveBeenCalledWith(
                tx,
                'user-1'
            );
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(workspaceRepository.createInTx).not.toHaveBeenCalled();
            expect(
                workspaceMemberRepository.createOwnerInTx
            ).not.toHaveBeenCalled();
        });

        it('creates the workspace on the first slug candidate', async () => {
            workspaceRepository.countByOwnerInTx.mockResolvedValue(1);
            databaseService.withTransaction.mockImplementation(fn => fn(tx));
            workspaceRepository.createInTx.mockResolvedValue(workspace);

            const result = await domain.createWorkspace('user-1', create);

            expect(result).toBe(workspace);
            expect(workspaceRepository.countByOwnerInTx).toHaveBeenCalledWith(
                tx,
                'user-1'
            );
            expect(workspaceRepository.createInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                create,
                'ws-aaa',
                'workspace-1'
            );
            expect(
                workspaceMemberRepository.createOwnerInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1', 'user-1');
        });

        it('retries with the next slug candidate after a collision and creates on the second attempt', async () => {
            workspaceRepository.countByOwnerInTx.mockResolvedValue(1);
            const collision = new Error('slug collision');
            databaseService.withTransaction
                .mockRejectedValueOnce(collision)
                .mockImplementationOnce(fn => fn(tx));
            databaseUtil.isUniqueCollision.mockReturnValue(true);
            workspaceRepository.createInTx.mockResolvedValue(workspace);

            const result = await domain.createWorkspace('user-1', create);

            expect(result).toBe(workspace);
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(2);
            expect(workspaceRepository.createInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                create,
                'ws-bbb',
                'workspace-1'
            );
        });

        it('wraps a non-collision transaction error in AppUnknownException without retrying', async () => {
            workspaceRepository.countByOwnerInTx.mockResolvedValue(1);
            const otherError = new Error('unexpected');
            databaseService.withTransaction.mockRejectedValue(otherError);
            databaseUtil.isUniqueCollision.mockReturnValue(false);

            await expect(
                domain.createWorkspace('user-1', create)
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: otherError,
            });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('propagates an AppBaseException raised in the transaction without retrying', async () => {
            workspaceRepository.countByOwnerInTx.mockResolvedValue(1);
            const typedError = new WorkspaceNotFoundException();
            databaseService.withTransaction.mockRejectedValue(typedError);
            databaseUtil.isUniqueCollision.mockReturnValue(false);

            await expect(domain.createWorkspace('user-1', create)).rejects.toBe(
                typedError
            );
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('throws DatabaseUniqueValueGenerationFailedException when every slug candidate collides', async () => {
            workspaceRepository.countByOwnerInTx.mockResolvedValue(1);
            const collision = new Error('slug collision');
            databaseService.withTransaction.mockRejectedValue(collision);
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            await expect(
                domain.createWorkspace('user-1', create)
            ).rejects.toMatchObject({
                constructor: DatabaseUniqueValueGenerationFailedException,
                module: 'database',
            });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(3);
        });
    });

    describe('updateWorkspace', () => {
        it('writes the details as given', async () => {
            const update: IWorkspaceUpdate = {
                name: 'Acme 2',
                description: null,
            };
            workspaceRepository.updateDetails.mockResolvedValue(workspace);

            const result = await domain.updateWorkspace('workspace-1', update);

            expect(result).toBe(workspace);
            expect(workspaceRepository.updateDetails).toHaveBeenCalledWith(
                'workspace-1',
                update
            );
        });
    });

    describe('updateWorkspaceIsPublic', () => {
        it('writes the visibility', async () => {
            workspaceRepository.updateIsPublic.mockResolvedValue(workspace);

            const result = await domain.updateWorkspaceIsPublic(
                'workspace-1',
                true
            );

            expect(result).toBe(workspace);
            expect(workspaceRepository.updateIsPublic).toHaveBeenCalledWith(
                'workspace-1',
                true
            );
        });
    });

    describe('updateWorkspaceSlug', () => {
        it('throws WorkspaceSlugInvalidException before writing when the util rejects the slug', async () => {
            workspaceUtil.isSlugAllowed.mockReturnValue(false);

            await expect(
                domain.updateWorkspaceSlug('workspace-1', 'Not Allowed!')
            ).rejects.toMatchObject({
                constructor: WorkspaceSlugInvalidException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.slugInvalid,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.slugInvalid
                    ],
                messagePath: 'workspace.error.slugInvalid',
            });
            expect(workspaceUtil.isSlugAllowed).toHaveBeenCalledWith(
                'Not Allowed!'
            );
            expect(workspaceRepository.updateSlug).not.toHaveBeenCalled();
        });

        it('throws WorkspaceSlugAlreadyExistsException when the write collides on the slug index', async () => {
            workspaceUtil.isSlugAllowed.mockReturnValue(true);
            const collision = new Error('slug collision');
            workspaceRepository.updateSlug.mockRejectedValue(collision);
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            await expect(
                domain.updateWorkspaceSlug('workspace-1', 'taken-slug')
            ).rejects.toMatchObject({
                constructor: WorkspaceSlugAlreadyExistsException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.slugAlreadyExists,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.slugAlreadyExists
                    ],
                messagePath: 'workspace.error.slugAlreadyExists',
            });
            expect(databaseUtil.isUniqueCollision).toHaveBeenCalledWith(
                collision,
                'slug'
            );
        });

        it('wraps a non-collision write error in AppUnknownException', async () => {
            workspaceUtil.isSlugAllowed.mockReturnValue(true);
            const otherError = new Error('unexpected');
            workspaceRepository.updateSlug.mockRejectedValue(otherError);
            databaseUtil.isUniqueCollision.mockReturnValue(false);

            await expect(
                domain.updateWorkspaceSlug('workspace-1', 'new-slug')
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: otherError,
            });
        });

        it('writes the slug when it is allowed', async () => {
            workspaceUtil.isSlugAllowed.mockReturnValue(true);
            workspaceRepository.updateSlug.mockResolvedValue(workspace);

            const result = await domain.updateWorkspaceSlug(
                'workspace-1',
                'new-slug'
            );

            expect(result).toBe(workspace);
            expect(workspaceRepository.updateSlug).toHaveBeenCalledWith(
                'workspace-1',
                'new-slug'
            );
        });
    });

    describe('softDeleteInTx', () => {
        it('soft-deletes the workspace row on the given transaction', async () => {
            const tx = {} as IDatabaseTransactionClient;
            const deletedAt = new Date('2026-01-01T00:00:00.000Z');

            await domain.softDeleteInTx(tx, 'workspace-1', deletedAt);

            expect(workspaceRepository.softDeleteInTx).toHaveBeenCalledWith(
                tx,
                'workspace-1',
                deletedAt
            );
        });
    });

    describe('softDeleteSolelyOwnedByUserInTx', () => {
        it('soft-deletes the workspaces the user solely owns on the given transaction and returns their ids', async () => {
            const tx = {} as IDatabaseTransactionClient;
            const deletedAt = new Date('2026-01-01T00:00:00.000Z');
            workspaceRepository.softDeleteSolelyOwnedByUserInTx.mockResolvedValue(
                ['workspace-1', 'workspace-2']
            );

            await expect(
                domain.softDeleteSolelyOwnedByUserInTx(tx, 'user-1', deletedAt)
            ).resolves.toEqual(['workspace-1', 'workspace-2']);

            expect(
                workspaceRepository.softDeleteSolelyOwnedByUserInTx
            ).toHaveBeenCalledWith(tx, 'user-1', deletedAt);
        });
    });

    describe('getListOffsetByAdmin', () => {
        it('delegates to the repository offset listing with the isPublic filter', async () => {
            const pagination: IPaginationQueryOffsetParams<Prisma.WorkspaceWhereInput> =
                { limit: 20, skip: 0, orderBy: [] };
            const page: IResponsePaginationReturn<Workspace> = {
                type: EnumPaginationType.offset,
                count: 1,
                perPage: 20,
                page: 1,
                totalPage: 1,
                hasNext: false,
                hasPrevious: false,
                data: [workspace],
            };
            workspaceRepository.findWithPaginationOffsetByAdmin.mockResolvedValue(
                page
            );

            const result = await domain.getListOffsetByAdmin(pagination, {
                isPublic: { equals: true },
            });

            expect(result).toBe(page);
            expect(
                workspaceRepository.findWithPaginationOffsetByAdmin
            ).toHaveBeenCalledWith(pagination, { isPublic: { equals: true } });
        });

        it('passes a null isPublic filter when none is given', async () => {
            const pagination: IPaginationQueryOffsetParams<Prisma.WorkspaceWhereInput> =
                { skip: 0, limit: 20, orderBy: [] };
            const page: IResponsePaginationReturn<Workspace> = {
                type: EnumPaginationType.offset,
                count: 0,
                perPage: 20,
                page: 1,
                totalPage: 0,
                hasNext: false,
                hasPrevious: false,
                data: [],
            };
            workspaceRepository.findWithPaginationOffsetByAdmin.mockResolvedValue(
                page
            );

            const result = await domain.getListOffsetByAdmin(pagination);

            expect(result).toBe(page);
            expect(
                workspaceRepository.findWithPaginationOffsetByAdmin
            ).toHaveBeenCalledWith(pagination, null);
        });
    });

    describe('getByIdByAdmin', () => {
        it('throws WorkspaceNotFoundException when the workspace does not exist', async () => {
            workspaceRepository.findByIdByAdmin.mockResolvedValue(null);

            await expect(
                domain.getByIdByAdmin('workspace-1')
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

        it('returns the workspace resolved for admin', async () => {
            workspaceRepository.findByIdByAdmin.mockResolvedValue(workspace);

            const result = await domain.getByIdByAdmin('workspace-1');

            expect(result).toBe(workspace);
        });
    });

    describe('previewWorkspace', () => {
        it('throws WorkspaceNotFoundException when no active public workspace matches the slug', async () => {
            workspaceRepository.findActivePublicBySlug.mockResolvedValue(null);

            await expect(
                domain.previewWorkspace('acme-team')
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

        it('returns the public workspace resolved by slug', async () => {
            workspaceRepository.findActivePublicBySlug.mockResolvedValue(
                workspace
            );

            const result = await domain.previewWorkspace('acme-team');

            expect(result).toBe(workspace);
        });
    });
});
