import { Test } from '@nestjs/testing';
import { buildTermPolicyPage } from '@test/unit/helpers/test.unit.notification-term-policy.helper';
import { ConfigService } from '@nestjs/config';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
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
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { UserDomain } from '@modules/user/domains/user.domain';
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
import { TestEncryptedRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import { buildQueueJob } from '@test/unit/helpers/test.unit.queue.helper';
import { MessageService } from '@common/message/services/message.service';

describe('NotificationProcessorService', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    const notificationAccountDomain: MockProxy<NotificationAccountDomain> =
        mock<NotificationAccountDomain>();
    const notificationSecurityDomain: MockProxy<NotificationSecurityDomain> =
        mock<NotificationSecurityDomain>();
    const notificationTermPolicyDomain: MockProxy<NotificationTermPolicyDomain> =
        mock<NotificationTermPolicyDomain>();
    const notificationWorkspaceDomain: MockProxy<NotificationWorkspaceDomain> =
        mock<NotificationWorkspaceDomain>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    let service: NotificationProcessorService;

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
        messageService.setMessage.mockImplementation((path: string) => path);
        const module = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                { provide: ConfigService, useValue: configService },
                {
                    provide: HelperEncryptionService,
                    useValue: helperEncryptionService,
                },
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
                { provide: UserDomain, useValue: userDomain },
                { provide: HelperDateService, useValue: helperDateService },
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
            recipient: TestEncryptedRecipient,
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
            ).toHaveBeenCalledWith(
                'user-id',
                'admin-id',
                TestEncryptedRecipient,
                data,
                'n-1',
                []
            );
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
                message: 'notification.queue.error.stepsFailed',
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
            recipient: TestEncryptedRecipient,
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
            ).toHaveBeenCalledWith(
                'user-id',
                TestEncryptedRecipient,
                verification,
                'n-1',
                'n-2',
                []
            );
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
                message: 'notification.queue.error.stepsFailed',
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
            recipient: TestEncryptedRecipient,
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
            ).toHaveBeenCalledWith(
                'user-id',
                TestEncryptedRecipient,
                'n-1',
                []
            );
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
                message: 'notification.queue.error.stepsFailed',
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
            recipient: TestEncryptedRecipient,
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
            ).toHaveBeenCalledWith(
                'user-id',
                TestEncryptedRecipient,
                data,
                'n-1',
                []
            );
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
                message: 'notification.queue.error.stepsFailed',
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
            recipient: TestEncryptedRecipient,
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
            ).toHaveBeenCalledWith(
                'user-id',
                TestEncryptedRecipient,
                data,
                'n-1',
                []
            );
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
                message: 'notification.queue.error.stepsFailed',
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
            recipient: TestEncryptedRecipient,
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
            ).toHaveBeenCalledWith(
                'user-id',
                TestEncryptedRecipient,
                data,
                'n-1',
                []
            );
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
                message: 'notification.queue.error.stepsFailed',
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
            recipient: TestEncryptedRecipient,
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
            ).toHaveBeenCalledWith(
                'user-id',
                'admin-id',
                TestEncryptedRecipient,
                data,
                'n-1',
                []
            );
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
                message: 'notification.queue.error.stepsFailed',
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
            recipient: TestEncryptedRecipient,
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
            ).toHaveBeenCalledWith(
                'user-id',
                TestEncryptedRecipient,
                'n-1',
                []
            );
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
                message: 'notification.queue.error.stepsFailed',
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
            recipient: TestEncryptedRecipient,
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
            ).toHaveBeenCalledWith(
                'user-id',
                TestEncryptedRecipient,
                data,
                'n-1',
                []
            );
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
                message: 'notification.queue.error.stepsFailed',
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
            recipient: TestEncryptedRecipient,
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
            ).toHaveBeenCalledWith(
                'user-id',
                TestEncryptedRecipient,
                'n-1',
                []
            );
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
                message: 'notification.queue.error.stepsFailed',
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
            recipient: TestEncryptedRecipient,
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
            ).toHaveBeenCalledWith(
                'user-id',
                'admin-id',
                TestEncryptedRecipient,
                'n-1',
                []
            );
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
                message: 'notification.queue.error.stepsFailed',
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
            recipient: TestEncryptedRecipient,
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
            ).toHaveBeenCalledWith(
                'user-id',
                TestEncryptedRecipient,
                data,
                'n-1',
                []
            );
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
                message: 'notification.queue.error.stepsFailed',
            });
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });
    });
    describe('processPublishTermPolicy', () => {
        const data = {
            termPolicyId: 'term-policy-id',
            type: EnumTermPolicyType.privacy,
            version: 2,
            recipientCutoffAt: '2024-01-01T00:00:00.000Z',
            resendNonce: null,
        };
        const cutoff = new Date('2024-01-01T00:00:00.000Z');
        const u1 = { id: 'u1', email: 'u1@example.com', username: 'u1' };
        const u2 = { id: 'u2', email: 'u2@example.com', username: 'u2' };
        const u3 = { id: 'u3', email: 'u3@example.com', username: 'u3' };
        const u4 = { id: 'u4', email: 'u4@example.com', username: 'u4' };
        const job = buildQueueJob<
            INotificationBulkQueuePayload<typeof data>,
            unknown,
            EnumNotificationProcess
        >({ proceedBy: 'admin-id', data });

        beforeEach(() => {
            helperDateService.createFromIso.mockReturnValue(cutoff);
            Object.defineProperty(
                notificationTermPolicyDomain,
                'emailBatchSize',
                { value: 3 }
            );
        });

        it('pages the active users at the cutoff and sends each page as batches, advancing the batch index', async () => {
            userDomain.getListActiveRecipientCursor
                .mockResolvedValueOnce([u1, u2, u3])
                .mockResolvedValueOnce([u4]);
            const firstPage = buildTermPolicyPage([u1, u2, u3]);
            const secondPage = buildTermPolicyPage([u4]);
            notificationTermPolicyDomain.getPage
                .mockResolvedValueOnce(firstPage)
                .mockResolvedValueOnce(secondPage);
            notificationTermPolicyDomain.sendFreshBatch.mockResolvedValue(1);

            const result = await service.processPublishTermPolicy(job);

            expect(helperDateService.createFromIso).toHaveBeenCalledWith(
                data.recipientCutoffAt
            );
            expect(
                userDomain.getListActiveRecipientCursor
            ).toHaveBeenNthCalledWith(1, null, 3, cutoff);
            expect(
                userDomain.getListActiveRecipientCursor
            ).toHaveBeenNthCalledWith(2, 'u3', 3, cutoff);
            expect(
                userDomain.getManyActiveRecipientsByIds
            ).not.toHaveBeenCalled();
            expect(
                notificationTermPolicyDomain.getPage
            ).toHaveBeenNthCalledWith(1, data.termPolicyId, [u1, u2, u3]);
            expect(
                notificationTermPolicyDomain.sendFreshBatch
            ).toHaveBeenNthCalledWith(
                1,
                'admin-id',
                data,
                firstPage.freshUsers,
                0
            );
            expect(
                notificationTermPolicyDomain.sendFreshBatch
            ).toHaveBeenNthCalledWith(
                2,
                'admin-id',
                data,
                secondPage.freshUsers,
                1
            );
            expect(
                notificationTermPolicyDomain.getPending
            ).not.toHaveBeenCalled();
            expect(
                notificationTermPolicyDomain.sendPendingBatches
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'notification.queue.publishTermPolicy',
                candidateCounts: 4,
                createdCounts: 4,
                batches: 2,
            });
        });

        it('fetches the active users off the page that a pending batch names before sending them', async () => {
            userDomain.getListActiveRecipientCursor.mockResolvedValueOnce([u1]);
            const page = buildTermPolicyPage([u1], [], ['B']);
            const pending = { sendableMarkers: [], offPageUserIds: ['u4'] };
            notificationTermPolicyDomain.getPage.mockResolvedValue(page);
            notificationTermPolicyDomain.getPending.mockResolvedValue(pending);
            userDomain.getManyActiveRecipientsByIds.mockResolvedValue([u4]);
            notificationTermPolicyDomain.sendPendingBatches.mockResolvedValue(
                1
            );
            notificationTermPolicyDomain.sendFreshBatch.mockResolvedValue(0);

            const result = await service.processPublishTermPolicy(job);

            expect(
                notificationTermPolicyDomain.getPending
            ).toHaveBeenCalledWith(data.termPolicyId, page);
            expect(
                userDomain.getManyActiveRecipientsByIds
            ).toHaveBeenCalledWith(['u4'], cutoff);
            expect(
                notificationTermPolicyDomain.sendPendingBatches
            ).toHaveBeenCalledWith('admin-id', data, page, pending, [u4], 0);
            expect(result).toMatchObject({
                candidateCounts: 1,
                createdCounts: 0,
                batches: 1,
            });
        });

        it('creates the fresh batch while the pending batches read their markers and users, numbering it after them', async () => {
            userDomain.getListActiveRecipientCursor.mockResolvedValueOnce([
                u1,
                u2,
            ]);
            const page = buildTermPolicyPage([u1, u2], [u2], ['B1', 'B2']);
            notificationTermPolicyDomain.getPage.mockResolvedValue(page);
            const deferredPending = Promise.withResolvers<{
                sendableMarkers: [];
                offPageUserIds: [];
            }>();
            notificationTermPolicyDomain.getPending.mockReturnValue(
                deferredPending.promise
            );
            notificationTermPolicyDomain.sendFreshBatch.mockImplementation(
                async () => {
                    deferredPending.resolve({
                        sendableMarkers: [],
                        offPageUserIds: [],
                    });

                    return 1;
                }
            );
            notificationTermPolicyDomain.sendPendingBatches.mockResolvedValue(
                2
            );

            const result = await service.processPublishTermPolicy(job);

            expect(
                notificationTermPolicyDomain.sendFreshBatch
            ).toHaveBeenCalledWith('admin-id', data, [u2], 2);
            expect(result).toMatchObject({ createdCounts: 1, batches: 3 });
        });

        it('advances the cursor past a full page that sends nothing', async () => {
            userDomain.getListActiveRecipientCursor
                .mockResolvedValueOnce([u1, u2, u3])
                .mockResolvedValueOnce([]);
            notificationTermPolicyDomain.getPage.mockResolvedValue(
                buildTermPolicyPage([u1, u2, u3], [])
            );
            notificationTermPolicyDomain.sendFreshBatch.mockResolvedValue(0);

            const result = await service.processPublishTermPolicy(job);

            expect(
                userDomain.getListActiveRecipientCursor
            ).toHaveBeenNthCalledWith(2, 'u3', 3, cutoff);
            expect(result).toEqual({
                message: 'notification.queue.publishTermPolicy',
                candidateCounts: 3,
                createdCounts: 0,
                batches: 0,
            });
        });

        it('stops after a page shorter than the batch size', async () => {
            userDomain.getListActiveRecipientCursor.mockResolvedValueOnce([u1]);
            notificationTermPolicyDomain.getPage.mockResolvedValue(
                buildTermPolicyPage([u1])
            );
            notificationTermPolicyDomain.sendFreshBatch.mockResolvedValue(1);

            await service.processPublishTermPolicy(job);

            expect(
                userDomain.getListActiveRecipientCursor
            ).toHaveBeenCalledTimes(1);
        });

        it('reads and sends nothing when there is no candidate', async () => {
            userDomain.getListActiveRecipientCursor.mockResolvedValueOnce([]);

            const result = await service.processPublishTermPolicy(job);

            expect(notificationTermPolicyDomain.getPage).not.toHaveBeenCalled();
            expect(
                notificationTermPolicyDomain.sendFreshBatch
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'notification.queue.publishTermPolicy',
                candidateCounts: 0,
                createdCounts: 0,
                batches: 0,
            });
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
            recipient: TestEncryptedRecipient,
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
            ).toHaveBeenCalledWith(
                'user-id',
                TestEncryptedRecipient,
                data,
                'n-1',
                []
            );
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
                message: 'notification.queue.error.stepsFailed',
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
            recipient: TestEncryptedRecipient,
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
            ).toHaveBeenCalledWith(
                'user-id',
                'admin-id',
                TestEncryptedRecipient,
                data,
                'n-1',
                []
            );
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
                message: 'notification.queue.error.stepsFailed',
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
            joinRequestId: 'join-request-id',
            encryptedJoinRequestReviewLink: 'cipher-review-link',
        };

        const jobData = {
            userId: 'user-id',
            notificationId: 'n-1',
            completedSteps: [],
            recipient: TestEncryptedRecipient,
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
            ).toHaveBeenCalledWith(
                'user-id',
                'admin-id',
                TestEncryptedRecipient,
                data,
                'n-1',
                []
            );
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
                message: 'notification.queue.error.stepsFailed',
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
            recipient: TestEncryptedRecipient,
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
            ).toHaveBeenCalledWith(
                'user-id',
                'admin-id',
                TestEncryptedRecipient,
                data,
                'n-1',
                []
            );
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
                message: 'notification.queue.error.stepsFailed',
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
            recipient: TestEncryptedRecipient,
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
            ).toHaveBeenCalledWith(
                'user-id',
                'admin-id',
                TestEncryptedRecipient,
                data,
                'n-1',
                []
            );
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
                message: 'notification.queue.error.stepsFailed',
            });
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });
    });

    describe('processUnknown', () => {
        it('throws a fatal QueueException naming the unknown process', () => {
            expect(() => service.processUnknown('unknownProcess')).toThrow(
                expect.objectContaining({
                    message: 'notification.queue.error.unknownProcess',
                    isFatal: true,
                })
            );
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.queue.error.unknownProcess',
                { properties: { process: 'unknownProcess' } }
            );
        });
    });
});
