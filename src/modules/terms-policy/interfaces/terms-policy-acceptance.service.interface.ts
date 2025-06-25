import { ClassTransformOptions } from 'class-transformer';
import { TermsPolicyAcceptanceDoc } from '@modules/terms-policy/repository/entities/terms-policy.acceptance.entity';
import {
  TermsPolicyAcceptanceGetResponseDto,
} from '@modules/terms-policy/dtos/response/terms-policy-acceptance.get.response.dto';
import {
  TermsPolicyAcceptanceListResponseDto,
} from '@modules/terms-policy/dtos/response/terms-policy-acceptance.list.response.dto';
import { IDatabaseFindAllOptions, IDatabaseFindOneOptions, IDatabaseCreateOptions } from '@common/database/interfaces/database.interface';
import { ITermsPolicyAcceptanceDoc } from '@modules/terms-policy/interfaces/terms-policy-acceptance.interface';
import { ENUM_TERMS_POLICY_TYPE } from '@modules/terms-policy/enums/terms-policy.enum';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';

export interface ITermsPolicyAcceptanceService {
  create(
      userId: string,
      policyType: ENUM_TERMS_POLICY_TYPE,
      policyCountry: string,
      policyLanguage: ENUM_MESSAGE_LANGUAGE,
      policyVersion: number,
      acceptedAt: Date,
      options?: IDatabaseCreateOptions
  ): Promise<TermsPolicyAcceptanceDoc>;

  createMany(
      userId: string,
      policies: Array<{
          type: ENUM_TERMS_POLICY_TYPE;
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
    policies: ITermsPolicyAcceptanceDoc[],
    options?: ClassTransformOptions,
  ): TermsPolicyAcceptanceListResponseDto[];

  mapGet(
    policy: TermsPolicyAcceptanceDoc,
    options?: ClassTransformOptions,
  ): TermsPolicyAcceptanceGetResponseDto;

  findAll(
    filter?: Record<string, any>,
    options?: IDatabaseFindAllOptions,
  ): Promise<ITermsPolicyAcceptanceDoc[]>;
}

