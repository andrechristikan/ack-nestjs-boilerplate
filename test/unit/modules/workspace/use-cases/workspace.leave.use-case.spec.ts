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
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { UserService } from '@modules/user/services/user.service';
import { WorkspaceLastOwnerException } from '@modules/workspace/exceptions/workspace.last-owner.exception';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import type { IWorkspaceMemberWithEmail } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceLeaveUseCase } from '@modules/workspace/use-cases/workspace.leave.use-case';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
    buildUser,
    buildUserContext,
    buildWorkspace,
    buildWorkspaceContext,
    buildWorkspaceMember,
} from '@test/unit/helpers/test.unit.request.helper';

describe('WorkspaceLeaveUseCase', () => {
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const projectMemberService: MockProxy<ProjectMemberService> =
        mock<ProjectMemberService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const firstEntry = buildActivityLogCreateManyEffect('first-entry');
    const secondEntry = buildActivityLogCreateManyEffect('second-entry');
    const tx: IDatabaseTransactionClient = mock<IDatabaseTransactionClient>();
    const member: WorkspaceMember = buildWorkspaceMember('user-1');
    const left: IWorkspaceMemberWithEmail = {
        ...member,
        workspaceId: 'written-workspace',
        userId: 'written-user',
        user: {
            id: 'written-user',
            email: 'written-user@example.com',
            username: 'written-user',
            name: null,
        },
    };
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-1', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const workspaceContext = buildWorkspaceContext(buildWorkspace(), member);

    let useCase: WorkspaceLeaveUseCase;

    beforeEach(async () => {
        activityLogQueue.recordEffect
            .mockReturnValueOnce(firstEntry)
            .mockReturnValueOnce(secondEntry);
        databaseService.withTransaction.mockImplementation(async fn => fn(tx));
        workspaceMemberService.leaveWorkspaceInTx.mockResolvedValue(left);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceLeaveUseCase,
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                {
                    provide: ProjectMemberService,
                    useValue: projectMemberService,
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

        useCase = module.get(WorkspaceLeaveUseCase);
    });

    describe('execute', () => {
        it('throws WorkspaceLastOwnerException from the leavable check and opens no transaction', async () => {
            const refusal = new WorkspaceLastOwnerException();
            workspaceMemberService.assertLeavable.mockImplementation(() => {
                throw refusal;
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext
                )
            ).rejects.toBe(refusal);
            expect(workspaceMemberService.assertLeavable).toHaveBeenCalledWith(
                member
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('leaves and cascades on one transaction and adds the left entry on it', async () => {
            const callOrder: string[] = [];
            workspaceMemberService.leaveWorkspaceInTx.mockImplementation(
                async () => {
                    callOrder.push('leave');

                    return left;
                }
            );
            projectMemberService.removeByWorkspaceAndUserInTx.mockImplementation(
                async () => {
                    callOrder.push('projectMembers');

                    return 2;
                }
            );
            userService.clearLastWorkspaceInTx.mockImplementation(async () => {
                callOrder.push('lastWorkspace');
            });
            outboxService.addInTx.mockImplementation(async () => {
                callOrder.push('addEntry');

                return 'outbox-1';
            });

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext
            );

            expect(result).toEqual({});
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                workspaceMemberService.leaveWorkspaceInTx
            ).toHaveBeenCalledWith(tx, member);
            expect(
                projectMemberService.removeByWorkspaceAndUserInTx
            ).toHaveBeenCalledWith(tx, 'written-workspace', 'written-user');
            expect(userService.clearLastWorkspaceInTx).toHaveBeenCalledWith(
                tx,
                'written-user',
                'written-workspace'
            );
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                {
                    action: EnumActivityLogAction.workspaceMemberLeft,
                    userId: 'written-user',
                    createdBy: 'written-user',
                    workspaceId: 'written-workspace',
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, firstEntry);
            expect(callOrder).toEqual([
                'leave',
                'projectMembers',
                'lastWorkspace',
                'addEntry',
            ]);
        });

        it('awaits the guarded leave alone, then starts the project member removal and the last workspace clear together', async () => {
            const events: string[] = [];
            workspaceMemberService.leaveWorkspaceInTx.mockImplementation(
                async () => {
                    events.push('start:leave');
                    await Promise.resolve();
                    events.push('end:leave');

                    return left;
                }
            );
            projectMemberService.removeByWorkspaceAndUserInTx.mockImplementation(
                async () => {
                    events.push('start:projectMembers');
                    await Promise.resolve();
                    events.push('end:projectMembers');

                    return 2;
                }
            );
            userService.clearLastWorkspaceInTx.mockImplementation(async () => {
                events.push('start:lastWorkspace');
                await Promise.resolve();
                events.push('end:lastWorkspace');
            });
            outboxService.addInTx.mockImplementation(async () => {
                events.push('addEntry');

                return 'outbox-1';
            });

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext
            );

            expect(events).toEqual([
                'start:leave',
                'end:leave',
                'start:projectMembers',
                'start:lastWorkspace',
                'end:projectMembers',
                'end:lastWorkspace',
                'addEntry',
            ]);
        });

        it('lets WorkspaceMemberNotFoundException of the guarded leave reach the caller untouched, running no cascade and adding no entry', async () => {
            const notFound = new WorkspaceMemberNotFoundException();
            workspaceMemberService.leaveWorkspaceInTx.mockRejectedValue(
                notFound
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext
                )
            ).rejects.toBe(notFound);
            expect(
                projectMemberService.removeByWorkspaceAndUserInTx
            ).not.toHaveBeenCalled();
            expect(userService.clearLastWorkspaceInTx).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('lets any other transaction error reach the caller untouched', async () => {
            const cause = new Error('boom');
            workspaceMemberService.leaveWorkspaceInTx.mockRejectedValue(cause);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext
                )
            ).rejects.toBe(cause);
        });
    });
});
