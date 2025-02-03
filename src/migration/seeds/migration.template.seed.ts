import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { EmailService } from 'src/modules/email/services/email.service';

@Injectable()
export class MigrationTemplateSeed {
    constructor(private readonly emailService: EmailService) {}

    @Command({
        command: 'migrate:template',
        describe: 'migrate templates',
    })
    async migrate(): Promise<void> {
        try {
            await this.emailService.importWelcome();
        } catch (err: any) {
            throw new Error(err);
        }

        try {
            await this.emailService.importCreate();
        } catch (err: any) {
            throw new Error(err);
        }

        try {
            await this.emailService.importChangePassword();
        } catch (err: any) {
            throw new Error(err);
        }

        try {
            await this.emailService.importTempPassword();
        } catch (err: any) {
            throw new Error(err);
        }

        try {
            await this.emailService.importResetPassword();
        } catch (err: any) {
            throw new Error(err);
        }

        try {
            await this.emailService.importVerification();
        } catch (err: any) {
            throw new Error(err);
        }

        try {
            await this.emailService.importEmailVerified();
        } catch (err: any) {
            throw new Error(err);
        }

        try {
            await this.emailService.importMobileNumberVerified();
        } catch (err: any) {
            throw new Error(err);
        }

        return;
    }

    @Command({
        command: 'rollback:template',
        describe: 'rollback templates',
    })
    async rollback(): Promise<void> {
        try {
            await this.emailService.deleteWelcome();
        } catch (err: any) {
            throw new Error(err);
        }

        try {
            await this.emailService.deleteCreate();
        } catch (err: any) {
            throw new Error(err);
        }

        try {
            await this.emailService.deleteChangePassword();
        } catch (err: any) {
            throw new Error(err);
        }

        try {
            await this.emailService.deleteTempPassword();
        } catch (err: any) {
            throw new Error(err);
        }

        try {
            await this.emailService.deleteResetPassword();
        } catch (err: any) {
            throw new Error(err);
        }

        try {
            await this.emailService.deleteVerification();
        } catch (err: any) {
            throw new Error(err);
        }

        try {
            await this.emailService.deleteEmailVerified();
        } catch (err: any) {
            throw new Error(err);
        }

        try {
            await this.emailService.deleteMobileNumberVerified();
        } catch (err: any) {
            throw new Error(err);
        }

        return;
    }
}
