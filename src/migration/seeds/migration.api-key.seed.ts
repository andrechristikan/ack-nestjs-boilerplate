import { ENUM_APP_ENVIRONMENT } from '@app/enums/app.enum';
import { DatabaseService } from '@common/database/services/database.service';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { migrationApiKeyData } from '@migration/data/migration.api-key.data';
import { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { ApiKeyCreateRawRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Command } from 'nest-commander';

@Command({
    name: 'apiKey',
    description: 'Seed/Remove Api Keys',
    allowUnknownOptions: false,
})
export class MigrationApiKeySeed
    extends MigrationSeedBase
    implements IMigrationSeed
{
    private readonly logger = new Logger(MigrationApiKeySeed.name);

    private readonly env: ENUM_APP_ENVIRONMENT;
    private apiKeys: ApiKeyCreateRawRequestDto[] = [];

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly apiKeyUtil: ApiKeyUtil,
        private readonly configService: ConfigService
    ) {
        super();

        this.env = this.configService.get<ENUM_APP_ENVIRONMENT>('app.env');
        this.apiKeys = migrationApiKeyData[this.env];
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Api Keys...');
        this.logger.log(`Found ${this.apiKeys.length} Api Keys to seed.`);

        const existingApiKeys = await this.databaseService.apiKey.findMany({
            where: {
                key: {
                    in: this.apiKeys.map(apiKey =>
                        this.apiKeyUtil.createKey(apiKey.key)
                    ),
                },
            },
            select: {
                id: true,
            },
        });
        if (existingApiKeys.length > 0) {
            this.logger.warn('Api Keys already exist, skipping seed.');
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

    async remove(): Promise<void> {
        this.logger.log('Removing back Api Keys...');
        this.logger.log(`Found ${this.apiKeys.length} Api Keys to remove.`);

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
