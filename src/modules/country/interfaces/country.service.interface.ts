import {
    IDatabaseCreateManyOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import { CountryCreateRequestDto } from 'src/modules/country/dtos/request/country.create.request.dto';
import { CountryGetResponseDto } from 'src/modules/country/dtos/response/country.get.response.dto';
import { CountryListResponseDto } from 'src/modules/country/dtos/response/country.list.response.dto';
import { CountryShortResponseDto } from 'src/modules/country/dtos/response/country.short.response.dto';
import {
    CountryDoc,
    CountryEntity,
} from 'src/modules/country/repository/entities/country.entity';

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
    findOneActiveByPhoneCode(
        phoneCode: string,
        options?: IDatabaseOptions
    ): Promise<CountryDoc>;
    findOneById(_id: string, options?: IDatabaseOptions): Promise<CountryDoc>;
    findOneActiveById(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<CountryDoc>;
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    deleteMany(
        find: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean>;
    createMany(
        data: CountryCreateRequestDto[],
        options?: IDatabaseCreateManyOptions
    ): Promise<boolean>;
    mapList(
        countries: CountryDoc[] | CountryEntity[]
    ): Promise<CountryListResponseDto[]>;
    mapGet(country: CountryDoc | CountryEntity): Promise<CountryGetResponseDto>;
    mapShort(
        countries: CountryDoc[] | CountryEntity[]
    ): Promise<CountryShortResponseDto[]>;
}
