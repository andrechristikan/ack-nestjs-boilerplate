import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumWorkspaceJoinRejectReason,
} from '@generated/prisma-client/client';
import { NotificationPushMaintenanceDomain } from '@modules/notification/domains/notification.push.maintenance.domain';
import { NotificationPushSecurityDomain } from '@modules/notification/domains/notification.push.security.domain';
import { NotificationPushWorkspaceDomain } from '@modules/notification/domains/notification.push.workspace.domain';
import { EnumNotificationPushProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationNewDeviceLoginPayload,
    INotificationPushCleanupTokenQueuePayload,
    INotificationSendPushPayload,
    INotificationTemporaryPasswordPushPayload,
    INotificationWorkspaceInvitePushPayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestPushPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { NotificationPushProcessorService } from '@modules/notification/services/notification.push.processor.service';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { createQueueJob } from '@test/support/queue-job.mock';

vi.mock('@common/firebase/services/firebase.service', () => ({
    FirebaseService: class {},
}));

describe('NotificationPushProcessorService', () => {
    const notificationPushSecurityDomain: MockProxy<NotificationPushSecurityDomain> =
        mock<NotificationPushSecurityDomain>();
    const notificationPushWorkspaceDomain: MockProxy<NotificationPushWorkspaceDomain> =
        mock<NotificationPushWorkspaceDomain>();
    const notificationPushMaintenanceDomain: MockProxy<NotificationPushMaintenanceDomain> =
        mock<NotificationPushMaintenanceDomain>();
    const notificationPushQueue: MockProxy<NotificationPushQueue> =
        mock<NotificationPushQueue>();
    const response: IQueueResponse = { message: 'processed' };
    const send = {
        userId: 'user-id',
        notificationId: 'notification-id',
        notificationTokens: ['notification-token'],
        username: 'user',
    } satisfies INotificationSendPushPayload;
    const newDeviceLogin = {
        loginFrom: EnumUserLoginFrom.website,
        loginWith: EnumUserLoginWith.credential,
        loginAt: '2026-01-01T00:00:00.000Z',
        requestLog: {
            userAgent: { ua: 'browser' },
            ipAddress: '127.0.0.1',
            geoLocation: null,
        },
    } satisfies INotificationNewDeviceLoginPayload;
    const temporaryPassword = {
        passwordExpiredAt: '2026-01-02T00:00:00.000Z',
        passwordCreatedAt: '2026-01-01T00:00:00.000Z',
    } satisfies INotificationTemporaryPasswordPushPayload;
    const workspaceInvite = {
        workspaceId: 'workspace-id',
        workspaceName: 'Workspace',
        inviterName: 'Inviter',
        workspaceRoleName: 'Member',
        reference: 'reference',
        expiredAt: '2026-01-02T00:00:00.000Z',
    } satisfies INotificationWorkspaceInvitePushPayload;
    const workspaceJoinRequest = {
        workspaceId: 'workspace-id',
        workspaceName: 'Workspace',
        requesterName: 'Requester',
    } satisfies INotificationWorkspaceJoinRequestPushPayload;
    const workspaceJoinAccepted = {
        workspaceId: 'workspace-id',
        workspaceName: 'Workspace',
    } satisfies INotificationWorkspaceJoinAcceptedPayload;
    const workspaceJoinRejected = {
        ...workspaceJoinAccepted,
        rejectReasonCode: EnumWorkspaceJoinRejectReason.other,
    } satisfies INotificationWorkspaceJoinRejectedPayload;
    const cleanupTokens = {
        data: {
            userId: send.userId,
            failureTokens: ['invalid-token'],
        },
    } satisfies INotificationPushCleanupTokenQueuePayload;
    let service: NotificationPushProcessorService;
    const cases = [
        {
            title: 'delegates new-device-login push payloads',
            handler: notificationPushSecurityDomain.processNewDeviceLogin,
            expected: [send, newDeviceLogin],
            run: () =>
                service.processNewDeviceLogin(
                    createQueueJob(EnumNotificationPushProcess.newDeviceLogin, {
                        send,
                        data: newDeviceLogin,
                    })
                ),
        },
        {
            title: 'delegates two-factor reset push payloads',
            handler:
                notificationPushSecurityDomain.processResetTwoFactorByAdmin,
            expected: [send],
            run: () =>
                service.processResetTwoFactorByAdmin(
                    createQueueJob(
                        EnumNotificationPushProcess.resetTwoFactorByAdmin,
                        { send }
                    )
                ),
        },
        {
            title: 'delegates temporary-password push payloads',
            handler:
                notificationPushSecurityDomain.processTemporaryPasswordByAdmin,
            expected: [send, temporaryPassword],
            run: () =>
                service.processTemporaryPasswordByAdmin(
                    createQueueJob(
                        EnumNotificationPushProcess.temporaryPasswordByAdmin,
                        { send, data: temporaryPassword }
                    )
                ),
        },
        {
            title: 'delegates reset-password push payloads',
            handler: notificationPushSecurityDomain.processResetPassword,
            expected: [send],
            run: () =>
                service.processResetPassword(
                    createQueueJob(EnumNotificationPushProcess.resetPassword, {
                        send,
                    })
                ),
        },
        {
            title: 'delegates forgot-password push payloads',
            handler: notificationPushSecurityDomain.processForgotPassword,
            expected: [send],
            run: () =>
                service.processForgotPassword(
                    createQueueJob(EnumNotificationPushProcess.resetPassword, {
                        send,
                    })
                ),
        },
        {
            title: 'delegates workspace-invite push payloads',
            handler: notificationPushWorkspaceDomain.processWorkspaceInvite,
            expected: [send, workspaceInvite],
            run: () =>
                service.processWorkspaceInvite(
                    createQueueJob(
                        EnumNotificationPushProcess.workspaceInvite,
                        { send, data: workspaceInvite }
                    )
                ),
        },
        {
            title: 'delegates workspace-join-request push payloads',
            handler:
                notificationPushWorkspaceDomain.processWorkspaceJoinRequest,
            expected: [send, workspaceJoinRequest],
            run: () =>
                service.processWorkspaceJoinRequest(
                    createQueueJob(
                        EnumNotificationPushProcess.workspaceJoinRequest,
                        { send, data: workspaceJoinRequest }
                    )
                ),
        },
        {
            title: 'delegates workspace-join-accepted push payloads',
            handler:
                notificationPushWorkspaceDomain.processWorkspaceJoinAccepted,
            expected: [send, workspaceJoinAccepted],
            run: () =>
                service.processWorkspaceJoinAccepted(
                    createQueueJob(
                        EnumNotificationPushProcess.workspaceJoinAccepted,
                        { send, data: workspaceJoinAccepted }
                    )
                ),
        },
        {
            title: 'delegates workspace-join-rejected push payloads',
            handler:
                notificationPushWorkspaceDomain.processWorkspaceJoinRejected,
            expected: [send, workspaceJoinRejected],
            run: () =>
                service.processWorkspaceJoinRejected(
                    createQueueJob(
                        EnumNotificationPushProcess.workspaceJoinRejected,
                        { send, data: workspaceJoinRejected }
                    )
                ),
        },
        {
            title: 'delegates invalid-token cleanup payloads',
            handler: notificationPushMaintenanceDomain.processCleanupTokens,
            expected: [
                cleanupTokens.data.userId,
                cleanupTokens.data.failureTokens,
            ],
            run: () =>
                service.processCleanupTokens(
                    createQueueJob(
                        EnumNotificationPushProcess.cleanupTokens,
                        cleanupTokens
                    )
                ),
        },
        {
            title: 'delegates stale-token cleanup',
            handler:
                notificationPushMaintenanceDomain.processCleanupStaleTokens,
            expected: [],
            run: () => service.processCleanupStaleTokens(),
        },
    ];

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
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

        service = moduleRef.get(NotificationPushProcessorService);
    });

    it('schedules stale-token cleanup during module initialization', async () => {
        await service.onModuleInit();

        expect(
            notificationPushQueue.sendCleanupStaleTokens
        ).toHaveBeenCalledWith();
    });

    it.each(cases)('$title', async ({ handler, expected, run }) => {
        handler.mockResolvedValue(response);

        await expect(run()).resolves.toBe(response);
        expect(handler).toHaveBeenCalledWith(...expected);
    });
});
