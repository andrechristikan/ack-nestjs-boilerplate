import { EnumAppEnvironment } from '@app/enums/app.enum';
import { DatabaseService } from '@common/database/services/database.service';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { migrationCountryData } from '@migration/data/migration.country.data';
import { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { CountryRequestDto } from '@modules/country/dtos/request/country.request.dto';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Command } from 'nest-commander';

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

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly configService: ConfigService
    ) {
        super();

        this.env = this.configService.get<EnumAppEnvironment>('app.env');
        this.countries = migrationCountryData[this.env];
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Countries...');
        this.logger.log(`Found ${this.countries.length} Countries to seed.`);

        try {
            await this.databaseService.$transaction(
                this.countries.map(country =>
                    this.databaseService.country.upsert({
                        where: {
                            alpha2Code: country.alpha2Code,
                        },
                        create: country,
                        update: {},
                    })
                )
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
            await this.databaseService.country.deleteMany({
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
