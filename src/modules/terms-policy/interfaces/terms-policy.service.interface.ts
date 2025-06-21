import { ClassTransformOptions } from 'class-transformer';
import { TermsPolicyDoc } from '@modules/terms-policy/repository/entities/terms-policy.entity';
import {
  IDatabaseFindAllOptions,
  IDatabaseFindOneOptions,
  IDatabaseGetTotalOptions,
  IDatabaseSaveOptions,
} from '@common/database/interfaces/database.interface';
import { ITermsPolicyDoc } from './terms-policy.interface';
import { TermsPolicyListResponseDto } from '@modules/terms-policy/dtos/response/terms-policy.list.response.dto';
import { TermsPolicyGetResponseDto } from '@modules/terms-policy/dtos/response/terms-policy.get.response.dto';

export interface ITermsPolicyService {
  findOneById(id: string): Promise<TermsPolicyDoc>;

  findOne(find: Record<string, any>, options?: IDatabaseFindOneOptions): Promise<TermsPolicyDoc>

  findAll(
    find?: Record<string, any>,
    options?: IDatabaseFindAllOptions
  ): Promise<TermsPolicyDoc[]>;

  getTotal(
    find?: Record<string, any>,
    options?: IDatabaseGetTotalOptions
  ): Promise<number>;

  update(
    repository: TermsPolicyDoc,
    options?: IDatabaseSaveOptions,
  ): Promise<TermsPolicyDoc>;

  mapList(
    policies: ITermsPolicyDoc[],
    options?: ClassTransformOptions,
  ): TermsPolicyListResponseDto[];

  mapGet(
    policy: TermsPolicyDoc,
    options?: ClassTransformOptions,
  ): TermsPolicyGetResponseDto;
}
