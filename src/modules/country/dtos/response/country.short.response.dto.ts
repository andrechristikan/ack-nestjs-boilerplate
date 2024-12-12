import { ApiHideProperty, OmitType } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { CountryListResponseDto } from 'src/modules/country/dtos/response/country.list.response.dto';

export class CountryShortResponseDto extends OmitType(CountryListResponseDto, [
    'createdAt',
    'updatedAt',
    'alpha3Code',
    'numericCode',
    'fipsCode',
    'continent',
]) {
    @ApiHideProperty()
    @Exclude()
    alpha3Code: string;

    @ApiHideProperty()
    @Exclude()
    numericCode: string;

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
    createdAt: Date;

    @ApiHideProperty()
    @Exclude()
    updatedAt: Date;
}
