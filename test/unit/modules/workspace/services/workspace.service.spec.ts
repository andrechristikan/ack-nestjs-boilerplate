import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { Workspace } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
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
import { WorkspaceSlugInvalidException } from '@modules/workspace/exceptions/workspace.slug-invalid.exception';
import type {
    IWorkspaceCreate,
    IWorkspaceOwnedUser,
    IWorkspaceUpdate,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
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
import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';

describe('WorkspaceService', () => {
    const workspaceRepository: MockProxy<WorkspaceRepository> =
        mock<WorkspaceRepository>();
    const workspaceMemberRepository: MockProxy<WorkspaceMemberRepository> =
        mock<WorkspaceMemberRepository>();
    const workspaceInviteService: MockProxy<WorkspaceInviteService> =
        mock<WorkspaceInviteService>();
    const workspaceJoinRequestService: MockProxy<WorkspaceJoinRequestService> =
        mock<WorkspaceJoinRequestService>();
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
    let helperStringService: HelperStringService;
    const featureFlagService: MockProxy<FeatureFlagService> =
        mock<FeatureFlagService>();

    const configValues: Record<string, unknown> = {
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
                {
                    provide: WorkspaceInviteService,
                    useValue: workspaceInviteService,
                },
                {
                    provide: WorkspaceJoinRequestService,
                    useValue: workspaceJoinRequestService,
                },
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
            ).toHaveBeenCalledWith('user-1');
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

    describe('createOwnedForUsersInTx', () => {
        it('issues no statement for an empty user list', async () => {
            const tx = {} as IDatabaseTransactionClient;

            await service.createOwnedForUsersInTx(tx, []);

            expect(workspaceRepository.createManyInTx).not.toHaveBeenCalled();
            expect(
                workspaceMemberRepository.createOwnersInTx
            ).not.toHaveBeenCalled();
        });

        it('creates every personal workspace with one call, then every owner membership with one call', async () => {
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

            await service.createOwnedForUsersInTx(tx, owned);

            expect(workspaceRepository.createManyInTx).toHaveBeenCalledTimes(1);
            expect(workspaceRepository.createManyInTx).toHaveBeenCalledWith(
                tx,
                owned
            );
            expect(
                workspaceMemberRepository.createOwnersInTx
            ).toHaveBeenCalledTimes(1);
            expect(
                workspaceMemberRepository.createOwnersInTx
            ).toHaveBeenCalledWith(tx, owned);
            expect(workspaceRepository.createManyInTx).toHaveBeenCalledBefore(
                workspaceMemberRepository.createOwnersInTx
            );
        });
    });

    describe('assertOwnedCapAvailable', () => {
        beforeEach(() => {
            featureFlagService.getMetadataNumber.mockResolvedValue(3);
        });

        it('throws WorkspaceCapReachedException when the owner already meets the cap', async () => {
            workspaceMemberRepository.countOwnedActiveByUser.mockResolvedValue(
                3
            );

            await expect(
                service.assertOwnedCapAvailable('user-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceCapReachedException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.capReached,
            });
            expect(featureFlagService.getMetadataNumber).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.maxWorkspacesPerUser
            );
            expect(
                workspaceMemberRepository.countOwnedActiveByUser
            ).toHaveBeenCalledTimes(1);
            expect(
                workspaceMemberRepository.countOwnedActiveByUser
            ).toHaveBeenCalledWith('user-1');
        });

        it('resolves for an owner of 2 workspaces when the flag caps at 3', async () => {
            workspaceMemberRepository.countOwnedActiveByUser.mockResolvedValue(
                2
            );

            await expect(
                service.assertOwnedCapAvailable('user-1')
            ).resolves.toBeUndefined();
        });

        it('propagates FeatureFlagNotConfiguredException from the read', async () => {
            const notConfigured = new FeatureFlagNotConfiguredException(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.maxWorkspacesPerUser
            );
            featureFlagService.getMetadataNumber.mockRejectedValue(
                notConfigured
            );
            workspaceMemberRepository.countOwnedActiveByUser.mockResolvedValue(
                0
            );

            await expect(
                service.assertOwnedCapAvailable('user-1')
            ).rejects.toBe(notConfigured);
        });
    });

    describe('assertSlugAllowed', () => {
        it('throws WorkspaceSlugInvalidException when the slug has an upper-case letter', () => {
            expect(() => service.assertSlugAllowed('Acme')).toThrow(
                WorkspaceSlugInvalidException
            );
        });

        it('throws WorkspaceSlugInvalidException when the slug has an underscore', () => {
            expect(() => service.assertSlugAllowed('Bad_Slug')).toThrow(
                WorkspaceSlugInvalidException
            );
        });

        it('throws WorkspaceSlugInvalidException with the slugInvalid code when the slug breaks the pattern', () => {
            try {
                service.assertSlugAllowed('Not Allowed!');
                expect.unreachable();
            } catch (error: unknown) {
                expect(error).toMatchObject({
                    constructor: WorkspaceSlugInvalidException,
                    module: 'workspace',
                    statusCode: EnumWorkspaceStatusCodeError.slugInvalid,
                });
            }
        });

        it('returns when the slug is allowed', () => {
            expect(service.assertSlugAllowed('new-slug')).toBeUndefined();
        });
    });

    describe('createWorkspaceInTx', () => {
        const create: IWorkspaceCreate = {
            name: 'Acme',
            description: null,
            isPublic: null,
        };
        const tx = {} as IDatabaseTransactionClient;

        it('creates the workspace and its owner row on the tx given and returns the workspace', async () => {
            workspaceRepository.createInTx.mockResolvedValue(workspace);

            const result = await service.createWorkspaceInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                'ws-aaa',
                create
            );

            expect(result).toBe(workspace);
            expect(workspaceRepository.createInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                create,
                'ws-aaa',
                'workspace-1'
            );
            expect(
                workspaceMemberRepository.createOwnerInTx
            ).toHaveBeenCalledWith(tx, workspace.id, 'user-1');
        });

        it('adds the creator entry on the tx after the write', async () => {
            workspaceRepository.createInTx.mockResolvedValue(workspace);

            await service.createWorkspaceInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                'ws-aaa',
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
                    workspaceId: workspace.id,
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entry);
            expect(
                workspaceMemberRepository.createOwnerInTx
            ).toHaveBeenCalledBefore(activityLogQueue.recordEffect);
        });
    });

    describe('updateWorkspaceInTx', () => {
        const tx = {} as IDatabaseTransactionClient;

        it('writes the details as given and adds the entry on the same tx', async () => {
            const update: IWorkspaceUpdate = {
                name: 'Acme 2',
                description: null,
            };
            workspaceRepository.updateDetailsInTx.mockResolvedValue(workspace);

            const result = await service.updateWorkspaceInTx(
                tx,
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

    describe('updateWorkspaceIsPublicInTx', () => {
        const tx = {} as IDatabaseTransactionClient;

        it('writes the visibility and adds the entry on the same tx', async () => {
            workspaceRepository.updateIsPublicInTx.mockResolvedValue(workspace);

            const result = await service.updateWorkspaceIsPublicInTx(
                tx,
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

    describe('updateWorkspaceSlugInTx', () => {
        const tx = {} as IDatabaseTransactionClient;

        it('writes the slug and adds the entry on the same tx', async () => {
            workspaceRepository.updateSlugInTx.mockResolvedValue(workspace);

            const result = await service.updateWorkspaceSlugInTx(
                tx,
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

        it('lets a write failure reach the caller', async () => {
            const collision = buildPrismaKnownRequestError('P2002', 'slug');
            workspaceRepository.updateSlugInTx.mockRejectedValue(collision);

            await expect(
                service.updateWorkspaceSlugInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    'taken-slug'
                )
            ).rejects.toBe(collision);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });

    describe('softDeleteManyInTx', () => {
        const tx = {} as IDatabaseTransactionClient;
        const deletedAt = new Date('2026-01-01T00:00:00.000Z');

        it('soft-deletes each workspace row on the given transaction and returns every id it wrote', async () => {
            workspaceRepository.softDeleteInTx.mockImplementation(
                async (_tx, workspaceId) => workspaceId
            );

            const result = await service.softDeleteManyInTx(
                tx,
                ['workspace-1', 'workspace-2'],
                deletedAt,
                'user-1'
            );

            expect(result).toEqual(['workspace-1', 'workspace-2']);
            expect(workspaceRepository.softDeleteInTx).toHaveBeenCalledTimes(2);
            expect(workspaceRepository.softDeleteInTx).toHaveBeenCalledWith(
                tx,
                'workspace-1',
                deletedAt,
                'user-1'
            );
            expect(workspaceRepository.softDeleteInTx).toHaveBeenCalledWith(
                tx,
                'workspace-2',
                deletedAt,
                'user-1'
            );
        });

        it('revokes the pending invites and cancels the pending join requests of every deleted workspace once each, with the user who deleted them as updatedBy', async () => {
            workspaceRepository.softDeleteInTx.mockImplementation(
                async (_tx, workspaceId) => workspaceId
            );

            await service.softDeleteManyInTx(
                tx,
                ['workspace-1', 'workspace-2'],
                deletedAt,
                'user-1'
            );

            expect(
                workspaceInviteService.revokePendingByWorkspacesInTx
            ).toHaveBeenCalledTimes(1);
            expect(
                workspaceInviteService.revokePendingByWorkspacesInTx
            ).toHaveBeenCalledWith(
                tx,
                ['workspace-1', 'workspace-2'],
                'user-1'
            );
            expect(
                workspaceJoinRequestService.cancelPendingByWorkspacesInTx
            ).toHaveBeenCalledTimes(1);
            expect(
                workspaceJoinRequestService.cancelPendingByWorkspacesInTx
            ).toHaveBeenCalledWith(
                tx,
                ['workspace-1', 'workspace-2'],
                'user-1'
            );
        });

        it('passes a rejected write through and closes no invite or join request', async () => {
            const error = new AppUnknownException(null);
            workspaceRepository.softDeleteInTx.mockImplementation(
                async (_tx, workspaceId) => {
                    if (workspaceId === 'workspace-2') {
                        throw error;
                    }

                    return workspaceId;
                }
            );

            await expect(
                service.softDeleteManyInTx(
                    tx,
                    ['workspace-1', 'workspace-2', 'workspace-3'],
                    deletedAt,
                    'user-1'
                )
            ).rejects.toBe(error);
            expect(
                workspaceInviteService.revokePendingByWorkspacesInTx
            ).not.toHaveBeenCalled();
            expect(
                workspaceJoinRequestService.cancelPendingByWorkspacesInTx
            ).not.toHaveBeenCalled();
        });

        it('starts the invite revoke and the join request cancel together after the guarded writes', async () => {
            const events: string[] = [];
            workspaceRepository.softDeleteInTx.mockImplementation(
                async (_tx, workspaceId) => {
                    events.push('workspace');

                    return workspaceId;
                }
            );
            workspaceInviteService.revokePendingByWorkspacesInTx.mockImplementation(
                async () => {
                    events.push('start:invites');
                    await Promise.resolve();
                    events.push('end:invites');
                }
            );
            workspaceJoinRequestService.cancelPendingByWorkspacesInTx.mockImplementation(
                async () => {
                    events.push('start:joinRequests');
                    await Promise.resolve();
                    events.push('end:joinRequests');
                }
            );

            await service.softDeleteManyInTx(
                tx,
                ['workspace-1'],
                deletedAt,
                'user-1'
            );

            expect(events).toEqual([
                'workspace',
                'start:invites',
                'start:joinRequests',
                'end:invites',
                'end:joinRequests',
            ]);
        });

        it('issues no statement for an empty id list', async () => {
            const result = await service.softDeleteManyInTx(
                tx,
                [],
                deletedAt,
                'user-1'
            );

            expect(result).toEqual([]);
            expect(workspaceRepository.softDeleteInTx).not.toHaveBeenCalled();
            expect(
                workspaceInviteService.revokePendingByWorkspacesInTx
            ).not.toHaveBeenCalled();
            expect(
                workspaceJoinRequestService.cancelPendingByWorkspacesInTx
            ).not.toHaveBeenCalled();
        });
    });

    describe('getOwnedForSelfDelete', () => {
        it('throws WorkspaceOwnerTransferRequiredException when an owned workspace has another member', async () => {
            workspaceMemberRepository.findLiveOwnedWorkspaceIdsByUser.mockResolvedValue(
                ['workspace-1']
            );
            workspaceRepository.existsOwnedWithOtherMembers.mockResolvedValue(
                true
            );

            await expect(
                service.getOwnedForSelfDelete('user-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceOwnerTransferRequiredException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.ownerTransferRequired,
            });
            expect(
                workspaceMemberRepository.findLiveOwnedWorkspaceIdsByUser
            ).toHaveBeenCalledWith('user-1');
            expect(
                workspaceRepository.existsOwnedWithOtherMembers
            ).toHaveBeenCalledWith(['workspace-1'], 'user-1');
        });

        it('returns the live owned workspace ids it read when no owned workspace has another member', async () => {
            workspaceMemberRepository.findLiveOwnedWorkspaceIdsByUser.mockResolvedValue(
                ['workspace-1']
            );
            workspaceRepository.existsOwnedWithOtherMembers.mockResolvedValue(
                false
            );

            await expect(
                service.getOwnedForSelfDelete('user-1')
            ).resolves.toEqual(['workspace-1']);
        });

        it('returns an empty list without checking other members when the user owns no live workspace', async () => {
            workspaceMemberRepository.findLiveOwnedWorkspaceIdsByUser.mockResolvedValue(
                []
            );

            await expect(
                service.getOwnedForSelfDelete('user-1')
            ).resolves.toEqual([]);
            expect(
                workspaceRepository.existsOwnedWithOtherMembers
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
        it('starts the read while the workspace.joinRequestAllowed gate is still pending', async () => {
            const gate = buildDeferred<void>();
            featureFlagService.validateFeatureFlagMetadata.mockReturnValue(
                gate.promise
            );
            workspaceRepository.findActivePublicBySlug.mockResolvedValue(
                workspace
            );

            const pending = service.previewWorkspace('acme-team');
            expect(
                workspaceRepository.findActivePublicBySlug
            ).toHaveBeenCalledWith('acme-team');
            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.joinRequestAllowed
            );

            gate.resolve();

            await expect(pending).resolves.toBe(workspace);
        });

        it('throws the gate refusal when the gate rejects', async () => {
            featureFlagService.validateFeatureFlagMetadata.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                service.previewWorkspace('acme-team')
            ).rejects.toMatchObject({
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.disabled,
            });
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

            const result = service.drawSlugCandidates();

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
