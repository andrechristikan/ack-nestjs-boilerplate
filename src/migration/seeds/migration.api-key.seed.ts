import { Command } from 'nestjs-command';
import { Injectable, Logger } from '@nestjs/common';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ENUM_API_KEY_TYPE } from '@modules/api-key/enums/api-key.enum';
import { ApiKeyRepository } from '@modules/api-key/repository/repositories/api-key.repository';

@Injectable()
export class MigrationApiKeySeed {
    private readonly logger = new Logger(MigrationApiKeySeed.name);

    private readonly apiKeyDefaultKey: string = 'fyFGb7ywyM37TqDY8nuhAmGW5';
    private readonly apiKeyDefaultSecret: string =
        'qbp7LmCxYUTHFwKvHnxGW1aTyjSNU6ytN21etK89MaP2Dj2KZP';
    private readonly apiKeySystemKey: string = 'UTDH0fuDMAbd1ZVnwnyrQJd8Q';
    private readonly apiKeySystemSecret: string =
        'qbp7LmCxYUTHFwKvHnxGW1aTyjSNU6ytN21etK89MaP2Dj2KZP';

    constructor(
        private readonly apiKeyRepository: ApiKeyRepository,
        private readonly apiKeyService: ApiKeyService
    ) {}

    @Command({
        command: 'seed:apikey',
        describe: 'seeds apikeys',
    })
    async seeds(): Promise<void> {
        this.logger.log('Seeding Api Keys...');

        const existingApiKeys = await this.apiKeyRepository.findMany({
            where: {
                key: {
                    in: [this.apiKeyDefaultKey, this.apiKeySystemKey],
                },
            },
            select: {
                _id: true,
            },
        });
        if (existingApiKeys.length > 0) {
            this.logger.log('Api Keys already exist, skipping seed.');
            return;
        }

        const [apiKeyDefaultHash, apiKeySystemHash] = await Promise.all([
            this.apiKeyService.createHashApiKey(
                this.apiKeyDefaultKey,
                this.apiKeyDefaultSecret
            ),
            this.apiKeyService.createHashApiKey(
                this.apiKeySystemKey,
                this.apiKeySystemSecret
            ),
        ]);

        await this.apiKeyRepository.createMany({
            data: [
                {
                    description: 'Api Key Default Migration',
                    type: ENUM_API_KEY_TYPE.DEFAULT,
                    key: this.apiKeyDefaultKey,
                    hash: apiKeyDefaultHash,
                    isActive: true,
                },
                {
                    description: 'Api Key System Migration',
                    type: ENUM_API_KEY_TYPE.SYSTEM,
                    key: this.apiKeySystemKey,
                    hash: apiKeySystemHash,
                    isActive: true,
                },
            ],
        });

        this.logger.log('Api Keys seeded successfully.');

        return;
    }

    @Command({
        command: 'remove:apikey',
        describe: 'remove apikeys',
    })
    async remove(): Promise<void> {
        await this.apiKeyRepository.deleteMany({
            where: {
                key: {
                    in: [this.apiKeyDefaultKey, this.apiKeySystemKey],
                },
            },
        });

        return;
    }
}
