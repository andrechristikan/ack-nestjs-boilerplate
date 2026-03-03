import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HelperService } from '@common/helper/services/helper.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { INotificationEmailProcessorService } from '@modules/notification/interfaces/notification.email.processor.service.interface';
import {
    INotificationEmailSendPayload,
    INotificationForgotPasswordPayload,
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
    }

    // TODO: DONT FORGET TO CHECK USER SETTINGS BEFORE SENDING PUSH NOTIFICATIONS

    async processWelcome({
        email,
        username,
        bcc,
        cc,
    }: INotificationEmailSendPayload): Promise<IQueueResponse> {
        try {
            await this.awsSESService.send({
                templateName: EnumNotificationProcess.welcome,
                recipients: [email],
                sender: this.noreplyEmail,
                templateData: {
                    homeName: this.homeName,
                    supportEmail: title(this.supportEmail),
                    homeUrl: this.homeUrl,
                    username,
                    email: title(email),
                },
                cc,
                bcc,
            });

            return { message: 'Welcome email processed' };
        } catch (err: unknown) {
            this.logger.error(err);
            throw err;
        }
    }

    async processChangePassword({
        email,
        username,
        bcc,
        cc,
    }: INotificationEmailSendPayload): Promise<IQueueResponse> {
        try {
            await this.awsSESService.send({
                templateName: EnumNotificationProcess.changePassword,
                recipients: [email],
                sender: this.noreplyEmail,
                templateData: {
                    homeName: this.homeName,
                    supportEmail: this.supportEmail,
                    homeUrl: this.homeUrl,
                    username,
                },
                cc,
                bcc,
            });

            return { message: 'Change password email processed' };
        } catch (err: unknown) {
            this.logger.error(err);
            throw err;
        }
    }

    async processTemporaryPasswordByAdmin(
        { email, username, bcc, cc }: INotificationEmailSendPayload,
        {
            password: passwordString,
            passwordExpiredAt,
            passwordCreatedAt,
        }: INotificationTemporaryPasswordPayload
    ): Promise<IQueueResponse> {
        try {
            await this.awsSESService.send({
                templateName: EnumNotificationProcess.temporaryPasswordByAdmin,
                recipients: [email],
                sender: this.noreplyEmail,
                templateData: {
                    homeName: this.homeName,
                    supportEmail: title(this.supportEmail),
                    homeUrl: this.homeUrl,
                    username,
                    password: passwordString,
                    passwordExpiredAt: this.helperService.dateFormatToRFC2822(
                        this.helperService.dateCreateFromIso(passwordExpiredAt)
                    ),
                    passwordCreatedAt: this.helperService.dateFormatToRFC2822(
                        this.helperService.dateCreateFromIso(passwordCreatedAt)
                    ),
                },
                cc,
                bcc,
            });

            return { message: 'Temporary password email processed' };
        } catch (err: unknown) {
            this.logger.error(err);
            throw err;
        }
    }

    async processResetPassword({
        email,
        username,
        bcc,
        cc,
    }: INotificationEmailSendPayload): Promise<IQueueResponse> {
        try {
            await this.awsSESService.send({
                templateName: EnumNotificationProcess.resetPassword,
                recipients: [email],
                sender: this.noreplyEmail,
                templateData: {
                    homeName: this.homeName,
                    supportEmail: title(this.supportEmail),
                    homeUrl: this.homeUrl,
                    username,
                },
                cc,
                bcc,
            });

            return { message: 'Reset password email processed' };
        } catch (err: unknown) {
            this.logger.error(err);
            throw err;
        }
    }

    async processWelcomeByAdmin(
        { username, email }: INotificationEmailSendPayload,
        {
            password: passwordString,
            passwordExpiredAt,
            passwordCreatedAt,
        }: INotificationWelcomeByAdminPayload
    ): Promise<IQueueResponse> {
        try {
            await this.awsSESService.send({
                templateName: EnumNotificationProcess.welcomeByAdmin,
                recipients: [email],
                sender: this.noreplyEmail,
                templateData: {
                    homeName: this.homeName,
                    supportEmail: title(this.supportEmail),
                    homeUrl: this.homeUrl,
                    username,
                    email: title(email),
                    password: passwordString,
                    passwordExpiredAt: this.helperService.dateFormatToRFC2822(
                        this.helperService.dateCreateFromIso(passwordExpiredAt)
                    ),
                    passwordCreatedAt: this.helperService.dateFormatToRFC2822(
                        this.helperService.dateCreateFromIso(passwordCreatedAt)
                    ),
                },
            });

            return { message: 'Create by admin email processed' };
        } catch (err: unknown) {
            this.logger.error(err);
            throw err;
        }
    }

    async processForgotPassword(
        { username, email }: INotificationEmailSendPayload,
        {
            expiredAt,
            link,
            reference,
            expiredInMinutes,
        }: INotificationForgotPasswordPayload
    ): Promise<IQueueResponse> {
        try {
            await this.awsSESService.send({
                templateName: EnumNotificationProcess.forgotPassword,
                recipients: [email],
                sender: this.noreplyEmail,
                templateData: {
                    homeName: this.homeName,
                    supportEmail: title(this.supportEmail),
                    homeUrl: this.homeUrl,
                    username,
                    link,
                    expiredAt: this.helperService.dateFormatToRFC2822(
                        this.helperService.dateCreateFromIso(expiredAt)
                    ),
                    reference,
                    expiredInMinutes,
                },
            });

            return { message: 'Forgot password email processed' };
        } catch (err: unknown) {
            this.logger.error(err);
            throw err;
        }
    }

    async processVerificationEmail(
        { username, email }: INotificationEmailSendPayload,
        {
            expiredAt,
            reference,
            link,
            expiredInMinutes,
        }: INotificationVerificationEmailPayload
    ): Promise<IQueueResponse> {
        try {
            await this.awsSESService.send({
                templateName: EnumNotificationProcess.verificationEmail,
                recipients: [email],
                sender: this.noreplyEmail,
                templateData: {
                    homeName: this.homeName,
                    supportEmail: title(this.supportEmail),
                    homeUrl: this.homeUrl,
                    username,
                    link,
                    reference,
                    expiredAt: this.helperService.dateFormatToRFC2822(
                        this.helperService.dateCreateFromIso(expiredAt)
                    ),
                    expiredInMinutes,
                },
            });

            return { message: 'Verification email processed' };
        } catch (err: unknown) {
            this.logger.error(err);
            throw err;
        }
    }

    async processVerifiedEmail(
        { username, email }: INotificationEmailSendPayload,
        { reference }: INotificationVerifiedEmailPayload
    ): Promise<IQueueResponse> {
        try {
            await this.awsSESService.send({
                templateName: EnumNotificationProcess.verifiedEmail,
                recipients: [email],
                sender: this.noreplyEmail,
                templateData: {
                    homeName: this.homeName,
                    supportEmail: title(this.supportEmail),
                    homeUrl: this.homeUrl,
                    username,
                    reference,
                },
            });

            return { message: 'Email verified email processed' };
        } catch (err: unknown) {
            this.logger.error(err);
            throw err;
        }
    }

    async processVerifiedMobileNumber(
        { username, email }: INotificationEmailSendPayload,
        { reference, mobileNumber }: INotificationVerifiedMobileNumberPayload
    ): Promise<IQueueResponse> {
        try {
            await this.awsSESService.send({
                templateName: EnumNotificationProcess.verifiedMobileNumber,
                recipients: [email],
                sender: this.noreplyEmail,
                templateData: {
                    homeName: this.homeName,
                    supportEmail: title(this.supportEmail),
                    homeUrl: this.homeUrl,
                    username,
                    reference,
                    mobileNumber,
                },
            });

            return { message: 'Mobile number verified email processed' };
        } catch (err: unknown) {
            this.logger.error(err);
            throw err;
        }
    }

    async processResetTwoFactorByAdmin({
        username,
        email,
    }: INotificationEmailSendPayload): Promise<IQueueResponse> {
        try {
            await this.awsSESService.send({
                templateName: EnumNotificationProcess.resetTwoFactorByAdmin,
                recipients: [email],
                sender: this.noreplyEmail,
                templateData: {
                    homeName: this.homeName,
                    supportEmail: title(this.supportEmail),
                    homeUrl: this.homeUrl,
                    username,
                },
            });

            return {
                message: 'Reset two factor by admin email processed',
            };
        } catch (err: unknown) {
            this.logger.error(err);
            throw err;
        }
    }

    async processNewDeviceLogin(
        { username, email }: INotificationEmailSendPayload,
        {
            loginFrom,
            loginWith,
            loginAt,
            requestLog: { userAgent, ipAddress },
        }: INotificationNewDeviceLoginPayload
    ): Promise<IQueueResponse> {
        try {
            await this.awsSESService.send({
                templateName: EnumNotificationProcess.newDeviceLogin,
                recipients: [email],
                sender: this.noreplyEmail,
                templateData: {
                    homeName: this.homeName,
                    supportEmail: this.supportEmail,
                    homeUrl: this.homeUrl,
                    username,
                    loginFrom,
                    loginWith,
                    loginAt: this.helperService.dateFormatToRFC2822(loginAt),
                    userAgent: flatten(userAgent),
                    ipAddress,
                },
            });

            return { message: 'New device login email processed' };
        } catch (err: unknown) {
            this.logger.error(err);
            throw err;
        }
    }

    async processPublishTermPolicy({
        type,
        version,
    }: INotificationPublishTermPolicyPayload): Promise<IQueueResponse> {
        try {
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
                        templateData: {
                            username: u.username,
                        },
                    })),
                    sender: this.noreplyEmail,
                    defaultTemplateData: {
                        homeName: this.homeName,
                        supportEmail: this.supportEmail,
                        homeUrl: this.homeUrl,
                        type,
                        version,
                    },
                });

                // Add delay between batches to avoid hitting SES sending limits
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            return { message: 'Publish term policy email processed' };
        } catch (err: unknown) {
            this.logger.error(err);
            throw err;
        }
    }
}
