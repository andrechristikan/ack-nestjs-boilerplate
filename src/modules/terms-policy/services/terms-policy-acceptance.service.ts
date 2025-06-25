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

        const acceptanceEntities = policies.map(policy => {
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

    async findAll(
        filter?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<ITermsPolicyAcceptanceDoc[]> {
        return this.termsPolicyAcceptanceRepository.findAll(filter, {
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
    ): Promise<ITermsPolicyAcceptanceDoc[]> {
        const filter: Record<string, any> = {
            user: userId,
            ...find,
        };

        return this.termsPolicyAcceptanceRepository.findAll(filter, options);
    }

    async findOneByUser(
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
                `Failed to find policy for user ${userId}, type ${policyType}, country ${country}${language ? `, language ${language}` : ''}`,
                error
            );
            throw error;
        }
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
}
