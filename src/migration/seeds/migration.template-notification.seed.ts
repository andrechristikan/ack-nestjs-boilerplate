import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import type { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationTemplateService } from '@modules/notification/services/notification.template.service';
import { Logger } from '@nestjs/common';
import { Command } from 'nest-commander';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

@Command({
    name: 'templateEmailNotification',
    description: 'Seed/Remove Emails',
    allowUnknownOptions: false,
})
export class MigrationTemplateEmailNotificationSeed
    extends MigrationSeedBase
    implements IMigrationSeed
{
    private readonly logger = new Logger(
        MigrationTemplateEmailNotificationSeed.name
    );

    constructor(
        private readonly notificationTemplateService: NotificationTemplateService,
        private readonly awsSESService: AwsSESService
    ) {
        super();
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Emails...');

        const isSESInitialized = this.awsSESService.isInitialized();
        if (!isSESInitialized) {
            this.logger.warn(
                'AWS SES is not configured. Skipping email template seed.'
            );

            return;
        }

        const [
            changePasswordEmail,
            welcomeSocialEmail,
            welcomeByAdminEmail,
            emailVerifiedEmail,
            forgotPasswordEmail,
            mobileNumberVerifiedEmail,
            tempPasswordEmail,
            verificationEmail,
            welcomeEmail,
            resetTwoFactorByAdminEmail,
            newDeviceLoginEmail,
            loginLockedEmail,
            publishTermPolicyEmail,
            userImportResultEmail,
            resetPasswordEmail,
            workspaceInviteEmail,
            workspaceJoinRequestEmail,
            workspaceJoinAcceptedEmail,
            workspaceJoinRejectedEmail,
            reauthenticationOtpEmail,
        ] = await Promise.all([
            this.notificationTemplateService.emailGet(
                EnumNotificationKind.changePassword
            ),
            this.notificationTemplateService.emailGet(
                EnumNotificationKind.welcomeSocial
            ),
            this.notificationTemplateService.emailGet(
                EnumNotificationKind.welcomeByAdmin
            ),
            this.notificationTemplateService.emailGet(
                EnumNotificationKind.verifiedEmail
            ),
            this.notificationTemplateService.emailGet(
                EnumNotificationKind.forgotPassword
            ),
            this.notificationTemplateService.emailGet(
                EnumNotificationKind.verifiedMobileNumber
            ),
            this.notificationTemplateService.emailGet(
                EnumNotificationKind.temporaryPasswordByAdmin
            ),
            this.notificationTemplateService.emailGet(
                EnumNotificationKind.verificationEmail
            ),
            this.notificationTemplateService.emailGet(
                EnumNotificationKind.welcome
            ),
            this.notificationTemplateService.emailGet(
                EnumNotificationKind.resetTwoFactorByAdmin
            ),
            this.notificationTemplateService.emailGet(
                EnumNotificationKind.newDeviceLogin
            ),
            this.notificationTemplateService.emailGet(
                EnumNotificationKind.loginLocked
            ),
            this.notificationTemplateService.emailGet(
                EnumNotificationKind.publishTermPolicy
            ),
            this.notificationTemplateService.emailGet(
                EnumNotificationKind.userImportResult
            ),
            this.notificationTemplateService.emailGet(
                EnumNotificationKind.resetPassword
            ),
            this.notificationTemplateService.emailGet(
                EnumNotificationKind.workspaceInvite
            ),
            this.notificationTemplateService.emailGet(
                EnumNotificationKind.workspaceJoinRequest
            ),
            this.notificationTemplateService.emailGet(
                EnumNotificationKind.workspaceJoinAccepted
            ),
            this.notificationTemplateService.emailGet(
                EnumNotificationKind.workspaceJoinRejected
            ),
            this.notificationTemplateService.emailGet(
                EnumNotificationKind.reauthenticationOtp
            ),
        ]);

        const promises: Promise<void>[] = [];
        if (!changePasswordEmail) {
            this.logger.log(
                'Change Password Email template missing, importing...'
            );
            const changePasswordEmailImport =
                this.notificationTemplateService.emailImport(
                    EnumNotificationKind.changePassword
                );
            promises.push(changePasswordEmailImport);
        }

        if (!welcomeSocialEmail) {
            this.logger.log(
                'Welcome Social Email template missing, importing...'
            );
            const welcomeSocialEmailImport =
                this.notificationTemplateService.emailImport(
                    EnumNotificationKind.welcomeSocial
                );
            promises.push(welcomeSocialEmailImport);
        }

        if (!welcomeByAdminEmail) {
            this.logger.log(
                'Welcome By Admin Email template missing, importing...'
            );
            const welcomeByAdminEmailImport =
                this.notificationTemplateService.emailImport(
                    EnumNotificationKind.welcomeByAdmin
                );
            promises.push(welcomeByAdminEmailImport);
        }

        if (!emailVerifiedEmail) {
            this.logger.log(
                'Email Verified Email template missing, importing...'
            );
            const emailVerifiedEmailImport =
                this.notificationTemplateService.emailImport(
                    EnumNotificationKind.verifiedEmail
                );
            promises.push(emailVerifiedEmailImport);
        }

        if (!forgotPasswordEmail) {
            this.logger.log(
                'Forgot Password Email template missing, importing...'
            );
            const forgotPasswordEmailImport =
                this.notificationTemplateService.emailImport(
                    EnumNotificationKind.forgotPassword
                );
            promises.push(forgotPasswordEmailImport);
        }

        if (!mobileNumberVerifiedEmail) {
            this.logger.log(
                'Mobile Number Verified Email template missing, importing...'
            );
            const mobileNumberVerifiedEmailImport =
                this.notificationTemplateService.emailImport(
                    EnumNotificationKind.verifiedMobileNumber
                );
            promises.push(mobileNumberVerifiedEmailImport);
        }

        if (!tempPasswordEmail) {
            this.logger.log(
                'Temporary Password Email template missing, importing...'
            );
            const tempPasswordEmailImport =
                this.notificationTemplateService.emailImport(
                    EnumNotificationKind.temporaryPasswordByAdmin
                );
            promises.push(tempPasswordEmailImport);
        }

        if (!verificationEmail) {
            this.logger.log(
                'Verification Email template missing, importing...'
            );
            const verificationEmailImport =
                this.notificationTemplateService.emailImport(
                    EnumNotificationKind.verificationEmail
                );
            promises.push(verificationEmailImport);
        }

        if (!welcomeEmail) {
            this.logger.log('Welcome Email template missing, importing...');
            const welcomeEmailImport =
                this.notificationTemplateService.emailImport(
                    EnumNotificationKind.welcome
                );
            promises.push(welcomeEmailImport);
        }

        if (!resetTwoFactorByAdminEmail) {
            this.logger.log(
                'Reset Two Factor By Admin Email template missing, importing...'
            );
            const resetTwoFactorByAdminEmailImport =
                this.notificationTemplateService.emailImport(
                    EnumNotificationKind.resetTwoFactorByAdmin
                );
            promises.push(resetTwoFactorByAdminEmailImport);
        }

        if (!loginLockedEmail) {
            this.logger.log(
                'Login Locked Email template missing, importing...'
            );
            const loginLockedEmailImport =
                this.notificationTemplateService.emailImport(
                    EnumNotificationKind.loginLocked
                );
            promises.push(loginLockedEmailImport);
        }

        if (!newDeviceLoginEmail) {
            this.logger.log(
                'New Device Login Email template missing, importing...'
            );
            const newDeviceLoginEmailImport =
                this.notificationTemplateService.emailImport(
                    EnumNotificationKind.newDeviceLogin
                );
            promises.push(newDeviceLoginEmailImport);
        }

        if (!publishTermPolicyEmail) {
            this.logger.log(
                'Publish Term Policy Email template missing, importing...'
            );
            const publishTermPolicyEmailImport =
                this.notificationTemplateService.emailImport(
                    EnumNotificationKind.publishTermPolicy
                );
            promises.push(publishTermPolicyEmailImport);
        }

        if (!userImportResultEmail) {
            this.logger.log(
                'User Import Result Email template missing, importing...'
            );
            const userImportResultEmailImport =
                this.notificationTemplateService.emailImport(
                    EnumNotificationKind.userImportResult
                );
            promises.push(userImportResultEmailImport);
        }

        if (!resetPasswordEmail) {
            this.logger.log(
                'Reset Password Email template missing, importing...'
            );
            const resetPasswordEmailImport =
                this.notificationTemplateService.emailImport(
                    EnumNotificationKind.resetPassword
                );
            promises.push(resetPasswordEmailImport);
        }

        if (!workspaceInviteEmail) {
            this.logger.log(
                'Workspace Invite Email template missing, importing...'
            );
            const workspaceInviteEmailImport =
                this.notificationTemplateService.emailImport(
                    EnumNotificationKind.workspaceInvite
                );
            promises.push(workspaceInviteEmailImport);
        }

        if (!workspaceJoinRequestEmail) {
            this.logger.log(
                'Workspace Join Request Email template missing, importing...'
            );
            const workspaceJoinRequestEmailImport =
                this.notificationTemplateService.emailImport(
                    EnumNotificationKind.workspaceJoinRequest
                );
            promises.push(workspaceJoinRequestEmailImport);
        }

        if (!workspaceJoinAcceptedEmail) {
            this.logger.log(
                'Workspace Join Accepted Email template missing, importing...'
            );
            const workspaceJoinAcceptedEmailImport =
                this.notificationTemplateService.emailImport(
                    EnumNotificationKind.workspaceJoinAccepted
                );
            promises.push(workspaceJoinAcceptedEmailImport);
        }

        if (!workspaceJoinRejectedEmail) {
            this.logger.log(
                'Workspace Join Rejected Email template missing, importing...'
            );
            const workspaceJoinRejectedEmailImport =
                this.notificationTemplateService.emailImport(
                    EnumNotificationKind.workspaceJoinRejected
                );
            promises.push(workspaceJoinRejectedEmailImport);
        }

        if (!reauthenticationOtpEmail) {
            this.logger.log(
                'Reauthentication Otp Email template missing, importing...'
            );
            const reauthenticationOtpEmailImport =
                this.notificationTemplateService.emailImport(
                    EnumNotificationKind.reauthenticationOtp
                );
            promises.push(reauthenticationOtpEmailImport);
        }

        if (promises.length > 0) {
            try {
                await Promise.all(promises);
            } catch (error: unknown) {
                throw new AppUnknownException(
                    error,
                    'Seeding email templates failed'
                );
            }
        }

        this.logger.log('Emails seeded successfully.');

        return;
    }

    async remove(): Promise<void> {
        this.logger.log('Removing back Emails...');

        try {
            await Promise.all([
                this.notificationTemplateService.emailDelete(
                    EnumNotificationKind.changePassword
                ),
                this.notificationTemplateService.emailDelete(
                    EnumNotificationKind.welcomeSocial
                ),
                this.notificationTemplateService.emailDelete(
                    EnumNotificationKind.welcomeByAdmin
                ),
                this.notificationTemplateService.emailDelete(
                    EnumNotificationKind.verifiedEmail
                ),
                this.notificationTemplateService.emailDelete(
                    EnumNotificationKind.forgotPassword
                ),
                this.notificationTemplateService.emailDelete(
                    EnumNotificationKind.verifiedMobileNumber
                ),
                this.notificationTemplateService.emailDelete(
                    EnumNotificationKind.temporaryPasswordByAdmin
                ),
                this.notificationTemplateService.emailDelete(
                    EnumNotificationKind.verificationEmail
                ),
                this.notificationTemplateService.emailDelete(
                    EnumNotificationKind.welcome
                ),
                this.notificationTemplateService.emailDelete(
                    EnumNotificationKind.resetTwoFactorByAdmin
                ),
                this.notificationTemplateService.emailDelete(
                    EnumNotificationKind.newDeviceLogin
                ),
                this.notificationTemplateService.emailDelete(
                    EnumNotificationKind.loginLocked
                ),
                this.notificationTemplateService.emailDelete(
                    EnumNotificationKind.publishTermPolicy
                ),
                this.notificationTemplateService.emailDelete(
                    EnumNotificationKind.userImportResult
                ),
                this.notificationTemplateService.emailDelete(
                    EnumNotificationKind.resetPassword
                ),
                this.notificationTemplateService.emailDelete(
                    EnumNotificationKind.workspaceInvite
                ),
                this.notificationTemplateService.emailDelete(
                    EnumNotificationKind.workspaceJoinRequest
                ),
                this.notificationTemplateService.emailDelete(
                    EnumNotificationKind.workspaceJoinAccepted
                ),
                this.notificationTemplateService.emailDelete(
                    EnumNotificationKind.workspaceJoinRejected
                ),
                this.notificationTemplateService.emailDelete(
                    EnumNotificationKind.reauthenticationOtp
                ),
            ]);
        } catch (error: unknown) {
            throw new AppUnknownException(
                error,
                'Removing email templates failed'
            );
        }

        this.logger.log('Emails removed successfully.');

        return;
    }
}
