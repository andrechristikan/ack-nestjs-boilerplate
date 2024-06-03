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
        } catch (err: any) {}

        try {
            await this.emailService.createChangePassword();
        } catch (err: any) {}

        return;
    }
}
