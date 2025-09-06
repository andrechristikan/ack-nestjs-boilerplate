import { Command } from 'nestjs-command';
import { Injectable, Logger } from '@nestjs/common';
import { ENUM_APP_ENVIRONMENT } from '@app/enums/app.enum';
import { ConfigService } from '@nestjs/config';
import { ApiKeyCreateRawRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import { ENUM_API_KEY_TYPE } from '@prisma/client';
import { DatabaseService } from '@common/database/services/database.service';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';

@Injectable()
export class MigrationApiKeySeed {
    private readonly logger = new Logger(MigrationApiKeySeed.name);

    private readonly env: ENUM_APP_ENVIRONMENT;
    private readonly apiKeys: ApiKeyCreateRawRequestDto[] = [
        {
            name: 'Api Key Default Migration',
            type: ENUM_API_KEY_TYPE.DEFAULT,
            key: 'fyFGb7ywyM37TqDY8nuhAmGW5',
            secret: 'qbp7LmCxYUTHFwKvHnxGW1aTyjSNU6ytN21etK89MaP2Dj2KZP',
        },
        {
            name: 'Api Key System Migration',
            type: ENUM_API_KEY_TYPE.SYSTEM,
            key: 'UTDH0fuDMAbd1ZVnwnyrQJd8Q',
            secret: 'qbp7LmCxYUTHFwKvHnxGW1aTyjSNU6ytN21etK89MaP2Dj2KZP',
        },
    ];

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly apiKeyUtil: ApiKeyUtil,
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

        const existingApiKeys = await this.databaseService.apiKey.findMany({
            where: {
                key: {
                    in: this.apiKeys.map(apiKey => `${this.env}_${apiKey.key}`),
                },
            },
            select: {
                id: true,
            },
        });
        if (existingApiKeys.length > 0) {
            this.logger.log('Api Keys already exist, skipping seed.');
            return;
        }

        await this.databaseService.apiKey.createMany({
            data: this.apiKeys.map(apiKey => {
                const key = this.apiKeyUtil.createKey(apiKey.key);
                const hashed = this.apiKeyUtil.createHash(key, apiKey.secret);

                return {
                    hash: hashed,
                    key: key,
                    type: apiKey.type,
                    name: apiKey.name,
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
                        this.apiKeyUtil.deleteCacheByKey(
                            this.apiKeyUtil.createKey(apiKey.key)
                        ),
                    ];
                })
                .flat(),
            this.databaseService.apiKey.deleteMany({
                where: {
                    key: {
                        in: this.apiKeys.map(apiKey =>
                            this.apiKeyUtil.createKey(apiKey.key)
                        ),
                    },
                },
            }),
        ]);

        this.logger.log('Api Keys removed successfully.');

        return;
    }
}
