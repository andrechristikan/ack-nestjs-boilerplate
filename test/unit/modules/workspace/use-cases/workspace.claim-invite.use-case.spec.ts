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
    EnumProjectMemberRole,
    EnumWorkspaceInviteStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type {
    WorkspaceInvite,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { UserService } from '@modules/user/services/user.service';
import type { WorkspaceInviteClaimRequestDto } from '@modules/workspace/dtos/request/workspace.invite-claim.request.dto';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceInviteAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.invite-already-processed.exception';
import { WorkspaceInviteInvalidException } from '@modules/workspace/exceptions/workspace.invite-invalid.exception';
import { WorkspaceMemberAlreadyExistsException } from '@modules/workspace/exceptions/workspace.member-already-exists.exception';
import { WorkspaceClaimInviteUseCase } from '@modules/workspace/use-cases/workspace.claim-invite.use-case';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
    buildUser,
    buildUserContext,
    buildWorkspaceMember,
} from '@test/unit/helpers/test.unit.request.helper';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';

describe('WorkspaceClaimInviteUseCase', () => {
    const workspaceInviteService: MockProxy<WorkspaceInviteService> =
        mock<WorkspaceInviteService>();
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const workspaceJoinRequestService: MockProxy<WorkspaceJoinRequestService> =
        mock<WorkspaceJoinRequestService>();
    const projectMemberService: MockProxy<ProjectMemberService> =
        mock<ProjectMemberService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const firstEntry = buildActivityLogCreateManyEffect('first-entry');
    const secondEntry = buildActivityLogCreateManyEffect('second-entry');
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const invite: WorkspaceInvite = {
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
        nonce: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };
    const accepted: WorkspaceInvite = {
        ...invite,
        status: EnumWorkspaceInviteStatus.accepted,
        acceptedAt: new Date('2026-01-01T00:00:00.000Z'),
        acceptedByUserId: 'user-2',
    };
    const existingMember: WorkspaceMember = buildWorkspaceMember('user-2');
    const tx: IDatabaseTransactionClient = mock<IDatabaseTransactionClient>();
    const now = new Date('2026-01-01T00:00:00.000Z');
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-2', 'account@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);

    let useCase: WorkspaceClaimInviteUseCase;

    beforeAll(() => {
        vi.useFakeTimers();
    });

    beforeEach(async () => {
        activityLogQueue.recordEffect
            .mockReturnValueOnce(firstEntry)
            .mockReturnValueOnce(secondEntry);
        vi.setSystemTime(now);
        databaseService.withTransaction.mockImplementation(async fn => fn(tx));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceClaimInviteUseCase,
                {
                    provide: WorkspaceInviteService,
                    useValue: workspaceInviteService,
                },
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
                {
                    provide: WorkspaceJoinRequestService,
                    useValue: workspaceJoinRequestService,
                },
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
                { provide: ActivityLogQueue, useValue: activityLogQueue },
            ],
        }).compile();

        useCase = module.get(WorkspaceClaimInviteUseCase);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    describe('execute', () => {
        const body: WorkspaceInviteClaimRequestDto = {
            inviteToken: 'raw-token',
        };

        beforeEach(() => {
            workspaceInviteService.validateInviteForEmail.mockResolvedValue(
                invite
            );
            workspaceInviteService.acceptPendingInTx.mockResolvedValue(
                accepted
            );
        });

        it('validates, accepts the invite before the member insert on one transaction, then adds the accepted entries on the same tx', async () => {
            const callOrder: string[] = [];
            workspaceInviteService.validateInviteForEmail.mockImplementation(
                async () => {
                    callOrder.push('validate');

                    return invite;
                }
            );
            workspaceInviteService.assertInviteeNotMember.mockImplementation(
                async () => {
                    callOrder.push('assertNotMember');
                }
            );
            workspaceInviteService.acceptPendingInTx.mockImplementation(
                async () => {
                    callOrder.push('acceptInvite');

                    return accepted;
                }
            );
            workspaceMemberService.createInTx.mockImplementation(async () => {
                callOrder.push('createMember');

                return existingMember;
            });
            workspaceJoinRequestService.cancelPendingByUserInTx.mockImplementation(
                async () => {
                    callOrder.push('cancelJoinRequest');

                    return 1;
                }
            );
            userService.setLastWorkspaceInTx.mockImplementation(async () => {
                callOrder.push('setLastWorkspace');
            });
            outboxService.addManyInTx.mockImplementation(async () => {
                callOrder.push('addEntries');

                return [];
            });

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                body
            );

            expect(result).toEqual({});
            expect(callOrder).toEqual([
                'validate',
                'assertNotMember',
                'acceptInvite',
                'createMember',
                'cancelJoinRequest',
                'setLastWorkspace',
                'addEntries',
            ]);
            expect(
                workspaceInviteService.validateInviteForEmail
            ).toHaveBeenCalledWith('raw-token', userContext.user.email);
            expect(
                workspaceInviteService.assertInviteeNotMember
            ).toHaveBeenCalledWith('workspace-1', 'user-2');
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                workspaceInviteService.acceptPendingInTx
            ).toHaveBeenCalledWith(tx, 'invite-1', 'user-2', now);
            expect(workspaceMemberService.createInTx).toHaveBeenCalledWith(
                tx,
                'workspace-1',
                'user-2',
                EnumWorkspaceMemberRole.member,
                'user-2'
            );
            expect(
                workspaceJoinRequestService.cancelPendingByUserInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1', 'user-2');
            expect(userService.setLastWorkspaceInTx).toHaveBeenCalledWith(
                tx,
                'user-2',
                'workspace-1'
            );
            expect(projectMemberService.createInTx).not.toHaveBeenCalled();
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                authContext,
                {
                    action: EnumActivityLogAction.workspaceInviteAccepted,
                    userId: 'user-2',
                    createdBy: 'user-2',
                    workspaceId: 'workspace-1',
                    metadata: { targetUserId: 'user-1' },
                }
            );
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                2,
                requestContext,
                apiKeyContext,
                authContext,
                {
                    action: EnumActivityLogAction.workspaceInviteAcceptedByInvitee,
                    userId: 'user-1',
                    createdBy: 'user-2',
                    workspaceId: 'workspace-1',
                    metadata: { actorUserId: 'user-2' },
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                firstEntry,
                secondEntry,
            ]);
        });

        it('awaits the accept and the member insert in turn, then starts the join request cancel, the last workspace set, and the project membership together', async () => {
            const projectFields = {
                projectId: 'project-1',
                projectRole: EnumProjectMemberRole.member,
            };
            workspaceInviteService.validateInviteForEmail.mockResolvedValue({
                ...invite,
                ...projectFields,
            });
            const events: string[] = [];
            workspaceInviteService.acceptPendingInTx.mockImplementation(
                async () => {
                    events.push('start:accept');
                    await Promise.resolve();
                    events.push('end:accept');

                    return { ...accepted, ...projectFields };
                }
            );
            workspaceMemberService.createInTx.mockImplementation(async () => {
                events.push('start:member');
                await Promise.resolve();
                events.push('end:member');

                return existingMember;
            });
            workspaceJoinRequestService.cancelPendingByUserInTx.mockImplementation(
                async () => {
                    events.push('start:cancel');
                    await Promise.resolve();
                    events.push('end:cancel');

                    return 1;
                }
            );
            userService.setLastWorkspaceInTx.mockImplementation(async () => {
                events.push('start:setLast');
                await Promise.resolve();
                events.push('end:setLast');
            });
            projectMemberService.createInTx.mockImplementation(async () => {
                events.push('start:projectMember');
                await Promise.resolve();
                events.push('end:projectMember');
            });
            outboxService.addManyInTx.mockImplementation(async () => {
                events.push('addEntries');

                return [];
            });

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                body
            );

            expect(events).toEqual([
                'start:accept',
                'end:accept',
                'start:member',
                'end:member',
                'start:projectMember',
                'start:cancel',
                'start:setLast',
                'end:projectMember',
                'end:cancel',
                'end:setLast',
                'addEntries',
            ]);
        });

        it('creates the project membership on the same transaction when the invite carries a project and role', async () => {
            const projectFields = {
                projectId: 'project-1',
                projectRole: EnumProjectMemberRole.member,
            };
            workspaceInviteService.validateInviteForEmail.mockResolvedValue({
                ...invite,
                ...projectFields,
            });
            workspaceInviteService.acceptPendingInTx.mockResolvedValue({
                ...accepted,
                ...projectFields,
            });
            const callOrder: string[] = [];
            userService.setLastWorkspaceInTx.mockImplementation(async () => {
                callOrder.push('setLastWorkspace');
            });
            projectMemberService.createInTx.mockImplementation(async () => {
                callOrder.push('createProjectMember');
            });

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                body
            );

            expect(callOrder).toEqual([
                'createProjectMember',
                'setLastWorkspace',
            ]);
            expect(projectMemberService.createInTx).toHaveBeenCalledWith(
                tx,
                'project-1',
                'user-2',
                EnumProjectMemberRole.member,
                'user-2'
            );
        });

        it('adds a single entry when the caller invited itself', async () => {
            workspaceInviteService.validateInviteForEmail.mockResolvedValue({
                ...invite,
                invitedByUserId: 'user-2',
            });
            workspaceInviteService.acceptPendingInTx.mockResolvedValue({
                ...accepted,
                invitedByUserId: 'user-2',
            });

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                body
            );

            expect(activityLogQueue.recordEffect).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                firstEntry,
            ]);
        });

        it('throws WorkspaceMemberAlreadyExistsException and opens no transaction when the caller is already a member', async () => {
            workspaceInviteService.assertInviteeNotMember.mockRejectedValue(
                new WorkspaceMemberAlreadyExistsException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    body
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberAlreadyExists,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('opens no transaction when the invite validation answers the closed invitation flag', async () => {
            workspaceInviteService.validateInviteForEmail.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    body
                )
            ).rejects.toMatchObject({
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.disabled,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('throws WorkspaceInviteInvalidException before the transaction when the token does not resolve', async () => {
            workspaceInviteService.validateInviteForEmail.mockRejectedValue(
                new WorkspaceInviteInvalidException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    body
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteInvalid,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('lets the exception the member insert throws reach the caller untouched and adds no entry', async () => {
            const failure = new WorkspaceMemberAlreadyExistsException();
            workspaceMemberService.createInTx.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    body
                )
            ).rejects.toBe(failure);
            expect(workspaceInviteService.acceptPendingInTx).toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('takes the workspace, roles, project, and inviter from the accepted row', async () => {
            workspaceInviteService.acceptPendingInTx.mockResolvedValue({
                ...accepted,
                workspaceId: 'workspace-9',
                workspaceRole: EnumWorkspaceMemberRole.admin,
                projectId: 'project-9',
                projectRole: EnumProjectMemberRole.member,
                invitedByUserId: 'user-9',
            });

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                body
            );

            expect(workspaceMemberService.createInTx).toHaveBeenCalledWith(
                tx,
                'workspace-9',
                'user-2',
                EnumWorkspaceMemberRole.admin,
                'user-2'
            );
            expect(projectMemberService.createInTx).toHaveBeenCalledWith(
                tx,
                'project-9',
                'user-2',
                EnumProjectMemberRole.member,
                'user-2'
            );
            expect(
                workspaceJoinRequestService.cancelPendingByUserInTx
            ).toHaveBeenCalledWith(tx, 'workspace-9', 'user-2');
            expect(userService.setLastWorkspaceInTx).toHaveBeenCalledWith(
                tx,
                'user-2',
                'workspace-9'
            );
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                authContext,
                expect.objectContaining({
                    workspaceId: 'workspace-9',
                    metadata: { targetUserId: 'user-9' },
                })
            );
        });

        it('propagates WorkspaceInviteAlreadyProcessedException from the guarded accept, writes nothing after it, and adds no entry', async () => {
            workspaceInviteService.acceptPendingInTx.mockRejectedValue(
                new WorkspaceInviteAlreadyProcessedException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    body
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteAlreadyProcessed,
            });
            expect(workspaceMemberService.createInTx).not.toHaveBeenCalled();
            expect(userService.setLastWorkspaceInTx).not.toHaveBeenCalled();
            expect(projectMemberService.createInTx).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });
    });
});
