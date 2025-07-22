import {
    TermPolicyDoc,
    TermPolicyEntity,
} from '@modules/term-policy/repository/entities/term-policy.entity';
import { Injectable } from '@nestjs/common';
import { Document, Types } from 'mongoose';
import {
    IDatabaseCreateOptions,
    IDatabaseDeleteOptions,
    IDatabaseExistsOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseSaveOptions,
} from '@common/database/interfaces/database.interface';
import { ClassTransformOptions, plainToInstance } from 'class-transformer';
import { ITermPolicyService } from '@modules/term-policy/interfaces/term-policy.service.interface';
import {
    ITermPolicyDoc,
    ITermPolicyEntity,
} from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyRepository } from '@modules/term-policy/repository/repositories/term-policy.repository';
import {
    ENUM_TERM_POLICY_STATUS,
    ENUM_TERM_POLICY_TYPE,
} from '@modules/term-policy/enums/term-policy.enum';
import { TermPolicyResponseDto } from '@modules/term-policy/dtos/response/term-policy.response.dto';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@common/pagination/enums/pagination.enum';
import { AwsS3Dto } from '@modules/aws/dtos/aws.s3.dto';
import { TermPolicyUpdateDocumentRequestDto } from '@modules/term-policy/dtos/request/term-policy.update-document.request';
import { TermPolicyDocumentEntity } from '@modules/term-policy/repository/entities/term-policy-document.entity';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';
import { HelperDateService } from '@common/helper/services/helper.date.service';

@Injectable()
export class TermPolicyService implements ITermPolicyService {
    constructor(
        private readonly termPolicyRepository: TermPolicyRepository,
        private readonly helperDateService: HelperDateService
    ) {}

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<ITermPolicyDoc[]> {
        return this.termPolicyRepository.findAll<ITermPolicyDoc>(find, {
            ...options,
            join: true,
        });
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.termPolicyRepository.getTotal(find, options);
    }

    async findOnePublished(
        type: ENUM_TERM_POLICY_TYPE,
        country: string,
        options?: IDatabaseFindOneOptions
    ): Promise<TermPolicyDoc> {
        return this.termPolicyRepository.findOne(
            {
                type,
                country,
                status: ENUM_TERM_POLICY_STATUS.PUBLISHED,
            },
            options
        );
    }

    async findOneLatest(
        type: ENUM_TERM_POLICY_TYPE,
        country: string,
        options?: IDatabaseFindOneOptions
    ): Promise<TermPolicyDoc> {
        return this.termPolicyRepository.findOne(
            {
                type,
                country,
            },
            {
                ...options,
                order: {
                    version: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
                },
            }
        );
    }

    mapList(
        policies: ITermPolicyDoc[] | ITermPolicyEntity[],
        options?: ClassTransformOptions
    ): TermPolicyResponseDto[] {
        return plainToInstance(
            TermPolicyResponseDto,
            policies.map((e: ITermPolicyDoc | ITermPolicyEntity) =>
                e instanceof Document ? e.toObject() : e
            ),
            options
        );
    }

    async exist(
        type: ENUM_TERM_POLICY_TYPE,
        country: string,
        option?: IDatabaseExistsOptions
    ): Promise<boolean> {
        return this.termPolicyRepository.exists(
            {
                type,
                country,
            },
            option
        );
    }

    async findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<TermPolicyDoc> {
        return this.termPolicyRepository.findOneById(_id, options);
    }

    async create(
        previous: TermPolicyDoc,
        urls: (AwsS3Dto & TermPolicyUpdateDocumentRequestDto)[],
        createdBy: string,
        options?: IDatabaseCreateOptions
    ): Promise<TermPolicyDoc> {
        const entity = new TermPolicyEntity();
        entity.type = previous.type;
        entity.country = previous.country;
        entity.version = previous.version + 1;
        entity.status = ENUM_TERM_POLICY_STATUS.DRAFT;
        entity.publishedAt = null;
        entity.createdBy = createdBy;
        entity.updatedBy = createdBy;
        entity.urls = urls.map(
            ({
                bucket,
                completedUrl,
                extension,
                key,
                mime,
                size,
                language,
                cdnUrl,
            }) => {
                const en = new TermPolicyDocumentEntity();
                en.bucket = bucket;
                en.completedUrl = completedUrl;
                en.extension = extension;
                en.key = key;
                en.mime = mime;
                en.size = new Types.Decimal128(size.toString());
                en.language = language;
                en.cdnUrl = cdnUrl;
                return en;
            }
        );

        return this.termPolicyRepository.create(entity, options);
    }

    async updateDocument(
        repository: TermPolicyDoc,
        language: ENUM_MESSAGE_LANGUAGE,
        { size, ...aws }: AwsS3Dto,
        options?: IDatabaseSaveOptions
    ): Promise<TermPolicyDoc> {
        const index = repository.urls.findIndex(e => e.language === language);

        repository.urls[index] = {
            ...aws,
            language,
            size: new Types.Decimal128(size.toString()),
        };

        return this.termPolicyRepository.save(repository, options);
    }

    async publish(
        repository: TermPolicyDoc,
        options?: IDatabaseSaveOptions
    ): Promise<TermPolicyDoc> {
        repository.status = ENUM_TERM_POLICY_STATUS.PUBLISHED;
        repository.publishedAt = this.helperDateService.create();

        return this.termPolicyRepository.save(repository, options);
    }

    async delete(
        repository: TermPolicyDoc,
        options?: IDatabaseDeleteOptions
    ): Promise<TermPolicyDoc> {
        return this.termPolicyRepository.delete(
            { _id: repository._id },
            options
        );
    }

    async deleteDocument(
        repository: TermPolicyDoc,
        language: ENUM_MESSAGE_LANGUAGE,
        options?: IDatabaseSaveOptions
    ): Promise<TermPolicyDoc> {
        repository.urls = repository.urls.filter(e => e.language !== language);

        return this.termPolicyRepository.save(repository, options);
    }

    async createMany(
        country: string,
        types: Record<ENUM_TERM_POLICY_TYPE, TermPolicyDocumentEntity[]>
    ): Promise<void> {
        const typesArray = Object.keys(types) as ENUM_TERM_POLICY_TYPE[];
        const entities = typesArray.map(type => {
            const entity = new TermPolicyEntity();
            entity.type = type;
            entity.country = country;
            entity.version = 1;
            entity.status = ENUM_TERM_POLICY_STATUS.DRAFT;
            entity.urls = types[type];

            return entity;
        });

        await this.termPolicyRepository.createMany(entities);
    }

    async deleteMany(options?: IDatabaseDeleteOptions): Promise<void> {
        await this.termPolicyRepository.deleteMany({}, options);
    }
}
