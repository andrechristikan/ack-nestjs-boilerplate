import {
    IDatabaseCreateManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseManyOptions,
    IDatabaseSaveOptions,
} from 'src/common/database/interfaces/database.interface';
import { CountryCreateRequestDto } from 'src/modules/country/dtos/request/country.create.request.dto';
import { CountryListResponseDto } from 'src/modules/country/dtos/response/country.list.response.dto';
import { CountryDoc } from 'src/modules/country/repository/entities/country.entity';

export interface ICountryService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<CountryDoc[]>;
    findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<CountryDoc>;
    findOneActiveByPhoneCode(
        phoneCode: string,
        options?: IDatabaseFindOneOptions
    ): Promise<CountryDoc>;
    findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<CountryDoc>;
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    active(
        repository: CountryDoc,
        options?: IDatabaseSaveOptions
    ): Promise<CountryDoc>;
    inactive(
        repository: CountryDoc,
        options?: IDatabaseSaveOptions
    ): Promise<CountryDoc>;
    delete(
        repository: CountryDoc,
        options?: IDatabaseSaveOptions
    ): Promise<CountryDoc>;
    deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean>;
    createMany(
        data: CountryCreateRequestDto[],
        options?: IDatabaseCreateManyOptions
    ): Promise<boolean>;
    mapList(data: CountryDoc[]): Promise<CountryListResponseDto[]>;
}
