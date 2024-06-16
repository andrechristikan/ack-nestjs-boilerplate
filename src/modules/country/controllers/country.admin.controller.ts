import { Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeyPublicProtected } from 'src/common/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from 'src/common/auth/decorators/auth.jwt.decorator';
import {
    PaginationQuery,
    PaginationQueryFilterInBoolean,
} from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from 'src/common/policy/constants/policy.enum.constant';
import {
    PolicyAbilityProtected,
    PolicyRoleProtected,
} from 'src/common/policy/decorators/policy.decorator';
import { RequestRequiredPipe } from 'src/common/request/pipes/request.required.pipe';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from 'src/common/response/interfaces/response.interface';
import {
    COUNTRY_DEFAULT_AVAILABLE_SEARCH,
    COUNTRY_DEFAULT_IS_ACTIVE,
} from 'src/modules/country/constants/country.list.constant';
import {
    CountryAdminActiveDoc,
    CountryAdminGetDoc,
    CountryAdminInactiveDoc,
    CountryAdminListDoc,
} from 'src/modules/country/docs/country.admin.doc';
import { CountryGetResponseDto } from 'src/modules/country/dtos/response/country.get.response.dto';
import { CountryListResponseDto } from 'src/modules/country/dtos/response/country.list.response.dto';
import {
    CountryActivePipe,
    CountryInactivePipe,
} from 'src/modules/country/pipes/country.is-active.pipe';
import { CountryParsePipe } from 'src/modules/country/pipes/country.parse.pipe';
import { CountryDoc } from 'src/modules/country/repository/entities/country.entity';
import { CountryService } from 'src/modules/country/services/country.service';

@ApiTags('modules.admin.country')
@Controller({
    version: '1',
    path: '/country',
})
export class CountryAdminController {
    constructor(
        private readonly countryService: CountryService,
        private readonly paginationService: PaginationService
    ) {}

    @CountryAdminListDoc()
    @ResponsePaging('country.list')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.COUNTRY,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @ApiKeyPublicProtected()
    @Get('/list')
    async list(
        @PaginationQuery({
            availableSearch: COUNTRY_DEFAULT_AVAILABLE_SEARCH,
        })
        { _search, _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterInBoolean('isActive', COUNTRY_DEFAULT_IS_ACTIVE)
        isActive: Record<string, any>
    ): Promise<IResponsePaging<CountryListResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
            ...isActive,
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
        const mapCountries: CountryListResponseDto[] =
            await this.countryService.mapList(countries);
        const total: number = await this.countryService.getTotal(find);
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        return {
            _pagination: { total, totalPage },
            data: mapCountries,
        };
    }

    @CountryAdminGetDoc()
    @Response('country.get')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.COUNTRY,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @Get('/get/:country')
    async get(
        @Param('country', RequestRequiredPipe, CountryParsePipe)
        country: CountryDoc
    ): Promise<IResponse<CountryGetResponseDto>> {
        return { data: country };
    }

    @CountryAdminInactiveDoc()
    @Response('country.inactive')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.COUNTRY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @ApiKeyPublicProtected()
    @Patch('/update/:country/inactive')
    async inactive(
        @Param(
            'country',
            RequestRequiredPipe,
            CountryParsePipe,
            CountryActivePipe
        )
        country: CountryDoc
    ): Promise<void> {
        await this.countryService.inactive(country);

        return;
    }

    @CountryAdminActiveDoc()
    @Response('country.active')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.COUNTRY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @ApiKeyPublicProtected()
    @Patch('/update/:country/active')
    async active(
        @Param(
            'country',
            RequestRequiredPipe,
            CountryParsePipe,
            CountryInactivePipe
        )
        country: CountryDoc
    ): Promise<void> {
        await this.countryService.active(country);

        return;
    }
}
