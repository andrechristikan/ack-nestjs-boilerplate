import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { NotificationTemplateService } from '@modules/notification/services/notification.template.service';
import { TermPolicyTemplateService } from '@modules/term-policy/services/term-policy.template.service';
import { Logger } from '@nestjs/common';
import { Command } from 'nest-commander';

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
        private readonly notificationEmailTemplateService: NotificationTemplateService,
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
        ] = await Promise.all([
            this.notificationEmailTemplateService.emailGetChangePassword(),
            this.notificationEmailTemplateService.emailGetWelcomeSocial(),
            this.notificationEmailTemplateService.emailGetWelcomeByAdmin(),
            this.notificationEmailTemplateService.emailGetVerifiedEmail(),
            this.notificationEmailTemplateService.emailGetForgotPassword(),
            this.notificationEmailTemplateService.emailGetVerifiedMobileNumber(),
            this.notificationEmailTemplateService.emailGetTemporaryPasswordByAdmin(),
            this.notificationEmailTemplateService.emailGetVerificationEmail(),
            this.notificationEmailTemplateService.emailGetWelcome(),
            this.notificationEmailTemplateService.emailGetResetTwoFactorByAdmin(),
            this.notificationEmailTemplateService.emailGetNewDeviceLogin(),
            this.notificationEmailTemplateService.emailGetPublishTermPolicy(),
        ]);

        const promises: Promise<boolean>[] = [];
        if (!changePasswordEmail) {
            this.logger.log(
                'Change Password Email template missing, importing...'
            );
            promises.push(
                this.notificationEmailTemplateService.emailImportChangePassword()
            );
        }

        if (!welcomeSocialEmail) {
            this.logger.log(
                'Welcome Social Email template missing, importing...'
            );
            promises.push(
                this.notificationEmailTemplateService.emailImportWelcomeSocial()
            );
        }

        if (!welcomeByAdminEmail) {
            this.logger.log(
                'Welcome By Admin Email template missing, importing...'
            );
            promises.push(
                this.notificationEmailTemplateService.emailImportWelcomeByAdmin()
            );
        }

        if (!emailVerifiedEmail) {
            this.logger.log(
                'Email Verified Email template missing, importing...'
            );
            promises.push(
                this.notificationEmailTemplateService.emailImportVerifiedEmail()
            );
        }

        if (!forgotPasswordEmail) {
            this.logger.log(
                'Forgot Password Email template missing, importing...'
            );
            promises.push(
                this.notificationEmailTemplateService.emailImportForgotPassword()
            );
        }

        if (!mobileNumberVerifiedEmail) {
            this.logger.log(
                'Mobile Number Verified Email template missing, importing...'
            );
            promises.push(
                this.notificationEmailTemplateService.emailImportVerifiedMobileNumber()
            );
        }

        if (!tempPasswordEmail) {
            this.logger.log(
                'Temporary Password Email template missing, importing...'
            );
            promises.push(
                this.notificationEmailTemplateService.emailImportTemporaryPasswordByAdmin()
            );
        }

        if (!verificationEmail) {
            this.logger.log(
                'Verification Email template missing, importing...'
            );
            promises.push(
                this.notificationEmailTemplateService.emailImportVerificationEmail()
            );
        }

        if (!welcomeEmail) {
            this.logger.log('Welcome Email template missing, importing...');
            promises.push(
                this.notificationEmailTemplateService.emailImportWelcome()
            );
        }

        if (!resetTwoFactorByAdminEmail) {
            this.logger.log(
                'Reset Two Factor By Admin Email template missing, importing...'
            );
            promises.push(
                this.notificationEmailTemplateService.emailImportResetTwoFactorByAdmin()
            );
        }

        if (!newDeviceLoginEmail) {
            this.logger.log(
                'New Device Login Email template missing, importing...'
            );
            promises.push(
                this.notificationEmailTemplateService.emailImportNewDeviceLogin()
            );
        }

        if (!publishTermPolicyEmail) {
            this.logger.log(
                'Publish Term Policy Email template missing, importing...'
            );
            promises.push(
                this.notificationEmailTemplateService.emailImportPublishTermPolicy()
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
                this.notificationEmailTemplateService.emailDeleteChangePassword(),
                this.notificationEmailTemplateService.emailDeleteWelcomeSocial(),
                this.notificationEmailTemplateService.emailDeleteWelcomeByAdmin(),
                this.notificationEmailTemplateService.emailDeleteVerifiedEmail(),
                this.notificationEmailTemplateService.emailDeleteForgotPassword(),
                this.notificationEmailTemplateService.emailDeleteVerifiedMobileNumber(),
                this.notificationEmailTemplateService.emailDeleteTemporaryPasswordByAdmin(),
                this.notificationEmailTemplateService.emailDeleteVerificationEmail(),
                this.notificationEmailTemplateService.emailDeleteWelcome(),
                this.notificationEmailTemplateService.emailDeleteResetTwoFactorByAdmin(),
                this.notificationEmailTemplateService.emailDeleteNewDeviceLogin(),
                this.notificationEmailTemplateService.emailDeletePublishTermPolicy(),
            ]);
        } catch (error: unknown) {
            this.logger.error(error, 'Error removing emails');
            throw error;
        }

        this.logger.log('Emails removed successfully.');

        return;
    }
}

@Command({
    name: 'template-termPolicy',
    description: 'Seed/Remove Term Policies',
    allowUnknownOptions: false,
})
export class MigrationTemplateTermPolicySeed
    extends MigrationSeedBase
    implements IMigrationSeed
{
    private readonly logger = new Logger(MigrationTemplateTermPolicySeed.name);

    constructor(
        private readonly termPolicyTemplateService: TermPolicyTemplateService,
        private readonly databaseService: DatabaseService,
        private readonly awsS3Service: AwsS3Service,
        private readonly databaseUtil: DatabaseUtil
    ) {
        super();
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Term Policies...');

        const isS3Initialized = this.awsS3Service.isInitialized();
        if (!isS3Initialized) {
            this.logger.error(
                'AWS S3 is not initialized. Cannot seed term policies.'
            );

            throw new Error('AWS S3 is not initialized');
        }

        try {
            const [
                termsOfServiceAsset,
                privacyAsset,
                cookieAsset,
                marketingAsset,
            ] = await Promise.all([
                this.termPolicyTemplateService.importTermsOfService(),
                this.termPolicyTemplateService.importPrivacy(),
                this.termPolicyTemplateService.importCookie(),
                this.termPolicyTemplateService.importMarketing(),
            ]);

            await this.databaseService.$transaction([
                this.databaseService.termPolicy.upsert({
                    where: {
                        type_version: {
                            type: EnumTermPolicyType.termsOfService,
                            version: 1,
                        },
                    },
                    create: {
                        type: EnumTermPolicyType.termsOfService,
                        version: 1,
                        status: EnumTermPolicyStatus.published,
                        contents: this.databaseUtil.toPlainArray([
                            {
                                language: EnumMessageLanguage.en,
                                ...termsOfServiceAsset,
                            },
                        ]),
                    },
                    update: {
                        contents: this.databaseUtil.toPlainArray([
                            {
                                language: EnumMessageLanguage.en,
                                ...termsOfServiceAsset,
                            },
                        ]),
                    },
                }),
                this.databaseService.termPolicy.upsert({
                    where: {
                        type_version: {
                            type: EnumTermPolicyType.privacy,
                            version: 1,
                        },
                    },
                    create: {
                        type: EnumTermPolicyType.privacy,
                        version: 1,
                        status: EnumTermPolicyStatus.published,
                        contents: this.databaseUtil.toPlainArray([
                            {
                                language: EnumMessageLanguage.en,
                                ...privacyAsset,
                            },
                        ]),
                    },
                    update: {
                        contents: this.databaseUtil.toPlainArray([
                            {
                                language: EnumMessageLanguage.en,
                                ...privacyAsset,
                            },
                        ]),
                    },
                }),
                this.databaseService.termPolicy.upsert({
                    where: {
                        type_version: {
                            type: EnumTermPolicyType.cookies,
                            version: 1,
                        },
                    },
                    create: {
                        type: EnumTermPolicyType.cookies,
                        version: 1,
                        status: EnumTermPolicyStatus.published,
                        contents: this.databaseUtil.toPlainArray([
                            {
                                language: EnumMessageLanguage.en,
                                ...cookieAsset,
                            },
                        ]),
                    },
                    update: {
                        contents: this.databaseUtil.toPlainArray([
                            {
                                language: EnumMessageLanguage.en,
                                ...cookieAsset,
                            },
                        ]),
                    },
                }),
                this.databaseService.termPolicy.upsert({
                    where: {
                        type_version: {
                            type: EnumTermPolicyType.marketing,
                            version: 1,
                        },
                    },
                    create: {
                        type: EnumTermPolicyType.marketing,
                        version: 1,
                        status: EnumTermPolicyStatus.published,
                        contents: this.databaseUtil.toPlainArray([
                            {
                                language: EnumMessageLanguage.en,
                                ...marketingAsset,
                            },
                        ]),
                    },
                    update: {
                        contents: this.databaseUtil.toPlainArray([
                            {
                                language: EnumMessageLanguage.en,
                                ...marketingAsset,
                            },
                        ]),
                    },
                }),
            ]);
        } catch (error: unknown) {
            this.logger.error(error, 'Error seeding term policies');
            throw error;
        }

        this.logger.log('Term Policies seeded successfully.');

        return;
    }

    async remove(): Promise<void> {
        this.logger.log('Skipping removal of Term Policies seed.');

        return;
    }
}
