import { Command } from 'nestjs-command';
import { Injectable, Logger } from '@nestjs/common';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ENUM_API_KEY_TYPE } from '@modules/api-key/enums/api-key.enum';
import { ApiKeyRepository } from '@modules/api-key/repository/repositories/api-key.repository';
import { ENUM_APP_ENVIRONMENT } from '@app/enums/app.enum';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MigrationApiKeySeed {
    private readonly logger = new Logger(MigrationApiKeySeed.name);

    private readonly env: ENUM_APP_ENVIRONMENT;
    private readonly apiKeyDefaultKey: string = 'fyFGb7ywyM37TqDY8nuhAmGW5';
    private readonly apiKeyDefaultSecret: string =
        'qbp7LmCxYUTHFwKvHnxGW1aTyjSNU6ytN21etK89MaP2Dj2KZP';
    private readonly apiKeySystemKey: string = 'UTDH0fuDMAbd1ZVnwnyrQJd8Q';
    private readonly apiKeySystemSecret: string =
        'qbp7LmCxYUTHFwKvHnxGW1aTyjSNU6ytN21etK89MaP2Dj2KZP';

    constructor(
        private readonly apiKeyRepository: ApiKeyRepository,
        private readonly apiKeyService: ApiKeyService,
        private readonly configService: ConfigService
    ) {
        this.env = this.configService.get<ENUM_APP_ENVIRONMENT>('app.env');
    }

    @Command({
        command: 'seed:apikey',
        describe: 'seeds apikeys',
    })
    async seeds(): Promise<void> {
        this.logger.log('Seeding Api Keys...');

        const apiKeyDefault = `${this.env}_${this.apiKeyDefaultKey}`;
        const apiKeySystem = `${this.env}_${this.apiKeySystemKey}`;
        const existingApiKeys = await this.apiKeyRepository.findMany({
            where: {
                key: {
                    in: [apiKeyDefault, apiKeySystem],
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
                apiKeyDefault,
                this.apiKeyDefaultSecret
            ),
            this.apiKeyService.createHashApiKey(
                apiKeySystem,
                this.apiKeySystemSecret
            ),
        ]);

        await this.apiKeyRepository.createMany({
            data: [
                {
                    description: 'Api Key Default Migration',
                    type: ENUM_API_KEY_TYPE.DEFAULT,
                    key: apiKeyDefault,
                    hash: apiKeyDefaultHash,
                    isActive: true,
                },
                {
                    description: 'Api Key System Migration',
                    type: ENUM_API_KEY_TYPE.SYSTEM,
                    key: apiKeySystem,
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
        const apiKeyDefault = `${this.env}_${this.apiKeyDefaultKey}`;
        const apiKeySystem = `${this.env}_${this.apiKeySystemKey}`;

        await this.apiKeyService.deleteCacheByKey(apiKeyDefault);
        await this.apiKeyService.deleteCacheByKey(apiKeySystem);
        await this.apiKeyRepository.deleteMany({
            where: {
                key: {
                    in: [apiKeyDefault, apiKeySystem],
                },
            },
            withDeleted: true,
        });

        return;
    }
}
