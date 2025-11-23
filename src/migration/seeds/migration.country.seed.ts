import { ENUM_APP_ENVIRONMENT } from '@app/enums/app.enum';
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

    private readonly env: ENUM_APP_ENVIRONMENT;
    private countries: CountryRequestDto[] = [];

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly configService: ConfigService
    ) {
        super();

        this.env = this.configService.get<ENUM_APP_ENVIRONMENT>('app.env');
        this.countries = migrationCountryData[this.env];
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Countries...');
        this.logger.log(`Found ${this.countries.length} Countries to seed.`);

        const existingCountries = await this.databaseService.country.findMany({
            where: {
                alpha2Code: {
                    in: this.countries.map(country => country.alpha2Code),
                },
            },
            select: {
                id: true,
            },
        });

        if (existingCountries.length > 0) {
            this.logger.warn('Countries already exist, skipping seed.');
            return;
        }

        await this.databaseService.country.createMany({
            data: this.countries,
        });

        this.logger.log('Countries seeded successfully.');

        return;
    }

    async remove(): Promise<void> {
        this.logger.log('Removing back Countries...');

        await this.databaseService.country.deleteMany({
            where: {},
        });

        this.logger.log('Countries removed successfully.');

        return;
    }
}
