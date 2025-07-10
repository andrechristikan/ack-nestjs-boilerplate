import {
    TermPolicyDoc,
    TermPolicyEntity,
} from '@modules/term-policy/repository/entities/term-policy.entity';
import { TermPolicyRepository } from '@modules/term-policy/repository/repositories/term-policy-repository.service';
import { Injectable } from '@nestjs/common';
import { Document, PipelineStage } from 'mongoose';
import {
    IDatabaseCreateManyOptions,
    IDatabaseCreateOptions,
    IDatabaseDeleteOptions,
    IDatabaseFindAllAggregateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseSaveOptions,
} from '@common/database/interfaces/database.interface';
import { ClassTransformOptions, plainToInstance } from 'class-transformer';
import { TermPolicyListResponseDto } from '@modules/term-policy/dtos/response/term-policy.list.response.dto';
import { TermPolicyGetResponseDto } from '@modules/term-policy/dtos/response/term-policy.get.response.dto';
import { ITermPolicyService } from '@modules/term-policy/interfaces/term-policy.service.interface';
import {
    ITermPolicyDoc,
    ITermPolicyEntity,
} from '@modules/term-policy/interfaces/term-policy.interface';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@common/pagination/enums/pagination.enum';
import { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';

@Injectable()
export class TermPolicyService implements ITermPolicyService {
    constructor(
        private readonly termPolicyRepository: TermPolicyRepository
    ) {}

    async findOneById(id: string): Promise<TermPolicyDoc> {
        return this.termPolicyRepository.findOneById(id);
    }

    async findOne(
        find?: Record<string, any> & {
            latest?: boolean;
            published?: boolean;
        },
        databaseOptions?: IDatabaseFindOneOptions
    ): Promise<TermPolicyDoc> {
        const { latest, published, ...findQuery } = find;

        if (published) {
            findQuery.publishedAt = { $ne: null, $lte: new Date() };
        }

        let findOptions = { ...databaseOptions };
        if (latest) {
            findOptions = {
                ...findOptions,
                order: {
                    ...(findOptions?.order || {}),
                    publishedAt: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
                    version: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
                },
            };
        }

        return this.termPolicyRepository.findOne(findQuery, findOptions);
    }

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<TermPolicyDoc[]> {
        return this.termPolicyRepository.findAll<TermPolicyDoc>(
            find,
            options
        );
    }

    async create(
        dto: TermPolicyCreateRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<TermPolicyDoc> {
        const entity = new TermPolicyEntity();
        entity.type = dto.type;
        entity.country = dto.country;
        entity.language = dto.language;
        entity.description = dto.description;
        entity.version = dto.version;
        entity.url = dto.url;
        entity.title = dto.title;
        entity.publishedAt = dto.publishedAt;
        return this.termPolicyRepository.create(entity, options);
    }

    async createMany(
        data: TermPolicyCreateRequestDto[],
        options?: IDatabaseCreateManyOptions
    ): Promise<void> {
        const entities: TermPolicyEntity[] = data.map(
            ({
                type,
                language,
                description,
                version,
                url,
                title,
                publishedAt,
                country,
            }): TermPolicyEntity => {
                const entity = new TermPolicyEntity();
                entity.type = type;
                entity.language = language;
                entity.description = description;
                entity.version = version;
                entity.url = url;
                entity.title = title;
                entity.publishedAt = publishedAt;
                entity.country = country;
                return entity;
            }
        );
        await this.termPolicyRepository.createMany(entities, options);
    }

    async update(
        repository: TermPolicyDoc,
        options?: IDatabaseSaveOptions
    ): Promise<TermPolicyDoc> {
        return this.termPolicyRepository.save(repository, options);
    }

    async delete(
        id: string,
        options?: IDatabaseDeleteOptions
    ): Promise<TermPolicyDoc> {
        return this.termPolicyRepository.delete({ _id: id }, options);
    }

    async deleteMany(find?: Record<string, any>): Promise<boolean> {
        await this.termPolicyRepository.deleteMany(find);
        return true;
    }

    async findAllByFilters(
        filters: Record<string, any> & {
            published?: boolean;
            latest?: boolean;
        },
        options?: IDatabaseFindAllAggregateOptions
    ): Promise<TermPolicyDoc[]> {
        const { language, country, published, latest, ...otherFilters } =
            filters;

        const matchStage: Record<string, any> = { ...otherFilters };

        if (language) {
            matchStage.language = language;
        }

        if (country) {
            matchStage.country = country;
        }

        if (published) {
            matchStage.publishedAt = { $ne: null, $lte: new Date() };
        }

        // If latest is false or undefined, just do a simple find
        if (!latest) {
            return this.termPolicyRepository.findAll(matchStage, {
                order: {
                    type: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC,
                    publishedAt: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
                    version: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
                },
                ...options,
            });
        }

        // For latest versions, use aggregation pipeline
        const pipeline: PipelineStage[] = [
            { $match: matchStage },
            {
                $sort: {
                    type: 1,
                    publishedAt: -1,
                    version: -1,
                },
            },
            // Group by type and keep only the first document (latest version)
            {
                $group: {
                    _id: '$type',
                    doc: { $first: '$$ROOT' },
                },
            },
            // Replace the root with the full document
            { $replaceRoot: { newRoot: '$doc' } },
        ];

        return this.termPolicyRepository.aggregate<
            TermPolicyDoc,
            PipelineStage
        >(pipeline, options);
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.termPolicyRepository.getTotal(find, options);
    }

    mapList(
        policies: ITermPolicyDoc[] | ITermPolicyEntity[],
        options?: ClassTransformOptions
    ): TermPolicyListResponseDto[] {
        return plainToInstance(
            TermPolicyListResponseDto,
            policies.map((e: ITermPolicyDoc | ITermPolicyEntity) =>
                e instanceof Document ? e.toObject() : e
            ),
            options
        );
    }

    mapGet(
        policy: ITermPolicyDoc | ITermPolicyEntity,
        options?: ClassTransformOptions
    ): TermPolicyGetResponseDto {
        return plainToInstance(
            TermPolicyGetResponseDto,
            policy instanceof Document ? policy.toObject() : policy,
            options
        );
    }

    createDocumentFilename(
        type: string,
        country: string,
        language: string,
        extension: string
    ): string {
        return `term-policy/${type}_${country}_${language}.${extension}`;
    }
}
