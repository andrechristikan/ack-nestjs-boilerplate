import {
    IDatabaseCreateManyOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
} from '@common/database/interfaces/database.interface';
import { CountryCreateRequestDto } from '@module/country/dtos/request/country.create.request.dto';
import { CountryListResponseDto } from '@module/country/dtos/response/country.list.response.dto';
import { CountryShortResponseDto } from '@module/country/dtos/response/country.short.response.dto';
import {
    CountryDoc,
    CountryEntity,
} from '@module/country/repository/entities/country.entity';

export interface ICountryService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<CountryDoc[]>;
    findOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<CountryDoc>;
    findOneByName(
        name: string,
        options?: IDatabaseOptions
    ): Promise<CountryDoc>;
    findOneByAlpha2(
        alpha2: string,
        options?: IDatabaseOptions
    ): Promise<CountryDoc>;
    findOneByPhoneCode(
        phoneCode: string,
        options?: IDatabaseOptions
    ): Promise<CountryDoc>;
    findOneById(_id: string, options?: IDatabaseOptions): Promise<CountryDoc>;
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    deleteMany(
        find?: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean>;
    createMany(
        data: CountryCreateRequestDto[],
        options?: IDatabaseCreateManyOptions
    ): Promise<boolean>;
    mapList(
        countries: CountryDoc[] | CountryEntity[]
    ): CountryListResponseDto[];
    mapShort(
        countries: CountryDoc[] | CountryEntity[]
    ): CountryShortResponseDto[];
}
