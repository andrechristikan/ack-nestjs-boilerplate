import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { CountryService } from 'src/modules/country/services/country.service';
import path from 'path';
import { readFileSync } from 'fs';
import { CountryCreateRequestDto } from 'src/modules/country/dtos/request/country.create.request.dto';

@Injectable()
export class MigrationCountrySeed {
    constructor(private readonly countryService: CountryService) {}

    @Command({
        command: 'seed:country',
        describe: 'seeds countries',
    })
    async seeds(): Promise<void> {
        try {
            const data = readFileSync(
                path.resolve(__dirname, '../data/country.json'),
                'utf8'
            );
            const countries = JSON.parse(data) as CountryCreateRequestDto[];

            await this.countryService.createMany(countries);
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }

    @Command({
        command: 'remove:country',
        describe: 'remove countries',
    })
    async remove(): Promise<void> {
        try {
            await this.countryService.deleteMany({});
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }
}
