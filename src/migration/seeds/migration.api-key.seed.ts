import { EnumAppEnvironment } from '@app/enums/app.enum';
import { DatabaseService } from '@common/database/services/database.service';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { MigrationApiKeyData } from '@migration/data/migration.api-key.data';
import { MigrationUserSuperAdminId } from '@migration/data/migration.user.data';
import type { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import type { ApiKeyCreateRawRequestDto } from '@modules/api-key/dtos/request/api-key.create-raw.request.dto';
import { ApiKeyCache } from '@modules/api-key/caches/api-key.cache';
import { ApiKeyCredentialUtil } from '@modules/api-key/utils/api-key.credential.util';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Command } from 'nest-commander';

/**
 * Seeds environment-specific API keys; removal also clears their cache entries.
 */
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
    private readonly seedTransactionTimeoutInMs: number;

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly apiKeyCredentialUtil: ApiKeyCredentialUtil,
        private readonly apiKeyCache: ApiKeyCache,
        private readonly configService: ConfigService
    ) {
        super();

        this.env = this.configService.get<EnumAppEnvironment>('app.env')!;
        this.apiKeys = MigrationApiKeyData[this.env];
        this.seedTransactionTimeoutInMs = this.configService.get<number>(
            'database.seedTransactionTimeoutInMs'
        )!;
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Api Keys...');
        this.logger.log(`Found ${this.apiKeys.length} Api Keys to seed.`);

        const rows = this.apiKeys.map(apiKey => {
            const key = this.apiKeyCredentialUtil.createKey(apiKey.key);
            const hash = this.apiKeyCredentialUtil.createHash(
                key,
                apiKey.secret
            );

            return {
                key,
                hash,
                type: apiKey.type,
                name: apiKey.name,
            };
        });

        try {
            await this.databaseService.withTransaction(
                async tx => {
                    for (const row of rows) {
                        await tx.apiKey.upsert({
                            where: {
                                key: row.key,
                            },
                            create: {
                                hash: row.hash,
                                key: row.key,
                                type: row.type,
                                name: row.name,
                                isActive: true,
                                createdBy: MigrationUserSuperAdminId,
                                updatedBy: MigrationUserSuperAdminId,
                            },
                            update: {
                                updatedBy: MigrationUserSuperAdminId,
                            },
                        });
                    }
                },
                { timeout: this.seedTransactionTimeoutInMs }
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
            await this.databaseService.client.apiKey.deleteMany({});

            const deletions = this.apiKeys.map(apiKey => {
                const cacheKey = this.apiKeyCredentialUtil.createKey(
                    apiKey.key
                );

                return this.apiKeyCache.deleteCacheByKey(cacheKey);
            });
            await Promise.all(deletions);
        } catch (error: unknown) {
            this.logger.error(error, 'Error removing Api Keys');
            throw error;
        }

        this.logger.log('Api Keys removed successfully.');

        return;
    }
}
