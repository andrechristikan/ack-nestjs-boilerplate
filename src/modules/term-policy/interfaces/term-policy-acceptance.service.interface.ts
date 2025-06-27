import { ClassTransformOptions } from 'class-transformer';
import { TermPolicyAcceptanceDoc } from '@modules/term-policy/repository/entities/term-policy-acceptance.entity';
import {
  TermPolicyAcceptanceGetResponseDto,
} from '@modules/term-policy/dtos/response/term-policy-acceptance.get.response.dto';
import {
  TermPolicyAcceptanceListResponseDto,
} from '@modules/term-policy/dtos/response/term-policy-acceptance.list.response.dto';
import { IDatabaseFindAllOptions, IDatabaseFindOneOptions, IDatabaseCreateOptions } from '@common/database/interfaces/database.interface';
import { ITermPolicyAcceptanceDoc } from '@modules/term-policy/interfaces/term-policy-acceptance.interface';
import { ENUM_TERM_POLICY_TYPE } from '@modules/term-policy/enums/term-policy.enum';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';

export interface ITermPolicyAcceptanceService {
  create(
      userId: string,
      policyType: ENUM_TERM_POLICY_TYPE,
      policyCountry: string,
      policyLanguage: ENUM_MESSAGE_LANGUAGE,
      policyVersion: number,
      acceptedAt: Date,
      options?: IDatabaseCreateOptions
  ): Promise<TermPolicyAcceptanceDoc>;

  createMany(
      userId: string,
      policies: Array<{
          type: ENUM_TERM_POLICY_TYPE;
          country: string;
          language: ENUM_MESSAGE_LANGUAGE;
          version: number;
      }>,
      acceptedAt: Date,
      options?: IDatabaseCreateOptions
  ): Promise<boolean>;

  findOne<T>(
    find: Record<string, any>,
    options?: IDatabaseFindOneOptions
  ): Promise<T>;

  mapList(
    policies: ITermPolicyAcceptanceDoc[],
    options?: ClassTransformOptions,
  ): TermPolicyAcceptanceListResponseDto[];

  mapGet(
    policy: TermPolicyAcceptanceDoc,
    options?: ClassTransformOptions,
  ): TermPolicyAcceptanceGetResponseDto;

  findAll(
    filter?: Record<string, any>,
    options?: IDatabaseFindAllOptions,
  ): Promise<ITermPolicyAcceptanceDoc[]>;
}

