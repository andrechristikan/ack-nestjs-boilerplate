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
import { NotificationAccountDomain } from '@modules/notification/domains/notification.account.domain';
import { NotificationSecurityDomain } from '@modules/notification/domains/notification.security.domain';
import { NotificationTermPolicyDomain } from '@modules/notification/domains/notification.term-policy.domain';
import { NotificationWorkspaceDomain } from '@modules/notification/domains/notification.workspace.domain';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationAcceptTermPolicyPayload,
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
import { NotificationProcessorService } from '@modules/notification/services/notification.processor.service';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { createQueueJob } from '@test/support/queue-job.mock';

describe('NotificationProcessorService', () => {
    const notificationAccountDomain: MockProxy<NotificationAccountDomain> =
        mock<NotificationAccountDomain>();
    const notificationSecurityDomain: MockProxy<NotificationSecurityDomain> =
        mock<NotificationSecurityDomain>();
    const notificationTermPolicyDomain: MockProxy<NotificationTermPolicyDomain> =
        mock<NotificationTermPolicyDomain>();
    const notificationWorkspaceDomain: MockProxy<NotificationWorkspaceDomain> =
        mock<NotificationWorkspaceDomain>();
    const response: IQueueResponse = { message: 'processed' };
    const userId = 'user-id';
    const proceedBy = 'actor-id';
    const welcomeByAdmin = {
        encryptedPassword: 'encrypted-password',
        passwordExpiredAt: '2026-01-02T00:00:00.000Z',
        passwordCreatedAt: '2026-01-01T00:00:00.000Z',
    } satisfies INotificationWelcomeByAdminEncryptedPayload;
    const verificationEmail = {
        encryptedLink: 'encrypted-link',
        expiredAt: '2026-01-02T00:00:00.000Z',
        expiredInMinutes: 60,
        reference: 'reference',
    } satisfies INotificationVerificationEmailEncryptedPayload;
    const verifiedEmail = {
        reference: 'reference',
    } satisfies INotificationVerifiedEmailPayload;
    const verifiedMobileNumber = {
        reference: 'reference',
        resendInMinutes: 5,
        mobileNumber: '+390000000000',
    } satisfies INotificationVerifiedMobileNumberPayload;
    const temporaryPassword = {
        encryptedPassword: 'encrypted-password',
        passwordExpiredAt: '2026-01-02T00:00:00.000Z',
        passwordCreatedAt: '2026-01-01T00:00:00.000Z',
    } satisfies INotificationTemporaryPasswordEncryptedPayload;
    const forgotPassword = {
        ...verificationEmail,
        resendInMinutes: 5,
    } satisfies INotificationForgotPasswordEncryptedPayload;
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
    const acceptTermPolicy = {
        ...publishTermPolicy,
        termPolicyId: 'term-policy-id',
    } satisfies INotificationAcceptTermPolicyPayload;
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
    let service: NotificationProcessorService;
    const cases = [
        {
            title: 'delegates welcome-by-admin payloads',
            handler: notificationAccountDomain.processWelcomeByAdmin,
            expected: [userId, proceedBy, welcomeByAdmin],
            run: () =>
                service.processWelcomeByAdmin(
                    createQueueJob(EnumNotificationProcess.welcomeByAdmin, {
                        userId,
                        proceedBy,
                        data: welcomeByAdmin,
                    })
                ),
        },
        {
            title: 'delegates welcome payloads',
            handler: notificationAccountDomain.processWelcome,
            expected: [userId, verificationEmail],
            run: () =>
                service.processWelcome(
                    createQueueJob(EnumNotificationProcess.welcome, {
                        userId,
                        proceedBy,
                        data: verificationEmail,
                    })
                ),
        },
        {
            title: 'delegates social welcome payloads',
            handler: notificationAccountDomain.processWelcomeSocial,
            expected: [userId],
            run: () =>
                service.processWelcomeSocial(
                    createQueueJob(EnumNotificationProcess.welcomeSocial, {
                        userId,
                        proceedBy,
                    })
                ),
        },
        {
            title: 'delegates verified-email payloads',
            handler: notificationAccountDomain.processVerifiedEmail,
            expected: [userId, verifiedEmail],
            run: () =>
                service.processVerifiedEmail(
                    createQueueJob(EnumNotificationProcess.verifiedEmail, {
                        userId,
                        proceedBy,
                        data: verifiedEmail,
                    })
                ),
        },
        {
            title: 'delegates verification-email payloads',
            handler: notificationAccountDomain.processVerificationEmail,
            expected: [userId, verificationEmail],
            run: () =>
                service.processVerificationEmail(
                    createQueueJob(EnumNotificationProcess.verificationEmail, {
                        userId,
                        proceedBy,
                        data: verificationEmail,
                    })
                ),
        },
        {
            title: 'delegates verified-mobile-number payloads',
            handler: notificationAccountDomain.processVerifiedMobileNumber,
            expected: [userId, verifiedMobileNumber],
            run: () =>
                service.processVerifiedMobileNumber(
                    createQueueJob(
                        EnumNotificationProcess.verifiedMobileNumber,
                        {
                            userId,
                            proceedBy,
                            data: verifiedMobileNumber,
                        }
                    )
                ),
        },
        {
            title: 'delegates temporary-password payloads',
            handler: notificationSecurityDomain.processTemporaryPasswordByAdmin,
            expected: [userId, proceedBy, temporaryPassword],
            run: () =>
                service.processTemporaryPasswordByAdmin(
                    createQueueJob(
                        EnumNotificationProcess.temporaryPasswordByAdmin,
                        { userId, proceedBy, data: temporaryPassword }
                    )
                ),
        },
        {
            title: 'delegates change-password payloads',
            handler: notificationSecurityDomain.processChangePassword,
            expected: [userId],
            run: () =>
                service.processChangePassword(
                    createQueueJob(EnumNotificationProcess.changePassword, {
                        userId,
                        proceedBy,
                    })
                ),
        },
        {
            title: 'delegates forgot-password payloads',
            handler: notificationSecurityDomain.processForgotPassword,
            expected: [userId, forgotPassword],
            run: () =>
                service.processForgotPassword(
                    createQueueJob(EnumNotificationProcess.forgotPassword, {
                        userId,
                        proceedBy,
                        data: forgotPassword,
                    })
                ),
        },
        {
            title: 'delegates reset-password payloads',
            handler: notificationSecurityDomain.processResetPassword,
            expected: [userId],
            run: () =>
                service.processResetPassword(
                    createQueueJob(EnumNotificationProcess.resetPassword, {
                        userId,
                        proceedBy,
                    })
                ),
        },
        {
            title: 'delegates two-factor reset payloads',
            handler: notificationSecurityDomain.processResetTwoFactorByAdmin,
            expected: [userId, proceedBy],
            run: () =>
                service.processResetTwoFactorByAdmin(
                    createQueueJob(
                        EnumNotificationProcess.resetTwoFactorByAdmin,
                        { userId, proceedBy }
                    )
                ),
        },
        {
            title: 'delegates new-device-login payloads',
            handler: notificationSecurityDomain.processNewDeviceLogin,
            expected: [userId, newDeviceLogin],
            run: () =>
                service.processNewDeviceLogin(
                    createQueueJob(EnumNotificationProcess.newDeviceLogin, {
                        userId,
                        proceedBy,
                        data: newDeviceLogin,
                    })
                ),
        },
        {
            title: 'delegates term-policy publication payloads',
            handler: notificationTermPolicyDomain.processPublishTermPolicy,
            expected: [proceedBy, publishTermPolicy],
            run: () =>
                service.processPublishTermPolicy(
                    createQueueJob(EnumNotificationProcess.publishTermPolicy, {
                        proceedBy,
                        data: publishTermPolicy,
                    })
                ),
        },
        {
            title: 'delegates term-policy acceptance payloads',
            handler: notificationTermPolicyDomain.processUserAcceptTermPolicy,
            expected: [userId, acceptTermPolicy],
            run: () =>
                service.processUserAcceptTermPolicy(
                    createQueueJob(
                        EnumNotificationProcess.userAcceptTermPolicy,
                        { userId, proceedBy, data: acceptTermPolicy }
                    )
                ),
        },
        {
            title: 'delegates workspace-invite payloads',
            handler: notificationWorkspaceDomain.processWorkspaceInvite,
            expected: [userId, proceedBy, workspaceInvite],
            run: () =>
                service.processWorkspaceInvite(
                    createQueueJob(EnumNotificationProcess.workspaceInvite, {
                        userId,
                        proceedBy,
                        data: workspaceInvite,
                    })
                ),
        },
        {
            title: 'delegates workspace-join-request payloads',
            handler: notificationWorkspaceDomain.processWorkspaceJoinRequest,
            expected: [userId, proceedBy, workspaceJoinRequest],
            run: () =>
                service.processWorkspaceJoinRequest(
                    createQueueJob(
                        EnumNotificationProcess.workspaceJoinRequest,
                        { userId, proceedBy, data: workspaceJoinRequest }
                    )
                ),
        },
        {
            title: 'delegates workspace-join-accepted payloads',
            handler: notificationWorkspaceDomain.processWorkspaceJoinAccepted,
            expected: [userId, proceedBy, workspaceJoinAccepted],
            run: () =>
                service.processWorkspaceJoinAccepted(
                    createQueueJob(
                        EnumNotificationProcess.workspaceJoinAccepted,
                        { userId, proceedBy, data: workspaceJoinAccepted }
                    )
                ),
        },
        {
            title: 'delegates workspace-join-rejected payloads',
            handler: notificationWorkspaceDomain.processWorkspaceJoinRejected,
            expected: [userId, proceedBy, workspaceJoinRejected],
            run: () =>
                service.processWorkspaceJoinRejected(
                    createQueueJob(
                        EnumNotificationProcess.workspaceJoinRejected,
                        { userId, proceedBy, data: workspaceJoinRejected }
                    )
                ),
        },
    ];

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationProcessorService,
                {
                    provide: NotificationAccountDomain,
                    useValue: notificationAccountDomain,
                },
                {
                    provide: NotificationSecurityDomain,
                    useValue: notificationSecurityDomain,
                },
                {
                    provide: NotificationTermPolicyDomain,
                    useValue: notificationTermPolicyDomain,
                },
                {
                    provide: NotificationWorkspaceDomain,
                    useValue: notificationWorkspaceDomain,
                },
            ],
        }).compile();

        service = moduleRef.get(NotificationProcessorService);
    });

    it.each(cases)('$title', async ({ handler, expected, run }) => {
        handler.mockResolvedValue(response);

        await expect(run()).resolves.toBe(response);
        expect(handler).toHaveBeenCalledWith(...expected);
    });
});
