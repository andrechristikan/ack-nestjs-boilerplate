import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';
import { ApiKeyBulkKeyService } from 'src/common/api-key/services/api-key.bulk.service';
import { ApiKeyUseCase } from 'src/common/api-key/use-cases/api-key.use-case';
import { IApiKeyEntity } from 'src/common/api-key/interfaces/api-key.interface';

@Injectable()
export class MigrationApiKeySeed {
    constructor(
        private readonly apiKeyService: ApiKeyService,
        private readonly apiKeyUseCase: ApiKeyUseCase,
        private readonly apiKeyBulkService: ApiKeyBulkKeyService
    ) {}

    @Command({
        command: 'seed:apikey',
        describe: 'seeds apikeys',
    })
    async seeds(): Promise<void> {
        try {
            const data: IApiKeyEntity = await this.apiKeyUseCase.createRaw({
                name: 'Api Key Migration',
                description: 'From migration',
                key: 'qwertyuiop12345zxcvbnmkjh',
                secret: '5124512412412asdasdasdasdasdASDASDASD',
            });
            await this.apiKeyService.create(data);
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
            await this.apiKeyBulkService.deleteMany({});
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }
}
