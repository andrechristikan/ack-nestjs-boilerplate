import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';

@Injectable()
export class MigrationApiKeySeed {
    constructor(private readonly apiKeyService: ApiKeyService) {}

    @Command({
        command: 'seed:apikey',
        describe: 'seeds apikeys',
    })
    async seeds(): Promise<void> {
        try {
            await this.apiKeyService.createRaw({
                name: 'Api Key Migration',
                description: 'From migration',
                key: 'qwertyuiop12345zxcvbnmkjh',
                secret: '5124512412412asdasdasdasdasdASDASDASD',
            });
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }

    @Command({
        command: 'remove:apikey',
        describe: 'remove apikeys',
    })
    async remove(): Promise<void> {
        try {
            await this.apiKeyService.deleteMany({});
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }
}
