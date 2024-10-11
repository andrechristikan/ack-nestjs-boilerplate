import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { readdirSync, readFileSync } from 'fs';
import { Document } from 'mongoose';
import { DatabaseHelperQueryContain } from 'src/common/database/decorators/database.decorator';
import {
    IDatabaseCreateManyOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
} from 'src/common/database/interfaces/database.interface';
import { AwsS3Service } from 'src/modules/aws/services/aws.s3.service';
import { CountryCreateRequestDto } from 'src/modules/country/dtos/request/country.create.request.dto';
import { CountryListResponseDto } from 'src/modules/country/dtos/response/country.list.response.dto';
import { CountryShortResponseDto } from 'src/modules/country/dtos/response/country.short.response.dto';
import { ICountryService } from 'src/modules/country/interfaces/country.service.interface';
import {
    CountryDoc,
    CountryEntity,
} from 'src/modules/country/repository/entities/country.entity';
import { CountryRepository } from 'src/modules/country/repository/repositories/country.repository';
import { EmailService } from 'src/modules/email/services/email.service';

@Injectable()
export class CountryService implements ICountryService {
    private readonly debug: boolean;
    private readonly logger = new Logger(EmailService.name);

    private readonly assetPath: string;

    constructor(
        private readonly countryRepository: CountryRepository,
        private readonly awsS3Service: AwsS3Service,
        private readonly configService: ConfigService
    ) {
        this.debug = this.configService.get<boolean>('app.debug');

        this.assetPath = this.configService.get<string>('country.assetPath');
    }

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
            DatabaseHelperQueryContain('name', name),
            options
        );
    }

    async findOneByAlpha2(
        alpha2: string,
        options?: IDatabaseFindOneOptions
    ): Promise<CountryDoc> {
        return this.countryRepository.findOne(
            DatabaseHelperQueryContain('alpha2Code', alpha2),
            options
        );
    }

    async findOneByPhoneCode(
        phoneCode: string,
        options?: IDatabaseFindOneOptions
    ): Promise<CountryDoc> {
        return this.countryRepository.findOne(
            {
                phoneCode,
            },
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
        find: Record<string, any>,
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
                domain,
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
                create.domain = domain;
                create.currency = currency;

                return create;
            }
        ) as CountryEntity[];

        await this.countryRepository.createMany(entities, options);

        return true;
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

    async mapShort(
        countries: CountryDoc[] | CountryEntity[]
    ): Promise<CountryShortResponseDto[]> {
        return plainToInstance(
            CountryShortResponseDto,
            countries.map((e: CountryDoc | CountryEntity) =>
                e instanceof Document ? e.toObject() : e
            )
        );
    }

    async importAssets(): Promise<boolean> {
        try {
            const promises = [];
            const dirs: string[] = readdirSync(
                './assets/images/country-flags',
                'utf8'
            );

            const assetPath = this.awsS3Service.getAssetPath();
            const fullPath = `${assetPath}${this.assetPath}`;

            for (const path of dirs) {
                const filename = path.substring(
                    path.lastIndexOf('/'),
                    path.length
                );
                const file: Buffer = readFileSync(
                    `./assets/images/country-flags/${path}`
                );
                promises.push(
                    this.awsS3Service.putItem(
                        {
                            file: file,
                            size: file.byteLength,
                            originalname: filename,
                        },
                        {
                            path: fullPath,
                        }
                    )
                );
            }

            await Promise.all(promises);

            return true;
        } catch (err: unknown) {
            if (this.debug) {
                this.logger.error(err);
            }

            return false;
        }
    }

    async deleteAssets(): Promise<boolean> {
        try {
            const assetPath = this.awsS3Service.getAssetPath();
            const fullPath = `${assetPath}${this.assetPath}`;

            await this.awsS3Service.deleteItem(fullPath);

            return true;
        } catch (err: unknown) {
            if (this.debug) {
                this.logger.error(err);
            }

            return false;
        }
    }

    getAssetPath(): string {
        return this.assetPath;
    }
}
