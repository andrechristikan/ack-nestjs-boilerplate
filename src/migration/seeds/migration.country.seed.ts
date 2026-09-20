import { EnumAppEnvironment } from '@app/enums/app.enum';
import { DatabaseService } from '@common/database/services/database.service';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { MigrationCountryData } from '@migration/data/migration.country.data';
import { MigrationUserSuperAdminId } from '@migration/data/migration.user.data';
import type { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import type { CountryRequestDto } from '@modules/country/dtos/request/country.request.dto';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Command } from 'nest-commander';

/**
 * Seeds country reference data for the current environment.
 */
@Command({
    name: 'country',
    description: 'Seed/Remove Countries',
    allowUnknownOptions: false,
})
export class MigrationCountrySeed
    extends MigrationSeedBase
    implements IMigrationSeed
{
    private readonly logger = new Logger(MigrationCountrySeed.name);

    private readonly env: EnumAppEnvironment;
    private readonly countries: CountryRequestDto[] = [];
    private readonly seedTransactionTimeoutInMs: number;

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly configService: ConfigService
    ) {
        super();

        this.env = this.configService.get<EnumAppEnvironment>('app.env')!;
        this.countries = MigrationCountryData[this.env];
        this.seedTransactionTimeoutInMs = this.configService.get<number>(
            'database.seedTransactionTimeoutInMs'
        )!;
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Countries...');
        this.logger.log(`Found ${this.countries.length} Countries to seed.`);

        try {
            await this.databaseService.withTransaction(
                async tx => {
                    for (const country of this.countries) {
                        await tx.country.upsert({
                            where: {
                                alpha2Code: country.alpha2Code,
                            },
                            create: {
                                ...country,
                                createdBy: MigrationUserSuperAdminId,
                                updatedBy: MigrationUserSuperAdminId,
                            },
                            update: {
                                ...country,
                                updatedBy: MigrationUserSuperAdminId,
                            },
                        });
                    }
                },
                { timeout: this.seedTransactionTimeoutInMs }
            );
        } catch (error: unknown) {
            this.logger.error(error, 'Error seeding countries');
            throw error;
        }

        this.logger.log('Countries seeded successfully.');

        return;
    }

    async remove(): Promise<void> {
        this.logger.log('Removing back Countries...');

        try {
            await this.databaseService.client.country.deleteMany({
                where: {},
            });
        } catch (error: unknown) {
            this.logger.error(error, 'Error removing countries');
            throw error;
        }

        this.logger.log('Countries removed successfully.');

        return;
    }
}
