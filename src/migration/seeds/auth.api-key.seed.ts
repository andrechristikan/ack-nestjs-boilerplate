import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';
import { ApiKeyBulkKeyService } from 'src/common/api-key/services/api-key.bulk.service';

@Injectable()
export class AuthApiKeySeed {
    constructor(
        private readonly apiKeyService: ApiKeyService,
        private readonly apiKeyBulkService: ApiKeyBulkKeyService
    ) {}

    @Command({
        command: 'insert:authapis',
        describe: 'insert authapiss',
    })
    async insert(): Promise<void> {
        try {
            await this.apiKeyService.createRaw({
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
            await this.apiKeyBulkService.deleteMany({});
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }
}
