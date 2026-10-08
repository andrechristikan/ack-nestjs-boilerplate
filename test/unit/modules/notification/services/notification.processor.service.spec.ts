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
import {
    EnumNotificationProcess,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type {
    INotificationAcceptTermPolicyPayload,
    INotificationBulkQueuePayload,
    INotificationNewDeviceLoginPayload,
    INotificationQueuePayload,
    INotificationStepResult,
    INotificationWelcomeEncryptedPayload,
    INotificationWorkspaceInviteEncryptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationProcessorService } from '@modules/notification/services/notification.processor.service';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
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
    const completed: INotificationStepResult = {
        message: 'm',
        completedSteps: [EnumNotificationStep.createNotification],
        failedSteps: [],
    };
    const failed: INotificationStepResult = {
        message: 'm',
        completedSteps: [EnumNotificationStep.createNotification],
        failedSteps: [{ step: EnumNotificationStep.sendEmail, error: 'redis' }],
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                NotificationProcessorService,
                NotificationUtil,
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
        const data = {
            encryptedPassword: 'cipher',
            passwordExpiredAt: '2024-02-01T00:00:00.000Z',
            passwordCreatedAt: '2024-01-01T00:00:00.000Z',
        };

        const jobData = {
            userId: 'user-id',
            notificationId: 'n-1',
            completedSteps: [],
            proceedBy: 'admin-id',
            data: data,
        };

        it('records progress and returns the step response when every step succeeded', async () => {
            notificationAccountDomain.processWelcomeByAdmin.mockResolvedValue(
                completed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >(jobData);

            const result = await service.processWelcomeByAdmin(queueJob);

            expect(
                notificationAccountDomain.processWelcomeByAdmin
            ).toHaveBeenCalledWith('user-id', 'admin-id', data, 'n-1', []);
            expect(queueJob.updateData).toHaveBeenCalledTimes(1);
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
            expect(result).toEqual({
                message: 'm',
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });

        it('records progress then throws a fatal QueueException when a step failed', async () => {
            notificationAccountDomain.processWelcomeByAdmin.mockResolvedValue(
                failed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >(jobData);

            await expect(
                service.processWelcomeByAdmin(queueJob)
            ).rejects.toMatchObject({
                isFatal: true,
                message: 'Notification steps failed: sendEmail:redis',
            });
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });
    });

    describe('processWelcome', () => {
        const { verificationNotificationId, ...verification } = {
            expiredAt: '2024-02-01T00:00:00.000Z',
            expiredInMinutes: 30,
            encryptedLink: 'cipher-link',
            reference: 'ref-1',
            verificationNotificationId: 'n-2',
        };
        const data: INotificationWelcomeEncryptedPayload = {
            ...verification,
            verificationNotificationId,
        };
        const jobData = {
            userId: 'user-id',
            notificationId: 'n-1',
            completedSteps: [],
            proceedBy: 'user-id',
            data,
        };

        it('splits the verification notification id from the email data and records progress', async () => {
            notificationAccountDomain.processWelcome.mockResolvedValue(
                completed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload<INotificationWelcomeEncryptedPayload>,
                unknown,
                EnumNotificationProcess
            >(jobData);

            const result = await service.processWelcome(queueJob);

            expect(
                notificationAccountDomain.processWelcome
            ).toHaveBeenCalledWith('user-id', verification, 'n-1', 'n-2', []);
            expect(queueJob.updateData).toHaveBeenCalledTimes(1);
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
            expect(result).toEqual({
                message: 'm',
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });

        it('records progress then throws a fatal QueueException when a step failed', async () => {
            notificationAccountDomain.processWelcome.mockResolvedValue(failed);
            const queueJob = buildQueueJob<
                INotificationQueuePayload<INotificationWelcomeEncryptedPayload>,
                unknown,
                EnumNotificationProcess
            >(jobData);

            await expect(
                service.processWelcome(queueJob)
            ).rejects.toMatchObject({
                isFatal: true,
                message: 'Notification steps failed: sendEmail:redis',
            });
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });
    });

    describe('processWelcomeSocial', () => {
        const jobData = {
            userId: 'user-id',
            notificationId: 'n-1',
            completedSteps: [],
            proceedBy: 'user-id',
            data: null,
        };

        it('records progress and returns the step response when every step succeeded', async () => {
            notificationAccountDomain.processWelcomeSocial.mockResolvedValue(
                completed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload,
                unknown,
                EnumNotificationProcess
            >(jobData);

            const result = await service.processWelcomeSocial(queueJob);

            expect(
                notificationAccountDomain.processWelcomeSocial
            ).toHaveBeenCalledWith('user-id', 'n-1', []);
            expect(queueJob.updateData).toHaveBeenCalledTimes(1);
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
            expect(result).toEqual({
                message: 'm',
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });

        it('records progress then throws a fatal QueueException when a step failed', async () => {
            notificationAccountDomain.processWelcomeSocial.mockResolvedValue(
                failed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload,
                unknown,
                EnumNotificationProcess
            >(jobData);

            await expect(
                service.processWelcomeSocial(queueJob)
            ).rejects.toMatchObject({
                isFatal: true,
                message: 'Notification steps failed: sendEmail:redis',
            });
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });
    });

    describe('processVerifiedEmail', () => {
        const data = { reference: 'ref-1' };

        const jobData = {
            userId: 'user-id',
            notificationId: 'n-1',
            completedSteps: [],
            proceedBy: 'user-id',
            data: data,
        };

        it('records progress and returns the step response when every step succeeded', async () => {
            notificationAccountDomain.processVerifiedEmail.mockResolvedValue(
                completed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >(jobData);

            const result = await service.processVerifiedEmail(queueJob);

            expect(
                notificationAccountDomain.processVerifiedEmail
            ).toHaveBeenCalledWith('user-id', data, 'n-1', []);
            expect(queueJob.updateData).toHaveBeenCalledTimes(1);
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
            expect(result).toEqual({
                message: 'm',
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });

        it('records progress then throws a fatal QueueException when a step failed', async () => {
            notificationAccountDomain.processVerifiedEmail.mockResolvedValue(
                failed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >(jobData);

            await expect(
                service.processVerifiedEmail(queueJob)
            ).rejects.toMatchObject({
                isFatal: true,
                message: 'Notification steps failed: sendEmail:redis',
            });
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });
    });

    describe('processVerificationEmail', () => {
        const data = {
            expiredAt: '2024-02-01T00:00:00.000Z',
            expiredInMinutes: 30,
            encryptedLink: 'cipher-link',
            reference: 'ref-1',
        };

        const jobData = {
            userId: 'user-id',
            notificationId: 'n-1',
            completedSteps: [],
            proceedBy: 'user-id',
            data: data,
        };

        it('records progress and returns the step response when every step succeeded', async () => {
            notificationAccountDomain.processVerificationEmail.mockResolvedValue(
                completed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >(jobData);

            const result = await service.processVerificationEmail(queueJob);

            expect(
                notificationAccountDomain.processVerificationEmail
            ).toHaveBeenCalledWith('user-id', data, 'n-1', []);
            expect(queueJob.updateData).toHaveBeenCalledTimes(1);
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
            expect(result).toEqual({
                message: 'm',
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });

        it('records progress then throws a fatal QueueException when a step failed', async () => {
            notificationAccountDomain.processVerificationEmail.mockResolvedValue(
                failed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >(jobData);

            await expect(
                service.processVerificationEmail(queueJob)
            ).rejects.toMatchObject({
                isFatal: true,
                message: 'Notification steps failed: sendEmail:redis',
            });
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });
    });

    describe('processVerifiedMobileNumber', () => {
        const data = {
            reference: 'ref-1',
            resendInMinutes: 5,
            mobileNumber: '+15551234567',
        };

        const jobData = {
            userId: 'user-id',
            notificationId: 'n-1',
            completedSteps: [],
            proceedBy: 'user-id',
            data: data,
        };

        it('records progress and returns the step response when every step succeeded', async () => {
            notificationAccountDomain.processVerifiedMobileNumber.mockResolvedValue(
                completed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >(jobData);

            const result = await service.processVerifiedMobileNumber(queueJob);

            expect(
                notificationAccountDomain.processVerifiedMobileNumber
            ).toHaveBeenCalledWith('user-id', data, 'n-1', []);
            expect(queueJob.updateData).toHaveBeenCalledTimes(1);
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
            expect(result).toEqual({
                message: 'm',
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });

        it('records progress then throws a fatal QueueException when a step failed', async () => {
            notificationAccountDomain.processVerifiedMobileNumber.mockResolvedValue(
                failed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >(jobData);

            await expect(
                service.processVerifiedMobileNumber(queueJob)
            ).rejects.toMatchObject({
                isFatal: true,
                message: 'Notification steps failed: sendEmail:redis',
            });
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });
    });

    describe('processTemporaryPasswordByAdmin', () => {
        const data = {
            encryptedPassword: 'cipher',
            passwordExpiredAt: '2024-02-01T00:00:00.000Z',
            passwordCreatedAt: '2024-01-01T00:00:00.000Z',
        };

        const jobData = {
            userId: 'user-id',
            notificationId: 'n-1',
            completedSteps: [],
            proceedBy: 'admin-id',
            data: data,
        };

        it('records progress and returns the step response when every step succeeded', async () => {
            notificationSecurityDomain.processTemporaryPasswordByAdmin.mockResolvedValue(
                completed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >(jobData);

            const result =
                await service.processTemporaryPasswordByAdmin(queueJob);

            expect(
                notificationSecurityDomain.processTemporaryPasswordByAdmin
            ).toHaveBeenCalledWith('user-id', 'admin-id', data, 'n-1', []);
            expect(queueJob.updateData).toHaveBeenCalledTimes(1);
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
            expect(result).toEqual({
                message: 'm',
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });

        it('records progress then throws a fatal QueueException when a step failed', async () => {
            notificationSecurityDomain.processTemporaryPasswordByAdmin.mockResolvedValue(
                failed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >(jobData);

            await expect(
                service.processTemporaryPasswordByAdmin(queueJob)
            ).rejects.toMatchObject({
                isFatal: true,
                message: 'Notification steps failed: sendEmail:redis',
            });
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });
    });

    describe('processChangePassword', () => {
        const jobData = {
            userId: 'user-id',
            notificationId: 'n-1',
            completedSteps: [],
            proceedBy: 'user-id',
            data: null,
        };

        it('records progress and returns the step response when every step succeeded', async () => {
            notificationSecurityDomain.processChangePassword.mockResolvedValue(
                completed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload,
                unknown,
                EnumNotificationProcess
            >(jobData);

            const result = await service.processChangePassword(queueJob);

            expect(
                notificationSecurityDomain.processChangePassword
            ).toHaveBeenCalledWith('user-id', 'n-1', []);
            expect(queueJob.updateData).toHaveBeenCalledTimes(1);
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
            expect(result).toEqual({
                message: 'm',
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });

        it('records progress then throws a fatal QueueException when a step failed', async () => {
            notificationSecurityDomain.processChangePassword.mockResolvedValue(
                failed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload,
                unknown,
                EnumNotificationProcess
            >(jobData);

            await expect(
                service.processChangePassword(queueJob)
            ).rejects.toMatchObject({
                isFatal: true,
                message: 'Notification steps failed: sendEmail:redis',
            });
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });
    });

    describe('processForgotPassword', () => {
        const data = {
            expiredAt: '2024-02-01T00:00:00.000Z',
            encryptedLink: 'cipher-link',
            reference: 'ref-1',
            expiredInMinutes: 15,
            resendInMinutes: 5,
        };

        const jobData = {
            userId: 'user-id',
            notificationId: 'n-1',
            completedSteps: [],
            proceedBy: 'user-id',
            data: data,
        };

        it('records progress and returns the step response when every step succeeded', async () => {
            notificationSecurityDomain.processForgotPassword.mockResolvedValue(
                completed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >(jobData);

            const result = await service.processForgotPassword(queueJob);

            expect(
                notificationSecurityDomain.processForgotPassword
            ).toHaveBeenCalledWith('user-id', data, 'n-1', []);
            expect(queueJob.updateData).toHaveBeenCalledTimes(1);
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
            expect(result).toEqual({
                message: 'm',
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });

        it('records progress then throws a fatal QueueException when a step failed', async () => {
            notificationSecurityDomain.processForgotPassword.mockResolvedValue(
                failed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >(jobData);

            await expect(
                service.processForgotPassword(queueJob)
            ).rejects.toMatchObject({
                isFatal: true,
                message: 'Notification steps failed: sendEmail:redis',
            });
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });
    });

    describe('processResetPassword', () => {
        const jobData = {
            userId: 'user-id',
            notificationId: 'n-1',
            completedSteps: [],
            proceedBy: 'user-id',
            data: null,
        };

        it('records progress and returns the step response when every step succeeded', async () => {
            notificationSecurityDomain.processResetPassword.mockResolvedValue(
                completed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload,
                unknown,
                EnumNotificationProcess
            >(jobData);

            const result = await service.processResetPassword(queueJob);

            expect(
                notificationSecurityDomain.processResetPassword
            ).toHaveBeenCalledWith('user-id', 'n-1', []);
            expect(queueJob.updateData).toHaveBeenCalledTimes(1);
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
            expect(result).toEqual({
                message: 'm',
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });

        it('records progress then throws a fatal QueueException when a step failed', async () => {
            notificationSecurityDomain.processResetPassword.mockResolvedValue(
                failed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload,
                unknown,
                EnumNotificationProcess
            >(jobData);

            await expect(
                service.processResetPassword(queueJob)
            ).rejects.toMatchObject({
                isFatal: true,
                message: 'Notification steps failed: sendEmail:redis',
            });
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });
    });

    describe('processResetTwoFactorByAdmin', () => {
        const jobData = {
            userId: 'user-id',
            notificationId: 'n-1',
            completedSteps: [],
            proceedBy: 'admin-id',
            data: null,
        };

        it('records progress and returns the step response when every step succeeded', async () => {
            notificationSecurityDomain.processResetTwoFactorByAdmin.mockResolvedValue(
                completed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload,
                unknown,
                EnumNotificationProcess
            >(jobData);

            const result = await service.processResetTwoFactorByAdmin(queueJob);

            expect(
                notificationSecurityDomain.processResetTwoFactorByAdmin
            ).toHaveBeenCalledWith('user-id', 'admin-id', 'n-1', []);
            expect(queueJob.updateData).toHaveBeenCalledTimes(1);
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
            expect(result).toEqual({
                message: 'm',
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });

        it('records progress then throws a fatal QueueException when a step failed', async () => {
            notificationSecurityDomain.processResetTwoFactorByAdmin.mockResolvedValue(
                failed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload,
                unknown,
                EnumNotificationProcess
            >(jobData);

            await expect(
                service.processResetTwoFactorByAdmin(queueJob)
            ).rejects.toMatchObject({
                isFatal: true,
                message: 'Notification steps failed: sendEmail:redis',
            });
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
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
            userId: 'user-id',
            notificationId: 'n-1',
            completedSteps: [],
            proceedBy: 'user-id',
            data: data,
        };

        it('records progress and returns the step response when every step succeeded', async () => {
            notificationSecurityDomain.processNewDeviceLogin.mockResolvedValue(
                completed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >(jobData);

            const result = await service.processNewDeviceLogin(queueJob);

            expect(
                notificationSecurityDomain.processNewDeviceLogin
            ).toHaveBeenCalledWith('user-id', data, 'n-1', []);
            expect(queueJob.updateData).toHaveBeenCalledTimes(1);
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
            expect(result).toEqual({
                message: 'm',
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });

        it('records progress then throws a fatal QueueException when a step failed', async () => {
            notificationSecurityDomain.processNewDeviceLogin.mockResolvedValue(
                failed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >(jobData);

            await expect(
                service.processNewDeviceLogin(queueJob)
            ).rejects.toMatchObject({
                isFatal: true,
                message: 'Notification steps failed: sendEmail:redis',
            });
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });
    });
    describe('processPublishTermPolicy', () => {
        it('forwards proceedBy and data to the term-policy domain', async () => {
            const data = {
                termPolicyId: 'term-policy-id',
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
        const data: INotificationAcceptTermPolicyPayload = {
            type: EnumTermPolicyType.privacy,
            version: 2,
            termPolicyId: 'term-policy-id',
        };
        const jobData = {
            userId: 'user-id',
            notificationId: 'n-1',
            completedSteps: [],
            proceedBy: 'user-id',
            data,
        };

        it('records progress and returns the step response when every step succeeded', async () => {
            notificationTermPolicyDomain.processUserAcceptTermPolicy.mockResolvedValue(
                completed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload<INotificationAcceptTermPolicyPayload>,
                unknown,
                EnumNotificationProcess
            >(jobData);

            const result = await service.processUserAcceptTermPolicy(queueJob);

            expect(
                notificationTermPolicyDomain.processUserAcceptTermPolicy
            ).toHaveBeenCalledWith('user-id', data, 'n-1', []);
            expect(queueJob.updateData).toHaveBeenCalledTimes(1);
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
            expect(result).toEqual({
                message: 'm',
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });

        it('records progress then throws a fatal QueueException when a step failed', async () => {
            notificationTermPolicyDomain.processUserAcceptTermPolicy.mockResolvedValue(
                failed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload<INotificationAcceptTermPolicyPayload>,
                unknown,
                EnumNotificationProcess
            >(jobData);

            await expect(
                service.processUserAcceptTermPolicy(queueJob)
            ).rejects.toMatchObject({
                isFatal: true,
                message: 'Notification steps failed: sendEmail:redis',
            });
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });
    });

    describe('processWorkspaceInvite', () => {
        const data: INotificationWorkspaceInviteEncryptedPayload = {
            workspaceId: 'workspace-id',
            workspaceName: 'Acme',
            inviterName: 'Omar',
            workspaceMemberRole: EnumWorkspaceMemberRole.member,
            encryptedInviteAcceptLink: 'cipher-link',
            reference: 'ref-1',
            expiredAt: '2024-02-01T00:00:00.000Z',
        };

        const jobData = {
            userId: 'user-id',
            notificationId: 'n-1',
            completedSteps: [],
            proceedBy: 'admin-id',
            data: data,
        };

        it('records progress and returns the step response when every step succeeded', async () => {
            notificationWorkspaceDomain.processWorkspaceInvite.mockResolvedValue(
                completed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >(jobData);

            const result = await service.processWorkspaceInvite(queueJob);

            expect(
                notificationWorkspaceDomain.processWorkspaceInvite
            ).toHaveBeenCalledWith('user-id', 'admin-id', data, 'n-1', []);
            expect(queueJob.updateData).toHaveBeenCalledTimes(1);
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
            expect(result).toEqual({
                message: 'm',
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });

        it('records progress then throws a fatal QueueException when a step failed', async () => {
            notificationWorkspaceDomain.processWorkspaceInvite.mockResolvedValue(
                failed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >(jobData);

            await expect(
                service.processWorkspaceInvite(queueJob)
            ).rejects.toMatchObject({
                isFatal: true,
                message: 'Notification steps failed: sendEmail:redis',
            });
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });
    });

    describe('processWorkspaceJoinRequest', () => {
        const data = {
            workspaceId: 'workspace-id',
            workspaceName: 'Acme',
            requesterName: 'Omar',
            encryptedJoinRequestReviewLink: 'cipher-review-link',
        };

        const jobData = {
            userId: 'user-id',
            notificationId: 'n-1',
            completedSteps: [],
            proceedBy: 'admin-id',
            data: data,
        };

        it('records progress and returns the step response when every step succeeded', async () => {
            notificationWorkspaceDomain.processWorkspaceJoinRequest.mockResolvedValue(
                completed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >(jobData);

            const result = await service.processWorkspaceJoinRequest(queueJob);

            expect(
                notificationWorkspaceDomain.processWorkspaceJoinRequest
            ).toHaveBeenCalledWith('user-id', 'admin-id', data, 'n-1', []);
            expect(queueJob.updateData).toHaveBeenCalledTimes(1);
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
            expect(result).toEqual({
                message: 'm',
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });

        it('records progress then throws a fatal QueueException when a step failed', async () => {
            notificationWorkspaceDomain.processWorkspaceJoinRequest.mockResolvedValue(
                failed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >(jobData);

            await expect(
                service.processWorkspaceJoinRequest(queueJob)
            ).rejects.toMatchObject({
                isFatal: true,
                message: 'Notification steps failed: sendEmail:redis',
            });
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });
    });

    describe('processWorkspaceJoinAccepted', () => {
        const data = { workspaceId: 'workspace-id', workspaceName: 'Acme' };

        const jobData = {
            userId: 'user-id',
            notificationId: 'n-1',
            completedSteps: [],
            proceedBy: 'admin-id',
            data: data,
        };

        it('records progress and returns the step response when every step succeeded', async () => {
            notificationWorkspaceDomain.processWorkspaceJoinAccepted.mockResolvedValue(
                completed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >(jobData);

            const result = await service.processWorkspaceJoinAccepted(queueJob);

            expect(
                notificationWorkspaceDomain.processWorkspaceJoinAccepted
            ).toHaveBeenCalledWith('user-id', 'admin-id', data, 'n-1', []);
            expect(queueJob.updateData).toHaveBeenCalledTimes(1);
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
            expect(result).toEqual({
                message: 'm',
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });

        it('records progress then throws a fatal QueueException when a step failed', async () => {
            notificationWorkspaceDomain.processWorkspaceJoinAccepted.mockResolvedValue(
                failed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >(jobData);

            await expect(
                service.processWorkspaceJoinAccepted(queueJob)
            ).rejects.toMatchObject({
                isFatal: true,
                message: 'Notification steps failed: sendEmail:redis',
            });
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
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
            userId: 'user-id',
            notificationId: 'n-1',
            completedSteps: [],
            proceedBy: 'admin-id',
            data: data,
        };

        it('records progress and returns the step response when every step succeeded', async () => {
            notificationWorkspaceDomain.processWorkspaceJoinRejected.mockResolvedValue(
                completed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >(jobData);

            const result = await service.processWorkspaceJoinRejected(queueJob);

            expect(
                notificationWorkspaceDomain.processWorkspaceJoinRejected
            ).toHaveBeenCalledWith('user-id', 'admin-id', data, 'n-1', []);
            expect(queueJob.updateData).toHaveBeenCalledTimes(1);
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
            expect(result).toEqual({
                message: 'm',
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });

        it('records progress then throws a fatal QueueException when a step failed', async () => {
            notificationWorkspaceDomain.processWorkspaceJoinRejected.mockResolvedValue(
                failed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >(jobData);

            await expect(
                service.processWorkspaceJoinRejected(queueJob)
            ).rejects.toMatchObject({
                isFatal: true,
                message: 'Notification steps failed: sendEmail:redis',
            });
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });
    });
});
