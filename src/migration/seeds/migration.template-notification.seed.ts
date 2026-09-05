import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { NotificationTemplateAccountService } from '@modules/notification/services/notification.template.account.service';
import { NotificationTemplateSecurityService } from '@modules/notification/services/notification.template.security.service';
import { NotificationTemplateTermPolicyService } from '@modules/notification/services/notification.template.term-policy.service';
import { NotificationTemplateWorkspaceService } from '@modules/notification/services/notification.template.workspace.service';
import { Logger } from '@nestjs/common';
import { Command } from 'nest-commander';

/**
 * Imports email notification templates into AWS SES, skipping any already present. Throws if SES is uninitialized.
 */
@Command({
    name: 'template-email-notification',
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
        private readonly notificationTemplateAccountService: NotificationTemplateAccountService,
        private readonly notificationTemplateSecurityService: NotificationTemplateSecurityService,
        private readonly notificationTemplateTermPolicyService: NotificationTemplateTermPolicyService,
        private readonly notificationTemplateWorkspaceService: NotificationTemplateWorkspaceService,
        private readonly awsSESService: AwsSESService
    ) {
        super();
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Emails...');

        const isSESInitialized = this.awsSESService.isInitialized();
        if (!isSESInitialized) {
            this.logger.error(
                'AWS SES is not initialized. Cannot seed email templates.'
            );

            throw new Error('AWS SES is not initialized');
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
            publishTermPolicyEmail,
            resetPasswordEmail,
            workspaceInviteEmail,
            workspaceJoinRequestEmail,
            workspaceJoinAcceptedEmail,
            workspaceJoinRejectedEmail,
        ] = await Promise.all([
            this.notificationTemplateSecurityService.emailGetChangePassword(),
            this.notificationTemplateAccountService.emailGetWelcomeSocial(),
            this.notificationTemplateAccountService.emailGetWelcomeByAdmin(),
            this.notificationTemplateAccountService.emailGetVerifiedEmail(),
            this.notificationTemplateSecurityService.emailGetForgotPassword(),
            this.notificationTemplateAccountService.emailGetVerifiedMobileNumber(),
            this.notificationTemplateSecurityService.emailGetTemporaryPasswordByAdmin(),
            this.notificationTemplateAccountService.emailGetVerificationEmail(),
            this.notificationTemplateAccountService.emailGetWelcome(),
            this.notificationTemplateSecurityService.emailGetResetTwoFactorByAdmin(),
            this.notificationTemplateSecurityService.emailGetNewDeviceLogin(),
            this.notificationTemplateTermPolicyService.emailGetPublishTermPolicy(),
            this.notificationTemplateSecurityService.emailGetResetPassword(),
            this.notificationTemplateWorkspaceService.emailGetWorkspaceInvite(),
            this.notificationTemplateWorkspaceService.emailGetWorkspaceJoinRequest(),
            this.notificationTemplateWorkspaceService.emailGetWorkspaceJoinAccepted(),
            this.notificationTemplateWorkspaceService.emailGetWorkspaceJoinRejected(),
        ]);

        const promises: Promise<boolean>[] = [];
        if (!changePasswordEmail) {
            this.logger.log(
                'Change Password Email template missing, importing...'
            );
            promises.push(
                this.notificationTemplateSecurityService.emailImportChangePassword()
            );
        }

        if (!welcomeSocialEmail) {
            this.logger.log(
                'Welcome Social Email template missing, importing...'
            );
            promises.push(
                this.notificationTemplateAccountService.emailImportWelcomeSocial()
            );
        }

        if (!welcomeByAdminEmail) {
            this.logger.log(
                'Welcome By Admin Email template missing, importing...'
            );
            promises.push(
                this.notificationTemplateAccountService.emailImportWelcomeByAdmin()
            );
        }

        if (!emailVerifiedEmail) {
            this.logger.log(
                'Email Verified Email template missing, importing...'
            );
            promises.push(
                this.notificationTemplateAccountService.emailImportVerifiedEmail()
            );
        }

        if (!forgotPasswordEmail) {
            this.logger.log(
                'Forgot Password Email template missing, importing...'
            );
            promises.push(
                this.notificationTemplateSecurityService.emailImportForgotPassword()
            );
        }

        if (!mobileNumberVerifiedEmail) {
            this.logger.log(
                'Mobile Number Verified Email template missing, importing...'
            );
            promises.push(
                this.notificationTemplateAccountService.emailImportVerifiedMobileNumber()
            );
        }

        if (!tempPasswordEmail) {
            this.logger.log(
                'Temporary Password Email template missing, importing...'
            );
            promises.push(
                this.notificationTemplateSecurityService.emailImportTemporaryPasswordByAdmin()
            );
        }

        if (!verificationEmail) {
            this.logger.log(
                'Verification Email template missing, importing...'
            );
            promises.push(
                this.notificationTemplateAccountService.emailImportVerificationEmail()
            );
        }

        if (!welcomeEmail) {
            this.logger.log('Welcome Email template missing, importing...');
            promises.push(
                this.notificationTemplateAccountService.emailImportWelcome()
            );
        }

        if (!resetTwoFactorByAdminEmail) {
            this.logger.log(
                'Reset Two Factor By Admin Email template missing, importing...'
            );
            promises.push(
                this.notificationTemplateSecurityService.emailImportResetTwoFactorByAdmin()
            );
        }

        if (!newDeviceLoginEmail) {
            this.logger.log(
                'New Device Login Email template missing, importing...'
            );
            promises.push(
                this.notificationTemplateSecurityService.emailImportNewDeviceLogin()
            );
        }

        if (!publishTermPolicyEmail) {
            this.logger.log(
                'Publish Term Policy Email template missing, importing...'
            );
            promises.push(
                this.notificationTemplateTermPolicyService.emailImportPublishTermPolicy()
            );
        }

        if (!resetPasswordEmail) {
            this.logger.log(
                'Reset Password Email template missing, importing...'
            );
            promises.push(
                this.notificationTemplateSecurityService.emailImportResetPassword()
            );
        }

        if (!workspaceInviteEmail) {
            this.logger.log(
                'Workspace Invite Email template missing, importing...'
            );
            promises.push(
                this.notificationTemplateWorkspaceService.emailImportWorkspaceInvite()
            );
        }

        if (!workspaceJoinRequestEmail) {
            this.logger.log(
                'Workspace Join Request Email template missing, importing...'
            );
            promises.push(
                this.notificationTemplateWorkspaceService.emailImportWorkspaceJoinRequest()
            );
        }

        if (!workspaceJoinAcceptedEmail) {
            this.logger.log(
                'Workspace Join Accepted Email template missing, importing...'
            );
            promises.push(
                this.notificationTemplateWorkspaceService.emailImportWorkspaceJoinAccepted()
            );
        }

        if (!workspaceJoinRejectedEmail) {
            this.logger.log(
                'Workspace Join Rejected Email template missing, importing...'
            );
            promises.push(
                this.notificationTemplateWorkspaceService.emailImportWorkspaceJoinRejected()
            );
        }

        if (promises.length > 0) {
            try {
                await Promise.all(promises);
            } catch (error: unknown) {
                this.logger.error(error, 'Error seeding emails');
                throw error;
            }
        }

        this.logger.log('Emails seeded successfully.');

        return;
    }

    async remove(): Promise<void> {
        this.logger.log('Removing back Emails...');

        try {
            await Promise.all([
                this.notificationTemplateSecurityService.emailDeleteChangePassword(),
                this.notificationTemplateAccountService.emailDeleteWelcomeSocial(),
                this.notificationTemplateAccountService.emailDeleteWelcomeByAdmin(),
                this.notificationTemplateAccountService.emailDeleteVerifiedEmail(),
                this.notificationTemplateSecurityService.emailDeleteForgotPassword(),
                this.notificationTemplateAccountService.emailDeleteVerifiedMobileNumber(),
                this.notificationTemplateSecurityService.emailDeleteTemporaryPasswordByAdmin(),
                this.notificationTemplateAccountService.emailDeleteVerificationEmail(),
                this.notificationTemplateAccountService.emailDeleteWelcome(),
                this.notificationTemplateSecurityService.emailDeleteResetTwoFactorByAdmin(),
                this.notificationTemplateSecurityService.emailDeleteNewDeviceLogin(),
                this.notificationTemplateTermPolicyService.emailDeletePublishTermPolicy(),
                this.notificationTemplateSecurityService.emailDeleteResetPassword(),
                this.notificationTemplateWorkspaceService.emailDeleteWorkspaceInvite(),
                this.notificationTemplateWorkspaceService.emailDeleteWorkspaceJoinRequest(),
                this.notificationTemplateWorkspaceService.emailDeleteWorkspaceJoinAccepted(),
                this.notificationTemplateWorkspaceService.emailDeleteWorkspaceJoinRejected(),
            ]);
        } catch (error: unknown) {
            this.logger.error(error, 'Error removing emails');
            throw error;
        }

        this.logger.log('Emails removed successfully.');

        return;
    }
}
