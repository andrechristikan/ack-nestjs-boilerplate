import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeyPublicProtected } from 'src/common/api-key/decorators/api-key.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { CountryPublicAllDoc } from 'src/modules/country/docs/country.public.doc';
import { CountryAllResponseDto } from 'src/modules/country/dtos/response/country.all.response.dto';
import { CountryService } from 'src/modules/country/services/country.service';

@ApiTags('modules.public.country')
@Controller({
    version: '1',
    path: '/country',
})
export class CountryPublicController {
    constructor(private readonly countryService: CountryService) {}

    @CountryPublicAllDoc()
    @Response('country.all')
    @ApiKeyPublicProtected()
    @Get('/all')
    async all(): Promise<IResponse<CountryAllResponseDto>> {
        const countries = await this.countryService.findAll();

        return {
            data: {
                countries,
            },
        };
    }
}
