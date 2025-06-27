import { ClassTransformOptions } from 'class-transformer';
import { TermPolicyDoc } from '@modules/term-policy/repository/entities/term-policy.entity';
import {
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseSaveOptions,
} from '@common/database/interfaces/database.interface';
import { ITermPolicyDoc, ITermPolicyEntity } from './term-policy.interface';
import { TermPolicyListResponseDto } from '@modules/term-policy/dtos/response/term-policy.list.response.dto';
import { TermPolicyGetResponseDto } from '@modules/term-policy/dtos/response/term-policy.get.response.dto';

export interface ITermPolicyService {
    findOneById(id: string): Promise<TermPolicyDoc>;

    findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<TermPolicyDoc>;
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<TermPolicyDoc[]>;

    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;

    update(
        repository: TermPolicyDoc,
        options?: IDatabaseSaveOptions
    ): Promise<TermPolicyDoc>;

    mapList(
        policies: ITermPolicyDoc[]  | ITermPolicyEntity[],
        options?: ClassTransformOptions
    ): TermPolicyListResponseDto[];

    mapGet(
        policy: ITermPolicyDoc | ITermPolicyEntity,
        options?: ClassTransformOptions
    ): TermPolicyGetResponseDto;
}
