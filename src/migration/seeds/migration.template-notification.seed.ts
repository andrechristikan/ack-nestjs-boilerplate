import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { NotificationTemplateAccountDomain } from '@modules/notification/domains/notification.template.account.domain';
import { NotificationTemplateSecurityDomain } from '@modules/notification/domains/notification.template.security.domain';
import { NotificationTemplateTermPolicyDomain } from '@modules/notification/domains/notification.template.term-policy.domain';
import { NotificationTemplateWorkspaceDomain } from '@modules/notification/domains/notification.template.workspace.domain';
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
        private readonly notificationTemplateAccountDomain: NotificationTemplateAccountDomain,
        private readonly notificationTemplateSecurityDomain: NotificationTemplateSecurityDomain,
        private readonly notificationTemplateTermPolicyDomain: NotificationTemplateTermPolicyDomain,
        private readonly notificationTemplateWorkspaceDomain: NotificationTemplateWorkspaceDomain,
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
            this.notificationTemplateSecurityDomain.emailGetChangePassword(),
            this.notificationTemplateAccountDomain.emailGetWelcomeSocial(),
            this.notificationTemplateAccountDomain.emailGetWelcomeByAdmin(),
            this.notificationTemplateAccountDomain.emailGetVerifiedEmail(),
            this.notificationTemplateSecurityDomain.emailGetForgotPassword(),
            this.notificationTemplateAccountDomain.emailGetVerifiedMobileNumber(),
            this.notificationTemplateSecurityDomain.emailGetTemporaryPasswordByAdmin(),
            this.notificationTemplateAccountDomain.emailGetVerificationEmail(),
            this.notificationTemplateAccountDomain.emailGetWelcome(),
            this.notificationTemplateSecurityDomain.emailGetResetTwoFactorByAdmin(),
            this.notificationTemplateSecurityDomain.emailGetNewDeviceLogin(),
            this.notificationTemplateTermPolicyDomain.emailGetPublishTermPolicy(),
            this.notificationTemplateSecurityDomain.emailGetResetPassword(),
            this.notificationTemplateWorkspaceDomain.emailGetWorkspaceInvite(),
            this.notificationTemplateWorkspaceDomain.emailGetWorkspaceJoinRequest(),
            this.notificationTemplateWorkspaceDomain.emailGetWorkspaceJoinAccepted(),
            this.notificationTemplateWorkspaceDomain.emailGetWorkspaceJoinRejected(),
        ]);

        const promises: Promise<boolean>[] = [];
        if (!changePasswordEmail) {
            this.logger.log(
                'Change Password Email template missing, importing...'
            );
            promises.push(
                this.notificationTemplateSecurityDomain.emailImportChangePassword()
            );
        }

        if (!welcomeSocialEmail) {
            this.logger.log(
                'Welcome Social Email template missing, importing...'
            );
            promises.push(
                this.notificationTemplateAccountDomain.emailImportWelcomeSocial()
            );
        }

        if (!welcomeByAdminEmail) {
            this.logger.log(
                'Welcome By Admin Email template missing, importing...'
            );
            promises.push(
                this.notificationTemplateAccountDomain.emailImportWelcomeByAdmin()
            );
        }

        if (!emailVerifiedEmail) {
            this.logger.log(
                'Email Verified Email template missing, importing...'
            );
            promises.push(
                this.notificationTemplateAccountDomain.emailImportVerifiedEmail()
            );
        }

        if (!forgotPasswordEmail) {
            this.logger.log(
                'Forgot Password Email template missing, importing...'
            );
            promises.push(
                this.notificationTemplateSecurityDomain.emailImportForgotPassword()
            );
        }

        if (!mobileNumberVerifiedEmail) {
            this.logger.log(
                'Mobile Number Verified Email template missing, importing...'
            );
            promises.push(
                this.notificationTemplateAccountDomain.emailImportVerifiedMobileNumber()
            );
        }

        if (!tempPasswordEmail) {
            this.logger.log(
                'Temporary Password Email template missing, importing...'
            );
            promises.push(
                this.notificationTemplateSecurityDomain.emailImportTemporaryPasswordByAdmin()
            );
        }

        if (!verificationEmail) {
            this.logger.log(
                'Verification Email template missing, importing...'
            );
            promises.push(
                this.notificationTemplateAccountDomain.emailImportVerificationEmail()
            );
        }

        if (!welcomeEmail) {
            this.logger.log('Welcome Email template missing, importing...');
            promises.push(
                this.notificationTemplateAccountDomain.emailImportWelcome()
            );
        }

        if (!resetTwoFactorByAdminEmail) {
            this.logger.log(
                'Reset Two Factor By Admin Email template missing, importing...'
            );
            promises.push(
                this.notificationTemplateSecurityDomain.emailImportResetTwoFactorByAdmin()
            );
        }

        if (!newDeviceLoginEmail) {
            this.logger.log(
                'New Device Login Email template missing, importing...'
            );
            promises.push(
                this.notificationTemplateSecurityDomain.emailImportNewDeviceLogin()
            );
        }

        if (!publishTermPolicyEmail) {
            this.logger.log(
                'Publish Term Policy Email template missing, importing...'
            );
            promises.push(
                this.notificationTemplateTermPolicyDomain.emailImportPublishTermPolicy()
            );
        }

        if (!resetPasswordEmail) {
            this.logger.log(
                'Reset Password Email template missing, importing...'
            );
            promises.push(
                this.notificationTemplateSecurityDomain.emailImportResetPassword()
            );
        }

        if (!workspaceInviteEmail) {
            this.logger.log(
                'Workspace Invite Email template missing, importing...'
            );
            promises.push(
                this.notificationTemplateWorkspaceDomain.emailImportWorkspaceInvite()
            );
        }

        if (!workspaceJoinRequestEmail) {
            this.logger.log(
                'Workspace Join Request Email template missing, importing...'
            );
            promises.push(
                this.notificationTemplateWorkspaceDomain.emailImportWorkspaceJoinRequest()
            );
        }

        if (!workspaceJoinAcceptedEmail) {
            this.logger.log(
                'Workspace Join Accepted Email template missing, importing...'
            );
            promises.push(
                this.notificationTemplateWorkspaceDomain.emailImportWorkspaceJoinAccepted()
            );
        }

        if (!workspaceJoinRejectedEmail) {
            this.logger.log(
                'Workspace Join Rejected Email template missing, importing...'
            );
            promises.push(
                this.notificationTemplateWorkspaceDomain.emailImportWorkspaceJoinRejected()
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
                this.notificationTemplateSecurityDomain.emailDeleteChangePassword(),
                this.notificationTemplateAccountDomain.emailDeleteWelcomeSocial(),
                this.notificationTemplateAccountDomain.emailDeleteWelcomeByAdmin(),
                this.notificationTemplateAccountDomain.emailDeleteVerifiedEmail(),
                this.notificationTemplateSecurityDomain.emailDeleteForgotPassword(),
                this.notificationTemplateAccountDomain.emailDeleteVerifiedMobileNumber(),
                this.notificationTemplateSecurityDomain.emailDeleteTemporaryPasswordByAdmin(),
                this.notificationTemplateAccountDomain.emailDeleteVerificationEmail(),
                this.notificationTemplateAccountDomain.emailDeleteWelcome(),
                this.notificationTemplateSecurityDomain.emailDeleteResetTwoFactorByAdmin(),
                this.notificationTemplateSecurityDomain.emailDeleteNewDeviceLogin(),
                this.notificationTemplateTermPolicyDomain.emailDeletePublishTermPolicy(),
                this.notificationTemplateSecurityDomain.emailDeleteResetPassword(),
                this.notificationTemplateWorkspaceDomain.emailDeleteWorkspaceInvite(),
                this.notificationTemplateWorkspaceDomain.emailDeleteWorkspaceJoinRequest(),
                this.notificationTemplateWorkspaceDomain.emailDeleteWorkspaceJoinAccepted(),
                this.notificationTemplateWorkspaceDomain.emailDeleteWorkspaceJoinRejected(),
            ]);
        } catch (error: unknown) {
            this.logger.error(error, 'Error removing emails');
            throw error;
        }

        this.logger.log('Emails removed successfully.');

        return;
    }
}
