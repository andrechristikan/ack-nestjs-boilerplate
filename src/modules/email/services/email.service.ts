import { Injectable, Logger } from '@nestjs/common';
import { ENUM_SEND_EMAIL_PROCESS } from '@modules/email/enums/email.enum';
import { title } from 'case';
import { ConfigService } from '@nestjs/config';
import { IEmailService } from '@modules/email/interfaces/email.service.interface';
import { EmailSendDto } from '@modules/email/dtos/email.send.dto';
import { EmailTempPasswordDto } from '@modules/email/dtos/email.temp-password.dto';
import { EmailResetPasswordDto } from '@modules/email/dtos/email.reset-password.dto';
import { EmailVerificationDto } from '@modules/email/dtos/email.verification.dto';
import { EmailVerifiedDto } from '@modules/email/dtos/email.verified.dto';
import { EmailMobileNumberVerifiedDto } from '@modules/email/dtos/email.mobile-number-verified.dto';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HelperService } from '@common/helper/services/helper.service';
import { EmailCreateByAdminDto } from '@modules/email/dtos/email.create-by-admin.dto';

/**
 * Service for handling email operations using AWS SES
 * Provides methods to send various types of emails like welcome, password reset, verification, etc.
 */
// TODO: SEND EMAIL FROM THIS SERVICE USING QUEUE SYSTEM. eg: sendChangePasswordWithQueue
@Injectable()
export class EmailService implements IEmailService {
    private readonly logger = new Logger(EmailService.name);

    private readonly fromEmail: string;
    private readonly supportEmail: string;

    private readonly homeName: string;
    private readonly homeUrl: string;

    constructor(
        private readonly awsSESService: AwsSESService,
        private readonly helperService: HelperService,
        private readonly configService: ConfigService
    ) {
        this.fromEmail = this.configService.get<string>('email.fromEmail');
        this.supportEmail =
            this.configService.get<string>('email.supportEmail');

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
                templateName: ENUM_SEND_EMAIL_PROCESS.CHANGE_PASSWORD,
                recipients: [email],
                sender: this.fromEmail,
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
                templateName: ENUM_SEND_EMAIL_PROCESS.WELCOME,
                recipients: [email],
                sender: this.fromEmail,
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
                templateName: ENUM_SEND_EMAIL_PROCESS.WELCOME,
                recipients: [email],
                sender: this.fromEmail,
                templateData: {
                    homeName: this.homeName,
                    supportEmail: title(this.supportEmail),
                    homeUrl: this.homeUrl,
                    username,
                    email: title(email),
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
                templateName: ENUM_SEND_EMAIL_PROCESS.TEMPORARY_PASSWORD,
                recipients: [email],
                sender: this.fromEmail,
                templateData: {
                    homeName: this.homeName,
                    supportEmail: title(this.supportEmail),
                    homeUrl: this.homeUrl,
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
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }

    /**
     * Send password reset email with reset link
     * @param {EmailSendDto} emailData - Email and username data
     * @param {EmailResetPasswordDto} resetData - Reset password link and expiration data
     * @returns {Promise<boolean>} True if email sent successfully, false otherwise
     */
    async sendResetPassword(
        { username, email }: EmailSendDto,
        { expiredDate, link }: EmailResetPasswordDto
    ): Promise<boolean> {
        try {
            await this.awsSESService.send({
                templateName: ENUM_SEND_EMAIL_PROCESS.RESET_PASSWORD,
                recipients: [email],
                sender: this.fromEmail,
                templateData: {
                    homeName: this.homeName,
                    supportEmail: title(this.supportEmail),
                    homeUrl: this.homeUrl,
                    username,
                    link,
                    expiredDate:
                        this.helperService.dateFormatToRFC2822(expiredDate),
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
        { expiredAt, reference, token, link }: EmailVerificationDto
    ): Promise<boolean> {
        try {
            await this.awsSESService.send({
                templateName: ENUM_SEND_EMAIL_PROCESS.VERIFICATION,
                recipients: [email],
                sender: this.fromEmail,
                templateData: {
                    homeName: this.homeName,
                    supportEmail: title(this.supportEmail),
                    homeUrl: this.homeUrl,
                    username,
                    link,
                    token,
                    reference,
                    expiredAt:
                        this.helperService.dateFormatToRFC2822(expiredAt),
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
                templateName: ENUM_SEND_EMAIL_PROCESS.EMAIL_VERIFIED,
                recipients: [email],
                sender: this.fromEmail,
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
                templateName: ENUM_SEND_EMAIL_PROCESS.MOBILE_NUMBER_VERIFIED,
                recipients: [email],
                sender: this.fromEmail,
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
}
