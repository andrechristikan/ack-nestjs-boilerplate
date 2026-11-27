import { CacheService } from '@common/cache/services/cache.service';
import { AwsSesService } from '@common/aws/services/aws.ses.service';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import type { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationTemplateName } from '@modules/notification/interfaces/notification.interface';
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
        protected override readonly cacheService: CacheService,
        private readonly notificationTemplateService: NotificationTemplateService,
        private readonly awsSesService: AwsSesService
    ) {
        super(cacheService);
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Emails...');

        const isSesInitialized = this.awsSesService.isInitialized();
        if (!isSesInitialized) {
            this.logger.warn(
                'AWS SES is not configured. Skipping email template seed.'
            );

            return;
        }

        const templates: { kind: INotificationTemplateName; label: string }[] =
            [
                {
                    kind: EnumNotificationKind.changePassword,
                    label: 'Change Password',
                },
                {
                    kind: EnumNotificationKind.welcomeSocial,
                    label: 'Welcome Social',
                },
                {
                    kind: EnumNotificationKind.welcomeByAdmin,
                    label: 'Welcome By Admin',
                },
                {
                    kind: EnumNotificationKind.verifiedEmail,
                    label: 'Email Verified',
                },
                {
                    kind: EnumNotificationKind.forgotPassword,
                    label: 'Forgot Password',
                },
                {
                    kind: EnumNotificationKind.verifiedMobileNumber,
                    label: 'Mobile Number Verified',
                },
                {
                    kind: EnumNotificationKind.temporaryPasswordByAdmin,
                    label: 'Temporary Password',
                },
                {
                    kind: EnumNotificationKind.verificationEmail,
                    label: 'Verification',
                },
                { kind: EnumNotificationKind.welcome, label: 'Welcome' },
                {
                    kind: EnumNotificationKind.resetMfaByAdmin,
                    label: 'Reset Two Factor By Admin',
                },
                {
                    kind: EnumNotificationKind.newDeviceLogin,
                    label: 'New Device Login',
                },
                {
                    kind: EnumNotificationKind.loginLocked,
                    label: 'Login Locked',
                },
                {
                    kind: EnumNotificationKind.publishTermPolicy,
                    label: 'Publish Term Policy',
                },
                {
                    kind: EnumNotificationKind.processResult,
                    label: 'Process Result',
                },
                {
                    kind: EnumNotificationKind.resetPassword,
                    label: 'Reset Password',
                },
                {
                    kind: EnumNotificationKind.workspaceInvite,
                    label: 'Workspace Invite',
                },
                {
                    kind: EnumNotificationKind.workspaceJoinRequest,
                    label: 'Workspace Join Request',
                },
                {
                    kind: EnumNotificationKind.workspaceJoinAccepted,
                    label: 'Workspace Join Accepted',
                },
                {
                    kind: EnumNotificationKind.workspaceJoinRejected,
                    label: 'Workspace Join Rejected',
                },
                {
                    kind: EnumNotificationKind.reauthenticationOtp,
                    label: 'Reauthentication Otp',
                },
            ];

        for (const { label } of templates) {
            this.logger.log(`${label} Email template, upserting...`);
        }

        try {
            await Promise.all(
                templates.map(({ kind }) =>
                    this.notificationTemplateService.emailUpsert(kind)
                )
            );
        } catch (error: unknown) {
            throw new AppUnknownException(
                error,
                'Seeding email templates failed'
            );
        }

        this.logger.log('Emails seeded successfully.');

        return;
    }

    async remove(): Promise<void> {
        this.logger.log('Removing back Emails...');

        const isSesInitialized = this.awsSesService.isInitialized();
        if (!isSesInitialized) {
            this.logger.warn(
                'AWS SES is not configured. Skipping email template removal.'
            );

            return;
        }

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
                    EnumNotificationKind.resetMfaByAdmin
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
                    EnumNotificationKind.processResult
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
