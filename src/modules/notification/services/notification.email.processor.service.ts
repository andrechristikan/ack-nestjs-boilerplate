import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HelperService } from '@common/helper/services/helper.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { INotificationEmailProcessorService } from '@modules/notification/interfaces/notification.email.processor.service.interface';
import {
    INotificationEmailWorkerBulkPayload,
    INotificationEmailWorkerPayload,
    INotificationForgotPasswordPayload,
    INotificationInvitePayload,
    INotificationNewDeviceLoginPayload,
    INotificationPublishTermPolicyPayload,
    INotificationTemporaryPasswordPayload,
    INotificationVerificationEmailPayload,
    INotificationVerifiedEmailPayload,
    INotificationVerifiedMobileNumberPayload,
    INotificationWelcomeByAdminPayload,
} from '@modules/notification/interfaces/notification.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { title } from 'case';
import { flatten } from 'flat';
import { Job } from 'bullmq';
import { IQueueResponse } from 'src/queues/interfaces/queue.interface';

@Injectable()
export class NotificationEmailProcessorService implements INotificationEmailProcessorService {
    private readonly logger = new Logger(
        NotificationEmailProcessorService.name
    );

    private readonly noreplyEmail: string;
    private readonly supportEmail: string;

    private readonly homeName: string;
    private readonly homeUrl: string;

    private readonly batchSize: number;

    private readonly defaultTemplateData: Record<string, string>;

    constructor(
        private readonly awsSESService: AwsSESService,
        private readonly helperService: HelperService,
        private readonly configService: ConfigService,
        private readonly userRepository: UserRepository
    ) {
        this.noreplyEmail = this.configService.get<string>('email.noreply');
        this.supportEmail = this.configService.get<string>('email.support');

        this.homeName = this.configService.get<string>('home.name');
        this.homeUrl = this.configService.get<string>('home.url');

        this.batchSize = this.configService.get<number>('email.batchSize');

        this.defaultTemplateData = {
            homeName: this.homeName,
            supportEmail: title(this.supportEmail),
            homeUrl: this.homeUrl,
        };
    }

    async processWelcome(
        job: Job<
            INotificationEmailWorkerPayload,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        try {
            const { email, username, bcc, cc } = job.data.send;

            await this.awsSESService.send({
                templateName: EnumNotificationProcess.welcome,
                recipients: [email],
                sender: this.noreplyEmail,
                templateData: {
                    ...this.defaultTemplateData,
                    username,
                },
                ...(cc?.length && { cc }),
                ...(bcc?.length && { bcc }),
            });

            return { message: 'Welcome email processed' };
        } catch (err: unknown) {
            this.logger.error(err, 'Failed to process welcome email');
            throw err;
        }
    }

    async processWelcomeSocial(
        job: Job<
            INotificationEmailWorkerPayload,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        try {
            const { email, username, bcc, cc } = job.data.send;

            await this.awsSESService.send({
                templateName: EnumNotificationProcess.welcomeSocial,
                recipients: [email],
                sender: this.noreplyEmail,
                templateData: {
                    ...this.defaultTemplateData,
                    username,
                },
                ...(cc?.length && { cc }),
                ...(bcc?.length && { bcc }),
            });

            return { message: 'Welcome social email processed' };
        } catch (err: unknown) {
            this.logger.error(err, 'Failed to process welcome social email');
            throw err;
        }
    }

    async processWelcomeByAdmin(
        job: Job<
            INotificationEmailWorkerPayload<INotificationWelcomeByAdminPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        try {
            const { email, username, cc, bcc } = job.data.send;
            const {
                password: passwordString,
                passwordExpiredAt,
                passwordCreatedAt,
            } = job.data.data;

            await this.awsSESService.send({
                templateName: EnumNotificationProcess.welcomeByAdmin,
                recipients: [email],
                sender: this.noreplyEmail,
                templateData: {
                    ...this.defaultTemplateData,
                    username,
                    password: passwordString,
                    passwordExpiredAt:
                        this.helperService.dateFormatToRFC2822(
                            passwordExpiredAt
                        ),
                    passwordCreatedAt:
                        this.helperService.dateFormatToRFC2822(
                            passwordCreatedAt
                        ),
                },
                ...(cc?.length && { cc }),
                ...(bcc?.length && { bcc }),
            });

            return { message: 'Create by admin email processed' };
        } catch (err: unknown) {
            this.logger.error(err, 'Failed to process welcome by admin email');
            throw err;
        }
    }

    async processTemporaryPasswordByAdmin(
        job: Job<
            INotificationEmailWorkerPayload<INotificationTemporaryPasswordPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        try {
            const { email, username, cc, bcc } = job.data.send;
            const {
                password: encryptedPasswordString,
                passwordExpiredAt,
                passwordCreatedAt,
            } = job.data.data;

            const passwordString = this.helperService.simpleDecrypt(
                encryptedPasswordString
            );

            await this.awsSESService.send({
                templateName: EnumNotificationProcess.temporaryPasswordByAdmin,
                recipients: [email],
                sender: this.noreplyEmail,
                templateData: {
                    ...this.defaultTemplateData,
                    username,
                    password: passwordString,
                    passwordExpiredAt:
                        this.helperService.dateFormatToRFC2822(
                            passwordExpiredAt
                        ),
                    passwordCreatedAt:
                        this.helperService.dateFormatToRFC2822(
                            passwordCreatedAt
                        ),
                },
                ...(cc?.length && { cc }),
                ...(bcc?.length && { bcc }),
            });

            return { message: 'Temporary password email processed' };
        } catch (err: unknown) {
            this.logger.error(
                err,
                'Failed to process temporary password email'
            );
            throw err;
        }
    }

    async processChangePassword(
        job: Job<
            INotificationEmailWorkerPayload,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        try {
            const { email, username, cc, bcc } = job.data.send;

            await this.awsSESService.send({
                templateName: EnumNotificationProcess.changePassword,
                recipients: [email],
                sender: this.noreplyEmail,
                templateData: {
                    ...this.defaultTemplateData,
                    username,
                },
                ...(cc?.length && { cc }),
                ...(bcc?.length && { bcc }),
            });

            return { message: 'Change password email processed' };
        } catch (err: unknown) {
            this.logger.error(err, 'Failed to process change password email');
            throw err;
        }
    }

    async processResetPassword(
        job: Job<
            INotificationEmailWorkerPayload,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        try {
            const { email, username, cc, bcc } = job.data.send;

            await this.awsSESService.send({
                templateName: EnumNotificationProcess.resetPassword,
                recipients: [email],
                sender: this.noreplyEmail,
                templateData: {
                    ...this.defaultTemplateData,
                    username,
                },
                ...(cc?.length && { cc }),
                ...(bcc?.length && { bcc }),
            });

            return { message: 'Reset password email processed' };
        } catch (err: unknown) {
            this.logger.error(err, 'Failed to process reset password email');
            throw err;
        }
    }

    async processVerificationEmail(
        job: Job<
            INotificationEmailWorkerPayload<INotificationVerificationEmailPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        try {
            const { email, username, cc, bcc } = job.data.send;
            const {
                expiredAt,
                reference,
                link: encryptedLink,
                expiredInMinutes,
            } = job.data.data;

            const link = this.helperService.simpleDecrypt(encryptedLink);

            await this.awsSESService.send({
                templateName: EnumNotificationProcess.verificationEmail,
                recipients: [email],
                sender: this.noreplyEmail,
                templateData: {
                    ...this.defaultTemplateData,
                    username,
                    link,
                    reference,
                    expiredAt:
                        this.helperService.dateFormatToRFC2822(expiredAt),
                    expiredInMinutes,
                },
                ...(cc?.length && { cc }),
                ...(bcc?.length && { bcc }),
            });

            return { message: 'Verification email processed' };
        } catch (err: unknown) {
            this.logger.error(err, 'Failed to process verification email');
            throw err;
        }
    }

    async processVerifiedEmail(
        job: Job<
            INotificationEmailWorkerPayload<INotificationVerifiedEmailPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        try {
            const { email, username, cc, bcc } = job.data.send;
            const { reference } = job.data.data;

            await this.awsSESService.send({
                templateName: EnumNotificationProcess.verifiedEmail,
                recipients: [email],
                sender: this.noreplyEmail,
                templateData: {
                    ...this.defaultTemplateData,
                    username,
                    reference,
                },
                ...(cc?.length && { cc }),
                ...(bcc?.length && { bcc }),
            });

            return { message: 'Email verified email processed' };
        } catch (err: unknown) {
            this.logger.error(err, 'Failed to process verified email');
            throw err;
        }
    }

    async processInvite(
        job: Job<
            INotificationEmailWorkerPayload<INotificationInvitePayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        try {
            const { email, username, cc, bcc } = job.data.send;
            const {
                link: encryptedLink,
                expiredAt,
                expiredInMinutes,
                reference,
                inviteType,
                roleScope,
                contextName,
            } = job.data.data;

            const link = this.helperService.simpleDecrypt(encryptedLink);

            await this.awsSESService.send({
                templateName: EnumNotificationProcess.invite,
                recipients: [email],
                sender: this.noreplyEmail,
                templateData: {
                    ...this.defaultTemplateData,
                    username,
                    link,
                    expiredAt: this.helperService.dateFormatToRFC2822(expiredAt),
                    expiredInMinutes,
                    reference,
                    inviteType,
                    roleScope,
                    contextName,
                },
                ...(cc?.length && { cc }),
                ...(bcc?.length && { bcc }),
            });

            return { message: 'Invite email processed' };
        } catch (err: unknown) {
            this.logger.error(err, 'Failed to process invite email');
            throw err;
        }
    }

    async processForgotPassword(
        job: Job<
            INotificationEmailWorkerPayload<INotificationForgotPasswordPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        try {
            const { email, username, cc, bcc } = job.data.send;
            const {
                expiredAt,
                link: encryptedLink,
                reference,
                expiredInMinutes,
            } = job.data.data;

            const link = this.helperService.simpleDecrypt(encryptedLink);

            await this.awsSESService.send({
                templateName: EnumNotificationProcess.forgotPassword,
                recipients: [email],
                sender: this.noreplyEmail,
                templateData: {
                    ...this.defaultTemplateData,
                    username,
                    link,
                    expiredAt:
                        this.helperService.dateFormatToRFC2822(expiredAt),
                    reference,
                    expiredInMinutes,
                },
                ...(cc?.length && { cc }),
                ...(bcc?.length && { bcc }),
            });

            return { message: 'Forgot password email processed' };
        } catch (err: unknown) {
            this.logger.error(err, 'Failed to process forgot password email');
            throw err;
        }
    }

    async processVerifiedMobileNumber(
        job: Job<
            INotificationEmailWorkerPayload<INotificationVerifiedMobileNumberPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        try {
            const { email, username, cc, bcc } = job.data.send;
            const { reference, mobileNumber } = job.data.data;

            await this.awsSESService.send({
                templateName: EnumNotificationProcess.verifiedMobileNumber,
                recipients: [email],
                sender: this.noreplyEmail,
                templateData: {
                    ...this.defaultTemplateData,
                    username,
                    reference,
                    mobileNumber,
                },
                ...(cc?.length && { cc }),
                ...(bcc?.length && { bcc }),
            });

            return { message: 'Mobile number verified email processed' };
        } catch (err: unknown) {
            this.logger.error(
                err,
                'Failed to process verified mobile number email'
            );
            throw err;
        }
    }

    async processResetTwoFactorByAdmin(
        job: Job<
            INotificationEmailWorkerPayload,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        try {
            const { email, username, cc, bcc } = job.data.send;

            await this.awsSESService.send({
                templateName: EnumNotificationProcess.resetTwoFactorByAdmin,
                recipients: [email],
                sender: this.noreplyEmail,
                templateData: {
                    ...this.defaultTemplateData,
                    username,
                },
                ...(cc?.length && { cc }),
                ...(bcc?.length && { bcc }),
            });

            return { message: 'Reset two factor by admin email processed' };
        } catch (err: unknown) {
            this.logger.error(
                err,
                'Failed to process reset two factor by admin email'
            );
            throw err;
        }
    }

    async processNewDeviceLogin(
        job: Job<
            INotificationEmailWorkerPayload<INotificationNewDeviceLoginPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        try {
            const { email, username, cc, bcc } = job.data.send;
            const {
                loginFrom,
                loginWith,
                loginAt,
                requestLog: { userAgent, ipAddress },
            } = job.data.data;

            await this.awsSESService.send({
                templateName: EnumNotificationProcess.newDeviceLogin,
                recipients: [email],
                sender: this.noreplyEmail,
                templateData: {
                    ...this.defaultTemplateData,
                    username,
                    loginFrom,
                    loginWith,
                    loginAt: this.helperService.dateFormatToRFC2822(loginAt),
                    userAgent: flatten(userAgent),
                    ipAddress,
                },
                ...(cc?.length && { cc }),
                ...(bcc?.length && { bcc }),
            });

            return { message: 'New device login email processed' };
        } catch (err: unknown) {
            this.logger.error(err, 'Failed to process new device login email');
            throw err;
        }
    }

    async processPublishTermPolicy(
        job: Job<
            INotificationEmailWorkerBulkPayload<INotificationPublishTermPolicyPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        try {
            const { type, version } = job.data.data;
            const users = await this.userRepository.findActive();
            const userChunks = this.helperService.arrayChunk(
                users,
                this.batchSize
            );

            for (const chunk of userChunks) {
                await this.awsSESService.sendBulk({
                    templateName: EnumNotificationProcess.publishTermPolicy,
                    recipients: chunk.map(u => ({
                        recipient: u.email,
                        templateData: { username: u.username },
                    })),
                    sender: this.noreplyEmail,
                    defaultTemplateData: {
                        ...this.defaultTemplateData,
                        type,
                        version,
                    },
                });

                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            return { message: 'Publish term policy email processed' };
        } catch (err: unknown) {
            this.logger.error(
                err,
                'Failed to process publish term policy email'
            );
            throw err;
        }
    }
}
