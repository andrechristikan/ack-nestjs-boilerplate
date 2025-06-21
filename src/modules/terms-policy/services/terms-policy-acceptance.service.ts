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
     * @param policyId ID of the policy being accepted
     * @param acceptedAt Date of acceptance
     * @param options Database options
     * @returns Created acceptance record
     */
    async create(
        userId: string,
        policyId: string,
        acceptedAt: Date = new Date(),
        options?: IDatabaseCreateOptions
    ): Promise<TermsPolicyAcceptanceDoc> {
        const acceptance = new TermsPolicyAcceptanceEntity();
        acceptance.user = userId;
        acceptance.policy = policyId;
        acceptance.acceptedAt = acceptedAt;

        return this.termsPolicyAcceptanceRepository.create(acceptance, options);
    }

    /**
     * Create multiple policy acceptance records for a user in a batch
     * @param userId User accepting the policies
     * @param policyIds Array of policy IDs being accepted
     * @param acceptedAt Date of acceptance (same for all records)
     * @param options Database options
     * @returns Boolean indicating success (true) or failure (false)
     */
    async createMany(
        userId: string,
        policyIds: string[],
        acceptedAt: Date = new Date(),
        options?: IDatabaseCreateOptions
    ): Promise<boolean> {
        if (!policyIds.length) {
            return true; // No policies to create is still a success case
        }

        const acceptanceEntities = policyIds.map(policyId => {
            const acceptance = new TermsPolicyAcceptanceEntity();
            acceptance.user = userId;
            acceptance.policy = policyId;
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
     * Find all policies accepted by a specific user with populated policy details
     * @param userId The user ID to search for
     * @param find Additional find conditions to merge with the user filter
     * @param options Database find options
     * @returns Array of acceptance records with populated policy details
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
            {
                join: {
                    path: 'policy',
                },
                ...options,
            }
        );
    }

    /**
     * Find the user's accepted policy with the highest version for a specific type and language
     * @param userId The user ID to search for
     * @param policyType The type of policy (terms, privacy, cookies)
     * @param language The language of the policy
     * @param options Database find options
     * @returns The acceptance record with the highest version or null if none found
     */
    async findOneAcceptedByUser(
        userId: string,
        policyType: ENUM_TERMS_POLICY_TYPE,
        language: string,
        options?: IDatabaseFindAllOptions
    ): Promise<ITermsPolicyAcceptanceEntity | null> {
        try {
            // Find all accepted policies of this type and language for the user
            const acceptances =
                await this.termsPolicyAcceptanceRepository.findAll<ITermsPolicyAcceptanceEntity>(
                    {
                        user: userId,
                    },
                    {
                        join: {
                            path: 'policy',
                            match: { type: policyType, language: language },
                        },
                        ...options,
                    }
                );

            // Filter out those where the join didn't match (policy is null)
            const validAcceptances = acceptances.filter(
                acceptance => acceptance.policy
            );

            if (validAcceptances.length === 0) {
                return null;
            }

            // Find the one with the highest version
            return validAcceptances.reduce((highest, current) => {
                return !highest ||
                    current.policy.version > highest.policy.version
                    ? current
                    : highest;
            }, null);
        } catch (error) {
            this.logger.error(
                `Failed to find latest accepted policy for user ${userId}, type ${policyType}, language ${language}`,
                error
            );
            throw error;
        }
    }
}
