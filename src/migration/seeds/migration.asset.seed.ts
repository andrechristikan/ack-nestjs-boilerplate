import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { EmailService } from 'src/modules/email/services/email.service';
import { CountryService } from 'src/modules/country/services/country.service';

@Injectable()
export class MigrationAssetSeed {
    constructor(
        private readonly emailService: EmailService,
        private readonly countryService: CountryService
    ) {}

    @Command({
        command: 'migrate:asset',
        describe: 'migrate assets',
    })
    async migrate(): Promise<void> {
        try {
            await this.emailService.importWelcome();
        } catch (err: any) {
            throw new Error(err);
        }

        try {
            await this.emailService.importWelcomeAdmin();
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
            await this.countryService.importAssets();
        } catch (err: any) {
            throw new Error(err);
        }

        return;
    }

    @Command({
        command: 'rollback:asset',
        describe: 'rollback assets',
    })
    async rollback(): Promise<void> {
        try {
            await this.emailService.deleteWelcome();
        } catch (err: any) {
            throw new Error(err);
        }

        try {
            await this.emailService.deleteWelcomeAdmin();
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
            await this.countryService.deleteAssets();
        } catch (err: any) {
            throw new Error(err);
        }

        return;
    }
}
