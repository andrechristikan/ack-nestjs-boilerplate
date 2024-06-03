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
    readonly alpha3Code: string;

    @ApiHideProperty()
    @Exclude()
    readonly fipsCode: string;

    @ApiHideProperty()
    @Exclude()
    readonly continent: string;

    @ApiHideProperty()
    @Exclude()
    readonly domain?: string;

    @ApiHideProperty()
    @Exclude()
    readonly timeZone: string;

    @ApiHideProperty()
    @Exclude()
    readonly numericCode: string;
}
