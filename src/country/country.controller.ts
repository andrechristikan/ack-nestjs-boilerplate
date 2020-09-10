import {
    Controller,
    Param,
    Get,
    Post,
    Body,
    Delete,
    Query,
} from '@nestjs/common';
import { CountryService } from 'country/country.service';
import { Country} from 'country/country.model';
import { CountryStore, CountrySearch } from 'country/country.constant';
import { ErrorService } from 'error/error.service';
import { HelperService } from 'helper/helper.service';
import { SystemErrorStatusCode } from 'error/error.constant';
import { ResponseSuccess } from 'helper/helper.constant';
import { ApiError } from 'error/error.constant';
import { LanguageService } from 'language/language.service';

@Controller('api/country')
export class CountryController {
    constructor(
        private readonly countryService: CountryService,
        private readonly errorService: ErrorService,
        private readonly helperService: HelperService,
        private readonly languageService: LanguageService,
    ) {}

    @Get('/')
    async getAll(@Query() data: CountrySearch): Promise<ResponseSuccess> {
        const { skip, limit } = this.helperService.pagination(
            data.page,
            data.limit,
        );

        const search: CountrySearch = await this.countryService.search(data);
        const country: Country[] = await this.countryService.getAll(
            skip,
            limit,
            search,
        );
        return this.helperService.response(200, this.languageService.get('user.getAll.success'), country);
    }

    @Post('/store')
    async store(@Body() data: CountryStore): Promise<ResponseSuccess> {
        const existCountryCode: Promise<Country> = this.countryService.getOneByCountryCode(
            data.countryCode,
        );
        const existMobileNumberCode: Promise<Country> = this.countryService.getOneByMobileNumberCode(
            data.mobileNumberCode,
        );

        return Promise.all([existCountryCode, existMobileNumberCode])
            .then(async ([resExistCountryCode, resExistMobileNumberCode]) => {
                const errors: ApiError[] = [];
                if (resExistCountryCode) {
                    errors.push({
                        statusCode: SystemErrorStatusCode.COUNTRY_CODE_EXIST,
                        field: 'countryCode',
                    });
                }
                if (resExistMobileNumberCode) {
                    errors.push({
                        statusCode:
                            SystemErrorStatusCode.COUNTRY_MOBILE_NUMBER_CODE_EXIST,
                        field: 'mobileNumberCode',
                    });
                }

                if (errors.length > 0) {
                    throw this.errorService.apiError(
                        SystemErrorStatusCode.USER_EXIST,
                        errors,
                    );
                }
                const create: Country = await this.countryService.store(data);
                return this.helperService.response(
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
    async getOneById(@Param('id') id: string): Promise<ResponseSuccess> {
        const country: Country = await this.countryService.getOneById(id);
        if (!country) {
            throw this.errorService.apiError(
                SystemErrorStatusCode.COUNTRY_NOT_FOUND,
            );
        }
        return this.helperService.response(200, this.languageService.get('user.getById.success'), country);
    }

    @Delete('/destroy/:id')
    async destroy(@Param('id') id: string): Promise<ResponseSuccess> {
        const country: Country = await this.countryService.getOneById(id);
        if (!country) {
            throw this.errorService.apiError(
                SystemErrorStatusCode.COUNTRY_NOT_FOUND,
            );
        }

        await this.countryService.destroy(id);
        return this.helperService.response(200, this.languageService.get('user.destroy.success'));
    }
}
