import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { PaginationQuery } from '@common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from '@common/pagination/dtos/pagination.list.dto';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { ResponsePaging } from '@common/response/decorators/response.decorator';
import { IResponsePaging } from '@common/response/interfaces/response.interface';
import { COUNTRY_DEFAULT_AVAILABLE_SEARCH } from '@modules/country/constants/country.list.constant';
import { CountryDoc } from '@modules/country/repository/entities/country.entity';
import { CountryService } from '@modules/country/services/country.service';
import { CountryListResponseDto } from '@modules/country/dtos/response/country.list.response.dto';
import { CountryPublicListDoc } from '@modules/country/docs/country.public.doc';

@ApiTags('modules.public.country')
@Controller({
    version: '1',
    path: '/country',
})
export class CountryPublicController {
    constructor(
        private readonly countryService: CountryService,
        private readonly paginationService: PaginationService
    ) {}

    @CountryPublicListDoc()
    @ResponsePaging('country.list')
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationQuery({
            availableSearch: COUNTRY_DEFAULT_AVAILABLE_SEARCH,
        })
        { _search, _limit, _offset, _order }: PaginationListDto
    ): Promise<IResponsePaging<CountryListResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
        };

        const countries: CountryDoc[] = await this.countryService.findAll(
            find,
            {
                paging: {
                    limit: _limit,
                    offset: _offset,
                },
                order: _order,
            }
        );
        const total: number = await this.countryService.getTotal(find);
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        const mapped: CountryListResponseDto[] =
            this.countryService.mapList(countries);

        return {
            _pagination: { total, totalPage },
            data: mapped,
        };
    }
}
