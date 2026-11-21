import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import type { Workspace } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { FeatureFlagNotConfiguredException } from '@modules/feature-flag/exceptions/feature-flag.not-configured.exception';
import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import { WorkspaceCapReachedException } from '@modules/workspace/exceptions/workspace.cap-reached.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceOwnerTransferRequiredException } from '@modules/workspace/exceptions/workspace.owner-transfer-required.exception';
import { WorkspaceSlugAlreadyExistsException } from '@modules/workspace/exceptions/workspace.slug-already-exists.exception';
import { WorkspaceSlugInvalidException } from '@modules/workspace/exceptions/workspace.slug-invalid.exception';
import type {
    IWorkspaceCreate,
    IWorkspaceOwnedUser,
    IWorkspaceUpdate,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
    buildUser,
    buildUserContext,
    buildWorkspace,
} from '@test/unit/helpers/test.unit.request.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { buildPrismaKnownRequestError } from '@test/unit/helpers/test.unit.database.helper';
import { EnumDatabaseStatusCodeError } from '@common/database/enums/database.status-code.enum';

describe('WorkspaceService', () => {
    const workspaceRepository: MockProxy<WorkspaceRepository> =
        mock<WorkspaceRepository>();
    const workspaceMemberRepository: MockProxy<WorkspaceMemberRepository> =
        mock<WorkspaceMemberRepository>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-1', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const entry = buildActivityLogCreateManyEffect('entry');
    let databaseUtil: DatabaseUtil;
    let helperStringService: HelperStringService;
    const featureFlagService: MockProxy<FeatureFlagService> =
        mock<FeatureFlagService>();

    const configValues: Record<string, unknown> = {
        'workspace.slugRegex': /^[a-z0-9-]+$/,
        'workspace.slugPrefix': 'ws-',
        'workspace.slugMaxLength': 12,
        'workspace.slugMaxAttempts': 3,
    };

    const workspace: Workspace = buildWorkspace();

    let service: WorkspaceService;

    beforeEach(async () => {
        activityLogQueue.recordEffect.mockReturnValue(entry);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceService,
                { provide: WorkspaceRepository, useValue: workspaceRepository },
                {
                    provide: WorkspaceMemberRepository,
                    useValue: workspaceMemberRepository,
                },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                ...TestUnitKitProviders,
                { provide: FeatureFlagService, useValue: featureFlagService },
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                        ...configValues,
                    }),
                },
            ],
        }).compile();

        service = module.get(WorkspaceService);
        databaseUtil = module.get(DatabaseUtil);
        helperStringService = module.get(HelperStringService);
    });

    describe('getListCursorByMember', () => {
        const pagination: IPaginationQueryCursorParams = {
            fingerprint: 'aaaaaaaaaaaaaaaa',
            limit: 20,
            orderBy: [],
        };

        it('reads the member workspace ids and lists the workspaces by them', async () => {
            const page: IResponsePaginationReturn<Workspace> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [workspace],
            };
            workspaceMemberRepository.findWorkspaceIdsByUser.mockResolvedValue([
                'workspace-1',
                'workspace-2',
            ]);
            workspaceRepository.findWithPaginationCursorByMember.mockResolvedValue(
                page
            );

            const result = await service.getListCursorByMember(
                'user-1',
                pagination
            );

            expect(result).toBe(page);
            expect(
                workspaceMemberRepository.findWorkspaceIdsByUser
            ).toHaveBeenCalledWith('user-1', null);
            expect(
                workspaceRepository.findWithPaginationCursorByMember
            ).toHaveBeenCalledWith(['workspace-1', 'workspace-2'], pagination);
        });

        it('passes an empty id list to the repository unchanged', async () => {
            workspaceMemberRepository.findWorkspaceIdsByUser.mockResolvedValue(
                []
            );

            await service.getListCursorByMember('user-1', pagination);

            expect(
                workspaceRepository.findWithPaginationCursorByMember
            ).toHaveBeenCalledWith([], pagination);
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

            const result = await service.createInTx(
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

            await service.createPersonalInTx(
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

            await service.createOwnedForUsersInTx(tx, []);

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

            await service.createOwnedForUsersInTx(tx, owned);

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
            vi.spyOn(
                helperStringService,
                'generateSlugCandidates'
            ).mockReturnValue(['ws-aaa', 'ws-bbb', 'ws-ccc']);
            vi.spyOn(databaseUtil, 'createId').mockReturnValue('workspace-1');
            featureFlagService.getMetadataNumber.mockResolvedValue(5);
        });

        it('refuses a create for an owner of 2 workspaces when the flag caps at 2', async () => {
            featureFlagService.getMetadataNumber.mockResolvedValue(2);
            databaseService.withTransaction.mockImplementation(fn => fn(tx));
            workspaceMemberRepository.countOwnedActiveByUserInTx.mockResolvedValue(
                2
            );

            await expect(
                service.createWorkspace(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    create
                )
            ).rejects.toBeInstanceOf(WorkspaceCapReachedException);
            expect(featureFlagService.getMetadataNumber).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.maxWorkspacesPerUser
            );
        });

        it('allows a create for an owner of 2 workspaces when the flag caps at 3', async () => {
            featureFlagService.getMetadataNumber.mockResolvedValue(3);
            databaseService.withTransaction.mockImplementation(fn => fn(tx));
            workspaceMemberRepository.countOwnedActiveByUserInTx.mockResolvedValue(
                2
            );
            workspaceRepository.createInTx.mockResolvedValue(workspace);

            const result = await service.createWorkspace(
                requestContext,
                apiKeyContext,
                authContext,
                create
            );

            expect(result).toBe(workspace);
        });

        it('propagates FeatureFlagNotConfiguredException from the read and opens no transaction', async () => {
            const notConfigured = new FeatureFlagNotConfiguredException(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.maxWorkspacesPerUser
            );
            featureFlagService.getMetadataNumber.mockRejectedValue(
                notConfigured
            );

            await expect(
                service.createWorkspace(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    create
                )
            ).rejects.toBe(notConfigured);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(workspaceRepository.createInTx).not.toHaveBeenCalled();
        });

        it('throws WorkspaceCapReachedException from inside the transaction when the owner already meets the cap', async () => {
            databaseService.withTransaction.mockImplementation(fn => fn(tx));
            workspaceMemberRepository.countOwnedActiveByUserInTx.mockResolvedValue(
                5
            );

            await expect(
                service.createWorkspace(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    create
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceCapReachedException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.capReached,
            });
            expect(
                workspaceMemberRepository.countOwnedActiveByUserInTx
            ).toHaveBeenCalledWith(tx, 'user-1');
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(workspaceRepository.createInTx).not.toHaveBeenCalled();
            expect(
                workspaceMemberRepository.createOwnerInTx
            ).not.toHaveBeenCalled();
        });

        it('creates the workspace on the first slug candidate', async () => {
            workspaceMemberRepository.countOwnedActiveByUserInTx.mockResolvedValue(
                1
            );
            databaseService.withTransaction.mockImplementation(fn => fn(tx));
            workspaceRepository.createInTx.mockResolvedValue(workspace);

            const result = await service.createWorkspace(
                requestContext,
                apiKeyContext,
                authContext,
                create
            );

            expect(result).toBe(workspace);
            expect(
                workspaceMemberRepository.countOwnedActiveByUserInTx
            ).toHaveBeenCalledWith(tx, 'user-1');
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

        it('adds the creator entry on the tx of the create', async () => {
            workspaceMemberRepository.countOwnedActiveByUserInTx.mockResolvedValue(
                1
            );
            databaseService.withTransaction.mockImplementation(fn => fn(tx));
            workspaceRepository.createInTx.mockResolvedValue(workspace);

            await service.createWorkspace(
                requestContext,
                apiKeyContext,
                authContext,
                create
            );

            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.workspaceCreated,
                    userId: 'user-1',
                    createdBy: 'user-1',
                    workspaceId: 'workspace-1',
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entry);
        });

        it('retries with the next slug candidate after a collision and creates on the second attempt', async () => {
            workspaceMemberRepository.countOwnedActiveByUserInTx.mockResolvedValue(
                1
            );
            const collision = buildPrismaKnownRequestError('P2002', 'slug');
            databaseService.withTransaction
                .mockRejectedValueOnce(collision)
                .mockImplementationOnce(fn => fn(tx));
            workspaceRepository.createInTx.mockResolvedValue(workspace);

            const result = await service.createWorkspace(
                requestContext,
                apiKeyContext,
                authContext,
                create
            );

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
            workspaceMemberRepository.countOwnedActiveByUserInTx.mockResolvedValue(
                1
            );
            const otherError = new Error('unexpected');
            databaseService.withTransaction.mockRejectedValue(otherError);

            await expect(
                service.createWorkspace(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    create
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: otherError,
            });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('propagates an AppBaseException raised in the transaction without retrying', async () => {
            workspaceMemberRepository.countOwnedActiveByUserInTx.mockResolvedValue(
                1
            );
            const typedError = new WorkspaceNotFoundException();
            databaseService.withTransaction.mockRejectedValue(typedError);

            await expect(
                service.createWorkspace(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    create
                )
            ).rejects.toBe(typedError);
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('throws DatabaseUniqueValueGenerationFailedException when every slug candidate collides', async () => {
            workspaceMemberRepository.countOwnedActiveByUserInTx.mockResolvedValue(
                1
            );
            const collision = buildPrismaKnownRequestError('P2002', 'slug');
            databaseService.withTransaction.mockRejectedValue(collision);

            await expect(
                service.createWorkspace(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    create
                )
            ).rejects.toMatchObject({
                statusCode:
                    EnumDatabaseStatusCodeError.uniqueValueGenerationFailed,

                constructor: DatabaseUniqueValueGenerationFailedException,
                module: 'database',
            });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(3);
        });
    });

    describe('updateWorkspace', () => {
        const tx = {} as IDatabaseTransactionClient;

        beforeEach(() => {
            databaseService.withTransaction.mockImplementation(fn => fn(tx));
        });

        it('writes the details as given and adds the entry on the same tx', async () => {
            const update: IWorkspaceUpdate = {
                name: 'Acme 2',
                description: null,
            };
            workspaceRepository.updateDetailsInTx.mockResolvedValue(workspace);

            const result = await service.updateWorkspace(
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                update
            );

            expect(result).toBe(workspace);
            expect(workspaceRepository.updateDetailsInTx).toHaveBeenCalledWith(
                tx,
                'workspace-1',
                update
            );
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.workspaceUpdated,
                    userId: 'user-1',
                    createdBy: 'user-1',
                    workspaceId: 'workspace-1',
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entry);
        });
    });

    describe('updateWorkspaceIsPublic', () => {
        const tx = {} as IDatabaseTransactionClient;

        beforeEach(() => {
            databaseService.withTransaction.mockImplementation(fn => fn(tx));
        });

        it('writes the visibility and adds the entry on the same tx', async () => {
            workspaceRepository.updateIsPublicInTx.mockResolvedValue(workspace);

            const result = await service.updateWorkspaceIsPublic(
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                true
            );

            expect(result).toBe(workspace);
            expect(workspaceRepository.updateIsPublicInTx).toHaveBeenCalledWith(
                tx,
                'workspace-1',
                true
            );
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.workspaceVisibilityUpdated,
                    userId: 'user-1',
                    createdBy: 'user-1',
                    workspaceId: 'workspace-1',
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entry);
        });
    });

    describe('updateWorkspaceSlug', () => {
        const tx = {} as IDatabaseTransactionClient;

        beforeEach(() => {
            databaseService.withTransaction.mockImplementation(fn => fn(tx));
        });

        it('throws WorkspaceSlugInvalidException before writing when the slug has an upper-case letter', async () => {
            await expect(
                service.updateWorkspaceSlug(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    'Acme'
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.slugInvalid,
            });
            expect(workspaceRepository.updateSlugInTx).not.toHaveBeenCalled();
        });

        it('throws WorkspaceSlugInvalidException before writing when the slug is not allowed', async () => {
            await expect(
                service.updateWorkspaceSlug(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    'Not Allowed!'
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceSlugInvalidException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.slugInvalid,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(workspaceRepository.updateSlugInTx).not.toHaveBeenCalled();
        });

        it('throws WorkspaceSlugAlreadyExistsException when the write collides on the slug index', async () => {
            const collision = buildPrismaKnownRequestError('P2002', 'slug');
            workspaceRepository.updateSlugInTx.mockRejectedValue(collision);

            await expect(
                service.updateWorkspaceSlug(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    'taken-slug'
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceSlugAlreadyExistsException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.slugAlreadyExists,
            });
        });

        it('rethrows an AppBaseException thrown inside the transaction as is', async () => {
            const thrown = new WorkspaceNotFoundException();
            workspaceRepository.updateSlugInTx.mockRejectedValue(thrown);

            await expect(
                service.updateWorkspaceSlug(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    'new-slug'
                )
            ).rejects.toBe(thrown);
        });

        it('wraps a non-collision write error in AppUnknownException', async () => {
            const otherError = new Error('unexpected');
            workspaceRepository.updateSlugInTx.mockRejectedValue(otherError);

            await expect(
                service.updateWorkspaceSlug(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    'new-slug'
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: otherError,
            });
        });

        it('writes the slug when it is allowed and adds the entry on the same tx', async () => {
            workspaceRepository.updateSlugInTx.mockResolvedValue(workspace);

            const result = await service.updateWorkspaceSlug(
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                'new-slug'
            );

            expect(result).toBe(workspace);
            expect(workspaceRepository.updateSlugInTx).toHaveBeenCalledWith(
                tx,
                'workspace-1',
                'new-slug'
            );
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.workspaceUpdated,
                    userId: 'user-1',
                    createdBy: 'user-1',
                    workspaceId: 'workspace-1',
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entry);
        });
    });

    describe('softDeleteInTx', () => {
        it('soft-deletes the workspace row on the given transaction', async () => {
            const tx = {} as IDatabaseTransactionClient;
            const deletedAt = new Date('2026-01-01T00:00:00.000Z');
            workspaceRepository.softDeleteInTx.mockResolvedValue(true);

            await service.softDeleteInTx(
                tx,
                'workspace-1',
                deletedAt,
                'user-1'
            );

            expect(workspaceRepository.softDeleteInTx).toHaveBeenCalledWith(
                tx,
                'workspace-1',
                deletedAt,
                'user-1'
            );
        });

        it('throws WorkspaceNotFoundException when the guarded write misses', async () => {
            const tx = {} as IDatabaseTransactionClient;
            const deletedAt = new Date('2026-01-01T00:00:00.000Z');
            workspaceRepository.softDeleteInTx.mockResolvedValue(false);

            await expect(
                service.softDeleteInTx(tx, 'workspace-1', deletedAt, 'user-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.notFound,
            });
        });
    });

    describe('softDeleteOwnedByUserInTx', () => {
        const tx = {} as IDatabaseTransactionClient;
        const deletedAt = new Date('2026-01-01T00:00:00.000Z');

        it('soft-deletes the given workspace ids and returns the deleted ids without reading the owned ids again', async () => {
            workspaceRepository.softDeleteOwnedByUserInTx.mockResolvedValue([
                'workspace-1',
                'workspace-2',
            ]);

            await expect(
                service.softDeleteOwnedByUserInTx(
                    tx,
                    ['workspace-1', 'workspace-2'],
                    'user-1',
                    deletedAt
                )
            ).resolves.toEqual(['workspace-1', 'workspace-2']);

            expect(
                workspaceMemberRepository.findWorkspaceIdsByUserInTx
            ).not.toHaveBeenCalled();
            expect(
                workspaceRepository.softDeleteOwnedByUserInTx
            ).toHaveBeenCalledWith(
                tx,
                ['workspace-1', 'workspace-2'],
                'user-1',
                deletedAt
            );
        });

        it('passes an empty owner id list to the repository unchanged', async () => {
            workspaceRepository.softDeleteOwnedByUserInTx.mockResolvedValue([]);

            await expect(
                service.softDeleteOwnedByUserInTx(tx, [], 'user-1', deletedAt)
            ).resolves.toEqual([]);

            expect(
                workspaceRepository.softDeleteOwnedByUserInTx
            ).toHaveBeenCalledWith(tx, [], 'user-1', deletedAt);
        });
    });

    describe('assertOwnedHasNoOtherMembersInTx', () => {
        const tx = {} as IDatabaseTransactionClient;

        beforeEach(() => {
            workspaceMemberRepository.findWorkspaceIdsByUserInTx.mockResolvedValue(
                ['workspace-1']
            );
        });

        it('throws WorkspaceOwnerTransferRequiredException when an owned workspace has another member', async () => {
            workspaceRepository.existsOwnedWithOtherMembersInTx.mockResolvedValue(
                true
            );

            await expect(
                service.assertOwnedHasNoOtherMembersInTx(tx, 'user-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceOwnerTransferRequiredException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.ownerTransferRequired,
            });
            expect(
                workspaceMemberRepository.findWorkspaceIdsByUserInTx
            ).toHaveBeenCalledTimes(1);
            expect(
                workspaceMemberRepository.findWorkspaceIdsByUserInTx
            ).toHaveBeenCalledWith(tx, 'user-1', EnumWorkspaceMemberRole.owner);
            expect(
                workspaceRepository.existsOwnedWithOtherMembersInTx
            ).toHaveBeenCalledWith(tx, ['workspace-1'], 'user-1');
        });

        it('returns the owned workspace ids it read when no owned workspace has another member', async () => {
            workspaceRepository.existsOwnedWithOtherMembersInTx.mockResolvedValue(
                false
            );

            await expect(
                service.assertOwnedHasNoOtherMembersInTx(tx, 'user-1')
            ).resolves.toEqual(['workspace-1']);
        });
    });

    describe('countOwnedInTx', () => {
        const tx = {} as IDatabaseTransactionClient;

        it('returns the one owned-active count read on the transaction and reads nothing else', async () => {
            workspaceMemberRepository.countOwnedActiveByUserInTx.mockResolvedValue(
                2
            );

            await expect(service.countOwnedInTx(tx, 'user-1')).resolves.toBe(2);

            expect(
                workspaceMemberRepository.countOwnedActiveByUserInTx
            ).toHaveBeenCalledTimes(1);
            expect(
                workspaceMemberRepository.countOwnedActiveByUserInTx
            ).toHaveBeenCalledWith(tx, 'user-1');
            expect(
                workspaceMemberRepository.findWorkspaceIdsByUserInTx
            ).not.toHaveBeenCalled();
        });
    });

    describe('getListOffsetByAdmin', () => {
        it('delegates to the repository offset listing with the isPublic filter', async () => {
            const pagination: IPaginationQueryOffsetParams = {
                limit: 20,
                skip: 0,
                orderBy: [],
            };
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

            const result = await service.getListOffsetByAdmin(pagination, {
                isPublic: { equals: true },
            });

            expect(result).toBe(page);
            expect(
                workspaceRepository.findWithPaginationOffsetByAdmin
            ).toHaveBeenCalledWith(pagination, { isPublic: { equals: true } });
        });

        it('passes a null isPublic filter when none is given', async () => {
            const pagination: IPaginationQueryOffsetParams = {
                skip: 0,
                limit: 20,
                orderBy: [],
            };
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

            const result = await service.getListOffsetByAdmin(pagination);

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
                service.getByIdByAdmin('workspace-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.notFound,
            });
        });

        it('returns the workspace resolved for admin', async () => {
            workspaceRepository.findByIdByAdmin.mockResolvedValue(workspace);

            const result = await service.getByIdByAdmin('workspace-1');

            expect(result).toBe(workspace);
        });
    });

    describe('previewWorkspace', () => {
        it('validates workspace.joinRequestAllowed before the read', async () => {
            workspaceRepository.findActivePublicBySlug.mockResolvedValue(
                workspace
            );

            await service.previewWorkspace('acme-team');

            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.joinRequestAllowed
            );
            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledBefore(
                workspaceRepository.findActivePublicBySlug
            );
        });

        it('reads nothing when the gate rejects', async () => {
            featureFlagService.validateFeatureFlagMetadata.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                service.previewWorkspace('acme-team')
            ).rejects.toBeInstanceOf(FeatureFlagDisabledException);
            expect(
                workspaceRepository.findActivePublicBySlug
            ).not.toHaveBeenCalled();
        });

        it('throws WorkspaceNotFoundException when no active public workspace matches the slug', async () => {
            workspaceRepository.findActivePublicBySlug.mockResolvedValue(null);

            await expect(
                service.previewWorkspace('acme-team')
            ).rejects.toMatchObject({
                constructor: WorkspaceNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.notFound,
            });
        });

        it('returns the public workspace resolved by slug', async () => {
            workspaceRepository.findActivePublicBySlug.mockResolvedValue(
                workspace
            );

            const result = await service.previewWorkspace('acme-team');

            expect(result).toBe(workspace);
        });
    });

    describe('drawSlugCandidates', () => {
        it('draws one slug candidate per configured attempt', () => {
            const generateSlugCandidates = vi
                .spyOn(helperStringService, 'generateSlugCandidates')
                .mockReturnValue(['ws-aaa', 'ws-bbb', 'ws-ccc']);

            const result = service['drawSlugCandidates']();

            expect(result).toEqual(['ws-aaa', 'ws-bbb', 'ws-ccc']);
            expect(generateSlugCandidates).toHaveBeenCalledWith('ws-', 12, 3);
        });
    });

    describe('isSlugAllowed', () => {
        it('returns true for a slug matching the pattern and length', () => {
            expect(service['isSlugAllowed']('acme-team')).toBe(true);
        });

        it('returns false for a slug breaking the pattern', () => {
            expect(service['isSlugAllowed']('Not Allowed!')).toBe(false);
        });

        it('returns false for a slug exceeding the max length', () => {
            expect(service['isSlugAllowed']('a'.repeat(13))).toBe(false);
        });
    });
});
