import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Document } from 'mongoose';
import { DatabaseHelperQueryContain } from 'src/common/database/decorators/database.decorator';
import {
    IDatabaseCreateManyOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
} from 'src/common/database/interfaces/database.interface';
import { CountryCreateRequestDto } from 'src/modules/country/dtos/request/country.create.request.dto';
import { CountryListResponseDto } from 'src/modules/country/dtos/response/country.list.response.dto';
import { CountryShortResponseDto } from 'src/modules/country/dtos/response/country.short.response.dto';
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
        return this.countryRepository.findAll(find, options);
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<CountryDoc> {
        return this.countryRepository.findOne(find, options);
    }

    async findOneByName(
        name: string,
        options?: IDatabaseFindOneOptions
    ): Promise<CountryDoc> {
        return this.countryRepository.findOne(
            DatabaseHelperQueryContain('name', name, { fullWord: true }),
            options
        );
    }

    async findOneByAlpha2(
        alpha2: string,
        options?: IDatabaseFindOneOptions
    ): Promise<CountryDoc> {
        return this.countryRepository.findOne(
            DatabaseHelperQueryContain('alpha2Code', alpha2, {
                fullWord: true,
            }),
            options
        );
    }

    async findOneByPhoneCode(
        phoneCode: string,
        options?: IDatabaseFindOneOptions
    ): Promise<CountryDoc> {
        return this.countryRepository.findOne(
            DatabaseHelperQueryContain('phoneCode', phoneCode, {
                fullWord: true,
            }),
            options
        );
    }

    async findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<CountryDoc> {
        return this.countryRepository.findOneById(_id, options);
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.countryRepository.getTotal(find, options);
    }

    async deleteMany(
        find?: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean> {
        await this.countryRepository.deleteMany(find, options);

        return true;
    }

    async createMany(
        data: CountryCreateRequestDto[],
        options?: IDatabaseCreateManyOptions
    ): Promise<boolean> {
        const entities: CountryEntity[] = data.map(
            ({
                name,
                alpha2Code,
                alpha3Code,
                numericCode,
                continent,
                fipsCode,
                phoneCode,
                timeZone,
                currency,
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
                create.currency = currency;

                return create;
            }
        ) as CountryEntity[];

        await this.countryRepository.createMany(entities, options);

        return true;
    }

    mapList(
        countries: CountryDoc[] | CountryEntity[]
    ): CountryListResponseDto[] {
        return plainToInstance(
            CountryListResponseDto,
            countries.map((e: CountryDoc | CountryEntity) =>
                e instanceof Document ? e.toObject() : e
            )
        );
    }

    mapShort(
        countries: CountryDoc[] | CountryEntity[]
    ): CountryShortResponseDto[] {
        return plainToInstance(
            CountryShortResponseDto,
            countries.map((e: CountryDoc | CountryEntity) =>
                e instanceof Document ? e.toObject() : e
            )
        );
    }
}
