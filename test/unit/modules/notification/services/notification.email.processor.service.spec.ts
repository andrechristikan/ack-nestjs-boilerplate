import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    EnumTermPolicyType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import { NotificationEmailAccountDomain } from '@modules/notification/domains/notification.email.account.domain';
import { NotificationEmailSecurityDomain } from '@modules/notification/domains/notification.email.security.domain';
import { NotificationEmailTermPolicyDomain } from '@modules/notification/domains/notification.email.term-policy.domain';
import { NotificationEmailWorkspaceDomain } from '@modules/notification/domains/notification.email.workspace.domain';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailBulkQueuePayload,
    INotificationEmailPublishTermPolicyResult,
    INotificationEmailQueuePayload,
    INotificationEmailResult,
    INotificationEmailUnregisteredQueuePayload,
    INotificationNewDeviceLoginPayload,
    INotificationPublishTermPolicyPayload,
    INotificationTermPolicyBatchRecipientEncryptedPayload,
    INotificationWorkspaceInviteEncryptedPayload,
    INotificationWorkspaceInviteUnregisteredEncryptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailProcessorService } from '@modules/notification/services/notification.email.processor.service';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { buildQueueJob } from '@test/unit/helpers/test.unit.queue.helper';
import { MessageService } from '@common/message/services/message.service';

describe('NotificationEmailProcessorService', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const notificationEmailAccountDomain: MockProxy<NotificationEmailAccountDomain> =
        mock<NotificationEmailAccountDomain>();
    const notificationEmailSecurityDomain: MockProxy<NotificationEmailSecurityDomain> =
        mock<NotificationEmailSecurityDomain>();
    const notificationEmailTermPolicyDomain: MockProxy<NotificationEmailTermPolicyDomain> =
        mock<NotificationEmailTermPolicyDomain>();
    const notificationEmailWorkspaceDomain: MockProxy<NotificationEmailWorkspaceDomain> =
        mock<NotificationEmailWorkspaceDomain>();
    let service: NotificationEmailProcessorService;

    const send = {
        userId: 'user-id',
        notificationId: 'notification-id',
        encryptedEmail: 'cipher(nadia@example.com)',
        username: 'nadia',
        cc: [],
        bcc: [],
    };
    const response: INotificationEmailResult = {
        message: 'processed',
        result: { $metadata: {}, MessageId: 'message-id' },
    };
    const publishResponse: INotificationEmailPublishTermPolicyResult = {
        message: 'processed',
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);
        const module = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
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
        service = module.get(NotificationEmailProcessorService);
    });

    describe('processWelcome', () => {
        it('forwards send to the account domain', async () => {
            notificationEmailAccountDomain.processWelcome.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationEmailQueuePayload,
                IQueueResponse,
                EnumNotificationProcess
            >({ send, data: null });

            const result = await service.processWelcome(job);

            expect(
                notificationEmailAccountDomain.processWelcome
            ).toHaveBeenCalledWith(send);
            expect(result).toBe(response);
        });
    });

    describe('processWelcomeSocial', () => {
        it('forwards send to the account domain', async () => {
            notificationEmailAccountDomain.processWelcomeSocial.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationEmailQueuePayload,
                IQueueResponse,
                EnumNotificationProcess
            >({ send, data: null });

            const result = await service.processWelcomeSocial(job);

            expect(
                notificationEmailAccountDomain.processWelcomeSocial
            ).toHaveBeenCalledWith(send);
            expect(result).toBe(response);
        });
    });

    describe('processWelcomeByAdmin', () => {
        it('forwards send and data to the account domain', async () => {
            const data = {
                encryptedPassword: 'cipher',
                passwordExpiredAt: '2024-02-01T00:00:00.000Z',
                passwordCreatedAt: '2024-01-01T00:00:00.000Z',
            };
            notificationEmailAccountDomain.processWelcomeByAdmin.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationEmailQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationProcess
            >({ send, data });

            const result = await service.processWelcomeByAdmin(job);

            expect(
                notificationEmailAccountDomain.processWelcomeByAdmin
            ).toHaveBeenCalledWith(send, data);
            expect(result).toBe(response);
        });
    });

    describe('processTemporaryPasswordByAdmin', () => {
        it('forwards send and data to the security domain', async () => {
            const data = {
                encryptedPassword: 'cipher',
                passwordExpiredAt: '2024-02-01T00:00:00.000Z',
                passwordCreatedAt: '2024-01-01T00:00:00.000Z',
            };
            notificationEmailSecurityDomain.processTemporaryPasswordByAdmin.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationEmailQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationProcess
            >({ send, data });

            const result = await service.processTemporaryPasswordByAdmin(job);

            expect(
                notificationEmailSecurityDomain.processTemporaryPasswordByAdmin
            ).toHaveBeenCalledWith(send, data);
            expect(result).toBe(response);
        });
    });

    describe('processChangePassword', () => {
        it('forwards send to the security domain', async () => {
            notificationEmailSecurityDomain.processChangePassword.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationEmailQueuePayload,
                IQueueResponse,
                EnumNotificationProcess
            >({ send, data: null });

            const result = await service.processChangePassword(job);

            expect(
                notificationEmailSecurityDomain.processChangePassword
            ).toHaveBeenCalledWith(send);
            expect(result).toBe(response);
        });
    });

    describe('processResetPassword', () => {
        it('forwards send to the security domain', async () => {
            notificationEmailSecurityDomain.processResetPassword.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationEmailQueuePayload,
                IQueueResponse,
                EnumNotificationProcess
            >({ send, data: null });

            const result = await service.processResetPassword(job);

            expect(
                notificationEmailSecurityDomain.processResetPassword
            ).toHaveBeenCalledWith(send);
            expect(result).toBe(response);
        });
    });

    describe('processVerificationEmail', () => {
        it('forwards send and data to the account domain', async () => {
            const data = {
                expiredAt: '2024-02-01T00:00:00.000Z',
                expiredInMinutes: 30,
                encryptedLink: 'cipher-link',
                reference: 'ref-1',
            };
            notificationEmailAccountDomain.processVerificationEmail.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationEmailQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationProcess
            >({ send, data });

            const result = await service.processVerificationEmail(job);

            expect(
                notificationEmailAccountDomain.processVerificationEmail
            ).toHaveBeenCalledWith(send, data);
            expect(result).toBe(response);
        });
    });

    describe('processVerifiedEmail', () => {
        it('forwards send and data to the account domain', async () => {
            const data = { reference: 'ref-1' };
            notificationEmailAccountDomain.processVerifiedEmail.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationEmailQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationProcess
            >({ send, data });

            const result = await service.processVerifiedEmail(job);

            expect(
                notificationEmailAccountDomain.processVerifiedEmail
            ).toHaveBeenCalledWith(send, data);
            expect(result).toBe(response);
        });
    });

    describe('processForgotPassword', () => {
        it('forwards send and data to the security domain', async () => {
            const data = {
                expiredAt: '2024-02-01T00:00:00.000Z',
                encryptedLink: 'cipher-link',
                reference: 'ref-1',
                expiredInMinutes: 15,
                resendInMinutes: 5,
            };
            notificationEmailSecurityDomain.processForgotPassword.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationEmailQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationProcess
            >({ send, data });

            const result = await service.processForgotPassword(job);

            expect(
                notificationEmailSecurityDomain.processForgotPassword
            ).toHaveBeenCalledWith(send, data);
            expect(result).toBe(response);
        });
    });

    describe('processVerifiedMobileNumber', () => {
        it('forwards send and data to the account domain', async () => {
            const data = {
                reference: 'ref-1',
                resendInMinutes: 5,
                mobileNumber: '+15551234567',
            };
            notificationEmailAccountDomain.processVerifiedMobileNumber.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationEmailQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationProcess
            >({ send, data });

            const result = await service.processVerifiedMobileNumber(job);

            expect(
                notificationEmailAccountDomain.processVerifiedMobileNumber
            ).toHaveBeenCalledWith(send, data);
            expect(result).toBe(response);
        });
    });

    describe('processResetTwoFactorByAdmin', () => {
        it('forwards send to the security domain', async () => {
            notificationEmailSecurityDomain.processResetTwoFactorByAdmin.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationEmailQueuePayload,
                IQueueResponse,
                EnumNotificationProcess
            >({ send, data: null });

            const result = await service.processResetTwoFactorByAdmin(job);

            expect(
                notificationEmailSecurityDomain.processResetTwoFactorByAdmin
            ).toHaveBeenCalledWith(send);
            expect(result).toBe(response);
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
            notificationEmailSecurityDomain.processNewDeviceLogin.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationEmailQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationProcess
            >({ send, data });

            const result = await service.processNewDeviceLogin(job);

            expect(
                notificationEmailSecurityDomain.processNewDeviceLogin
            ).toHaveBeenCalledWith(send, data);
            expect(result).toBe(response);
        });
    });

    describe('processPublishTermPolicy', () => {
        it('forwards data, batchId, proceedBy and recipients to the term-policy domain', async () => {
            const data: INotificationPublishTermPolicyPayload = {
                termPolicyId: 'term-policy-id',
                type: EnumTermPolicyType.privacy,
                version: 2,
                recipientCutoffAt: '2024-01-01T00:00:00.000Z',
                resendNonce: null,
            };
            const recipients: INotificationTermPolicyBatchRecipientEncryptedPayload[] =
                [
                    {
                        userId: 'user-1',
                        notificationId: 'notification-1',
                        encryptedEmail: 'cipher(nadia@example.com)',
                        username: 'nadia',
                    },
                ];
            notificationEmailTermPolicyDomain.processPublishTermPolicy.mockResolvedValue(
                publishResponse
            );
            const job = buildQueueJob<
                INotificationEmailBulkQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationProcess
            >({ data, batchId: 'batch-id', proceedBy: 'admin-id', recipients });

            const result = await service.processPublishTermPolicy(job);

            expect(
                notificationEmailTermPolicyDomain.processPublishTermPolicy
            ).toHaveBeenCalledWith(data, 'batch-id', 'admin-id', recipients);
            expect(result).toBe(publishResponse);
        });
    });

    describe('processWorkspaceInvite', () => {
        it('forwards send and data to the workspace domain', async () => {
            const data: INotificationWorkspaceInviteEncryptedPayload = {
                workspaceId: 'workspace-id',
                workspaceName: 'Acme',
                inviterName: 'Omar',
                workspaceMemberRole: EnumWorkspaceMemberRole.member,
                encryptedInviteAcceptLink: 'cipher-link',
                reference: 'ref-1',
                expiredAt: '2024-02-01T00:00:00.000Z',
            };
            notificationEmailWorkspaceDomain.processWorkspaceInvite.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationEmailQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationProcess
            >({ send, data });

            const result = await service.processWorkspaceInvite(job);

            expect(
                notificationEmailWorkspaceDomain.processWorkspaceInvite
            ).toHaveBeenCalledWith(send, data);
            expect(result).toBe(response);
        });
    });

    describe('processWorkspaceInviteUnregistered', () => {
        it('forwards send and data to the workspace domain', async () => {
            const unregisteredSend = {
                encryptedEmail: 'cipher-email',
                cc: [],
                bcc: [],
            };
            const data: INotificationWorkspaceInviteUnregisteredEncryptedPayload =
                {
                    workspaceId: 'workspace-id',
                    workspaceName: 'Acme',
                    inviterName: 'Omar',
                    workspaceMemberRole: EnumWorkspaceMemberRole.member,
                    encryptedInviteAcceptLink: 'cipher-link',
                    reference: 'ref-1',
                    expiredAt: '2024-02-01T00:00:00.000Z',
                };
            notificationEmailWorkspaceDomain.processWorkspaceInviteUnregistered.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationEmailUnregisteredQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationProcess
            >({ send: unregisteredSend, data });

            const result =
                await service.processWorkspaceInviteUnregistered(job);

            expect(
                notificationEmailWorkspaceDomain.processWorkspaceInviteUnregistered
            ).toHaveBeenCalledWith(unregisteredSend, data);
            expect(result).toBe(response);
        });
    });

    describe('processWorkspaceJoinRequest', () => {
        it('forwards send and data to the workspace domain', async () => {
            const data = {
                workspaceId: 'workspace-id',
                workspaceName: 'Acme',
                requesterName: 'Omar',
                joinRequestId: 'join-request-id',
                encryptedJoinRequestReviewLink: 'cipher-review-link',
            };
            notificationEmailWorkspaceDomain.processWorkspaceJoinRequest.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationEmailQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationProcess
            >({ send, data });

            const result = await service.processWorkspaceJoinRequest(job);

            expect(
                notificationEmailWorkspaceDomain.processWorkspaceJoinRequest
            ).toHaveBeenCalledWith(send, data);
            expect(result).toBe(response);
        });
    });

    describe('processWorkspaceJoinAccepted', () => {
        it('forwards send and data to the workspace domain', async () => {
            const data = { workspaceId: 'workspace-id', workspaceName: 'Acme' };
            notificationEmailWorkspaceDomain.processWorkspaceJoinAccepted.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationEmailQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationProcess
            >({ send, data });

            const result = await service.processWorkspaceJoinAccepted(job);

            expect(
                notificationEmailWorkspaceDomain.processWorkspaceJoinAccepted
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
            notificationEmailWorkspaceDomain.processWorkspaceJoinRejected.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationEmailQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationProcess
            >({ send, data });

            const result = await service.processWorkspaceJoinRejected(job);

            expect(
                notificationEmailWorkspaceDomain.processWorkspaceJoinRejected
            ).toHaveBeenCalledWith(send, data);
            expect(result).toBe(response);
        });
    });

    describe('processUnknown', () => {
        it('throws a fatal QueueException naming the unknown process', () => {
            expect(() => service.processUnknown('unknownProcess')).toThrow(
                expect.objectContaining({
                    message: 'notification.queue.email.error.unknownProcess',
                    isFatal: true,
                })
            );
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.queue.email.error.unknownProcess',
                { properties: { process: 'unknownProcess' } }
            );
        });
    });
});
