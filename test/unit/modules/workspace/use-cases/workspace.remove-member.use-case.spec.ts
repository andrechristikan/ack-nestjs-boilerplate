import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import {
    EnumActivityLogAction,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import type { IWorkspaceMemberWithEmail } from '@modules/workspace/interfaces/workspace.interface';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { UserService } from '@modules/user/services/user.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceRemoveMemberUseCase } from '@modules/workspace/use-cases/workspace.remove-member.use-case';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
    buildWorkspace,
    buildWorkspaceContext,
    buildWorkspaceMember,
} from '@test/unit/helpers/test.unit.request.helper';

describe('WorkspaceRemoveMemberUseCase', () => {
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const projectMemberService: MockProxy<ProjectMemberService> =
        mock<ProjectMemberService>();
    const workspaceInviteService: MockProxy<WorkspaceInviteService> =
        mock<WorkspaceInviteService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const firstEntry = buildActivityLogCreateManyEffect('first-entry');
    const secondEntry = buildActivityLogCreateManyEffect('second-entry');
    const tx: IDatabaseTransactionClient = mock<IDatabaseTransactionClient>();
    const member: WorkspaceMember = buildWorkspaceMember('user-1');
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const authContext = buildAuthJwtAccessContext('actor-1');
    const workspaceContext = buildWorkspaceContext(buildWorkspace(), member);

    let useCase: WorkspaceRemoveMemberUseCase;

    beforeEach(async () => {
        activityLogQueue.recordEffect
            .mockReturnValueOnce(firstEntry)
            .mockReturnValueOnce(secondEntry);
        databaseService.withTransaction.mockImplementation(async fn => fn(tx));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceRemoveMemberUseCase,
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                {
                    provide: ProjectMemberService,
                    useValue: projectMemberService,
                },
                {
                    provide: WorkspaceInviteService,
                    useValue: workspaceInviteService,
                },
                { provide: UserService, useValue: userService },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();

        useCase = module.get(WorkspaceRemoveMemberUseCase);
    });

    describe('execute', () => {
        const target: IWorkspaceMemberWithEmail = {
            ...member,
            id: 'member-2',
            userId: 'user-2',
            role: EnumWorkspaceMemberRole.member,
            user: {
                id: 'user-2',
                email: 'user-2@example.com',
                username: 'user-2',
                name: null,
            },
        };

        const removedRow: IWorkspaceMemberWithEmail = {
            ...target,
            workspaceId: 'written-workspace',
            userId: 'written-user-2',
            user: {
                id: 'written-user-2',
                email: 'written-user-2@example.com',
                username: 'written-user-2',
                name: null,
            },
        };

        beforeEach(() => {
            workspaceMemberService.getPeerTarget.mockResolvedValue(target);
            workspaceMemberService.removeMemberInTx.mockResolvedValue(
                removedRow
            );
        });

        it('reads the removable member before opening the transaction and throws its refusal with no transaction opened', async () => {
            const refusal = new WorkspaceMemberNotFoundException();
            workspaceMemberService.getPeerTarget.mockRejectedValue(refusal);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    'member-2'
                )
            ).rejects.toBe(refusal);
            expect(workspaceMemberService.getPeerTarget).toHaveBeenCalledWith(
                authContext,
                'workspace-1',
                member,
                'member-2'
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('awaits the member removal alone, then starts the project member removal, the invite revoke, and the last workspace clear together', async () => {
            const events: string[] = [];
            workspaceMemberService.removeMemberInTx.mockImplementation(
                async () => {
                    events.push('start:remove');
                    await Promise.resolve();
                    events.push('end:remove');

                    return removedRow;
                }
            );
            projectMemberService.removeByWorkspaceAndUserInTx.mockImplementation(
                async () => {
                    events.push('start:projectMembers');
                    await Promise.resolve();
                    events.push('end:projectMembers');

                    return 1;
                }
            );
            workspaceInviteService.revokePendingByEmailInTx.mockImplementation(
                async () => {
                    events.push('start:invite');
                    await Promise.resolve();
                    events.push('end:invite');
                }
            );
            userService.clearLastWorkspaceInTx.mockImplementation(async () => {
                events.push('start:lastWorkspace');
                await Promise.resolve();
                events.push('end:lastWorkspace');
            });
            outboxService.addManyInTx.mockImplementation(async () => {
                events.push('addEntries');

                return [];
            });

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                'member-2'
            );

            expect(events).toEqual([
                'start:remove',
                'end:remove',
                'start:projectMembers',
                'start:invite',
                'start:lastWorkspace',
                'end:projectMembers',
                'end:invite',
                'end:lastWorkspace',
                'addEntries',
            ]);
        });

        it('removes the member and cascades on one transaction for the returned target, then adds the actor entry and the target entry on the same tx', async () => {
            const callOrder: string[] = [];
            workspaceMemberService.removeMemberInTx.mockImplementation(
                async () => {
                    callOrder.push('remove');

                    return removedRow;
                }
            );
            projectMemberService.removeByWorkspaceAndUserInTx.mockImplementation(
                async () => {
                    callOrder.push('projectMembers');

                    return 1;
                }
            );
            workspaceInviteService.revokePendingByEmailInTx.mockImplementation(
                async () => {
                    callOrder.push('invite');
                }
            );
            userService.clearLastWorkspaceInTx.mockImplementation(async () => {
                callOrder.push('lastWorkspace');
            });

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                'member-2'
            );

            expect(result).toEqual({});
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                workspaceMemberService.removeMemberInTx
            ).toHaveBeenCalledWith(tx, target);
            expect(
                projectMemberService.removeByWorkspaceAndUserInTx
            ).toHaveBeenCalledWith(tx, 'written-workspace', 'written-user-2');
            expect(userService.clearLastWorkspaceInTx).toHaveBeenCalledWith(
                tx,
                'written-user-2',
                'written-workspace'
            );
            expect(callOrder).toEqual([
                'remove',
                'projectMembers',
                'invite',
                'lastWorkspace',
            ]);
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                authContext,
                {
                    action: EnumActivityLogAction.workspaceMemberRemoved,
                    userId: 'actor-1',
                    createdBy: 'actor-1',
                    workspaceId: 'written-workspace',
                    metadata: { targetUserId: 'written-user-2' },
                }
            );
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                2,
                requestContext,
                apiKeyContext,
                authContext,
                {
                    action: EnumActivityLogAction.workspaceMemberRemovedByAdmin,
                    userId: 'written-user-2',
                    createdBy: 'actor-1',
                    workspaceId: 'written-workspace',
                    metadata: { actorUserId: 'actor-1' },
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                firstEntry,
                secondEntry,
            ]);
        });

        it("revokes the pending invite to the deleted row's email on the same tx", async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                'member-2'
            );

            expect(
                workspaceInviteService.revokePendingByEmailInTx
            ).toHaveBeenCalledWith(
                tx,
                'written-workspace',
                'written-user-2@example.com'
            );
        });

        it('lets WorkspaceMemberNotFoundException of the guarded removal reach the caller untouched, running no cascade and adding no entry', async () => {
            const notFound = new WorkspaceMemberNotFoundException();
            workspaceMemberService.removeMemberInTx.mockRejectedValue(notFound);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    'member-2'
                )
            ).rejects.toBe(notFound);
            expect(
                projectMemberService.removeByWorkspaceAndUserInTx
            ).not.toHaveBeenCalled();
            expect(
                workspaceInviteService.revokePendingByEmailInTx
            ).not.toHaveBeenCalled();
            expect(userService.clearLastWorkspaceInTx).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('lets any other transaction error reach the caller untouched', async () => {
            const cause = new Error('boom');
            workspaceMemberService.removeMemberInTx.mockRejectedValue(cause);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    'member-2'
                )
            ).rejects.toBe(cause);
        });
    });
});
