import { ClassTransformOptions } from 'class-transformer';
import {
    IDatabaseFindAllOptions,
    IDatabaseCreateOptions,
    IDatabaseGetTotalOptions,
} from '@common/database/interfaces/database.interface';
import { ENUM_TERM_POLICY_TYPE } from '@modules/term-policy/enums/term-policy.enum';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';
import { TermPolicyAcceptanceDoc } from '@modules/term-policy/repository/entities/term-policy-acceptance.entity';
import { TermPolicyAcceptanceResponseDto } from '@modules/term-policy/dtos/response/term-policy-acceptance.response.dto';
import { ITermPolicyAcceptanceDoc } from '@modules/term-policy/interfaces/term-policy.acceptance.interface';

export interface ITermPolicyAcceptanceService {
    findAllByUser(
        user: string,
        options?: IDatabaseFindAllOptions
    ): Promise<ITermPolicyAcceptanceDoc[]>;
    getTotalUser(
        user: string,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    create(
        user: string,
        termPolicy: string,
        options?: IDatabaseCreateOptions
    ): Promise<TermPolicyAcceptanceDoc>;
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<ITermPolicyAcceptanceDoc[]>;
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    mapList(
        policies: ITermPolicyAcceptanceDoc[],
        options?: ClassTransformOptions
    ): TermPolicyAcceptanceResponseDto[];
    createMany(
        user: string,
        termPolicies: Array<string>,
        options?: IDatabaseCreateOptions
    ): Promise<boolean>;
    createAcceptances(
        user: string,
        termPolicyTypes: ENUM_TERM_POLICY_TYPE[],
        language: ENUM_MESSAGE_LANGUAGE,
        country: string,
        options?: IDatabaseCreateOptions
    ): Promise<void>;
}
