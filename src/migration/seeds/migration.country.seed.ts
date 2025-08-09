import { Command } from 'nestjs-command';
import { Injectable, Logger } from '@nestjs/common';
import { CountryRepository } from '@modules/country/repository/repositories/country.repository';
import { CountryRequestDto } from '@modules/country/dtos/request/country.request.dto';

@Injectable()
export class MigrationCountrySeed {
    private readonly logger = new Logger(MigrationCountrySeed.name);

    private readonly countries: CountryRequestDto[] = [
        {
            name: 'Indonesia',
            alpha2Code: 'ID',
            alpha3Code: 'IDN',
            fipsCode: 'ID',
            numericCode: '360',
            phoneCode: ['62'],
            continent: 'Asia',
            timeZone: 'Asia/Jakarta',
            currency: 'IDR',
        },
    ];

    constructor(private readonly countryRepository: CountryRepository) {}

    @Command({
        command: 'seed:country',
        describe: 'seeds countries',
    })
    async seeds(): Promise<void> {
        this.logger.log('Seeding Countries...');

        const existingCountries = await this.countryRepository.findMany({
            where: {
                alpha2Code: {
                    in: this.countries.map(country => country.alpha2Code),
                },
            },
            select: {
                _id: true,
            },
        });
        if (existingCountries.length > 0) {
            this.logger.log('Countries already exist, skipping seed.');
            return;
        }

        await this.countryRepository.createMany({
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

        await this.countryRepository.deleteMany({
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
