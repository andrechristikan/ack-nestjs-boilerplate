import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { CountryService } from 'src/modules/country/services/country.service';
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
            const data: CountryCreateRequestDto[] = [
                {
                    name: 'Indonesia',
                    alpha2Code: 'ID',
                    alpha3Code: 'IDN',
                    domain: 'id',
                    fipsCode: 'ID',
                    numericCode: '360',
                    phoneCode: ['62'],
                    continent: 'Asia',
                    timeZone: 'Asia/Jakarta',
                },
            ];

            await this.countryService.createMany(data);
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
