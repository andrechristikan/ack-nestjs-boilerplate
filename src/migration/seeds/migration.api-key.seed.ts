import { EnumAppEnvironment } from '@app/enums/app.enum';
import { CacheService } from '@common/cache/services/cache.service';
import { DatabaseService } from '@common/database/services/database.service';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { MigrationApiKeyData } from '@migration/data/migration.api-key.data';
import { MigrationUserSuperAdminId } from '@migration/data/migration.user.data';
import type { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import type { ApiKeyCreateRawRequestDto } from '@modules/api-key/dtos/request/api-key.create-raw.request.dto';
import { ApiKeyCredentialUtil } from '@modules/api-key/utils/api-key.credential.util';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Command } from 'nest-commander';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

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
        protected readonly cacheService: CacheService,
        private readonly databaseService: DatabaseService,
        private readonly apiKeyCredentialUtil: ApiKeyCredentialUtil,
        private readonly configService: ConfigService
    ) {
        super(cacheService);

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
                                startAt: null,
                                endAt: null,
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
            throw new AppUnknownException(error, 'Seeding API keys failed');
        }

        this.logger.log('Api Keys seeded successfully.');

        return;
    }

    async remove(): Promise<void> {
        this.logger.log('Removing back Api Keys...');

        try {
            await this.databaseService.client.apiKey.deleteMany({});
        } catch (error: unknown) {
            throw new AppUnknownException(error, 'Removing API keys failed');
        }

        this.logger.log('Api Keys removed successfully.');

        return;
    }
}
