import { Injectable, Logger } from '@nestjs/common';
import { Document } from 'mongoose';
import { TermPolicyAcceptanceRepository } from '@modules/term-policy/repository/repositories/term-policy-acceptance-repository.service';
import {
    TermPolicyAcceptanceDoc,
    TermPolicyAcceptanceEntity,
} from '@modules/term-policy/repository/entities/term-policy-acceptance.entity';
import { ClassTransformOptions, plainToInstance } from 'class-transformer';
import { TermPolicyAcceptanceGetResponseDto } from '@modules/term-policy/dtos/response/term-policy-acceptance.get.response.dto';
import { TermPolicyAcceptanceListResponseDto } from '@modules/term-policy/dtos/response/term-policy-acceptance.list.response.dto';
import { ENUM_TERM_POLICY_TYPE } from '@modules/term-policy/enums/term-policy.enum';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@common/pagination/enums/pagination.enum';
import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
} from '@common/database/interfaces/database.interface';
import {
    ITermPolicyAcceptanceDoc,
    ITermPolicyAcceptanceEntity,
} from '@modules/term-policy/interfaces/term-policy-acceptance.interface';
import { ITermPolicyAcceptanceService } from '@modules/term-policy/interfaces/term-policy-acceptance.service.interface';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';

@Injectable()
export class TermPolicyAcceptanceService
    implements ITermPolicyAcceptanceService
{
    private readonly logger = new Logger(TermPolicyAcceptanceService.name);

    constructor(
        private readonly termPolicyAcceptanceRepository: TermPolicyAcceptanceRepository
    ) {}

    async create(
        userId: string,
        policyType: ENUM_TERM_POLICY_TYPE,
        policyCountry: string,
        policyLanguage: ENUM_MESSAGE_LANGUAGE,
        policyVersion: number,
        acceptedAt: Date = new Date(),
        options?: IDatabaseCreateOptions
    ): Promise<TermPolicyAcceptanceDoc> {
        const acceptance = new TermPolicyAcceptanceEntity();
        acceptance.user = userId;
        acceptance.type = policyType;
        acceptance.country = policyCountry;
        acceptance.language = policyLanguage;
        acceptance.version = policyVersion;
        acceptance.acceptedAt = acceptedAt;

        return this.termPolicyAcceptanceRepository.create(acceptance, options);
    }

    async createMany(
        userId: string,
        policies: Array<{
            type: ENUM_TERM_POLICY_TYPE;
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

        const acceptanceEntities = policies.map(policy => {
            const acceptance = new TermPolicyAcceptanceEntity();
            acceptance.user = userId;
            acceptance.type = policy.type;
            acceptance.country = policy.country;
            acceptance.language = policy.language;
            acceptance.version = policy.version;
            acceptance.acceptedAt = acceptedAt;
            return acceptance;
        });

        await this.termPolicyAcceptanceRepository.createMany(
            acceptanceEntities,
            options
        );

        return true;
    }

    async findOne<T>(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<T> {
        return this.termPolicyAcceptanceRepository.findOne<T>(find, options);
    }

    async findAll(
        filter?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<ITermPolicyAcceptanceDoc[]> {
        return this.termPolicyAcceptanceRepository.findAll(filter, {
            order: {
                acceptedAt: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
            },
            ...options,
        });
    }

    async findAllByUser(
        userId: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<ITermPolicyAcceptanceDoc[]> {
        const filter: Record<string, any> = {
            user: userId,
            ...find,
        };

        return this.termPolicyAcceptanceRepository.findAll(filter, options);
    }

    async findOneByUser(
        userId: string,
        policyType: ENUM_TERM_POLICY_TYPE,
        country: string,
        language?: ENUM_MESSAGE_LANGUAGE,
        options?: IDatabaseFindOneOptions
    ): Promise<ITermPolicyAcceptanceEntity | null> {
        try {
            const query: Record<string, any> = {
                user: userId,
                type: policyType,
                country: country,
            };

            if (language) {
                query.language = language;
            }

            return await this.termPolicyAcceptanceRepository.findOne<ITermPolicyAcceptanceEntity>(
                query,
                options
            );
        } catch (error) {
            this.logger.error(
                `Failed to find policy for user ${userId}, type ${policyType}, country ${country}${language ? `, language ${language}` : ''}`,
                error
            );
            throw error;
        }
    }

    mapList(
        policies: ITermPolicyAcceptanceDoc[],
        options?: ClassTransformOptions
    ): TermPolicyAcceptanceListResponseDto[] {
        return plainToInstance(
            TermPolicyAcceptanceListResponseDto,
            policies.map((e: ITermPolicyAcceptanceDoc) =>
                e instanceof Document ? e.toObject() : e
            ),
            options
        );
    }

    mapGet(
        policy: TermPolicyAcceptanceDoc,
        options?: ClassTransformOptions
    ): TermPolicyAcceptanceGetResponseDto {
        return plainToInstance(
            TermPolicyAcceptanceGetResponseDto,
            policy.toObject(),
            options
        );
    }
}
