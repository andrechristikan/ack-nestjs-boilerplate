import { PaginationCursorQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { ResponsePaging } from '@common/response/decorators/response.decorator';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    CountryDefaultAvailableOrderBy,
    CountryDefaultAvailableSearch,
} from '@modules/country/constants/country.list.constant';
import { CountryPublicListDoc } from '@modules/country/docs/country.public.doc';
import { CountryResponseDto } from '@modules/country/dtos/response/country.response.dto';
import { CountryHttpService } from '@modules/country/services/country.http.service';
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.public.country')
@Controller({
    version: '1',
    path: '/country',
})
export class CountryPublicController {
    constructor(private readonly countryHttpService: CountryHttpService) {}

    @CountryPublicListDoc()
    @ResponsePaging('country.list')
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationCursorQuery({
            availableSearch: CountryDefaultAvailableSearch,
            availableOrderBy: CountryDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryCursorParams<Prisma.CountryWhereInput>
    ): Promise<IResponsePagingReturn<CountryResponseDto>> {
        return this.countryHttpService.getListCursor(pagination);
    }
}
