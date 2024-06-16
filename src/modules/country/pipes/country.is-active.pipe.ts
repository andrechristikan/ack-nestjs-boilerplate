import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ENUM_COUNTRY_STATUS_CODE_ERROR } from 'src/modules/country/constants/country.status-code.constant';
import { CountryDoc } from 'src/modules/country/repository/entities/country.entity';

@Injectable()
export class CountryActivePipe implements PipeTransform {
    async transform(value: CountryDoc): Promise<CountryDoc> {
        if (!value.isActive) {
            throw new BadRequestException({
                statusCode: ENUM_COUNTRY_STATUS_CODE_ERROR.IS_ACTIVE_ERROR,
                message: 'country.error.isActiveInvalid',
            });
        }

        return value;
    }
}

@Injectable()
export class CountryInactivePipe implements PipeTransform {
    async transform(value: CountryDoc): Promise<CountryDoc> {
        if (value.isActive) {
            throw new BadRequestException({
                statusCode: ENUM_COUNTRY_STATUS_CODE_ERROR.IS_ACTIVE_ERROR,
                message: 'country.error.isActiveInvalid',
            });
        }

        return value;
    }
}
