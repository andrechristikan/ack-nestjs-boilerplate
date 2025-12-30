import { EnumAppEnvironment } from '@app/enums/app.enum';
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

    private readonly env: EnumAppEnvironment;
    private readonly apiKeys: ApiKeyCreateRawRequestDto[] = [];

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly apiKeyUtil: ApiKeyUtil,
        private readonly configService: ConfigService
    ) {
        super();

        this.env = this.configService.get<EnumAppEnvironment>('app.env');
        this.apiKeys = migrationApiKeyData[this.env];
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Api Keys...');
        this.logger.log(`Found ${this.apiKeys.length} Api Keys to seed.`);

        try {
            await this.databaseService.$transaction(
                this.apiKeys.map(apiKey => {
                    const key = this.apiKeyUtil.createKey(apiKey.key);
                    const hashed = this.apiKeyUtil.createHash(
                        key,
                        apiKey.secret
                    );

                    return this.databaseService.apiKey.upsert({
                        where: {
                            key: apiKey.key,
                        },
                        create: {
                            hash: hashed,
                            key: key,
                            type: apiKey.type,
                            name: apiKey.name,
                            isActive: true,
                        },
                        update: {},
                    });
                })
            );
        } catch (error: unknown) {
            this.logger.error(error, 'Error seeding Api Keys');
            throw error;
        }

        this.logger.log('Api Keys seeded successfully.');

        return;
    }

    async remove(): Promise<void> {
        this.logger.log('Removing back Api Keys...');

        try {
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
                this.databaseService.apiKey.deleteMany({}),
            ]);
        } catch (error: unknown) {
            this.logger.error(error, 'Error removing Api Keys');
            throw error;
        }

        this.logger.log('Api Keys removed successfully.');

        return;
    }
}
