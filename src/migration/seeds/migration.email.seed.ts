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
                const checkSignUp: boolean =
                    await this.emailService.getSignUp();
                if (!checkSignUp) {
                    await this.emailService.createSignUp();
                }

                const checkChangePassword: boolean =
                    await this.emailService.getChangePassword();
                if (!checkChangePassword) {
                    await this.emailService.createChangePassword();
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
            await this.emailService.deleteChangePassword();
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }
}
