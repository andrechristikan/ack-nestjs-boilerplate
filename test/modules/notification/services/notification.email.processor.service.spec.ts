import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import {
    EnumTermPolicyType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumWorkspaceJoinRejectReason,
} from '@generated/prisma-client/client';
import { NotificationEmailAccountDomain } from '@modules/notification/domains/notification.email.account.domain';
import { NotificationEmailSecurityDomain } from '@modules/notification/domains/notification.email.security.domain';
import { NotificationEmailTermPolicyDomain } from '@modules/notification/domains/notification.email.term-policy.domain';
import { NotificationEmailWorkspaceDomain } from '@modules/notification/domains/notification.email.workspace.domain';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailSendPayload,
    INotificationEmailSendUnregisteredPayload,
    INotificationForgotPasswordEncryptedPayload,
    INotificationNewDeviceLoginPayload,
    INotificationPublishTermPolicyPayload,
    INotificationTemporaryPasswordEncryptedPayload,
    INotificationVerificationEmailEncryptedPayload,
    INotificationVerifiedEmailPayload,
    INotificationVerifiedMobileNumberPayload,
    INotificationWelcomeByAdminEncryptedPayload,
    INotificationWorkspaceInviteEncryptedPayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailProcessorService } from '@modules/notification/services/notification.email.processor.service';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { createQueueJob } from '@test/support/queue-job.mock';

describe('NotificationEmailProcessorService', () => {
    const notificationEmailAccountDomain: MockProxy<NotificationEmailAccountDomain> =
        mock<NotificationEmailAccountDomain>();
    const notificationEmailSecurityDomain: MockProxy<NotificationEmailSecurityDomain> =
        mock<NotificationEmailSecurityDomain>();
    const notificationEmailTermPolicyDomain: MockProxy<NotificationEmailTermPolicyDomain> =
        mock<NotificationEmailTermPolicyDomain>();
    const notificationEmailWorkspaceDomain: MockProxy<NotificationEmailWorkspaceDomain> =
        mock<NotificationEmailWorkspaceDomain>();
    const response: IQueueResponse = { message: 'processed' };
    const send = {
        userId: 'user-id',
        notificationId: 'notification-id',
        email: 'user@example.com',
        username: 'user',
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
    } satisfies INotificationEmailSendPayload;
    const unregisteredSend = {
        email: 'invitee@example.com',
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
    } satisfies INotificationEmailSendUnregisteredPayload;
    const welcomeByAdmin = {
        encryptedPassword: 'encrypted-password',
        passwordExpiredAt: '2026-01-02T00:00:00.000Z',
        passwordCreatedAt: '2026-01-01T00:00:00.000Z',
    } satisfies INotificationWelcomeByAdminEncryptedPayload;
    const temporaryPassword = {
        ...welcomeByAdmin,
    } satisfies INotificationTemporaryPasswordEncryptedPayload;
    const verificationEmail = {
        encryptedLink: 'encrypted-link',
        expiredAt: '2026-01-02T00:00:00.000Z',
        expiredInMinutes: 60,
        reference: 'reference',
    } satisfies INotificationVerificationEmailEncryptedPayload;
    const verifiedEmail = {
        reference: 'reference',
    } satisfies INotificationVerifiedEmailPayload;
    const forgotPassword = {
        ...verificationEmail,
        resendInMinutes: 5,
    } satisfies INotificationForgotPasswordEncryptedPayload;
    const verifiedMobileNumber = {
        reference: 'reference',
        resendInMinutes: 5,
        mobileNumber: '+390000000000',
    } satisfies INotificationVerifiedMobileNumberPayload;
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
    const publishTermPolicy = {
        type: EnumTermPolicyType.privacy,
        version: 1,
    } satisfies INotificationPublishTermPolicyPayload;
    const workspaceInvite = {
        workspaceId: 'workspace-id',
        workspaceName: 'Workspace',
        inviterName: 'Inviter',
        workspaceRoleName: 'Member',
        encryptedInviteAcceptLink: 'encrypted-link',
        reference: 'reference',
        expiredAt: '2026-01-02T00:00:00.000Z',
    } satisfies INotificationWorkspaceInviteEncryptedPayload;
    const workspaceJoinRequest = {
        workspaceId: 'workspace-id',
        workspaceName: 'Workspace',
        requesterName: 'Requester',
        encryptedJoinRequestReviewLink: 'encrypted-link',
    } satisfies INotificationWorkspaceJoinRequestEncryptedPayload;
    const workspaceJoinAccepted = {
        workspaceId: 'workspace-id',
        workspaceName: 'Workspace',
    } satisfies INotificationWorkspaceJoinAcceptedPayload;
    const workspaceJoinRejected = {
        ...workspaceJoinAccepted,
        rejectReasonCode: EnumWorkspaceJoinRejectReason.other,
    } satisfies INotificationWorkspaceJoinRejectedPayload;
    let service: NotificationEmailProcessorService;
    const cases = [
        {
            title: 'delegates welcome email payloads',
            handler: notificationEmailAccountDomain.processWelcome,
            expected: [send],
            run: () =>
                service.processWelcome(
                    createQueueJob(EnumNotificationProcess.welcome, { send })
                ),
        },
        {
            title: 'delegates social welcome email payloads',
            handler: notificationEmailAccountDomain.processWelcomeSocial,
            expected: [send],
            run: () =>
                service.processWelcomeSocial(
                    createQueueJob(EnumNotificationProcess.welcomeSocial, {
                        send,
                    })
                ),
        },
        {
            title: 'delegates welcome-by-admin email payloads',
            handler: notificationEmailAccountDomain.processWelcomeByAdmin,
            expected: [send, welcomeByAdmin],
            run: () =>
                service.processWelcomeByAdmin(
                    createQueueJob(EnumNotificationProcess.welcomeByAdmin, {
                        send,
                        data: welcomeByAdmin,
                    })
                ),
        },
        {
            title: 'delegates temporary-password email payloads',
            handler:
                notificationEmailSecurityDomain.processTemporaryPasswordByAdmin,
            expected: [send, temporaryPassword],
            run: () =>
                service.processTemporaryPasswordByAdmin(
                    createQueueJob(
                        EnumNotificationProcess.temporaryPasswordByAdmin,
                        { send, data: temporaryPassword }
                    )
                ),
        },
        {
            title: 'delegates change-password email payloads',
            handler: notificationEmailSecurityDomain.processChangePassword,
            expected: [send],
            run: () =>
                service.processChangePassword(
                    createQueueJob(EnumNotificationProcess.changePassword, {
                        send,
                    })
                ),
        },
        {
            title: 'delegates reset-password email payloads',
            handler: notificationEmailSecurityDomain.processResetPassword,
            expected: [send],
            run: () =>
                service.processResetPassword(
                    createQueueJob(EnumNotificationProcess.resetPassword, {
                        send,
                    })
                ),
        },
        {
            title: 'delegates verification-email payloads',
            handler: notificationEmailAccountDomain.processVerificationEmail,
            expected: [send, verificationEmail],
            run: () =>
                service.processVerificationEmail(
                    createQueueJob(EnumNotificationProcess.verificationEmail, {
                        send,
                        data: verificationEmail,
                    })
                ),
        },
        {
            title: 'delegates verified-email payloads',
            handler: notificationEmailAccountDomain.processVerifiedEmail,
            expected: [send, verifiedEmail],
            run: () =>
                service.processVerifiedEmail(
                    createQueueJob(EnumNotificationProcess.verifiedEmail, {
                        send,
                        data: verifiedEmail,
                    })
                ),
        },
        {
            title: 'delegates forgot-password email payloads',
            handler: notificationEmailSecurityDomain.processForgotPassword,
            expected: [send, forgotPassword],
            run: () =>
                service.processForgotPassword(
                    createQueueJob(EnumNotificationProcess.forgotPassword, {
                        send,
                        data: forgotPassword,
                    })
                ),
        },
        {
            title: 'delegates verified-mobile-number email payloads',
            handler: notificationEmailAccountDomain.processVerifiedMobileNumber,
            expected: [send, verifiedMobileNumber],
            run: () =>
                service.processVerifiedMobileNumber(
                    createQueueJob(
                        EnumNotificationProcess.verifiedMobileNumber,
                        { send, data: verifiedMobileNumber }
                    )
                ),
        },
        {
            title: 'delegates two-factor reset email payloads',
            handler:
                notificationEmailSecurityDomain.processResetTwoFactorByAdmin,
            expected: [send],
            run: () =>
                service.processResetTwoFactorByAdmin(
                    createQueueJob(
                        EnumNotificationProcess.resetTwoFactorByAdmin,
                        { send }
                    )
                ),
        },
        {
            title: 'delegates new-device-login email payloads',
            handler: notificationEmailSecurityDomain.processNewDeviceLogin,
            expected: [send, newDeviceLogin],
            run: () =>
                service.processNewDeviceLogin(
                    createQueueJob(EnumNotificationProcess.newDeviceLogin, {
                        send,
                        data: newDeviceLogin,
                    })
                ),
        },
        {
            title: 'delegates term-policy publication email payloads',
            handler: notificationEmailTermPolicyDomain.processPublishTermPolicy,
            expected: [publishTermPolicy],
            run: () =>
                service.processPublishTermPolicy(
                    createQueueJob(EnumNotificationProcess.publishTermPolicy, {
                        send: [send],
                        data: publishTermPolicy,
                    })
                ),
        },
        {
            title: 'delegates workspace-invite email payloads',
            handler: notificationEmailWorkspaceDomain.processWorkspaceInvite,
            expected: [send, workspaceInvite],
            run: () =>
                service.processWorkspaceInvite(
                    createQueueJob(EnumNotificationProcess.workspaceInvite, {
                        send,
                        data: workspaceInvite,
                    })
                ),
        },
        {
            title: 'delegates unregistered workspace-invite email payloads',
            handler:
                notificationEmailWorkspaceDomain.processWorkspaceInviteUnregistered,
            expected: [unregisteredSend, workspaceInvite],
            run: () =>
                service.processWorkspaceInviteUnregistered(
                    createQueueJob(
                        EnumNotificationProcess.workspaceInviteUnregistered,
                        { send: unregisteredSend, data: workspaceInvite }
                    )
                ),
        },
        {
            title: 'delegates workspace-join-request email payloads',
            handler:
                notificationEmailWorkspaceDomain.processWorkspaceJoinRequest,
            expected: [send, workspaceJoinRequest],
            run: () =>
                service.processWorkspaceJoinRequest(
                    createQueueJob(
                        EnumNotificationProcess.workspaceJoinRequest,
                        { send, data: workspaceJoinRequest }
                    )
                ),
        },
        {
            title: 'delegates workspace-join-accepted email payloads',
            handler:
                notificationEmailWorkspaceDomain.processWorkspaceJoinAccepted,
            expected: [send, workspaceJoinAccepted],
            run: () =>
                service.processWorkspaceJoinAccepted(
                    createQueueJob(
                        EnumNotificationProcess.workspaceJoinAccepted,
                        { send, data: workspaceJoinAccepted }
                    )
                ),
        },
        {
            title: 'delegates workspace-join-rejected email payloads',
            handler:
                notificationEmailWorkspaceDomain.processWorkspaceJoinRejected,
            expected: [send, workspaceJoinRejected],
            run: () =>
                service.processWorkspaceJoinRejected(
                    createQueueJob(
                        EnumNotificationProcess.workspaceJoinRejected,
                        { send, data: workspaceJoinRejected }
                    )
                ),
        },
    ];

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationEmailProcessorService,
                {
                    provide: NotificationEmailAccountDomain,
                    useValue: notificationEmailAccountDomain,
                },
                {
                    provide: NotificationEmailSecurityDomain,
                    useValue: notificationEmailSecurityDomain,
                },
                {
                    provide: NotificationEmailTermPolicyDomain,
                    useValue: notificationEmailTermPolicyDomain,
                },
                {
                    provide: NotificationEmailWorkspaceDomain,
                    useValue: notificationEmailWorkspaceDomain,
                },
            ],
        }).compile();

        service = moduleRef.get(NotificationEmailProcessorService);
    });

    it.each(cases)('$title', async ({ handler, expected, run }) => {
        handler.mockResolvedValue(response);

        await expect(run()).resolves.toBe(response);
        expect(handler).toHaveBeenCalledWith(...expected);
    });
});
