import {
    TermsPolicyDoc,
    TermsPolicyEntity,
} from '@modules/terms-policy/repository/entities/terms-policy.entity';
import { TermsPolicyRepository } from '@modules/terms-policy/repository/repositories/terms-policy.repository';
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
import { TermsPolicyListResponseDto } from '@modules/terms-policy/dtos/response/terms-policy.list.response.dto';
import { TermsPolicyGetResponseDto } from '@modules/terms-policy/dtos/response/terms-policy.get.response.dto';
import { ITermsPolicyService } from '@modules/terms-policy/interfaces/terms-policy.service.interface';
import {
    ITermsPolicyDoc,
    ITermsPolicyEntity,
} from '@modules/terms-policy/interfaces/terms-policy.interface';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@common/pagination/enums/pagination.enum';
import { TermsPolicyCreateRequestDto } from '@modules/terms-policy/dtos/request/terms-policy.create.request.dto';

@Injectable()
export class TermsPolicyService implements ITermsPolicyService {
    constructor(
        private readonly termsPolicyRepository: TermsPolicyRepository
    ) {}

    async findOneById(id: string): Promise<TermsPolicyDoc> {
        return this.termsPolicyRepository.findOneById(id);
    }

    async findOne(
        find?: Record<string, any> & {
            latest?: boolean;
            published?: boolean;
        },
        databaseOptions?: IDatabaseFindOneOptions
    ): Promise<TermsPolicyDoc> {
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

        return this.termsPolicyRepository.findOne(findQuery, findOptions);
    }

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<TermsPolicyDoc[]> {
        return this.termsPolicyRepository.findAll<TermsPolicyDoc>(
            find,
            options
        );
    }

    async create(
        dto: TermsPolicyCreateRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<TermsPolicyDoc> {
        const entity = new TermsPolicyEntity();
        entity.type = dto.type;
        entity.country = dto.country;
        entity.language = dto.language;
        entity.description = dto.description;
        entity.version = dto.version;
        entity.content = dto.content;
        entity.title = dto.title;
        entity.publishedAt = dto.publishedAt;
        return this.termsPolicyRepository.create(entity, options);
    }

    async createMany(
        data: TermsPolicyCreateRequestDto[],
        options?: IDatabaseCreateManyOptions
    ): Promise<void> {
        const entities: TermsPolicyEntity[] = data.map(
            ({
                type,
                language,
                description,
                version,
                content,
                title,
                publishedAt,
                country,
            }): TermsPolicyEntity => {
                const entity = new TermsPolicyEntity();
                entity.type = type;
                entity.language = language;
                entity.description = description;
                entity.version = version;
                entity.content = content;
                entity.title = title;
                entity.publishedAt = publishedAt;
                entity.country = country;
                return entity;
            }
        );
        await this.termsPolicyRepository.createMany(entities, options);
    }

    async update(
        repository: TermsPolicyDoc,
        options?: IDatabaseSaveOptions
    ): Promise<TermsPolicyDoc> {
        return this.termsPolicyRepository.save(repository, options);
    }

    async delete(
        id: string,
        options?: IDatabaseDeleteOptions
    ): Promise<TermsPolicyDoc> {
        return this.termsPolicyRepository.delete({ _id: id }, options);
    }

    async deleteMany(find?: Record<string, any>): Promise<boolean> {
        await this.termsPolicyRepository.deleteMany(find);
        return true;
    }

    async findAllByFilters(
        filters: Record<string, any> & {
            published?: boolean;
            latest?: boolean;
        },
        options?: IDatabaseFindAllAggregateOptions
    ): Promise<TermsPolicyDoc[]> {
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
            return this.termsPolicyRepository.findAll(matchStage, {
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

        return this.termsPolicyRepository.aggregate<
            TermsPolicyDoc,
            PipelineStage
        >(pipeline, options);
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.termsPolicyRepository.getTotal(find, options);
    }

    mapList(
        policies: ITermsPolicyDoc[] | ITermsPolicyEntity[],
        options?: ClassTransformOptions
    ): TermsPolicyListResponseDto[] {
        return plainToInstance(
            TermsPolicyListResponseDto,
            policies.map((e: ITermsPolicyDoc | ITermsPolicyEntity) =>
                e instanceof Document ? e.toObject() : e
            ),
            options
        );
    }

    mapGet(
        policy: ITermsPolicyDoc | ITermsPolicyEntity,
        options?: ClassTransformOptions
    ): TermsPolicyGetResponseDto {
        return plainToInstance(
            TermsPolicyGetResponseDto,
            policy instanceof Document ? policy.toObject() : policy,
            options
        );
    }
}
