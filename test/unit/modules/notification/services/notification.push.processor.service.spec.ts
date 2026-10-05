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
import { EnumNotificationPushProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationNewDeviceLoginPayload,
    INotificationPushCleanupTokenQueuePayload,
    INotificationPushQueuePayload,
    INotificationSendPushPayload,
    INotificationWorkspaceInvitePushPayload,
    INotificationWorkspaceJoinRejectedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { NotificationPushProcessorService } from '@modules/notification/services/notification.push.processor.service';
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

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                NotificationPushProcessorService,
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
        it('forwards send and data to the security domain', async () => {
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
            notificationPushSecurityDomain.processNewDeviceLogin.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationPushQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationPushProcess
            >({
                send,
                data,
            });

            const result = await service.processNewDeviceLogin(job);

            expect(
                notificationPushSecurityDomain.processNewDeviceLogin
            ).toHaveBeenCalledWith(send, data);
            expect(result).toBe(response);
        });
    });

    describe('processResetTwoFactorByAdmin', () => {
        it('forwards send to the security domain', async () => {
            notificationPushSecurityDomain.processResetTwoFactorByAdmin.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationPushQueuePayload,
                IQueueResponse,
                EnumNotificationPushProcess
            >({ send });

            const result = await service.processResetTwoFactorByAdmin(job);

            expect(
                notificationPushSecurityDomain.processResetTwoFactorByAdmin
            ).toHaveBeenCalledWith(send);
            expect(result).toBe(response);
        });
    });

    describe('processTemporaryPasswordByAdmin', () => {
        it('forwards send and data to the security domain', async () => {
            const data = {
                passwordExpiredAt: '2024-02-01T00:00:00.000Z',
                passwordCreatedAt: '2024-01-01T00:00:00.000Z',
            };
            notificationPushSecurityDomain.processTemporaryPasswordByAdmin.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationPushQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationPushProcess
            >({
                send,
                data,
            });

            const result = await service.processTemporaryPasswordByAdmin(job);

            expect(
                notificationPushSecurityDomain.processTemporaryPasswordByAdmin
            ).toHaveBeenCalledWith(send, data);
            expect(result).toBe(response);
        });
    });

    describe('processResetPassword', () => {
        it('forwards send to the security domain', async () => {
            notificationPushSecurityDomain.processResetPassword.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationPushQueuePayload,
                IQueueResponse,
                EnumNotificationPushProcess
            >({ send });

            const result = await service.processResetPassword(job);

            expect(
                notificationPushSecurityDomain.processResetPassword
            ).toHaveBeenCalledWith(send);
            expect(result).toBe(response);
        });
    });

    describe('processForgotPassword', () => {
        it('forwards send to the security domain', async () => {
            notificationPushSecurityDomain.processForgotPassword.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationPushQueuePayload,
                IQueueResponse,
                EnumNotificationPushProcess
            >({ send });

            const result = await service.processForgotPassword(job);

            expect(
                notificationPushSecurityDomain.processForgotPassword
            ).toHaveBeenCalledWith(send);
            expect(result).toBe(response);
        });
    });

    describe('processWorkspaceInvite', () => {
        it('forwards send and data to the workspace domain', async () => {
            const data: INotificationWorkspaceInvitePushPayload = {
                workspaceId: 'workspace-id',
                workspaceName: 'Acme',
                inviterName: 'Omar',
                workspaceMemberRole: EnumWorkspaceMemberRole.member,
                reference: 'ref-1',
                expiredAt: '2024-02-01T00:00:00.000Z',
            };
            notificationPushWorkspaceDomain.processWorkspaceInvite.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationPushQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationPushProcess
            >({
                send,
                data,
            });

            const result = await service.processWorkspaceInvite(job);

            expect(
                notificationPushWorkspaceDomain.processWorkspaceInvite
            ).toHaveBeenCalledWith(send, data);
            expect(result).toBe(response);
        });
    });

    describe('processWorkspaceJoinRequest', () => {
        it('forwards send and data to the workspace domain', async () => {
            const data = {
                workspaceId: 'workspace-id',
                workspaceName: 'Acme',
                requesterName: 'Omar',
            };
            notificationPushWorkspaceDomain.processWorkspaceJoinRequest.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationPushQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationPushProcess
            >({
                send,
                data,
            });

            const result = await service.processWorkspaceJoinRequest(job);

            expect(
                notificationPushWorkspaceDomain.processWorkspaceJoinRequest
            ).toHaveBeenCalledWith(send, data);
            expect(result).toBe(response);
        });
    });

    describe('processWorkspaceJoinAccepted', () => {
        it('forwards send and data to the workspace domain', async () => {
            const data = { workspaceId: 'workspace-id', workspaceName: 'Acme' };
            notificationPushWorkspaceDomain.processWorkspaceJoinAccepted.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationPushQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationPushProcess
            >({
                send,
                data,
            });

            const result = await service.processWorkspaceJoinAccepted(job);

            expect(
                notificationPushWorkspaceDomain.processWorkspaceJoinAccepted
            ).toHaveBeenCalledWith(send, data);
            expect(result).toBe(response);
        });
    });

    describe('processWorkspaceJoinRejected', () => {
        it('forwards send and data to the workspace domain', async () => {
            const data: INotificationWorkspaceJoinRejectedPayload = {
                workspaceId: 'workspace-id',
                workspaceName: 'Acme',
                rejectReasonCode:
                    EnumWorkspaceJoinRejectReason.memberLimitReached,
            };
            notificationPushWorkspaceDomain.processWorkspaceJoinRejected.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationPushQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationPushProcess
            >({
                send,
                data,
            });

            const result = await service.processWorkspaceJoinRejected(job);

            expect(
                notificationPushWorkspaceDomain.processWorkspaceJoinRejected
            ).toHaveBeenCalledWith(send, data);
            expect(result).toBe(response);
        });
    });

    describe('processCleanupTokens', () => {
        it('forwards userId and failureTokens to the maintenance domain', async () => {
            const payload: INotificationPushCleanupTokenQueuePayload = {
                data: { userId: 'user-id', failureTokens: ['token-1'] },
            };
            notificationPushMaintenanceDomain.processCleanupTokens.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationPushCleanupTokenQueuePayload,
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
