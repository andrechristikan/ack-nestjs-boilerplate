import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from 'src/modules/email/services/email.service';

@Injectable()
export class MigrationEmailSeed {
    constructor(
        private readonly emailService: EmailService,
        private readonly configService: ConfigService
    ) {}

    @Command({
        command: 'seed:email',
        describe: 'seeds emails',
    })
    async seeds(): Promise<void> {
        try {
            const clientId: string = this.configService.get<string>(
                'aws.ses.credential.key'
            );
            const clientSecret: string = this.configService.get<string>(
                'aws.ses.credential.secret'
            );
            if (clientId && clientSecret) {
                const check: boolean = await this.emailService.getSignUp();
                if (!check) {
                    await this.emailService.createSignUp();
                }
            }
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }

    @Command({
        command: 'remove:email',
        describe: 'remove emails',
    })
    async remove(): Promise<void> {
        try {
            await this.emailService.deleteSignUp();
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }
}
