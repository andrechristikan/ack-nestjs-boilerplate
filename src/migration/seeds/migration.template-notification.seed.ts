import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import type { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { NotificationTemplateAccountDomain } from '@modules/notification/domains/notification.template.account.domain';
import { NotificationTemplateSecurityDomain } from '@modules/notification/domains/notification.template.security.domain';
import { NotificationTemplateTermPolicyDomain } from '@modules/notification/domains/notification.template.term-policy.domain';
import { NotificationTemplateWorkspaceDomain } from '@modules/notification/domains/notification.template.workspace.domain';
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
            publishTermPolicyEmail,
            resetPasswordEmail,
            workspaceInviteEmail,
            workspaceJoinRequestEmail,
            workspaceJoinAcceptedEmail,
            workspaceJoinRejectedEmail,
        ] = await Promise.all([
            this.notificationTemplateSecurityDomain.emailGet(
                EnumNotificationProcess.changePassword
            ),
            this.notificationTemplateAccountDomain.emailGet(
                EnumNotificationProcess.welcomeSocial
            ),
            this.notificationTemplateAccountDomain.emailGet(
                EnumNotificationProcess.welcomeByAdmin
            ),
            this.notificationTemplateAccountDomain.emailGet(
                EnumNotificationProcess.verifiedEmail
            ),
            this.notificationTemplateSecurityDomain.emailGet(
                EnumNotificationProcess.forgotPassword
            ),
            this.notificationTemplateAccountDomain.emailGet(
                EnumNotificationProcess.verifiedMobileNumber
            ),
            this.notificationTemplateSecurityDomain.emailGet(
                EnumNotificationProcess.temporaryPasswordByAdmin
            ),
            this.notificationTemplateAccountDomain.emailGet(
                EnumNotificationProcess.verificationEmail
            ),
            this.notificationTemplateAccountDomain.emailGet(
                EnumNotificationProcess.welcome
            ),
            this.notificationTemplateSecurityDomain.emailGet(
                EnumNotificationProcess.resetTwoFactorByAdmin
            ),
            this.notificationTemplateSecurityDomain.emailGet(
                EnumNotificationProcess.newDeviceLogin
            ),
            this.notificationTemplateTermPolicyDomain.emailGet(
                EnumNotificationProcess.publishTermPolicy
            ),
            this.notificationTemplateSecurityDomain.emailGet(
                EnumNotificationProcess.resetPassword
            ),
            this.notificationTemplateWorkspaceDomain.emailGet(
                EnumNotificationProcess.workspaceInvite
            ),
            this.notificationTemplateWorkspaceDomain.emailGet(
                EnumNotificationProcess.workspaceJoinRequest
            ),
            this.notificationTemplateWorkspaceDomain.emailGet(
                EnumNotificationProcess.workspaceJoinAccepted
            ),
            this.notificationTemplateWorkspaceDomain.emailGet(
                EnumNotificationProcess.workspaceJoinRejected
            ),
        ]);

        const promises: Promise<void>[] = [];
        if (!changePasswordEmail) {
            this.logger.log(
                'Change Password Email template missing, importing...'
            );
            const changePasswordEmailImport =
                this.notificationTemplateSecurityDomain.emailImport(
                    EnumNotificationProcess.changePassword
                );
            promises.push(changePasswordEmailImport);
        }

        if (!welcomeSocialEmail) {
            this.logger.log(
                'Welcome Social Email template missing, importing...'
            );
            const welcomeSocialEmailImport =
                this.notificationTemplateAccountDomain.emailImport(
                    EnumNotificationProcess.welcomeSocial
                );
            promises.push(welcomeSocialEmailImport);
        }

        if (!welcomeByAdminEmail) {
            this.logger.log(
                'Welcome By Admin Email template missing, importing...'
            );
            const welcomeByAdminEmailImport =
                this.notificationTemplateAccountDomain.emailImport(
                    EnumNotificationProcess.welcomeByAdmin
                );
            promises.push(welcomeByAdminEmailImport);
        }

        if (!emailVerifiedEmail) {
            this.logger.log(
                'Email Verified Email template missing, importing...'
            );
            const emailVerifiedEmailImport =
                this.notificationTemplateAccountDomain.emailImport(
                    EnumNotificationProcess.verifiedEmail
                );
            promises.push(emailVerifiedEmailImport);
        }

        if (!forgotPasswordEmail) {
            this.logger.log(
                'Forgot Password Email template missing, importing...'
            );
            const forgotPasswordEmailImport =
                this.notificationTemplateSecurityDomain.emailImport(
                    EnumNotificationProcess.forgotPassword
                );
            promises.push(forgotPasswordEmailImport);
        }

        if (!mobileNumberVerifiedEmail) {
            this.logger.log(
                'Mobile Number Verified Email template missing, importing...'
            );
            const mobileNumberVerifiedEmailImport =
                this.notificationTemplateAccountDomain.emailImport(
                    EnumNotificationProcess.verifiedMobileNumber
                );
            promises.push(mobileNumberVerifiedEmailImport);
        }

        if (!tempPasswordEmail) {
            this.logger.log(
                'Temporary Password Email template missing, importing...'
            );
            const tempPasswordEmailImport =
                this.notificationTemplateSecurityDomain.emailImport(
                    EnumNotificationProcess.temporaryPasswordByAdmin
                );
            promises.push(tempPasswordEmailImport);
        }

        if (!verificationEmail) {
            this.logger.log(
                'Verification Email template missing, importing...'
            );
            const verificationEmailImport =
                this.notificationTemplateAccountDomain.emailImport(
                    EnumNotificationProcess.verificationEmail
                );
            promises.push(verificationEmailImport);
        }

        if (!welcomeEmail) {
            this.logger.log('Welcome Email template missing, importing...');
            const welcomeEmailImport =
                this.notificationTemplateAccountDomain.emailImport(
                    EnumNotificationProcess.welcome
                );
            promises.push(welcomeEmailImport);
        }

        if (!resetTwoFactorByAdminEmail) {
            this.logger.log(
                'Reset Two Factor By Admin Email template missing, importing...'
            );
            const resetTwoFactorByAdminEmailImport =
                this.notificationTemplateSecurityDomain.emailImport(
                    EnumNotificationProcess.resetTwoFactorByAdmin
                );
            promises.push(resetTwoFactorByAdminEmailImport);
        }

        if (!newDeviceLoginEmail) {
            this.logger.log(
                'New Device Login Email template missing, importing...'
            );
            const newDeviceLoginEmailImport =
                this.notificationTemplateSecurityDomain.emailImport(
                    EnumNotificationProcess.newDeviceLogin
                );
            promises.push(newDeviceLoginEmailImport);
        }

        if (!publishTermPolicyEmail) {
            this.logger.log(
                'Publish Term Policy Email template missing, importing...'
            );
            const publishTermPolicyEmailImport =
                this.notificationTemplateTermPolicyDomain.emailImport(
                    EnumNotificationProcess.publishTermPolicy
                );
            promises.push(publishTermPolicyEmailImport);
        }

        if (!resetPasswordEmail) {
            this.logger.log(
                'Reset Password Email template missing, importing...'
            );
            const resetPasswordEmailImport =
                this.notificationTemplateSecurityDomain.emailImport(
                    EnumNotificationProcess.resetPassword
                );
            promises.push(resetPasswordEmailImport);
        }

        if (!workspaceInviteEmail) {
            this.logger.log(
                'Workspace Invite Email template missing, importing...'
            );
            const workspaceInviteEmailImport =
                this.notificationTemplateWorkspaceDomain.emailImport(
                    EnumNotificationProcess.workspaceInvite
                );
            promises.push(workspaceInviteEmailImport);
        }

        if (!workspaceJoinRequestEmail) {
            this.logger.log(
                'Workspace Join Request Email template missing, importing...'
            );
            const workspaceJoinRequestEmailImport =
                this.notificationTemplateWorkspaceDomain.emailImport(
                    EnumNotificationProcess.workspaceJoinRequest
                );
            promises.push(workspaceJoinRequestEmailImport);
        }

        if (!workspaceJoinAcceptedEmail) {
            this.logger.log(
                'Workspace Join Accepted Email template missing, importing...'
            );
            const workspaceJoinAcceptedEmailImport =
                this.notificationTemplateWorkspaceDomain.emailImport(
                    EnumNotificationProcess.workspaceJoinAccepted
                );
            promises.push(workspaceJoinAcceptedEmailImport);
        }

        if (!workspaceJoinRejectedEmail) {
            this.logger.log(
                'Workspace Join Rejected Email template missing, importing...'
            );
            const workspaceJoinRejectedEmailImport =
                this.notificationTemplateWorkspaceDomain.emailImport(
                    EnumNotificationProcess.workspaceJoinRejected
                );
            promises.push(workspaceJoinRejectedEmailImport);
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
                this.notificationTemplateSecurityDomain.emailDelete(
                    EnumNotificationProcess.changePassword
                ),
                this.notificationTemplateAccountDomain.emailDelete(
                    EnumNotificationProcess.welcomeSocial
                ),
                this.notificationTemplateAccountDomain.emailDelete(
                    EnumNotificationProcess.welcomeByAdmin
                ),
                this.notificationTemplateAccountDomain.emailDelete(
                    EnumNotificationProcess.verifiedEmail
                ),
                this.notificationTemplateSecurityDomain.emailDelete(
                    EnumNotificationProcess.forgotPassword
                ),
                this.notificationTemplateAccountDomain.emailDelete(
                    EnumNotificationProcess.verifiedMobileNumber
                ),
                this.notificationTemplateSecurityDomain.emailDelete(
                    EnumNotificationProcess.temporaryPasswordByAdmin
                ),
                this.notificationTemplateAccountDomain.emailDelete(
                    EnumNotificationProcess.verificationEmail
                ),
                this.notificationTemplateAccountDomain.emailDelete(
                    EnumNotificationProcess.welcome
                ),
                this.notificationTemplateSecurityDomain.emailDelete(
                    EnumNotificationProcess.resetTwoFactorByAdmin
                ),
                this.notificationTemplateSecurityDomain.emailDelete(
                    EnumNotificationProcess.newDeviceLogin
                ),
                this.notificationTemplateTermPolicyDomain.emailDelete(
                    EnumNotificationProcess.publishTermPolicy
                ),
                this.notificationTemplateSecurityDomain.emailDelete(
                    EnumNotificationProcess.resetPassword
                ),
                this.notificationTemplateWorkspaceDomain.emailDelete(
                    EnumNotificationProcess.workspaceInvite
                ),
                this.notificationTemplateWorkspaceDomain.emailDelete(
                    EnumNotificationProcess.workspaceJoinRequest
                ),
                this.notificationTemplateWorkspaceDomain.emailDelete(
                    EnumNotificationProcess.workspaceJoinAccepted
                ),
                this.notificationTemplateWorkspaceDomain.emailDelete(
                    EnumNotificationProcess.workspaceJoinRejected
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
