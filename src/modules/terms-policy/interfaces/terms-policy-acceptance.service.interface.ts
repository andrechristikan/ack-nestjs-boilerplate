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

export interface ITermsPolicyAcceptanceService {
  create(
    userId: string,
    policyId: string,
    acceptedAt: Date,
  ): Promise<TermsPolicyAcceptanceDoc>;

  createMany(
    userId: string,
    policyIds: string[],
    acceptedAt: Date,
    options?: IDatabaseCreateOptions,
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

