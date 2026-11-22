import { TemplateDoesNotExistException } from '@aws-sdk/client-ses';
import type { GetTemplateCommandOutput } from '@aws-sdk/client-ses';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type {
    INotificationTemplateEmail,
    INotificationTemplateName,
} from '@modules/notification/interfaces/notification.interface';
import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class NotificationTemplateService {
    constructor(private readonly awsSESService: AwsSESService) {}

    private toTemplateLabel(name: INotificationTemplateName): string {
        return name.replace(/[A-Z]/g, letter => ` ${letter.toLowerCase()}`);
    }

    private getTemplateEmail(
        name: INotificationTemplateName
    ): INotificationTemplateEmail {
        const templateDir = join(import.meta.dirname, '../templates');

        switch (name) {
            case EnumNotificationKind.welcome:
                return {
                    subject: 'Welcome',
                    htmlBody: readFileSync(
                        join(templateDir, 'notification.welcome.template.hbs'),
                        'utf8'
                    ),
                };
            case EnumNotificationKind.welcomeSocial:
                return {
                    subject: 'Welcome Social',
                    htmlBody: readFileSync(
                        join(
                            templateDir,
                            'notification.welcome-social.template.hbs'
                        ),
                        'utf8'
                    ),
                };
            case EnumNotificationKind.welcomeByAdmin:
                return {
                    subject: 'Welcome By Admin',
                    htmlBody: readFileSync(
                        join(
                            templateDir,
                            'notification.welcome-by-admin.template.hbs'
                        ),
                        'utf8'
                    ),
                };
            case EnumNotificationKind.verificationEmail:
                return {
                    subject: 'Email Verification',
                    htmlBody: readFileSync(
                        join(
                            templateDir,
                            'notification.verification-email.template.hbs'
                        ),
                        'utf8'
                    ),
                };
            case EnumNotificationKind.reauthenticationOtp:
                return {
                    subject: 'Confirmation Code',
                    htmlBody: readFileSync(
                        join(
                            templateDir,
                            'notification.reauthentication-otp.template.hbs'
                        ),
                        'utf8'
                    ),
                };
            case EnumNotificationKind.verifiedEmail:
                return {
                    subject: 'Email Verified',
                    htmlBody: readFileSync(
                        join(
                            templateDir,
                            'notification.verified-email.template.hbs'
                        ),
                        'utf8'
                    ),
                };
            case EnumNotificationKind.verifiedMobileNumber:
                return {
                    subject: 'MobileNumber Verified',
                    htmlBody: readFileSync(
                        join(
                            templateDir,
                            'notification.verified-mobile-number.template.hbs'
                        ),
                        'utf8'
                    ),
                };
            case EnumNotificationKind.changePassword:
                return {
                    subject: 'Change Password',
                    htmlBody: readFileSync(
                        join(
                            templateDir,
                            'notification.change-password.template.hbs'
                        ),
                        'utf8'
                    ),
                };
            case EnumNotificationKind.temporaryPasswordByAdmin:
                return {
                    subject: 'Temporary Password By Admin',
                    htmlBody: readFileSync(
                        join(
                            templateDir,
                            'notification.temporary-password-by-admin.template.hbs'
                        ),
                        'utf8'
                    ),
                };
            case EnumNotificationKind.resetPassword:
                return {
                    subject: 'Reset Password',
                    htmlBody: readFileSync(
                        join(
                            templateDir,
                            'notification.reset-password.template.hbs'
                        ),
                        'utf8'
                    ),
                };
            case EnumNotificationKind.forgotPassword:
                return {
                    subject: 'Forgot Password',
                    htmlBody: readFileSync(
                        join(
                            templateDir,
                            'notification.forgot-password.template.hbs'
                        ),
                        'utf8'
                    ),
                };
            case EnumNotificationKind.resetMfaByAdmin:
                return {
                    subject: 'Reset Two Factor By Admin',
                    htmlBody: readFileSync(
                        join(
                            templateDir,
                            'notification.reset-mfa-by-admin.template.hbs'
                        ),
                        'utf8'
                    ),
                };
            case EnumNotificationKind.loginLocked:
                return {
                    subject: 'Login Locked',
                    htmlBody: readFileSync(
                        join(
                            templateDir,
                            'notification.login-locked.template.hbs'
                        ),
                        'utf8'
                    ),
                };
            case EnumNotificationKind.newDeviceLogin:
                return {
                    subject: 'Device Login',
                    htmlBody: readFileSync(
                        join(
                            templateDir,
                            'notification.new-device-login.template.hbs'
                        ),
                        'utf8'
                    ),
                };
            case EnumNotificationKind.publishTermPolicy:
                return {
                    subject: 'Publish Term Policy',
                    htmlBody: readFileSync(
                        join(
                            templateDir,
                            'notification.publish-term-policy.template.hbs'
                        ),
                        'utf8'
                    ),
                };
            case EnumNotificationKind.userImportResult:
                return {
                    subject: 'User Import Result',
                    htmlBody: readFileSync(
                        join(
                            templateDir,
                            'notification.user-import-result.template.hbs'
                        ),
                        'utf8'
                    ),
                };
            case EnumNotificationKind.userExportResult:
                return {
                    subject: 'User Export Result',
                    htmlBody: readFileSync(
                        join(
                            templateDir,
                            'notification.user-export-result.template.hbs'
                        ),
                        'utf8'
                    ),
                };
            case EnumNotificationKind.workspaceInvite:
                return {
                    subject: 'Workspace Invitation',
                    htmlBody: readFileSync(
                        join(
                            templateDir,
                            'notification.workspace-invite.template.hbs'
                        ),
                        'utf8'
                    ),
                };
            case EnumNotificationKind.workspaceJoinRequest:
                return {
                    subject: 'New Workspace Join Request',
                    htmlBody: readFileSync(
                        join(
                            templateDir,
                            'notification.workspace-join-request.template.hbs'
                        ),
                        'utf8'
                    ),
                };
            case EnumNotificationKind.workspaceJoinAccepted:
                return {
                    subject: 'Workspace Join Request Accepted',
                    htmlBody: readFileSync(
                        join(
                            templateDir,
                            'notification.workspace-join-accepted.template.hbs'
                        ),
                        'utf8'
                    ),
                };
            case EnumNotificationKind.workspaceJoinRejected:
                return {
                    subject: 'Workspace Join Request Rejected',
                    htmlBody: readFileSync(
                        join(
                            templateDir,
                            'notification.workspace-join-rejected.template.hbs'
                        ),
                        'utf8'
                    ),
                };
        }
    }

    async emailImport(name: INotificationTemplateName): Promise<void> {
        try {
            const template = this.getTemplateEmail(name);

            await this.awsSESService.createTemplate({
                name,
                subject: template.subject,
                htmlBody: template.htmlBody,
            });
        } catch (err: unknown) {
            const label = this.toTemplateLabel(name);
            throw new AppUnknownException(
                err,
                `Failed to import ${label} template`
            );
        }
    }

    async getEmail(
        name: INotificationTemplateName
    ): Promise<GetTemplateCommandOutput | null> {
        try {
            return await this.awsSESService.getTemplate({ name });
        } catch (err: unknown) {
            if (err instanceof TemplateDoesNotExistException) {
                return null;
            }

            const label = this.toTemplateLabel(name);
            throw new AppUnknownException(
                err,
                `Failed to get ${label} template`
            );
        }
    }

    async emailDelete(name: INotificationTemplateName): Promise<void> {
        try {
            await this.awsSESService.deleteTemplate({ name });
        } catch (err: unknown) {
            const label = this.toTemplateLabel(name);
            throw new AppUnknownException(
                err,
                `Failed to delete ${label} template`
            );
        }
    }
}
