import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';
import { ENUM_COUNTRY_STATUS_CODE_ERROR } from 'src/modules/country/constants/country.status-code.constant';
import { CountryDoc } from 'src/modules/country/repository/entities/country.entity';
import { CountryService } from 'src/modules/country/services/country.service';

@Injectable()
export class CountryParsePipe implements PipeTransform {
    constructor(private readonly countryService: CountryService) {}

    async transform(value: any): Promise<CountryDoc> {
        const country: CountryDoc =
            await this.countryService.findOneById(value);
        if (!country) {
            throw new NotFoundException({
                statusCode: ENUM_COUNTRY_STATUS_CODE_ERROR.NOT_FOUND_ERROR,
                message: 'country.error.notFound',
            });
        }

        return country;
    }
}
