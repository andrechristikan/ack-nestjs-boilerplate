import { Injectable } from '@nestjs/common';
import { Document } from 'mongoose';
import {
    TermPolicyAcceptanceDoc,
    TermPolicyAcceptanceEntity,
} from '@modules/term-policy/repository/entities/term-policy-acceptance.entity';
import { ClassTransformOptions, plainToInstance } from 'class-transformer';
import {
    ENUM_TERM_POLICY_STATUS,
    ENUM_TERM_POLICY_TYPE,
} from '@modules/term-policy/enums/term-policy.enum';
import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
} from '@common/database/interfaces/database.interface';
import { ITermPolicyAcceptanceDoc } from '@modules/term-policy/interfaces/term-policy-acceptance.interface';
import { ITermPolicyAcceptanceService } from '@modules/term-policy/interfaces/term-policy-acceptance.service.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';
import { DatabaseService } from '@common/database/services/database.service';
import { TermPolicyEntity } from '@modules/term-policy/repository/entities/term-policy.entity';
import { TermPolicyRepository } from '@modules/term-policy/repository/repositories/term-policy.repository';
import { TermPolicyAcceptanceRepository } from '@modules/term-policy/repository/repositories/term-policy-acceptance.repository';
import { TermPolicyAcceptanceResponseDto } from '@modules/term-policy/dtos/response/term-policy-acceptance.response.dto';

@Injectable()
export class TermPolicyAcceptanceService
    implements ITermPolicyAcceptanceService
{
    constructor(
        private readonly termPolicyAcceptanceRepository: TermPolicyAcceptanceRepository,
        private readonly termPolicyRepository: TermPolicyRepository,
        private readonly helperDateService: HelperDateService,
        private readonly databaseService: DatabaseService
    ) {}

    async findAllByUser(
        user: string,
        options?: IDatabaseFindAllOptions
    ): Promise<ITermPolicyAcceptanceDoc[]> {
        const filter: Record<string, any> = {
            user,
        };

        return this.termPolicyAcceptanceRepository.findAll(filter, {
            ...options,
            join: true,
        });
    }

    async getTotalUser(
        user: string,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.termPolicyAcceptanceRepository.getTotal(
            {
                user,
            },
            options
        );
    }

    async create(
        user: string,
        termPolicy: string,
        options?: IDatabaseCreateOptions
    ): Promise<TermPolicyAcceptanceDoc> {
        const acceptance = new TermPolicyAcceptanceEntity();
        acceptance.user = user;
        acceptance.termPolicy = termPolicy;
        acceptance.acceptedAt = this.helperDateService.create();

        return this.termPolicyAcceptanceRepository.create(acceptance, options);
    }

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<ITermPolicyAcceptanceDoc[]> {
        return this.termPolicyAcceptanceRepository.findAll(find, options);
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.termPolicyAcceptanceRepository.getTotal(find, options);
    }

    mapList(
        policies: ITermPolicyAcceptanceDoc[],
        options?: ClassTransformOptions
    ): TermPolicyAcceptanceResponseDto[] {
        return plainToInstance(
            TermPolicyAcceptanceResponseDto,
            policies.map((e: ITermPolicyAcceptanceDoc) =>
                e instanceof Document ? e.toObject() : e
            ),
            options
        );
    }

    async createMany(
        user: string,
        termPolicies: Array<string>,
        options?: IDatabaseCreateOptions
    ): Promise<boolean> {
        if (!termPolicies.length) {
            return true; // No policies to create is still a success case
        }

        const acceptedAt = this.helperDateService.create();

        const acceptanceEntities = termPolicies.map(policy => {
            const acceptance = new TermPolicyAcceptanceEntity();
            acceptance.user = user;
            acceptance.termPolicy = policy;
            acceptance.acceptedAt = acceptedAt;

            return acceptance;
        });

        await this.termPolicyAcceptanceRepository.createMany(
            acceptanceEntities,
            options
        );

        return true;
    }

    async createAcceptances(
        user: string,
        termPolicyTypes: ENUM_TERM_POLICY_TYPE[],
        language: ENUM_MESSAGE_LANGUAGE,
        country: string,
        options?: IDatabaseCreateOptions
    ): Promise<void> {
        if (termPolicyTypes.length === 0) {
            return;
        }

        const latestTermPolicies: TermPolicyEntity[] =
            await this.termPolicyRepository.findAll([
                {
                    language,
                    country,
                    status: ENUM_TERM_POLICY_STATUS.PUBLISHED,
                    ...this.databaseService.filterIn('type', termPolicyTypes),
                },
            ]);

        if (latestTermPolicies.length === 0) {
            return;
        }

        await this.createMany(
            user,
            latestTermPolicies.map(policy => policy._id),
            options
        );
    }
}
