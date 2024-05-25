import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { EmailService } from 'src/modules/email/services/email.service';

@Injectable()
export class MigrationEmailSeed {
    constructor(private readonly emailService: EmailService) {}

    @Command({
        command: 'seed:email',
        describe: 'seeds emails',
    })
    async seeds(): Promise<void> {
        try {
            await this.emailService.createWelcome();
        } catch (err: any) {}

        try {
            await this.emailService.createChangePassword();
        } catch (err: any) {}

        return;
    }

    @Command({
        command: 'remove:email',
        describe: 'remove emails',
    })
    async remove(): Promise<void> {
        await this.emailService.deleteChangePassword();
        await this.emailService.deleteWelcome();

        return;
    }
}
