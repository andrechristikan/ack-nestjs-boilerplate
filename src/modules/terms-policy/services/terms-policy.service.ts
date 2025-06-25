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
import { ENUM_TERMS_POLICY_TYPE } from '@modules/terms-policy/enums/terms-policy.enum';
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

    /**
     * Find one terms policy document based on filter criteria
     * @param filters Combined filter criteria including type, country, language,
     *                latest (for ordering), published (for filtering), and any other criteria
     * @param databaseOptions Additional database options
     * @returns The found policy document or null if not found
     */
    async findOne(
        filters: {
            type?: ENUM_TERMS_POLICY_TYPE;
            country?: string;
            language?: string;
            latest?: boolean;
            published?: boolean;
            [key: string]: any;
        } = {},
        databaseOptions?: IDatabaseFindOneOptions
    ): Promise<TermsPolicyDoc> {
        const { latest, published, ...findQuery } = filters;

        // Add published filter if requested
        if (published) {
            findQuery.publishedAt = { $ne: null, $lte: new Date() };
        }

        // Add ordering for latest version if requested
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

    /**
     * Find all terms policy documents matching criteria
     * @param find Optional find criteria
     * @param options Optional database options
     * @returns Array of terms policy documents
     */
    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<TermsPolicyDoc[]> {
        return this.termsPolicyRepository.findAll<TermsPolicyDoc>(
            find,
            options
        );
    }

    /**
     * Create a new terms policy document
     * @param dto The data to create the new terms policy
     * @param options Optional database options for the operation
     * @returns The created terms policy document
     */
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

    /**
     * Create multiple terms policy documents at once
     * @param data Array of policy DTOs to create
     * @param options Optional database options for the operation
     * @returns Promise<void>
     */
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
                 country
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

    /**
     * Update a terms policy document
     * @param repository Doc to update
     * @param options Optional database options for the operation
     * @returns The updated terms policy document
     */
    async update(
        repository: TermsPolicyDoc,
        options?: IDatabaseSaveOptions
    ): Promise<TermsPolicyDoc> {
        return this.termsPolicyRepository.save(repository, options);
    }

    /**
     * Delete a terms policy document by ID
     * @param id The ID of the terms policy to delete
     * @param options Optional database options for the operation
     * @returns True if deletion was successful
     */
    async delete(
        id: string,
        options?: IDatabaseDeleteOptions
    ): Promise<TermsPolicyDoc> {
        return this.termsPolicyRepository.delete({ _id: id }, options);
    }

    /**
     * Delete all terms policy documents or those matching a filter
     * @param find Optional filter criteria for documents to delete
     * @returns Promise indicating the operation's success
     */
    async deleteMany(find?: Record<string, any>): Promise<boolean> {
        await this.termsPolicyRepository.deleteMany(find);
        return true;
    }

    /**
     * Find all policy documents based on filter criteria
     * @param filters Combined filter criteria including language, country, and options
     * @param filters.language Optional language filter
     * @param filters.country Optional country filter
     * @param filters.published If true, filter for published documents only
     * @param filters.latest If true, return only the latest version for each type
     * @returns Array of policy documents matching the criteria
     */
    async findAllByFilters(
        filters: {
            language?: string;
            country?: string;
            published?: boolean;
            latest?: boolean;
            [key: string]: any;
        } = {}
    ): Promise<TermsPolicyDoc[]> {
        const { language, country, published, latest, ...otherFilters } = filters;

        // Validate input - at least one of language or country must be provided
        if (!language && !country) {
            throw new Error(
                'At least one of language or country must be provided'
            );
        }

        const matchStage: Record<string, any> = { ...otherFilters };

        if (language) {
            matchStage.language = language;
        }

        if (country) {
            matchStage.country = country;
        }

        // Add publishedAt filter if published option is true
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
                }
            });
        }

        // For latest versions, use aggregation pipeline
        const pipeline: PipelineStage[] = [
            // Match policies with the specified filters
            { $match: matchStage },
            // Sort by type, publishedAt and version in descending order
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
        >(pipeline);
    }

    /**
     * Find the latest published versions of multiple policy types at once
     * @param types Array of policy types to fetch
     * @param language The language for the policies
     * @param country Optional country filter
     * @returns A map of policy types to their latest published documents
     */
    async findAllLatestPublishedByTypes(
        types: ENUM_TERMS_POLICY_TYPE[],
        language: string,
        country?: string
    ): Promise<Map<ENUM_TERMS_POLICY_TYPE, TermsPolicyDoc>> {
        // If no types provided, return empty map
        if (!types.length) {
            return new Map();
        }

        const query: Record<string, any> = {
            type: { $in: types },
            language,
            publishedAt: { $ne: null, $lte: new Date() },
        };

        // Add country filter if provided
        if (country) {
            query.country = country;
        }

        const policies = await this.termsPolicyRepository.findAll(query, {
            order: {
                type: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC,
                publishedAt: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
                version: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
            },
        });

        // Group policies by type, keeping only the latest version
        const latestPolicies = new Map<
            ENUM_TERMS_POLICY_TYPE,
            TermsPolicyDoc
        >();

        for (const policy of policies) {
            if (
                !latestPolicies.has(policy.type) ||
                policy.version > latestPolicies.get(policy.type).version
            ) {
                latestPolicies.set(policy.type, policy);
            }
        }

        return latestPolicies;
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
