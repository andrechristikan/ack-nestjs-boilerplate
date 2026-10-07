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
import { NotificationAccountDomain } from '@modules/notification/domains/notification.account.domain';
import { NotificationSecurityDomain } from '@modules/notification/domains/notification.security.domain';
import { NotificationTermPolicyDomain } from '@modules/notification/domains/notification.term-policy.domain';
import { NotificationWorkspaceDomain } from '@modules/notification/domains/notification.workspace.domain';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationAcceptTermPolicyPayload,
    INotificationBulkQueuePayload,
    INotificationNewDeviceLoginPayload,
    INotificationQueuePayload,
    INotificationWorkspaceInviteEncryptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationProcessorService } from '@modules/notification/services/notification.processor.service';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { buildQueueJob } from '@test/unit/helpers/test.unit.queue.helper';

describe('NotificationProcessorService', () => {
    const notificationAccountDomain: MockProxy<NotificationAccountDomain> =
        mock<NotificationAccountDomain>();
    const notificationSecurityDomain: MockProxy<NotificationSecurityDomain> =
        mock<NotificationSecurityDomain>();
    const notificationTermPolicyDomain: MockProxy<NotificationTermPolicyDomain> =
        mock<NotificationTermPolicyDomain>();
    const notificationWorkspaceDomain: MockProxy<NotificationWorkspaceDomain> =
        mock<NotificationWorkspaceDomain>();
    let service: NotificationProcessorService;

    const response: IQueueResponse = { message: 'processed' };

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
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
        service = module.get(NotificationProcessorService);
    });

    describe('processWelcomeByAdmin', () => {
        it('forwards userId, proceedBy, and data to the account domain', async () => {
            const data = {
                encryptedPassword: 'cipher',
                passwordExpiredAt: '2024-02-01T00:00:00.000Z',
                passwordCreatedAt: '2024-01-01T00:00:00.000Z',
            };
            notificationAccountDomain.processWelcomeByAdmin.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >({
                userId: 'user-id',
                proceedBy: 'admin-id',
                data,
            });

            const result = await service.processWelcomeByAdmin(job);

            expect(
                notificationAccountDomain.processWelcomeByAdmin
            ).toHaveBeenCalledWith('user-id', 'admin-id', data);
            expect(result).toBe(response);
        });
    });

    describe('processWelcome', () => {
        it('forwards userId and data to the account domain', async () => {
            const data = {
                expiredAt: '2024-02-01T00:00:00.000Z',
                expiredInMinutes: 30,
                encryptedLink: 'cipher-link',
                reference: 'ref-1',
            };
            notificationAccountDomain.processWelcome.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >({
                userId: 'user-id',
                proceedBy: 'user-id',
                data,
            });

            const result = await service.processWelcome(job);

            expect(
                notificationAccountDomain.processWelcome
            ).toHaveBeenCalledWith('user-id', data);
            expect(result).toBe(response);
        });
    });

    describe('processWelcomeSocial', () => {
        it('forwards userId to the account domain', async () => {
            notificationAccountDomain.processWelcomeSocial.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationQueuePayload,
                unknown,
                EnumNotificationProcess
            >({
                userId: 'user-id',
                proceedBy: 'user-id',
                data: null,
            });

            const result = await service.processWelcomeSocial(job);

            expect(
                notificationAccountDomain.processWelcomeSocial
            ).toHaveBeenCalledWith('user-id');
            expect(result).toBe(response);
        });
    });

    describe('processVerifiedEmail', () => {
        it('forwards userId and data to the account domain', async () => {
            const data = { reference: 'ref-1' };
            notificationAccountDomain.processVerifiedEmail.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >({
                userId: 'user-id',
                proceedBy: 'user-id',
                data,
            });

            const result = await service.processVerifiedEmail(job);

            expect(
                notificationAccountDomain.processVerifiedEmail
            ).toHaveBeenCalledWith('user-id', data);
            expect(result).toBe(response);
        });
    });

    describe('processVerificationEmail', () => {
        it('forwards userId and data to the account domain', async () => {
            const data = {
                expiredAt: '2024-02-01T00:00:00.000Z',
                expiredInMinutes: 30,
                encryptedLink: 'cipher-link',
                reference: 'ref-1',
            };
            notificationAccountDomain.processVerificationEmail.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >({
                userId: 'user-id',
                proceedBy: 'user-id',
                data,
            });

            const result = await service.processVerificationEmail(job);

            expect(
                notificationAccountDomain.processVerificationEmail
            ).toHaveBeenCalledWith('user-id', data);
            expect(result).toBe(response);
        });
    });

    describe('processVerifiedMobileNumber', () => {
        it('forwards userId and data to the account domain', async () => {
            const data = {
                reference: 'ref-1',
                resendInMinutes: 5,
                mobileNumber: '+15551234567',
            };
            notificationAccountDomain.processVerifiedMobileNumber.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >({
                userId: 'user-id',
                proceedBy: 'user-id',
                data,
            });

            const result = await service.processVerifiedMobileNumber(job);

            expect(
                notificationAccountDomain.processVerifiedMobileNumber
            ).toHaveBeenCalledWith('user-id', data);
            expect(result).toBe(response);
        });
    });

    describe('processTemporaryPasswordByAdmin', () => {
        it('forwards userId, proceedBy, and data to the security domain', async () => {
            const data = {
                encryptedPassword: 'cipher',
                passwordExpiredAt: '2024-02-01T00:00:00.000Z',
                passwordCreatedAt: '2024-01-01T00:00:00.000Z',
            };
            notificationSecurityDomain.processTemporaryPasswordByAdmin.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >({
                userId: 'user-id',
                proceedBy: 'admin-id',
                data,
            });

            const result = await service.processTemporaryPasswordByAdmin(job);

            expect(
                notificationSecurityDomain.processTemporaryPasswordByAdmin
            ).toHaveBeenCalledWith('user-id', 'admin-id', data);
            expect(result).toBe(response);
        });
    });

    describe('processChangePassword', () => {
        it('forwards userId to the security domain', async () => {
            notificationSecurityDomain.processChangePassword.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationQueuePayload,
                unknown,
                EnumNotificationProcess
            >({
                userId: 'user-id',
                proceedBy: 'user-id',
                data: null,
            });

            const result = await service.processChangePassword(job);

            expect(
                notificationSecurityDomain.processChangePassword
            ).toHaveBeenCalledWith('user-id');
            expect(result).toBe(response);
        });
    });

    describe('processForgotPassword', () => {
        it('forwards userId and data to the security domain', async () => {
            const data = {
                expiredAt: '2024-02-01T00:00:00.000Z',
                encryptedLink: 'cipher-link',
                reference: 'ref-1',
                expiredInMinutes: 15,
                resendInMinutes: 5,
            };
            notificationSecurityDomain.processForgotPassword.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >({
                userId: 'user-id',
                proceedBy: 'user-id',
                data,
            });

            const result = await service.processForgotPassword(job);

            expect(
                notificationSecurityDomain.processForgotPassword
            ).toHaveBeenCalledWith('user-id', data);
            expect(result).toBe(response);
        });
    });

    describe('processResetPassword', () => {
        it('forwards userId to the security domain', async () => {
            notificationSecurityDomain.processResetPassword.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationQueuePayload,
                unknown,
                EnumNotificationProcess
            >({
                userId: 'user-id',
                proceedBy: 'user-id',
                data: null,
            });

            const result = await service.processResetPassword(job);

            expect(
                notificationSecurityDomain.processResetPassword
            ).toHaveBeenCalledWith('user-id');
            expect(result).toBe(response);
        });
    });

    describe('processResetTwoFactorByAdmin', () => {
        it('forwards userId and proceedBy to the security domain', async () => {
            notificationSecurityDomain.processResetTwoFactorByAdmin.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationQueuePayload,
                unknown,
                EnumNotificationProcess
            >({
                userId: 'user-id',
                proceedBy: 'admin-id',
                data: null,
            });

            const result = await service.processResetTwoFactorByAdmin(job);

            expect(
                notificationSecurityDomain.processResetTwoFactorByAdmin
            ).toHaveBeenCalledWith('user-id', 'admin-id');
            expect(result).toBe(response);
        });
    });

    describe('processNewDeviceLogin', () => {
        it('forwards userId and data to the security domain', async () => {
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
            notificationSecurityDomain.processNewDeviceLogin.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >({
                userId: 'user-id',
                proceedBy: 'user-id',
                data,
            });

            const result = await service.processNewDeviceLogin(job);

            expect(
                notificationSecurityDomain.processNewDeviceLogin
            ).toHaveBeenCalledWith('user-id', data);
            expect(result).toBe(response);
        });
    });

    describe('processPublishTermPolicy', () => {
        it('forwards proceedBy and data to the term-policy domain', async () => {
            const data = {
                type: EnumTermPolicyType.privacy,
                version: 2,
            };
            notificationTermPolicyDomain.processPublishTermPolicy.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationBulkQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >({
                proceedBy: 'admin-id',
                data,
            });

            const result = await service.processPublishTermPolicy(job);

            expect(
                notificationTermPolicyDomain.processPublishTermPolicy
            ).toHaveBeenCalledWith('admin-id', data);
            expect(result).toBe(response);
        });
    });

    describe('processUserAcceptTermPolicy', () => {
        it('forwards userId and data to the term-policy domain', async () => {
            const data: INotificationAcceptTermPolicyPayload = {
                type: EnumTermPolicyType.privacy,
                version: 2,
                termPolicyId: 'term-policy-id',
            };
            notificationTermPolicyDomain.processUserAcceptTermPolicy.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >({
                userId: 'user-id',
                proceedBy: 'user-id',
                data,
            });

            const result = await service.processUserAcceptTermPolicy(job);

            expect(
                notificationTermPolicyDomain.processUserAcceptTermPolicy
            ).toHaveBeenCalledWith('user-id', data);
            expect(result).toBe(response);
        });
    });

    describe('processWorkspaceInvite', () => {
        it('forwards userId, proceedBy, and data to the workspace domain', async () => {
            const data: INotificationWorkspaceInviteEncryptedPayload = {
                workspaceId: 'workspace-id',
                workspaceName: 'Acme',
                inviterName: 'Omar',
                workspaceMemberRole: EnumWorkspaceMemberRole.member,
                encryptedInviteAcceptLink: 'cipher-link',
                reference: 'ref-1',
                expiredAt: '2024-02-01T00:00:00.000Z',
            };
            notificationWorkspaceDomain.processWorkspaceInvite.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >({
                userId: 'user-id',
                proceedBy: 'admin-id',
                data,
            });

            const result = await service.processWorkspaceInvite(job);

            expect(
                notificationWorkspaceDomain.processWorkspaceInvite
            ).toHaveBeenCalledWith('user-id', 'admin-id', data);
            expect(result).toBe(response);
        });
    });

    describe('processWorkspaceJoinRequest', () => {
        it('forwards userId, proceedBy, and data to the workspace domain', async () => {
            const data = {
                workspaceId: 'workspace-id',
                workspaceName: 'Acme',
                requesterName: 'Omar',
                encryptedJoinRequestReviewLink: 'cipher-review-link',
            };
            notificationWorkspaceDomain.processWorkspaceJoinRequest.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >({
                userId: 'user-id',
                proceedBy: 'admin-id',
                data,
            });

            const result = await service.processWorkspaceJoinRequest(job);

            expect(
                notificationWorkspaceDomain.processWorkspaceJoinRequest
            ).toHaveBeenCalledWith('user-id', 'admin-id', data);
            expect(result).toBe(response);
        });
    });

    describe('processWorkspaceJoinAccepted', () => {
        it('forwards userId, proceedBy, and data to the workspace domain', async () => {
            const data = { workspaceId: 'workspace-id', workspaceName: 'Acme' };
            notificationWorkspaceDomain.processWorkspaceJoinAccepted.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >({
                userId: 'user-id',
                proceedBy: 'admin-id',
                data,
            });

            const result = await service.processWorkspaceJoinAccepted(job);

            expect(
                notificationWorkspaceDomain.processWorkspaceJoinAccepted
            ).toHaveBeenCalledWith('user-id', 'admin-id', data);
            expect(result).toBe(response);
        });
    });

    describe('processWorkspaceJoinRejected', () => {
        it('forwards userId, proceedBy, and data to the workspace domain', async () => {
            const data: INotificationWorkspaceJoinRejectedPayload = {
                workspaceId: 'workspace-id',
                workspaceName: 'Acme',
                rejectReasonCode:
                    EnumWorkspaceJoinRejectReason.memberLimitReached,
            };
            notificationWorkspaceDomain.processWorkspaceJoinRejected.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >({
                userId: 'user-id',
                proceedBy: 'admin-id',
                data,
            });

            const result = await service.processWorkspaceJoinRejected(job);

            expect(
                notificationWorkspaceDomain.processWorkspaceJoinRejected
            ).toHaveBeenCalledWith('user-id', 'admin-id', data);
            expect(result).toBe(response);
        });
    });
});
