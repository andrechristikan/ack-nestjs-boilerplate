import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { AuthApiService } from 'src/auth/service/auth.api.service';
import { AuthApiBulkService } from 'src/auth/service/auth.api.bulk.service';

@Injectable()
export class AuthApiSeed {
    constructor(
        private readonly authApiService: AuthApiService,
        private readonly authApiBulkService: AuthApiBulkService
    ) {}

    @Command({
        command: 'insert:authapis',
        describe: 'insert authapiss',
    })
    async insert(): Promise<void> {
        try {
            await this.authApiService.create({
                name: 'Auth Api Key Migration',
                description: 'From migration',
                key: 'qwertyuiop12345zxcvbnmkjh',
                secret: '5124512412412asdasdasdasdasdASDASDASD',
                passphrase: 'cuwakimacojulawu',
                encryptionKey: 'opbUwdiS1FBsrDUoPgZdx',
            });
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }

    @Command({
        command: 'remove:authapis',
        describe: 'remove authapis',
    })
    async remove(): Promise<void> {
        try {
            await this.authApiBulkService.deleteMany({});
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }
}
