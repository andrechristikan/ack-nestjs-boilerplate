import { ApiProperty } from '@nestjs/swagger';
import { CountryGetResponseDto } from 'src/modules/country/dtos/response/country.get.response.dto';

export class CountryAllResponseDto {
    @ApiProperty({
        required: true,
        default: [],
        isArray: true,
        type: () => CountryGetResponseDto,
    })
    readonly countries: CountryGetResponseDto[];
}
