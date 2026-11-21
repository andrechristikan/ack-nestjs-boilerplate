import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { MessageService } from '@common/message/services/message.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import type {
    IActivityLogActorPayload,
    IActivityLogCreateManyEffect,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import {
    EnumProjectProcess,
    EnumProjectQueue,
} from '@modules/project/enums/project.enum';
import type { IProjectSoftDeleteByWorkspaceEffect } from '@modules/project/interfaces/project.interface';
import { ProjectQueue } from '@modules/project/queues/project.queue';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { SessionService } from '@modules/session/services/session.service';
import type { IUser } from '@modules/user/interfaces/user.interface';
import type { IUserDeleteSelfPayload } from '@modules/user/interfaces/user.interface';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import { UserService } from '@modules/user/services/user.service';
import { UserSocialService } from '@modules/user/services/user.social.service';
import { UserProcessDeleteSelfUseCase } from '@modules/user/use-cases/user.process-delete-self.use-case';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    buildRequestLog,
    buildUser,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserProcessDeleteSelfUseCase', () => {
    const userService: MockProxy<UserService> = mock<UserService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const userProfileService: MockProxy<UserProfileService> =
        mock<UserProfileService>();
    const userMobileNumberService: MockProxy<UserMobileNumberService> =
        mock<UserMobileNumberService>();
    const mfaService: MockProxy<MfaService> = mock<MfaService>();
    const userSocialService: MockProxy<UserSocialService> =
        mock<UserSocialService>();
    const passwordHistoryService: MockProxy<PasswordHistoryService> =
        mock<PasswordHistoryService>();
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const workspaceInviteService: MockProxy<WorkspaceInviteService> =
        mock<WorkspaceInviteService>();
    const workspaceJoinRequestService: MockProxy<WorkspaceJoinRequestService> =
        mock<WorkspaceJoinRequestService>();
    const projectQueue: MockProxy<ProjectQueue> = mock<ProjectQueue>();
    const projectMemberService: MockProxy<ProjectMemberService> =
        mock<ProjectMemberService>();

    let useCase: UserProcessDeleteSelfUseCase;

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-05T00:00:00.000Z');
    const photo = {
        bucket: 'bucket',
        key: 'photo-profile/user-cinder/current.png',
        cdnUrl: null,
        completedUrl: 'https://cdn.example.com/current.png',
        mime: 'image/png',
        extension: 'png',
        access: 'public',
    } as const;
    const baseUser: IUser = {
        ...buildUser('user-cinder', 'cinder@example.com'),
        photo,
    };
    const activityLog: IActivityLogActorPayload = {
        apiKeyId: 'api-key-1',
        actorUserId: 'user-cinder',
        workspaceId: null,
        requestLog: buildRequestLog(),
    };
    const payload: IUserDeleteSelfPayload = {
        userId: 'user-cinder',
        ownedWorkspaceIds: ['workspace-one', 'workspace-two'],
        activityLog,
    };
    const entryEffect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };
    const projectEffect: IProjectSoftDeleteByWorkspaceEffect = {
        queue: EnumProjectQueue.project,
        name: EnumProjectProcess.softDeleteByWorkspace,
        data: {
            workspaceId: 'workspace-one',
            deletedAt: '2026-03-05T00:00:00.000Z',
            deletedBy: 'user-cinder',
        },
        priority: EnumQueuePriority.high,
        idempotencyKey: null,
    };

    beforeAll(() => {
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        vi.setSystemTime(now);
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        messageService.setMessage.mockImplementation(path => path);
        userService.getOneLive.mockResolvedValue(baseUser);
        workspaceService.softDeleteOwnedByUserInTx.mockResolvedValue([
            'workspace-one',
            'workspace-two',
        ]);
        activityLogQueue.recordEffectFromPayload.mockReturnValue(entryEffect);
        projectQueue.softDeleteByWorkspaceEffect.mockReturnValue(projectEffect);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserProcessDeleteSelfUseCase,
                { provide: UserService, useValue: userService },
                { provide: SessionService, useValue: sessionService },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
                { provide: MessageService, useValue: messageService },
                HelperDateService,
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                { provide: UserProfileService, useValue: userProfileService },
                {
                    provide: UserMobileNumberService,
                    useValue: userMobileNumberService,
                },
                { provide: MfaService, useValue: mfaService },
                { provide: UserSocialService, useValue: userSocialService },
                {
                    provide: PasswordHistoryService,
                    useValue: passwordHistoryService,
                },
                { provide: WorkspaceService, useValue: workspaceService },
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
                {
                    provide: WorkspaceInviteService,
                    useValue: workspaceInviteService,
                },
                {
                    provide: WorkspaceJoinRequestService,
                    useValue: workspaceJoinRequestService,
                },
                { provide: ProjectQueue, useValue: projectQueue },
                {
                    provide: ProjectMemberService,
                    useValue: projectMemberService,
                },
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        'user.deleteSelf.timeoutInMs': 30000,
                    }),
                },
            ],
        }).compile();
        useCase = module.get(UserProcessDeleteSelfUseCase);
    });

    describe('execute', () => {
        it('returns the message and writes nothing when the user is already deleted', async () => {
            userService.getOneLive.mockResolvedValue(null);

            await expect(useCase.execute(payload)).resolves.toEqual({
                message: 'user.queue.deleteSelf',
            });

            expect(userService.getOneLive).toHaveBeenCalledWith('user-cinder');
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(userService.deleteSelfInTx).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('runs every participant on one transaction with the row email, the row photo, and the user id as the audit actor', async () => {
            await expect(useCase.execute(payload)).resolves.toEqual({
                message: 'user.queue.deleteSelf',
            });

            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                workspaceService.softDeleteOwnedByUserInTx
            ).toHaveBeenCalledWith(
                tx,
                ['workspace-one', 'workspace-two'],
                'user-cinder',
                now
            );
            expect(
                workspaceJoinRequestService.cancelPendingByRequesterInTx
            ).toHaveBeenCalledWith(tx, 'user-cinder', 'user-cinder');
            expect(
                workspaceInviteService.revokeAllPendingByEmailInTx
            ).toHaveBeenCalledWith(tx, 'cinder@example.com', 'user-cinder');
            expect(
                workspaceMemberService.removeByUserInTx
            ).toHaveBeenCalledWith(tx, 'user-cinder');
            expect(projectMemberService.removeByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-cinder'
            );
            expect(
                userMobileNumberService.removeByUserInTx
            ).toHaveBeenCalledWith(tx, 'user-cinder');
            expect(userSocialService.removeByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-cinder'
            );
            expect(mfaService.deleteByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-cinder'
            );
            expect(
                passwordHistoryService.removeByUserInTx
            ).toHaveBeenCalledWith(tx, 'user-cinder');
            expect(sessionService.revokeAllByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-cinder',
                'user-cinder',
                now
            );
            expect(userService.deleteSelfInTx).toHaveBeenCalledWith(
                tx,
                'user-cinder',
                now
            );
            expect(
                userProfileService.deleteOwnedPhotoInTx
            ).toHaveBeenCalledWith(tx, 'user-cinder', photo);
        });

        it('adds the session, user, and one workspace entry each from the payload, and one project effect per owned workspace, in one addManyInTx', async () => {
            await useCase.execute(payload);

            expect(
                activityLogQueue.recordEffectFromPayload
            ).toHaveBeenNthCalledWith(1, activityLog, {
                action: EnumActivityLogAction.userAllSessionsRevoked,
                userId: 'user-cinder',
                createdBy: 'user-cinder',
            });
            expect(
                activityLogQueue.recordEffectFromPayload
            ).toHaveBeenNthCalledWith(2, activityLog, {
                action: EnumActivityLogAction.userSelfDeleted,
            });
            expect(
                activityLogQueue.recordEffectFromPayload
            ).toHaveBeenNthCalledWith(3, activityLog, {
                action: EnumActivityLogAction.workspaceDeleted,
                userId: 'user-cinder',
                createdBy: 'user-cinder',
                workspaceId: 'workspace-one',
            });
            expect(
                activityLogQueue.recordEffectFromPayload
            ).toHaveBeenNthCalledWith(4, activityLog, {
                action: EnumActivityLogAction.workspaceDeleted,
                userId: 'user-cinder',
                createdBy: 'user-cinder',
                workspaceId: 'workspace-two',
            });
            expect(
                projectQueue.softDeleteByWorkspaceEffect
            ).toHaveBeenCalledWith('workspace-one', now, 'user-cinder');
            expect(
                projectQueue.softDeleteByWorkspaceEffect
            ).toHaveBeenCalledWith('workspace-two', now, 'user-cinder');
            expect(outboxService.addManyInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                entryEffect,
                entryEffect,
                entryEffect,
                entryEffect,
                projectEffect,
                projectEffect,
            ]);
        });

        it('adds no workspace entry and no project effect when the user owns none', async () => {
            workspaceService.softDeleteOwnedByUserInTx.mockResolvedValue([]);

            await useCase.execute({ ...payload, ownedWorkspaceIds: [] });

            expect(
                projectQueue.softDeleteByWorkspaceEffect
            ).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                entryEffect,
                entryEffect,
            ]);
        });

        it('opens the transaction with user.deleteSelf.timeoutInMs', async () => {
            await useCase.execute(payload);

            expect(databaseService.withTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 30000 }
            );
        });

        it('rethrows an AppBaseException unchanged', async () => {
            const failure = new UserNotFoundException();
            databaseService.withTransaction.mockRejectedValue(failure);

            await expect(useCase.execute(payload)).rejects.toBe(failure);
        });

        it('rethrows a QueueException unchanged', async () => {
            const failure = new QueueException('failed', false);
            databaseService.withTransaction.mockRejectedValue(failure);

            await expect(useCase.execute(payload)).rejects.toBe(failure);
        });

        it('throws a fatal QueueException carrying the cause for an unknown error', async () => {
            const cause = new Error('database exploded');
            databaseService.withTransaction.mockRejectedValue(cause);

            const running = useCase.execute(payload);

            await expect(running).rejects.toBeInstanceOf(QueueException);
            await expect(running).rejects.toMatchObject({
                message: 'user.queue.error.deleteSelfFailed',
                isFatal: true,
                rawError: cause,
            });
        });
    });
});
