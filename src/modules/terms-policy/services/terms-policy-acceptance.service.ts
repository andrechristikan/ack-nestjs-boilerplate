import { Injectable, Logger } from '@nestjs/common';
import { Document } from 'mongoose';
import { TermsPolicyAcceptanceRepository } from '@modules/terms-policy/repository/repositories/terms-policy-acceptance.repository';
import {
    TermsPolicyAcceptanceDoc,
    TermsPolicyAcceptanceEntity,
} from '@modules/terms-policy/repository/entities/terms-policy.acceptance.entity';
import { ClassTransformOptions, plainToInstance } from 'class-transformer';
import { TermsPolicyAcceptanceGetResponseDto } from '@modules/terms-policy/dtos/response/terms-policy-acceptance.get.response.dto';
import { TermsPolicyAcceptanceListResponseDto } from '@modules/terms-policy/dtos/response/terms-policy-acceptance.list.response.dto';
import { ENUM_TERMS_POLICY_TYPE } from '@modules/terms-policy/enums/terms-policy.enum';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@common/pagination/enums/pagination.enum';
import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
} from '@common/database/interfaces/database.interface';
import {
    ITermsPolicyAcceptanceDoc,
    ITermsPolicyAcceptanceEntity,
} from '@modules/terms-policy/interfaces/terms-policy-acceptance.interface';
import { ITermsPolicyAcceptanceService } from '@modules/terms-policy/interfaces/terms-policy-acceptance.service.interface';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';

@Injectable()
export class TermsPolicyAcceptanceService
    implements ITermsPolicyAcceptanceService
{
    private readonly logger = new Logger(TermsPolicyAcceptanceService.name);

    constructor(
        private readonly termsPolicyAcceptanceRepository: TermsPolicyAcceptanceRepository
    ) {}

    /**
     * Create a policy acceptance record
     * @param userId User accepting the policy
     * @param policyType Type of the policy being accepted
     * @param policyCountry Country of the policy being accepted
     * @param policyLanguage Language of the policy being accepted
     * @param policyVersion Version of the policy being accepted
     * @param acceptedAt Date of acceptance
     * @param options Database options
     * @returns Created acceptance record
     */
    async create(
        userId: string,
        policyType: ENUM_TERMS_POLICY_TYPE,
        policyCountry: string,
        policyLanguage: ENUM_MESSAGE_LANGUAGE,
        policyVersion: number,
        acceptedAt: Date = new Date(),
        options?: IDatabaseCreateOptions
    ): Promise<TermsPolicyAcceptanceDoc> {
        const acceptance = new TermsPolicyAcceptanceEntity();
        acceptance.user = userId;
        acceptance.type = policyType;
        acceptance.country = policyCountry;
        acceptance.language = policyLanguage;
        acceptance.version = policyVersion;
        acceptance.acceptedAt = acceptedAt;

        return this.termsPolicyAcceptanceRepository.create(acceptance, options);
    }

    /**
     * Create multiple policy acceptance records for a user in a batch
     * @param userId User accepting the policies
     * @param policies Array of policy objects with type, country, language and version
     * @param acceptedAt Date of acceptance (same for all records)
     * @param options Database options
     * @returns Boolean indicating success (true) or failure (false)
     */
    async createMany(
        userId: string,
        policies: Array<{
            type: ENUM_TERMS_POLICY_TYPE;
            country: string;
            language: ENUM_MESSAGE_LANGUAGE;
            version: number;
        }>,
        acceptedAt: Date = new Date(),
        options?: IDatabaseCreateOptions
    ): Promise<boolean> {
        if (!policies.length) {
            return true; // No policies to create is still a success case
        }

        const acceptanceEntities = policies.map((policy) => {
            const acceptance = new TermsPolicyAcceptanceEntity();
            acceptance.user = userId;
            acceptance.type = policy.type;
            acceptance.country = policy.country;
            acceptance.language = policy.language;
            acceptance.version = policy.version;
            acceptance.acceptedAt = acceptedAt;
            return acceptance;
        });

        await this.termsPolicyAcceptanceRepository.createMany(
            acceptanceEntities,
            options
        );

        return true;
    }

    async findOne<T>(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<T> {
        return this.termsPolicyAcceptanceRepository.findOne<T>(find, options);
    }

    mapList(
        policies: ITermsPolicyAcceptanceDoc[],
        options?: ClassTransformOptions
    ): TermsPolicyAcceptanceListResponseDto[] {
        return plainToInstance(
            TermsPolicyAcceptanceListResponseDto,
            policies.map((e: ITermsPolicyAcceptanceDoc) =>
                e instanceof Document ? e.toObject() : e
            ),
            options
        );
    }

    mapGet(
        policy: TermsPolicyAcceptanceDoc,
        options?: ClassTransformOptions
    ): TermsPolicyAcceptanceGetResponseDto {
        return plainToInstance(
            TermsPolicyAcceptanceGetResponseDto,
            policy.toObject(),
            options
        );
    }

    /**
     * Common method for querying acceptance records with consistent options
     */
    async findAll(
        filter?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<ITermsPolicyAcceptanceDoc[]> {
        return this.termsPolicyAcceptanceRepository.findAll(filter, {
            order: {
                acceptedAt: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
            },
            join: {
                path: 'policy',
            },
            ...options,
        });
    }

    /**
     * Find all policies accepted by a specific user
     * @param userId The user ID to search for
     * @param find Additional find conditions to merge with the user filter
     * @param options Database find options
     * @returns Array of acceptance records
     */
    async findAllAcceptedPoliciesByUser(
        userId: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<ITermsPolicyAcceptanceDoc[]> {
        return this.termsPolicyAcceptanceRepository.findAll(
            {
                user: userId,
                ...find,
            },
            options
        );
    }

    /**
     * Check if a user has accepted a specific policy type for a specific country
     * @param userId The user ID to check
     * @param policyType The type of policy
     * @param country The country of the policy
     * @param options Database find options
     * @returns The acceptance record or null if not found
     */
    async hasUserAccepted(
        userId: string,
        policyType: ENUM_TERMS_POLICY_TYPE,
        country: string,
        options?: IDatabaseFindOneOptions
    ): Promise<ITermsPolicyAcceptanceEntity | null> {
        try {
            return await this.termsPolicyAcceptanceRepository.findOne<ITermsPolicyAcceptanceEntity>(
                {
                    user: userId,
                    type: policyType,
                    country: country,
                },
                options
            );
        } catch (error) {
            this.logger.error(
                `Failed to check if user ${userId} has accepted policy type ${policyType} for country ${country}`,
                error
            );
            throw error;
        }
    }

    /**
     * Find the user's accepted policy for a specific type and country,
     * optionally filtering by language
     * @param userId The user ID to search for
     * @param policyType The type of policy (terms, privacy, cookies)
     * @param country The country of the policy
     * @param language Optional language filter
     * @param options Database find options
     * @returns The acceptance record or null if none found
     */
    async findOneAcceptedByUser(
        userId: string,
        policyType: ENUM_TERMS_POLICY_TYPE,
        country: string,
        language?: ENUM_MESSAGE_LANGUAGE,
        options?: IDatabaseFindOneOptions
    ): Promise<ITermsPolicyAcceptanceEntity | null> {
        try {
            const query: Record<string, any> = {
                user: userId,
                type: policyType,
                country: country,
            };

            if (language) {
                query.language = language;
            }

            return await this.termsPolicyAcceptanceRepository.findOne<ITermsPolicyAcceptanceEntity>(
                query,
                options
            );
        } catch (error) {
            this.logger.error(
                `Failed to find accepted policy for user ${userId}, type ${policyType}, country ${country}${language ? `, language ${language}` : ''}`,
                error
            );
            throw error;
        }
    }
}
