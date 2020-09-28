import {
    Controller,
    Param,
    Get,
    Post,
    Body,
    Delete,
    Query,
    ParseIntPipe,
    DefaultValuePipe,
    UsePipes
} from '@nestjs/common';
import { CountryService } from 'country/country.service';
import { Country } from 'country/country.schema';
import { ICountryStore, ICountrySearch } from 'country/country.interface';
import { Error } from 'error/error.decorator';
import { ErrorService } from 'error/error.service';
import { ResponseService } from 'response/response.service';
import { SystemErrorStatusCode } from 'error/error.constant';
import { IApiResponseSuccess } from 'response/response.interface';
import { IApiError } from 'error/error.interface';
import { LanguageService } from 'language/language.service';
import { Language } from 'language/language.decorator';
import { Response } from 'response/response.decorator';
import { RequestValidationPipe } from 'pipe/request-validation.pipe';
import { CountryStoreRequest } from 'country/validation/country.store';
import { CountrySearchRequest } from 'country/validation/country.search';

@Controller('api/country')
export class CountryController {
    constructor(
        @Language() private readonly languageService: LanguageService,
        @Response() private readonly responseService: ResponseService,
        @Error() private readonly errorService: ErrorService,
        private readonly countryService: CountryService
    ) {}

    @Get('/')
    async getAll(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) perPage: number,
        @Query(RequestValidationPipe(CountrySearchRequest)) data: ICountrySearch
    ): Promise<IApiResponseSuccess> {
        const { skip, limit } = this.responseService.pagination(page, perPage);

        const search: ICountrySearch = await this.countryService.search(data);
        const country: Country[] = await this.countryService.getAll(
            skip,
            limit,
            search
        );

        return this.responseService.success(
            200,
            this.languageService.get('user.getAll.success'),
            country
        );
    }

    @Post('/store')
    @UsePipes(RequestValidationPipe(CountryStoreRequest))
    async store(
        @Body()
        data: ICountryStore
    ): Promise<IApiResponseSuccess> {
        const existCountryCode: Promise<Country> = this.countryService.getOneByCountryCode(
            data.countryCode
        );
        const existMobileNumberCode: Promise<Country> = this.countryService.getOneByMobileNumberCode(
            data.mobileNumberCode
        );

        return Promise.all([existCountryCode, existMobileNumberCode])
            .then(async ([resExistCountryCode, resExistMobileNumberCode]) => {
                const errors: IApiError[] = [];
                if (resExistCountryCode) {
                    errors.push({
                        statusCode: SystemErrorStatusCode.COUNTRY_CODE_EXIST,
                        property: 'countryCode'
                    });
                }
                if (resExistMobileNumberCode) {
                    errors.push({
                        statusCode:
                            SystemErrorStatusCode.COUNTRY_MOBILE_NUMBER_CODE_EXIST,
                        property: 'mobileNumberCode'
                    });
                }

                if (errors.length > 0) {
                    const res: IApiError = this.errorService.setError(
                        SystemErrorStatusCode.USER_EXIST,
                        errors
                    );
                    return this.responseService.error(res);
                }
                const create: Country = await this.countryService.store(data);
                return this.responseService.success(
                    201,
                    this.languageService.get('user.store.success'),
                    create
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
            const res: IApiError = this.errorService.setError(
                SystemErrorStatusCode.COUNTRY_NOT_FOUND
            );
            return this.responseService.error(res);
        }

        return this.responseService.success(
            200,
            this.languageService.get('user.getById.success'),
            country
        );
    }

    @Delete('/destroy/:id')
    async destroy(@Param('id') id: string): Promise<IApiResponseSuccess> {
        const country: Country = await this.countryService.getOneById(id);
        if (!country) {
            const res: IApiError = this.errorService.setError(
                SystemErrorStatusCode.COUNTRY_NOT_FOUND
            );
            return this.responseService.error(res);
        }

        await this.countryService.destroy(id);
        return this.responseService.success(
            200,
            this.languageService.get('user.destroy.success')
        );
    }
}
