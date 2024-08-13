import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { EmailService } from 'src/modules/email/services/email.service';

@Injectable()
export class MigrationEmailSeed {
    constructor(private readonly emailService: EmailService) {}

    @Command({
        command: 'migrate:email',
        describe: 'migrate emails',
    })
    async migrate(): Promise<void> {
        try {
            await this.emailService.createWelcome();
        } catch (err: any) {
            throw new Error(err);
        }

        try {
            await this.emailService.createChangePassword();
        } catch (err: any) {
            throw new Error(err);
        }

        try {
            await this.emailService.createTempPassword();
        } catch (err: any) {
            throw new Error(err);
        }

        return;
    }

    @Command({
        command: 'rollback:email',
        describe: 'rollback emails',
    })
    async rollback(): Promise<void> {
        try {
            await this.emailService.deleteWelcome();
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

        return;
    }
}
