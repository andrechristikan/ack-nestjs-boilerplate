import { Command } from 'nestjs-command';
import { Injectable, Logger } from '@nestjs/common';
import { CountryRequestDto } from '@modules/country/dtos/request/country.request.dto';
import { DatabaseService } from '@common/database/services/database.service';

@Injectable()
export class MigrationCountrySeed {
    private readonly logger = new Logger(MigrationCountrySeed.name);

    private readonly countries: CountryRequestDto[] = [
        {
            name: 'Indonesia',
            alpha2Code: 'ID',
            alpha3Code: 'IDN',
            phoneCode: ['62'],
            continent: 'Asia',
            timezone: 'Asia/Jakarta',
        },
    ];

    constructor(private readonly databaseService: DatabaseService) {}

    @Command({
        command: 'seed:country',
        describe: 'seeds countries',
    })
    async seeds(): Promise<void> {
        this.logger.log('Seeding Countries...');

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
            this.logger.log('Countries already exist, skipping seed.');
            return;
        }

        await this.databaseService.country.createMany({
            data: this.countries,
        });

        this.logger.log('Countries seeded successfully.');

        return;
    }

    @Command({
        command: 'remove:country',
        describe: 'remove countries',
    })
    async remove(): Promise<void> {
        this.logger.log('Removing Countries...');

        await this.databaseService.country.deleteMany({
            where: {
                alpha2Code: {
                    in: this.countries.map(country => country.alpha2Code),
                },
            },
        });

        this.logger.log('Countries removed successfully.');

        return;
    }
}
