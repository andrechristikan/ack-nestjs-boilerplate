import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HelperService } from '@common/helper/services/helper.service';
import { EnumEmailProcess } from '@modules/email/enums/email.enum';
import {
    ICreateByAdminPayload,
    IEmailForgotPasswordPayload,
    IEmailMobileNumberVerifiedPayload,
    IEmailNewLoginPayload,
    IEmailSendPayload,
    IEmailTempPasswordPayload,
    IEmailVerificationPayload,
    IEmailVerifiedPayload,
} from '@modules/email/interfaces/email.interface';
import { IEmailProcessorService } from '@modules/email/interfaces/email.processor.service.interface';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { title } from 'case';
import { flatten } from 'flat';
import { IQueueResponse } from 'src/queues/interfaces/queue.interface';

@Injectable()
export class EmailProcessorService implements IEmailProcessorService {
    private readonly logger = new Logger(EmailProcessorService.name);

    private readonly noreplyEmail: string;
    private readonly supportEmail: string;

    private readonly homeName: string;
    private readonly homeUrl: string;

    constructor(
        private readonly awsSESService: AwsSESService,
        private readonly helperService: HelperService,
        private readonly configService: ConfigService
    ) {
        this.noreplyEmail = this.configService.get<string>('email.noreply');
        this.supportEmail = this.configService.get<string>('email.support');

        this.homeName = this.configService.get<string>('home.name');
        this.homeUrl = this.configService.get<string>('home.url');
    }

    async processWelcome({
        email,
        username,
        bcc,
        cc,
    }: IEmailSendPayload): Promise<IQueueResponse> {
        try {
            await this.awsSESService.send({
                templateName: EnumEmailProcess.welcome,
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
    }: IEmailSendPayload): Promise<IQueueResponse> {
        try {
            await this.awsSESService.send({
                templateName: EnumEmailProcess.changePassword,
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

    async processTempPassword(
        { email, username, bcc, cc }: IEmailSendPayload,
        {
            password: passwordString,
            passwordExpiredAt,
            passwordCreatedAt,
        }: IEmailTempPasswordPayload
    ): Promise<IQueueResponse> {
        try {
            await this.awsSESService.send({
                templateName: EnumEmailProcess.temporaryPassword,
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

    async processCreateByAdmin(
        { username, email }: IEmailSendPayload,
        {
            password: passwordString,
            passwordExpiredAt,
            passwordCreatedAt,
        }: ICreateByAdminPayload
    ): Promise<IQueueResponse> {
        try {
            await this.awsSESService.send({
                templateName: EnumEmailProcess.createByAdmin,
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
        { username, email }: IEmailSendPayload,
        {
            expiredAt,
            link,
            reference,
            expiredInMinutes,
        }: IEmailForgotPasswordPayload
    ): Promise<IQueueResponse> {
        try {
            await this.awsSESService.send({
                templateName: EnumEmailProcess.forgotPassword,
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

    async processVerification(
        { username, email }: IEmailSendPayload,
        {
            expiredAt,
            reference,
            link,
            expiredInMinutes,
        }: IEmailVerificationPayload
    ): Promise<IQueueResponse> {
        try {
            await this.awsSESService.send({
                templateName: EnumEmailProcess.verification,
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

    async processEmailVerified(
        { username, email }: IEmailSendPayload,
        { reference }: IEmailVerifiedPayload
    ): Promise<IQueueResponse> {
        try {
            await this.awsSESService.send({
                templateName: EnumEmailProcess.emailVerified,
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

    async processMobileNumberVerified(
        { username, email }: IEmailSendPayload,
        { reference, mobileNumber }: IEmailMobileNumberVerifiedPayload
    ): Promise<IQueueResponse> {
        try {
            await this.awsSESService.send({
                templateName: EnumEmailProcess.mobileNumberVerified,
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
    }: IEmailSendPayload): Promise<IQueueResponse> {
        try {
            await this.awsSESService.send({
                templateName: EnumEmailProcess.resetTwoFactorByAdmin,
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

    async processNewLoginNotification(
        { username, email }: IEmailSendPayload,
        {
            loginFrom,
            loginWith,
            loginAt,
            requestLog: { userAgent, ipAddress },
        }: IEmailNewLoginPayload
    ): Promise<IQueueResponse> {
        try {
            await this.awsSESService.send({
                templateName: EnumEmailProcess.newLogin,
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

            return { message: 'New login notification email processed' };
        } catch (err: unknown) {
            this.logger.error(err);
            throw err;
        }
    }
}
