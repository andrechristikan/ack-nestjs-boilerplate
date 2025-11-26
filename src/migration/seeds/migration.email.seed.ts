import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { EmailTemplateService } from '@modules/email/services/email.template.service';
import { Logger } from '@nestjs/common';
import { Command } from 'nest-commander';

@Command({
    name: 'email',
    description: 'Seed/Remove Emails',
    allowUnknownOptions: false,
})
export class MigrationEmailSeed
    extends MigrationSeedBase
    implements IMigrationSeed
{
    private readonly logger = new Logger(MigrationEmailSeed.name);

    constructor(private readonly emailTemplateService: EmailTemplateService) {
        super();
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Emails...');

        const [
            changePasswordEmail,
            createByAdminEmail,
            emailVerifiedEmail,
            forgotPasswordEmail,
            mobileNumberVerifiedEmail,
            tempPasswordEmail,
            verificationEmail,
            welcomeEmail,
        ] = await Promise.all([
            this.emailTemplateService.getChangePassword(),
            this.emailTemplateService.getCreateByAdmin(),
            this.emailTemplateService.getEmailVerified(),
            this.emailTemplateService.getForgotPassword(),
            this.emailTemplateService.getMobileNumberVerified(),
            this.emailTemplateService.getTempPassword(),
            this.emailTemplateService.getVerification(),
            this.emailTemplateService.getWelcome(),
        ]);

        const promises: Promise<boolean>[] = [];
        if (!changePasswordEmail) {
            this.logger.log(
                'Change Password Email template missing, importing...'
            );
            promises.push(this.emailTemplateService.importChangePassword());
        }

        if (!createByAdminEmail) {
            this.logger.log(
                'Create By Admin Email template missing, importing...'
            );
            promises.push(this.emailTemplateService.importCreateByAdmin());
        }

        if (!emailVerifiedEmail) {
            this.logger.log(
                'Email Verified Email template missing, importing...'
            );
            promises.push(this.emailTemplateService.importEmailVerified());
        }

        if (!forgotPasswordEmail) {
            this.logger.log(
                'Forgot Password Email template missing, importing...'
            );
            promises.push(this.emailTemplateService.importForgotPassword());
        }

        if (!mobileNumberVerifiedEmail) {
            this.logger.log(
                'Mobile Number Verified Email template missing, importing...'
            );
            promises.push(
                this.emailTemplateService.importMobileNumberVerified()
            );
        }

        if (!tempPasswordEmail) {
            this.logger.log(
                'Temporary Password Email template missing, importing...'
            );
            promises.push(this.emailTemplateService.importTempPassword());
        }

        if (!verificationEmail) {
            this.logger.log(
                'Verification Email template missing, importing...'
            );
            promises.push(this.emailTemplateService.importVerification());
        }

        if (!welcomeEmail) {
            this.logger.log('Welcome Email template missing, importing...');
            promises.push(this.emailTemplateService.importWelcome());
        }

        if (promises.length > 0) {
            await Promise.all(promises);
        }

        this.logger.log('Emails seeded successfully.');

        return;
    }

    async remove(): Promise<void> {
        this.logger.log('Removing back Emails...');

        await Promise.all([
            this.emailTemplateService.deleteChangePassword(),
            this.emailTemplateService.deleteCreateByAdmin(),
            this.emailTemplateService.deleteEmailVerified(),
            this.emailTemplateService.deleteForgotPassword(),
            this.emailTemplateService.deleteMobileNumberVerified(),
            this.emailTemplateService.deleteTempPassword(),
            this.emailTemplateService.deleteVerification(),
            this.emailTemplateService.deleteWelcome(),
        ]);

        this.logger.log('Emails removed successfully.');

        return;
    }
}
