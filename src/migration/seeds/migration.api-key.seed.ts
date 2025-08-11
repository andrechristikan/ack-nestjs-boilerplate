import { Command } from 'nestjs-command';
import { Injectable, Logger } from '@nestjs/common';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ENUM_API_KEY_TYPE } from '@modules/api-key/enums/api-key.enum';
import { ApiKeyRepository } from '@modules/api-key/repository/repositories/api-key.repository';
import { ENUM_APP_ENVIRONMENT } from '@app/enums/app.enum';
import { ConfigService } from '@nestjs/config';
import { ApiKeyCreateRawRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';

@Injectable()
export class MigrationApiKeySeed {
    private readonly logger = new Logger(MigrationApiKeySeed.name);

    private readonly env: ENUM_APP_ENVIRONMENT;
    private readonly apiKeys: ApiKeyCreateRawRequestDto[] = [
        {
            description: 'Api Key Default Migration',
            type: ENUM_API_KEY_TYPE.DEFAULT,
            key: 'fyFGb7ywyM37TqDY8nuhAmGW5',
            secret: 'qbp7LmCxYUTHFwKvHnxGW1aTyjSNU6ytN21etK89MaP2Dj2KZP',
        },
        {
            description: 'Api Key System Migration',
            type: ENUM_API_KEY_TYPE.SYSTEM,
            key: 'UTDH0fuDMAbd1ZVnwnyrQJd8Q',
            secret: 'qbp7LmCxYUTHFwKvHnxGW1aTyjSNU6ytN21etK89MaP2Dj2KZP',
        },
    ];

    constructor(
        private readonly apiKeyRepository: ApiKeyRepository,
        private readonly apiKeyUtil: ApiKeyUtil,
        private readonly apiKeyService: ApiKeyService,
        private readonly configService: ConfigService
    ) {
        this.env = this.configService.get<ENUM_APP_ENVIRONMENT>('app.env');
    }

    @Command({
        command: 'seed:apiKey',
        describe: 'seeds apikeys',
    })
    async seeds(): Promise<void> {
        this.logger.log('Seeding Api Keys...');

        const existingApiKeys = await this.apiKeyRepository.findMany({
            where: {
                key: {
                    in: this.apiKeys.map(apiKey => `${this.env}_${apiKey.key}`),
                },
            },
            select: {
                _id: true,
            },
            withDeleted: true,
        });
        if (existingApiKeys.length > 0) {
            this.logger.log('Api Keys already exist, skipping seed.');
            return;
        }

        await this.apiKeyRepository.createMany({
            data: this.apiKeys.map(apiKey => {
                const key = this.apiKeyUtil.createKey(apiKey.key);
                const hashed = this.apiKeyUtil.createHash(key, apiKey.secret);

                return {
                    hash: hashed,
                    key: key,
                    type: apiKey.type,
                    description: apiKey.description,
                    isActive: true,
                };
            }),
        });

        this.logger.log('Api Keys seeded successfully.');

        return;
    }

    @Command({
        command: 'remove:apiKey',
        describe: 'remove apikeys',
    })
    async remove(): Promise<void> {
        this.logger.log('Removing Api Keys...');

        await Promise.all([
            ...this.apiKeys
                .map(apiKey => {
                    return [
                        this.apiKeyService.deleteCacheByKey(
                            this.apiKeyUtil.createKey(apiKey.key)
                        ),
                    ];
                })
                .flat(),
            this.apiKeyRepository.deleteMany({
                where: {
                    key: {
                        in: this.apiKeys.map(apiKey =>
                            this.apiKeyUtil.createKey(apiKey.key)
                        ),
                    },
                },
                withDeleted: true,
            }),
        ]);

        this.logger.log('Api Keys removed successfully.');

        return;
    }
}
