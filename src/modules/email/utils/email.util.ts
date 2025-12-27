import { Injectable, Logger } from '@nestjs/common';
import { EnumSendEmailProcess } from '@modules/email/enums/email.enum';
import { title } from 'case';
import { ConfigService } from '@nestjs/config';
import { EmailSendDto } from '@modules/email/dtos/email.send.dto';
import { EmailTempPasswordDto } from '@modules/email/dtos/email.temp-password.dto';
import { EmailVerificationDto } from '@modules/email/dtos/email.verification.dto';
import { EmailVerifiedDto } from '@modules/email/dtos/email.verified.dto';
import { EmailMobileNumberVerifiedDto } from '@modules/email/dtos/email.mobile-number-verified.dto';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HelperService } from '@common/helper/services/helper.service';
import { EmailCreateByAdminDto } from '@modules/email/dtos/email.create-by-admin.dto';
import { EmailForgotPasswordDto } from '@modules/email/dtos/email.forgot-password.dto';

/**
 * Util for handling email operations using AWS SES
 * Provides methods to send various types of emails like welcome, forgot password, verification, etc.
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
     * Send change password notification email
     * @param {EmailSendDto} emailData - Email and username data
     * @returns {Promise<boolean>} True if email sent successfully, false otherwise
     */
    async sendChangePassword({
        username,
        email,
    }: EmailSendDto): Promise<boolean> {
        try {
            await this.awsSESService.send({
                templateName: EnumSendEmailProcess.changePassword,
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
     * Send welcome email to new users
     * @param {EmailSendDto} emailData - Email and username data
     * @returns {Promise<boolean>} True if email sent successfully, false otherwise
     */
    async sendWelcome({ username, email }: EmailSendDto): Promise<boolean> {
        try {
            await this.awsSESService.send({
                templateName: EnumSendEmailProcess.welcome,
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
     * Send email notification when user is created by admin
     * @param {EmailSendDto} emailData - Email and username data
     * @param {EmailCreateByAdminDto} passwordData - Password information including expiration dates
     * @returns {Promise<boolean>} True if email sent successfully, false otherwise
     */
    async sendCreateByAdmin(
        { username, email }: EmailSendDto,
        {
            password: passwordString,
            passwordExpiredAt,
            passwordCreatedAt,
        }: EmailCreateByAdminDto
    ): Promise<boolean> {
        try {
            await this.awsSESService.send({
                templateName: EnumSendEmailProcess.createByAdmin,
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
     * Send temporary password email
     * @param {EmailSendDto} emailData - Email and username data
     * @param {EmailTempPasswordDto} passwordData - Temporary password information including expiration dates
     * @returns {Promise<boolean>} True if email sent successfully, false otherwise
     */
    async sendTempPassword(
        { username, email }: EmailSendDto,
        {
            password: passwordString,
            passwordExpiredAt,
            passwordCreatedAt,
        }: EmailTempPasswordDto
    ): Promise<boolean> {
        try {
            await this.awsSESService.send({
                templateName: EnumSendEmailProcess.temporaryPassword,
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
     * Send forgot password email with link
     * @param {EmailSendDto} emailData - Email and username data
     * @param {EmailForgotPasswordDto} forgotPasswordData - Forgot password link and expiration data
     * @returns {Promise<boolean>} True if email sent successfully, false otherwise
     */
    async sendForgotPassword(
        { username, email }: EmailSendDto,
        { expiredAt, link, reference, expiredInMinutes }: EmailForgotPasswordDto
    ): Promise<boolean> {
        try {
            await this.awsSESService.send({
                templateName: EnumSendEmailProcess.forgotPassword,
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
     * Send email verification message
     * @param {EmailSendDto} emailData - Email and username data
     * @param {EmailVerificationDto} verificationData - Verification token, link, reference and expiration data
     * @returns {Promise<boolean>} True if email sent successfully, false otherwise
     */
    async sendVerification(
        { username, email }: EmailSendDto,
        { expiredAt, reference, link, expiredInMinutes }: EmailVerificationDto
    ): Promise<boolean> {
        try {
            await this.awsSESService.send({
                templateName: EnumSendEmailProcess.verification,
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
     * Send email verified confirmation
     * @param {EmailSendDto} emailData - Email and username data
     * @param {EmailVerifiedDto} verifiedData - Verification reference data
     * @returns {Promise<boolean>} True if email sent successfully, false otherwise
     */
    async sendEmailVerified(
        { username, email }: EmailSendDto,
        { reference }: EmailVerifiedDto
    ): Promise<boolean> {
        try {
            await this.awsSESService.send({
                templateName: EnumSendEmailProcess.emailVerified,
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
     * Send mobile number verified confirmation email
     * @param {EmailSendDto} emailData - Email and username data
     * @param {EmailMobileNumberVerifiedDto} mobileData - Mobile number and reference data
     * @returns {Promise<boolean>} True if email sent successfully, false otherwise
     */
    async sendMobileNumberVerified(
        { username, email }: EmailSendDto,
        { reference, mobileNumber }: EmailMobileNumberVerifiedDto
    ): Promise<boolean> {
        try {
            await this.awsSESService.send({
                templateName: EnumSendEmailProcess.mobileNumberVerified,
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
     * Send email notification when 2FA is reset by admin
     * @param {EmailSendDto} emailData - Email and username data
     * @returns {Promise<boolean>} True if email sent successfully, false otherwise
     */
    async sendResetTwoFactorByAdmin({
        username,
        email,
    }: EmailSendDto): Promise<boolean> {
        try {
            await this.awsSESService.send({
                templateName: EnumSendEmailProcess.resetTwoFactorByAdmin,
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
}
