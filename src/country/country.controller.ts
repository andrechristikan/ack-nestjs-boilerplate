import {
    Controller,
    Param,
    Get,
    Post,
    Body,
    Delete,
    Query,
    UsePipes,
    ParseIntPipe,
    DefaultValuePipe,
} from '@nestjs/common';
import { CountryService } from 'country/country.service';
import { Country } from 'country/country.schema';
import { CountryStore, CountrySearch } from 'country/country.interface';
import { ErrorService } from 'error/error.service';
import { ApiResponseService } from 'helper/api-response/api-response.service';
import { SystemErrorStatusCode } from 'error/error.constant';
import { IApiResponseSuccess } from 'helper/api-response/api-response.interface';
import { IApiError } from 'error/error.interface';
import { LanguageService } from 'language/language.service';
import { Language } from 'language/language.decorator';
import { ApiResponse } from 'helper/api-response/api-response.decorator';
import { Error } from 'error/error.decorator';
import { ValidationPipe } from 'pipe/validation.pipe';
import { CountryStoreSchema } from 'country/validation/country.store';

@Controller('api/country')
export class CountryController {
    constructor(
        @Language() private readonly languageService: LanguageService,
        @ApiResponse() private readonly apiResponseService: ApiResponseService,
        @Error() private readonly errorService: ErrorService,
        private readonly countryService: CountryService,
    ) {}

    @Get('/')
    async getAll(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) perPage: number,
        @Query() data: CountrySearch,
    ): Promise<IApiResponseSuccess> {
        const { skip, limit } = this.apiResponseService.pagination(
            page,
            perPage,
        );

        const search: CountrySearch = await this.countryService.search(data);
        const country: Country[] = await this.countryService.getAll(
            skip,
            limit,
            search,
        );

        return this.apiResponseService.response(
            200,
            this.languageService.get('user.getAll.success'),
            country,
        );
    }

    @Post('/store')
    // @UsePipes(new ValidationPipe(CountryStoreSchema))
    async store(@Body() data: CountryStore): Promise<IApiResponseSuccess> {
        const existCountryCode: Promise<Country> = this.countryService.getOneByCountryCode(
            data.countryCode,
        );
        const existMobileNumberCode: Promise<Country> = this.countryService.getOneByMobileNumberCode(
            data.mobileNumberCode,
        );

        return Promise.all([existCountryCode, existMobileNumberCode])
            .then(async ([resExistCountryCode, resExistMobileNumberCode]) => {
                const errors: IApiError[] = [];
                if (resExistCountryCode) {
                    errors.push({
                        statusCode: SystemErrorStatusCode.COUNTRY_CODE_EXIST,
                        property: 'countryCode',
                    });
                }
                if (resExistMobileNumberCode) {
                    errors.push({
                        statusCode:
                            SystemErrorStatusCode.COUNTRY_MOBILE_NUMBER_CODE_EXIST,
                        property: 'mobileNumberCode',
                    });
                }

                if (errors.length > 0) {
                    throw this.errorService.apiError(
                        SystemErrorStatusCode.USER_EXIST,
                        errors,
                    );
                }
                const create: Country = await this.countryService.store(data);
                return this.apiResponseService.response(
                    201,
                    this.languageService.get('user.store.success'),
                    create,
                );
            })
            .catch(err => {
                throw err;
            });
    }

    @Get('/:id')
    async getOneById(@Param('id') id: string): Promise<IApiResponseSuccess> {
        const country: Country = await this.countryService.getOneById(id);
        if (!country) {
            throw this.errorService.apiError(
                SystemErrorStatusCode.COUNTRY_NOT_FOUND,
            );
        }

        return this.apiResponseService.response(
            200,
            this.languageService.get('user.getById.success'),
            country,
        );
    }

    @Delete('/destroy/:id')
    async destroy(@Param('id') id: string): Promise<IApiResponseSuccess> {
        const country: Country = await this.countryService.getOneById(id);
        if (!country) {
            throw this.errorService.apiError(
                SystemErrorStatusCode.COUNTRY_NOT_FOUND,
            );
        }

        await this.countryService.destroy(id);
        return this.apiResponseService.response(
            200,
            this.languageService.get('user.destroy.success'),
        );
    }
}
