import { TermsPolicyDoc, TermsPolicyEntity } from '@modules/terms-policy/repository/entities/terms-policy.entity';
import { TermsPolicyRepository } from '@modules/terms-policy/repository/repositories/terms-policy.repository';
import { Injectable } from '@nestjs/common';
import { Document, PipelineStage, Types } from 'mongoose';
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
import { ITermsPolicyDoc, ITermsPolicyEntity } from '@modules/terms-policy/interfaces/terms-policy.interface';
import { ENUM_TERMS_POLICY_TYPE } from '@modules/terms-policy/enums/terms-policy.enum';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@common/pagination/enums/pagination.enum';
import { TermsPolicyCreateRequestDto } from '@modules/terms-policy/dtos/request/terms-policy.create.request.dto';

@Injectable()
export class TermsPolicyService implements ITermsPolicyService {
  constructor(
    private readonly termsPolicyRepository: TermsPolicyRepository,
  ) {
  }

  async findOneById(id: string): Promise<TermsPolicyDoc> {
    return this.termsPolicyRepository.findOneById(id);
  }

  async findOne(find: Record<string, any>, options?: IDatabaseFindOneOptions): Promise<TermsPolicyDoc> {
    return this.termsPolicyRepository.findOne(find, options);
  }

  /**
   * Create a new terms policy document
   * @param dto The data to create the new terms policy
   * @param options Optional database options for the operation
   * @returns The created terms policy document
   */
  async create(
    dto: TermsPolicyCreateRequestDto,
    options?: IDatabaseCreateOptions,
  ): Promise<TermsPolicyDoc> {
    const entity = new TermsPolicyEntity()
    entity.type = dto.type
    entity.language = dto.language
    entity.description = dto.description
    entity.version = dto.version
    entity.content = dto.content
    entity.title = dto.title
    entity.publishedAt = dto.publishedAt
    return this.termsPolicyRepository.create(entity, options);
  }

  /**
   * Update a terms policy document
   * @param repository Doc to update
   * @param options Optional database options for the operation
   * @returns The updated terms policy document
   */
  async update(
    repository: TermsPolicyDoc,
    options?: IDatabaseSaveOptions,
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
    options?: IDatabaseDeleteOptions,
  ): Promise<TermsPolicyDoc> {
    return this.termsPolicyRepository.delete({ _id: id }, options);
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
    return this.termsPolicyRepository.findAll<TermsPolicyDoc>(find, options);
  }

  /**
   * Find the latest published version of a specific policy type and language
   * @param type The policy type to search for
   * @param language The language of the policy (optional)
   * @returns The latest published policy document or null if not found
   */
  async findLatestPublishedByType(
    type: ENUM_TERMS_POLICY_TYPE,
    language?: string,
  ): Promise<TermsPolicyDoc> {
    const findQuery: Record<string, any> = { type };

    // Add language filter if provided
    if (language) {
      findQuery.language = language;
    }

    // Find the latest published version of the policy
    return this.termsPolicyRepository.findOne(
      findQuery,
      {
        order: {
          publishedAt: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
          version: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
        },
      },
    );
  }

  /**
   * Find one published policy based on provided criteria
   * @param find The search criteria to find the policy
   * @param options Additional database options
   * @returns The found published policy or null if not found
   */
  async findOnePublished(
    find: Record<string, any>,
    options?: IDatabaseFindOneOptions,
  ): Promise<TermsPolicyDoc> {
    // Add the publishedAt filter to ensure only published policies are returned
    const findWithPublished = {
      ...find,
      publishedAt: { $ne: null, $lte: new Date() },
    };

    return this.termsPolicyRepository.findOne(findWithPublished, options);
  }

  /**
   * Find all latest published policies for a specific language
   * @param language The language of the policies to search for
   * @returns Array of latest published policy documents for each type
   */
  async findLatestPublishedByLanguage(language: string): Promise<TermsPolicyDoc[]> {
    const pipeline: PipelineStage[] = [
      // Match policies with the specified language and that are published
      {
        $match: {
          language,
          publishedAt: { $ne: null, $lte: new Date() },
        },
      },
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

    return this.termsPolicyRepository.aggregate<TermsPolicyDoc, PipelineStage>(pipeline);
  }

  /**
   * Find all latest published versions of policies across all types
   * @returns Array of the latest published policy document for each type/language combination
   */
  async findAllLatestPublished(): Promise<TermsPolicyDoc[]> {
    const pipeline: PipelineStage[] = [
      // Match only published policies (publishedAt is not null and less than current date)
      {
        $match: {
          publishedAt: { $ne: null, $lte: new Date() },
        },
      },
      // Sort by type, language, publishedAt and version
      {
        $sort: {
          type: 1,
          language: 1,
          publishedAt: -1,
          version: -1,
        },
      },
      // Group by type and language to get the latest version for each combination
      {
        $group: {
          _id: { type: '$type', language: '$language' },
          doc: { $first: '$$ROOT' },
        },
      },
      // Replace the root with the full document
      {
        $replaceRoot: { newRoot: '$doc' },
      },
    ];

    return this.termsPolicyRepository.aggregate<TermsPolicyDoc, PipelineStage>(pipeline);
  }

  mapList(
    policies: ITermsPolicyDoc[] | ITermsPolicyEntity[],
    options?: ClassTransformOptions,
  ): TermsPolicyListResponseDto[] {
    return plainToInstance(
      TermsPolicyListResponseDto,
      policies.map((e: ITermsPolicyDoc | ITermsPolicyEntity) =>
        e instanceof Document ? e.toObject() : e,
      ),
      options,
    );
  }

  mapGet(
    policy: TermsPolicyDoc,
    options?: ClassTransformOptions,
  ): TermsPolicyGetResponseDto {
    const plainPolicy = policy.toObject({ getters: true, virtuals: true });

    return plainToInstance(
      TermsPolicyGetResponseDto,
      plainPolicy,
      {
        ...options,
        excludeExtraneousValues: true,
      },
    );
  }

  async findLatestByLanguage(language: string): Promise<TermsPolicyDoc[]> {
    // This query will get the latest version of each policy type for the given language
    const pipeline: PipelineStage[] = [
      // Match policies with the specified language
      { $match: { language } },
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

    // Calling aggregate with both required type parameters
    return this.termsPolicyRepository.aggregate<TermsPolicyDoc, PipelineStage>(pipeline);
  }

  /**
   * Find the latest published versions of multiple policy types at once
   * @param types Array of policy types to fetch
   * @param language The language for the policies
   * @returns A map of policy types to their latest published documents
   */
  async findLatestPublishedByTypes(
    types: ENUM_TERMS_POLICY_TYPE[],
    language: string,
  ): Promise<Map<ENUM_TERMS_POLICY_TYPE, TermsPolicyDoc>> {
    // If no types provided, return empty map
    if (!types.length) {
      return new Map();
    }

    const policies = await this.termsPolicyRepository.findAll(
      {
        type: { $in: types },
        language,
        publishedAt: { $ne: null, $lte: new Date() },
      },
      {
        order: {
          type: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC,
          publishedAt: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
          version: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
        },
      },
    );

    // Group policies by type, keeping only the latest version
    const latestPolicies = new Map<ENUM_TERMS_POLICY_TYPE, TermsPolicyDoc>();

    for (const policy of policies) {
      if (!latestPolicies.has(policy.type) ||
        policy.version > latestPolicies.get(policy.type).version) {
        latestPolicies.set(policy.type, policy);
      }
    }

    return latestPolicies;
  }

  /**
   * Create multiple terms policy documents at once
   * @param data Array of policy DTOs to create
   * @param options Optional database options for the operation
   * @returns Promise<void>
   */
  async createMany(
    data: TermsPolicyCreateRequestDto[],
    options?: IDatabaseCreateManyOptions,
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
      }): TermsPolicyEntity => {
        const entity = new TermsPolicyEntity();
        entity.type = type;
        entity.language = language;
        entity.description = description;
        entity.version = version;
        entity.content = content;
        entity.title = title;
        entity.publishedAt = publishedAt;
        return entity;
      }
    );
    await this.termsPolicyRepository.createMany(entities, options);
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

  async getTotal(
    find?: Record<string, any>,
    options?: IDatabaseGetTotalOptions
  ): Promise<number> {
    return this.termsPolicyRepository.getTotal(find, options);
  }
}