import type { CountryListRequestDto } from '@modules/country/dtos/request/country.list.request.dto';
import { CountryListRequestSchema } from '@modules/country/dtos/request/country.list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import { ResponsePagination } from '@common/response/decorators/response.decorator';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';

import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { CountryResponseSchema } from '@modules/country/dtos/response/country.response.dto';
import type { CountryResponseDto } from '@modules/country/dtos/response/country.response.dto';
import { CountryHttpService } from '@modules/country/services/country.http.service';
import { Controller, Get, Query } from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.public.country')
@Controller({
    version: '1',
    path: '/country',
})
export class CountryPublicController {
    constructor(private readonly countryHttpService: CountryHttpService) {}

    @Doc({ summary: 'get all list country' })
    @ResponsePagination('country.list', { schema: CountryResponseSchema })
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @Query({ schema: CountryListRequestSchema })
        query: CountryListRequestDto
    ): Promise<IResponsePaginationReturn<CountryResponseDto>> {
        return this.countryHttpService.getListCursor(query);
    }
}
