import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';
import { ApiKeyBulkKeyService } from 'src/common/api-key/services/api-key.bulk.service';

@Injectable()
export class ApiKeySeed {
    constructor(
        private readonly apiKeyService: ApiKeyService,
        private readonly apiKeyBulkService: ApiKeyBulkKeyService
    ) {}

    @Command({
        command: 'insert:apikeys',
        describe: 'insert apikeys',
    })
    async insert(): Promise<void> {
        try {
            await this.apiKeyService.createRaw({
                name: 'Api Key Migration',
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
        command: 'remove:apikeys',
        describe: 'remove apikeys',
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
