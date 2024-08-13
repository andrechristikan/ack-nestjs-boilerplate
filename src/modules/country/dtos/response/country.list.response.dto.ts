import { ApiHideProperty, OmitType } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { CountryGetResponseDto } from 'src/modules/country/dtos/response/country.get.response.dto';

export class CountryListResponseDto extends OmitType(CountryGetResponseDto, [
    'alpha3Code',
    'fipsCode',
    'continent',
    'domain',
    'timeZone',
    'numericCode',
] as const) {
    @ApiHideProperty()
    @Exclude()
    alpha3Code: string;

    @ApiHideProperty()
    @Exclude()
    fipsCode: string;

    @ApiHideProperty()
    @Exclude()
    continent: string;

    @ApiHideProperty()
    @Exclude()
    domain?: string;

    @ApiHideProperty()
    @Exclude()
    timeZone: string;

    @ApiHideProperty()
    @Exclude()
    numericCode: string;
}
