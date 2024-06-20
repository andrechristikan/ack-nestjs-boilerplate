import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Document } from 'mongoose';
import { DatabaseQueryContain } from 'src/common/database/decorators/database.decorator';
import {
    IDatabaseCreateManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseManyOptions,
    IDatabaseSaveOptions,
} from 'src/common/database/interfaces/database.interface';
import { CountryCreateRequestDto } from 'src/modules/country/dtos/request/country.create.request.dto';
import { CountryGetResponseDto } from 'src/modules/country/dtos/response/country.get.response.dto';
import { CountryListResponseDto } from 'src/modules/country/dtos/response/country.list.response.dto';
import { ICountryService } from 'src/modules/country/interfaces/country.service.interface';
import {
    CountryDoc,
    CountryEntity,
} from 'src/modules/country/repository/entities/country.entity';
import { CountryRepository } from 'src/modules/country/repository/repositories/country.repository';

@Injectable()
export class CountryService implements ICountryService {
    constructor(private readonly countryRepository: CountryRepository) {}

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<CountryDoc[]> {
        return this.countryRepository.findAll<CountryDoc>(find, options);
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<CountryDoc> {
        return this.countryRepository.findOne<CountryDoc>(find, options);
    }

    async findOneByName(
        name: string,
        options?: IDatabaseFindOneOptions
    ): Promise<CountryDoc> {
        return this.countryRepository.findOne<CountryDoc>(
            DatabaseQueryContain('name', name),
            options
        );
    }

    async findOneByAlpha2(
        alpha2: string,
        options?: IDatabaseFindOneOptions
    ): Promise<CountryDoc> {
        return this.countryRepository.findOne<CountryDoc>(
            DatabaseQueryContain('alpha2Code', alpha2),
            options
        );
    }

    async findOneActiveByPhoneCode(
        phoneCode: string,
        options?: IDatabaseFindOneOptions
    ): Promise<CountryDoc> {
        return this.countryRepository.findOne<CountryDoc>(
            {
                phoneCode,
                isActive: true,
            },
            options
        );
    }

    async findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<CountryDoc> {
        return this.countryRepository.findOneById<CountryDoc>(_id, options);
    }

    async findOneActiveById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<CountryDoc> {
        return this.countryRepository.findOne<CountryDoc>(
            { _id, isActive: true },
            options
        );
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.countryRepository.getTotal(find, options);
    }

    async delete(
        repository: CountryDoc,
        options?: IDatabaseSaveOptions
    ): Promise<CountryDoc> {
        return this.countryRepository.softDelete(repository, options);
    }

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean> {
        return this.countryRepository.deleteMany(find, options);
    }

    async createMany(
        data: CountryCreateRequestDto[],
        options?: IDatabaseCreateManyOptions
    ): Promise<boolean> {
        return this.countryRepository.createMany(
            data.map(
                ({
                    name,
                    alpha2Code,
                    alpha3Code,
                    numericCode,
                    continent,
                    fipsCode,
                    phoneCode,
                    timeZone,
                    domain,
                }): CountryCreateRequestDto => {
                    const create: CountryEntity = new CountryEntity();
                    create.name = name;
                    create.alpha2Code = alpha2Code;
                    create.alpha3Code = alpha3Code;
                    create.numericCode = numericCode;
                    create.continent = continent;
                    create.fipsCode = fipsCode;
                    create.phoneCode = phoneCode;
                    create.timeZone = timeZone;
                    create.domain = domain;

                    return create;
                }
            ),
            options
        );
    }

    async mapList(
        countries: CountryDoc[] | CountryEntity[]
    ): Promise<CountryListResponseDto[]> {
        return plainToInstance(
            CountryListResponseDto,
            countries.map((e: CountryDoc | CountryEntity) =>
                e instanceof Document ? e.toObject() : e
            )
        );
    }

    async mapGet(
        country: CountryDoc | CountryEntity
    ): Promise<CountryGetResponseDto> {
        return plainToInstance(
            CountryGetResponseDto,
            country instanceof Document ? country.toObject() : country
        );
    }
}
