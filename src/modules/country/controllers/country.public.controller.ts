import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { PaginationOffsetQuery } from '@common/pagination/decorators/pagination.decorator';
import { ResponsePaging } from '@common/response/decorators/response.decorator';
import { COUNTRY_DEFAULT_AVAILABLE_SEARCH } from '@modules/country/constants/country.list.constant';
import { CountryService } from '@modules/country/services/country.service';
import { CountryPublicListDoc } from '@modules/country/docs/country.public.doc';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { CountryResponseDto } from '@modules/country/dtos/response/country.response.dto';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';

@ApiTags('modules.public.country')
@Controller({
    version: '1',
    path: '/country',
})
export class CountryPublicController {
    constructor(private readonly countryService: CountryService) {}

    @CountryPublicListDoc()
    @ResponsePaging('country.list')
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationOffsetQuery({
            availableSearch: COUNTRY_DEFAULT_AVAILABLE_SEARCH,
        })
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<CountryResponseDto>> {
        return this.countryService.getList(pagination);
    }
}
