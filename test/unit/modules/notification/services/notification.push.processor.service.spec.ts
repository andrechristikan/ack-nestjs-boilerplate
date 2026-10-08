import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import { NotificationPushMaintenanceDomain } from '@modules/notification/domains/notification.push.maintenance.domain';
import { NotificationPushSecurityDomain } from '@modules/notification/domains/notification.push.security.domain';
import { NotificationPushWorkspaceDomain } from '@modules/notification/domains/notification.push.workspace.domain';
import {
    EnumNotificationPushProcess,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type {
    INotificationNewDeviceLoginPayload,
    INotificationPushCleanupTokenPayload,
    INotificationPushQueuePayload,
    INotificationPushStepResult,
    INotificationSendPushPayload,
    INotificationWorkspaceInvitePushPayload,
    INotificationWorkspaceJoinRejectedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { NotificationPushProcessorService } from '@modules/notification/services/notification.push.processor.service';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { buildQueueJob } from '@test/unit/helpers/test.unit.queue.helper';

describe('NotificationPushProcessorService', () => {
    const notificationPushSecurityDomain: MockProxy<NotificationPushSecurityDomain> =
        mock<NotificationPushSecurityDomain>();
    const notificationPushWorkspaceDomain: MockProxy<NotificationPushWorkspaceDomain> =
        mock<NotificationPushWorkspaceDomain>();
    const notificationPushMaintenanceDomain: MockProxy<NotificationPushMaintenanceDomain> =
        mock<NotificationPushMaintenanceDomain>();
    const notificationPushQueue: MockProxy<NotificationPushQueue> =
        mock<NotificationPushQueue>();
    let service: NotificationPushProcessorService;

    const response: IQueueResponse = { message: 'processed' };
    const send: INotificationSendPushPayload = {
        userId: 'user-id',
        notificationId: 'notification-id',
        notificationTokens: ['token-1'],
        username: 'nadia',
    };
    const progress = [
        EnumNotificationStep.updateProcessAt,
        EnumNotificationStep.sendMulticast,
    ];
    const completed: INotificationPushStepResult = {
        message: 'm',
        completedSteps: [
            ...progress,
            EnumNotificationStep.cleanupTokens,
            EnumNotificationStep.updateSentAt,
        ],
        failedSteps: [],
        failureTokens: ['bad'],
    };
    const failed: INotificationPushStepResult = {
        message: 'm',
        completedSteps: progress,
        failedSteps: [
            { step: EnumNotificationStep.cleanupTokens, error: 'redis' },
        ],
        failureTokens: ['bad'],
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                NotificationPushProcessorService,
                NotificationUtil,
                {
                    provide: NotificationPushSecurityDomain,
                    useValue: notificationPushSecurityDomain,
                },
                {
                    provide: NotificationPushWorkspaceDomain,
                    useValue: notificationPushWorkspaceDomain,
                },
                {
                    provide: NotificationPushMaintenanceDomain,
                    useValue: notificationPushMaintenanceDomain,
                },
                {
                    provide: NotificationPushQueue,
                    useValue: notificationPushQueue,
                },
            ],
        }).compile();
        service = module.get(NotificationPushProcessorService);
    });

    describe('onModuleInit', () => {
        it('schedules the recurring stale-token cleanup job', async () => {
            notificationPushQueue.sendCleanupStaleTokens.mockResolvedValue(
                undefined
            );

            await service.onModuleInit();

            expect(
                notificationPushQueue.sendCleanupStaleTokens
            ).toHaveBeenCalledWith();
        });
    });

    describe('processNewDeviceLogin', () => {
        const requestLog: IRequestLog = {
            userAgent: {
                ua: null,
                browser: null,
                cpu: null,
                device: null,
                engine: null,
                os: null,
            },
            ipAddress: null,
            geoLocation: null,
        };
        const data: INotificationNewDeviceLoginPayload = {
            loginFrom: EnumUserLoginFrom.website,
            loginWith: EnumUserLoginWith.credential,
            loginAt: '2024-01-01T00:00:00.000Z',
            requestLog,
        };
        const jobData = {
            send,
            data,
            completedSteps: [EnumNotificationStep.updateProcessAt],
            failureTokens: null,
        };

        it('records progress and the failed tokens, then returns the step response when every step succeeded', async () => {
            notificationPushSecurityDomain.processNewDeviceLogin.mockResolvedValue(
                completed
            );
            const job = buildQueueJob<
                INotificationPushQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationPushProcess
            >(jobData);

            const result = await service.processNewDeviceLogin(job);

            expect(
                notificationPushSecurityDomain.processNewDeviceLogin
            ).toHaveBeenCalledWith(
                send,
                data,
                [EnumNotificationStep.updateProcessAt],
                null
            );
            expect(job.updateData).toHaveBeenCalledTimes(1);
            expect(job.updateData).toHaveBeenCalledWith({
                ...job.data,
                completedSteps: completed.completedSteps,
                failureTokens: ['bad'],
            });
            expect(result).toEqual({
                message: 'm',
                completedSteps: completed.completedSteps,
            });
        });

        it('records progress then throws a fatal QueueException when a step failed', async () => {
            notificationPushSecurityDomain.processNewDeviceLogin.mockResolvedValue(
                failed
            );
            const job = buildQueueJob<
                INotificationPushQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationPushProcess
            >(jobData);

            await expect(
                service.processNewDeviceLogin(job)
            ).rejects.toMatchObject({
                isFatal: true,
                message: 'Notification steps failed: cleanupTokens:redis',
            });
            expect(job.updateData).toHaveBeenCalledWith({
                ...job.data,
                completedSteps: progress,
                failureTokens: ['bad'],
            });
        });
    });

    describe('processResetTwoFactorByAdmin', () => {
        const jobData = {
            send,
            data: null,
            completedSteps: [EnumNotificationStep.updateProcessAt],
            failureTokens: null,
        };

        it('records progress and the failed tokens, then returns the step response when every step succeeded', async () => {
            notificationPushSecurityDomain.processResetTwoFactorByAdmin.mockResolvedValue(
                completed
            );
            const job = buildQueueJob<
                INotificationPushQueuePayload,
                IQueueResponse,
                EnumNotificationPushProcess
            >(jobData);

            const result = await service.processResetTwoFactorByAdmin(job);

            expect(
                notificationPushSecurityDomain.processResetTwoFactorByAdmin
            ).toHaveBeenCalledWith(
                send,
                [EnumNotificationStep.updateProcessAt],
                null
            );
            expect(job.updateData).toHaveBeenCalledTimes(1);
            expect(job.updateData).toHaveBeenCalledWith({
                ...job.data,
                completedSteps: completed.completedSteps,
                failureTokens: ['bad'],
            });
            expect(result).toEqual({
                message: 'm',
                completedSteps: completed.completedSteps,
            });
        });

        it('records progress then throws a fatal QueueException when a step failed', async () => {
            notificationPushSecurityDomain.processResetTwoFactorByAdmin.mockResolvedValue(
                failed
            );
            const job = buildQueueJob<
                INotificationPushQueuePayload,
                IQueueResponse,
                EnumNotificationPushProcess
            >(jobData);

            await expect(
                service.processResetTwoFactorByAdmin(job)
            ).rejects.toMatchObject({
                isFatal: true,
                message: 'Notification steps failed: cleanupTokens:redis',
            });
            expect(job.updateData).toHaveBeenCalledWith({
                ...job.data,
                completedSteps: progress,
                failureTokens: ['bad'],
            });
        });
    });

    describe('processTemporaryPasswordByAdmin', () => {
        const data = {
            passwordExpiredAt: '2024-02-01T00:00:00.000Z',
            passwordCreatedAt: '2024-01-01T00:00:00.000Z',
        };
        const jobData = {
            send,
            data,
            completedSteps: [EnumNotificationStep.updateProcessAt],
            failureTokens: null,
        };

        it('records progress and the failed tokens, then returns the step response when every step succeeded', async () => {
            notificationPushSecurityDomain.processTemporaryPasswordByAdmin.mockResolvedValue(
                completed
            );
            const job = buildQueueJob<
                INotificationPushQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationPushProcess
            >(jobData);

            const result = await service.processTemporaryPasswordByAdmin(job);

            expect(
                notificationPushSecurityDomain.processTemporaryPasswordByAdmin
            ).toHaveBeenCalledWith(
                send,
                data,
                [EnumNotificationStep.updateProcessAt],
                null
            );
            expect(job.updateData).toHaveBeenCalledTimes(1);
            expect(job.updateData).toHaveBeenCalledWith({
                ...job.data,
                completedSteps: completed.completedSteps,
                failureTokens: ['bad'],
            });
            expect(result).toEqual({
                message: 'm',
                completedSteps: completed.completedSteps,
            });
        });

        it('records progress then throws a fatal QueueException when a step failed', async () => {
            notificationPushSecurityDomain.processTemporaryPasswordByAdmin.mockResolvedValue(
                failed
            );
            const job = buildQueueJob<
                INotificationPushQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationPushProcess
            >(jobData);

            await expect(
                service.processTemporaryPasswordByAdmin(job)
            ).rejects.toMatchObject({
                isFatal: true,
                message: 'Notification steps failed: cleanupTokens:redis',
            });
            expect(job.updateData).toHaveBeenCalledWith({
                ...job.data,
                completedSteps: progress,
                failureTokens: ['bad'],
            });
        });
    });

    describe('processResetPassword', () => {
        const jobData = {
            send,
            data: null,
            completedSteps: [EnumNotificationStep.updateProcessAt],
            failureTokens: null,
        };

        it('records progress and the failed tokens, then returns the step response when every step succeeded', async () => {
            notificationPushSecurityDomain.processResetPassword.mockResolvedValue(
                completed
            );
            const job = buildQueueJob<
                INotificationPushQueuePayload,
                IQueueResponse,
                EnumNotificationPushProcess
            >(jobData);

            const result = await service.processResetPassword(job);

            expect(
                notificationPushSecurityDomain.processResetPassword
            ).toHaveBeenCalledWith(
                send,
                [EnumNotificationStep.updateProcessAt],
                null
            );
            expect(job.updateData).toHaveBeenCalledTimes(1);
            expect(job.updateData).toHaveBeenCalledWith({
                ...job.data,
                completedSteps: completed.completedSteps,
                failureTokens: ['bad'],
            });
            expect(result).toEqual({
                message: 'm',
                completedSteps: completed.completedSteps,
            });
        });

        it('records progress then throws a fatal QueueException when a step failed', async () => {
            notificationPushSecurityDomain.processResetPassword.mockResolvedValue(
                failed
            );
            const job = buildQueueJob<
                INotificationPushQueuePayload,
                IQueueResponse,
                EnumNotificationPushProcess
            >(jobData);

            await expect(
                service.processResetPassword(job)
            ).rejects.toMatchObject({
                isFatal: true,
                message: 'Notification steps failed: cleanupTokens:redis',
            });
            expect(job.updateData).toHaveBeenCalledWith({
                ...job.data,
                completedSteps: progress,
                failureTokens: ['bad'],
            });
        });
    });

    describe('processForgotPassword', () => {
        const jobData = {
            send,
            data: null,
            completedSteps: [EnumNotificationStep.updateProcessAt],
            failureTokens: null,
        };

        it('records progress and the failed tokens, then returns the step response when every step succeeded', async () => {
            notificationPushSecurityDomain.processForgotPassword.mockResolvedValue(
                completed
            );
            const job = buildQueueJob<
                INotificationPushQueuePayload,
                IQueueResponse,
                EnumNotificationPushProcess
            >(jobData);

            const result = await service.processForgotPassword(job);

            expect(
                notificationPushSecurityDomain.processForgotPassword
            ).toHaveBeenCalledWith(
                send,
                [EnumNotificationStep.updateProcessAt],
                null
            );
            expect(job.updateData).toHaveBeenCalledTimes(1);
            expect(job.updateData).toHaveBeenCalledWith({
                ...job.data,
                completedSteps: completed.completedSteps,
                failureTokens: ['bad'],
            });
            expect(result).toEqual({
                message: 'm',
                completedSteps: completed.completedSteps,
            });
        });

        it('records progress then throws a fatal QueueException when a step failed', async () => {
            notificationPushSecurityDomain.processForgotPassword.mockResolvedValue(
                failed
            );
            const job = buildQueueJob<
                INotificationPushQueuePayload,
                IQueueResponse,
                EnumNotificationPushProcess
            >(jobData);

            await expect(
                service.processForgotPassword(job)
            ).rejects.toMatchObject({
                isFatal: true,
                message: 'Notification steps failed: cleanupTokens:redis',
            });
            expect(job.updateData).toHaveBeenCalledWith({
                ...job.data,
                completedSteps: progress,
                failureTokens: ['bad'],
            });
        });
    });

    describe('processWorkspaceInvite', () => {
        const data: INotificationWorkspaceInvitePushPayload = {
            workspaceId: 'workspace-id',
            workspaceName: 'Acme',
            inviterName: 'Omar',
            workspaceMemberRole: EnumWorkspaceMemberRole.member,
            reference: 'ref-1',
            expiredAt: '2024-02-01T00:00:00.000Z',
        };
        const jobData = {
            send,
            data,
            completedSteps: [EnumNotificationStep.updateProcessAt],
            failureTokens: null,
        };

        it('records progress and the failed tokens, then returns the step response when every step succeeded', async () => {
            notificationPushWorkspaceDomain.processWorkspaceInvite.mockResolvedValue(
                completed
            );
            const job = buildQueueJob<
                INotificationPushQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationPushProcess
            >(jobData);

            const result = await service.processWorkspaceInvite(job);

            expect(
                notificationPushWorkspaceDomain.processWorkspaceInvite
            ).toHaveBeenCalledWith(
                send,
                data,
                [EnumNotificationStep.updateProcessAt],
                null
            );
            expect(job.updateData).toHaveBeenCalledTimes(1);
            expect(job.updateData).toHaveBeenCalledWith({
                ...job.data,
                completedSteps: completed.completedSteps,
                failureTokens: ['bad'],
            });
            expect(result).toEqual({
                message: 'm',
                completedSteps: completed.completedSteps,
            });
        });

        it('records progress then throws a fatal QueueException when a step failed', async () => {
            notificationPushWorkspaceDomain.processWorkspaceInvite.mockResolvedValue(
                failed
            );
            const job = buildQueueJob<
                INotificationPushQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationPushProcess
            >(jobData);

            await expect(
                service.processWorkspaceInvite(job)
            ).rejects.toMatchObject({
                isFatal: true,
                message: 'Notification steps failed: cleanupTokens:redis',
            });
            expect(job.updateData).toHaveBeenCalledWith({
                ...job.data,
                completedSteps: progress,
                failureTokens: ['bad'],
            });
        });
    });

    describe('processWorkspaceJoinRequest', () => {
        const data = {
            workspaceId: 'workspace-id',
            workspaceName: 'Acme',
            requesterName: 'Omar',
        };
        const jobData = {
            send,
            data,
            completedSteps: [EnumNotificationStep.updateProcessAt],
            failureTokens: null,
        };

        it('records progress and the failed tokens, then returns the step response when every step succeeded', async () => {
            notificationPushWorkspaceDomain.processWorkspaceJoinRequest.mockResolvedValue(
                completed
            );
            const job = buildQueueJob<
                INotificationPushQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationPushProcess
            >(jobData);

            const result = await service.processWorkspaceJoinRequest(job);

            expect(
                notificationPushWorkspaceDomain.processWorkspaceJoinRequest
            ).toHaveBeenCalledWith(
                send,
                data,
                [EnumNotificationStep.updateProcessAt],
                null
            );
            expect(job.updateData).toHaveBeenCalledTimes(1);
            expect(job.updateData).toHaveBeenCalledWith({
                ...job.data,
                completedSteps: completed.completedSteps,
                failureTokens: ['bad'],
            });
            expect(result).toEqual({
                message: 'm',
                completedSteps: completed.completedSteps,
            });
        });

        it('records progress then throws a fatal QueueException when a step failed', async () => {
            notificationPushWorkspaceDomain.processWorkspaceJoinRequest.mockResolvedValue(
                failed
            );
            const job = buildQueueJob<
                INotificationPushQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationPushProcess
            >(jobData);

            await expect(
                service.processWorkspaceJoinRequest(job)
            ).rejects.toMatchObject({
                isFatal: true,
                message: 'Notification steps failed: cleanupTokens:redis',
            });
            expect(job.updateData).toHaveBeenCalledWith({
                ...job.data,
                completedSteps: progress,
                failureTokens: ['bad'],
            });
        });
    });

    describe('processWorkspaceJoinAccepted', () => {
        const data = { workspaceId: 'workspace-id', workspaceName: 'Acme' };
        const jobData = {
            send,
            data,
            completedSteps: [EnumNotificationStep.updateProcessAt],
            failureTokens: null,
        };

        it('records progress and the failed tokens, then returns the step response when every step succeeded', async () => {
            notificationPushWorkspaceDomain.processWorkspaceJoinAccepted.mockResolvedValue(
                completed
            );
            const job = buildQueueJob<
                INotificationPushQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationPushProcess
            >(jobData);

            const result = await service.processWorkspaceJoinAccepted(job);

            expect(
                notificationPushWorkspaceDomain.processWorkspaceJoinAccepted
            ).toHaveBeenCalledWith(
                send,
                data,
                [EnumNotificationStep.updateProcessAt],
                null
            );
            expect(job.updateData).toHaveBeenCalledTimes(1);
            expect(job.updateData).toHaveBeenCalledWith({
                ...job.data,
                completedSteps: completed.completedSteps,
                failureTokens: ['bad'],
            });
            expect(result).toEqual({
                message: 'm',
                completedSteps: completed.completedSteps,
            });
        });

        it('records progress then throws a fatal QueueException when a step failed', async () => {
            notificationPushWorkspaceDomain.processWorkspaceJoinAccepted.mockResolvedValue(
                failed
            );
            const job = buildQueueJob<
                INotificationPushQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationPushProcess
            >(jobData);

            await expect(
                service.processWorkspaceJoinAccepted(job)
            ).rejects.toMatchObject({
                isFatal: true,
                message: 'Notification steps failed: cleanupTokens:redis',
            });
            expect(job.updateData).toHaveBeenCalledWith({
                ...job.data,
                completedSteps: progress,
                failureTokens: ['bad'],
            });
        });
    });

    describe('processWorkspaceJoinRejected', () => {
        const data: INotificationWorkspaceJoinRejectedPayload = {
            workspaceId: 'workspace-id',
            workspaceName: 'Acme',
            rejectReasonCode: EnumWorkspaceJoinRejectReason.memberLimitReached,
        };
        const jobData = {
            send,
            data,
            completedSteps: [EnumNotificationStep.updateProcessAt],
            failureTokens: null,
        };

        it('records progress and the failed tokens, then returns the step response when every step succeeded', async () => {
            notificationPushWorkspaceDomain.processWorkspaceJoinRejected.mockResolvedValue(
                completed
            );
            const job = buildQueueJob<
                INotificationPushQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationPushProcess
            >(jobData);

            const result = await service.processWorkspaceJoinRejected(job);

            expect(
                notificationPushWorkspaceDomain.processWorkspaceJoinRejected
            ).toHaveBeenCalledWith(
                send,
                data,
                [EnumNotificationStep.updateProcessAt],
                null
            );
            expect(job.updateData).toHaveBeenCalledTimes(1);
            expect(job.updateData).toHaveBeenCalledWith({
                ...job.data,
                completedSteps: completed.completedSteps,
                failureTokens: ['bad'],
            });
            expect(result).toEqual({
                message: 'm',
                completedSteps: completed.completedSteps,
            });
        });

        it('records progress then throws a fatal QueueException when a step failed', async () => {
            notificationPushWorkspaceDomain.processWorkspaceJoinRejected.mockResolvedValue(
                failed
            );
            const job = buildQueueJob<
                INotificationPushQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationPushProcess
            >(jobData);

            await expect(
                service.processWorkspaceJoinRejected(job)
            ).rejects.toMatchObject({
                isFatal: true,
                message: 'Notification steps failed: cleanupTokens:redis',
            });
            expect(job.updateData).toHaveBeenCalledWith({
                ...job.data,
                completedSteps: progress,
                failureTokens: ['bad'],
            });
        });
    });

    describe('processCleanupTokens', () => {
        it('forwards userId and failureTokens to the maintenance domain', async () => {
            const payload: INotificationPushCleanupTokenPayload = {
                userId: 'user-id',
                failureTokens: ['token-1'],
            };
            notificationPushMaintenanceDomain.processCleanupTokens.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationPushCleanupTokenPayload,
                IQueueResponse,
                EnumNotificationPushProcess
            >(payload);

            const result = await service.processCleanupTokens(job);

            expect(
                notificationPushMaintenanceDomain.processCleanupTokens
            ).toHaveBeenCalledWith('user-id', ['token-1']);
            expect(result).toBe(response);
        });
    });

    describe('processCleanupStaleTokens', () => {
        it('forwards to the maintenance domain', async () => {
            notificationPushMaintenanceDomain.processCleanupStaleTokens.mockResolvedValue(
                response
            );

            const result = await service.processCleanupStaleTokens();

            expect(
                notificationPushMaintenanceDomain.processCleanupStaleTokens
            ).toHaveBeenCalledWith();
            expect(result).toBe(response);
        });
    });
});
