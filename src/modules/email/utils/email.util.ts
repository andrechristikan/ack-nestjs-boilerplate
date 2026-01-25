import { Injectable, Logger } from '@nestjs/common';
import { EnumEmailProcess } from '@modules/email/enums/email.enum';
import { title } from 'case';
import { ConfigService } from '@nestjs/config';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HelperService } from '@common/helper/services/helper.service';
import { flatten } from 'flat';
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

/**
 * Email utility service for handling various email operations using AWS SES.
 * Provides methods to send transactional emails including welcome, password reset,
 * verification, and security notification emails.
 */
@Injectable()
export class EmailUtil {
    private readonly logger = new Logger(EmailUtil.name);

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

    /**
     * Sends a change password notification email to the user.
     *
     * @param {IEmailSendPayload} emailData - The recipient's email and username
     * @returns {Promise<boolean>} True if email sent successfully, false otherwise
     */
    async sendChangePassword({
        username,
        email,
    }: IEmailSendPayload): Promise<boolean> {
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
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    /**
     * Sends a welcome email to newly registered users.
     *
     * @param {IEmailSendPayload} emailData - The recipient's email and username
     * @returns {Promise<boolean>} True if email sent successfully, false otherwise
     */
    async sendWelcome({
        username,
        email,
    }: IEmailSendPayload): Promise<boolean> {
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
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    /**
     * Sends an email notification when a user account is created by admin.
     * Contains the temporary password and expiration information.
     *
     * @param {IEmailSendPayload} emailData - The recipient's email and username
     * @param {ICreateByAdminPayload} passwordData - Temporary password and expiration dates
     * @returns {Promise<boolean>} True if email sent successfully, false otherwise
     */
    async sendCreateByAdmin(
        { username, email }: IEmailSendPayload,
        {
            password: passwordString,
            passwordExpiredAt,
            passwordCreatedAt,
        }: ICreateByAdminPayload
    ): Promise<boolean> {
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

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    /**
     * Sends a temporary password email to a user.
     *
     * @param {IEmailSendPayload} emailData - The recipient's email and username
     * @param {IEmailTempPasswordPayload} passwordData - Temporary password and expiration dates
     * @returns {Promise<boolean>} True if email sent successfully, false otherwise
     */
    async sendTempPassword(
        { username, email }: IEmailSendPayload,
        {
            password: passwordString,
            passwordExpiredAt,
            passwordCreatedAt,
        }: IEmailTempPasswordPayload
    ): Promise<boolean> {
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
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    /**
     * Sends a forgot password email with password reset link.
     *
     * @param {IEmailSendPayload} emailData - The recipient's email and username
     * @param {IEmailForgotPasswordPayload} forgotPasswordData - Password reset link and expiration data
     * @returns {Promise<boolean>} True if email sent successfully, false otherwise
     */
    async sendForgotPassword(
        { username, email }: IEmailSendPayload,
        {
            expiredAt,
            link,
            reference,
            expiredInMinutes,
        }: IEmailForgotPasswordPayload
    ): Promise<boolean> {
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

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    /**
     * Sends an email verification message with confirmation link.
     *
     * @param {IEmailSendPayload} emailData - The recipient's email and username
     * @param {IEmailVerificationPayload} verificationData - Verification link and expiration data
     * @returns {Promise<boolean>} True if email sent successfully, false otherwise
     */
    async sendVerification(
        { username, email }: IEmailSendPayload,
        {
            expiredAt,
            reference,
            link,
            expiredInMinutes,
        }: IEmailVerificationPayload
    ): Promise<boolean> {
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

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    /**
     * Sends a confirmation email after successful email verification.
     *
     * @param {IEmailSendPayload} emailData - The recipient's email and username
     * @param {IEmailVerifiedPayload} verifiedData - Verification reference data
     * @returns {Promise<boolean>} True if email sent successfully, false otherwise
     */
    async sendEmailVerified(
        { username, email }: IEmailSendPayload,
        { reference }: IEmailVerifiedPayload
    ): Promise<boolean> {
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

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    /**
     * Sends a confirmation email after successful mobile number verification.
     *
     * @param {IEmailSendPayload} emailData - The recipient's email and username
     * @param {IEmailMobileNumberVerifiedPayload} mobileData - Mobile number and reference data
     * @returns {Promise<boolean>} True if email sent successfully, false otherwise
     */
    async sendMobileNumberVerified(
        { username, email }: IEmailSendPayload,
        { reference, mobileNumber }: IEmailMobileNumberVerifiedPayload
    ): Promise<boolean> {
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

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    /**
     * Sends an email notification when 2FA is reset by admin.
     *
     * @param {IEmailSendPayload} emailData - The recipient's email and username
     * @returns {Promise<boolean>} True if email sent successfully, false otherwise
     */
    async sendResetTwoFactorByAdmin({
        username,
        email,
    }: IEmailSendPayload): Promise<boolean> {
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

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    /**
     * Sends a security alert email when a new login is detected.
     *
     * @param {IEmailSendPayload} emailData - The recipient's email and username
     * @param {IEmailNewLoginPayload} loginData - Login information including location, device, and time
     * @returns {Promise<boolean>} True if email sent successfully, false otherwise
     */
    async sendNewLogin(
        { username, email }: IEmailSendPayload,
        {
            loginFrom,
            loginWith,
            loginAt,
            userAgent,
            ipAddress,
        }: IEmailNewLoginPayload
    ): Promise<boolean> {
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

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }
}
