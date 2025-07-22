import { TermPolicyDoc } from '@modules/term-policy/repository/entities/term-policy.entity';
import {
    IDatabaseCreateOptions,
    IDatabaseDeleteOptions,
    IDatabaseExistsOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseSaveOptions,
} from '@common/database/interfaces/database.interface';
import { ENUM_TERM_POLICY_TYPE } from '@modules/term-policy/enums/term-policy.enum';
import {
    ITermPolicyDoc,
    ITermPolicyEntity,
} from '@modules/term-policy/interfaces/term-policy.interface';
import { ClassTransformOptions } from 'class-transformer';
import { TermPolicyResponseDto } from '@modules/term-policy/dtos/response/term-policy.response.dto';
import { AwsS3Dto } from '@modules/aws/dtos/aws.s3.dto';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';
import { TermPolicyUpdateDocumentRequestDto } from '@modules/term-policy/dtos/request/term-policy.update-document.request';
import { TermPolicyDocumentEntity } from '@modules/term-policy/repository/entities/term-policy-document.entity';

export interface ITermPolicyService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<ITermPolicyDoc[]>;
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    findOnePublished(
        type: ENUM_TERM_POLICY_TYPE,
        country: string,
        options?: IDatabaseFindOneOptions
    ): Promise<TermPolicyDoc>;
    findOneLatest(
        type: ENUM_TERM_POLICY_TYPE,
        country: string,
        options?: IDatabaseFindOneOptions
    ): Promise<TermPolicyDoc>;
    mapList(
        policies: ITermPolicyDoc[] | ITermPolicyEntity[],
        options?: ClassTransformOptions
    ): TermPolicyResponseDto[];
    exist(
        type: ENUM_TERM_POLICY_TYPE,
        country: string,
        option?: IDatabaseExistsOptions
    ): Promise<boolean>;
    findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<TermPolicyDoc>;
    findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<TermPolicyDoc>;
    create(
        previous: TermPolicyDoc,
        urls: (AwsS3Dto & TermPolicyUpdateDocumentRequestDto)[],
        createdBy: string,
        options?: IDatabaseCreateOptions
    ): Promise<TermPolicyDoc>;
    updateDocument(
        repository: TermPolicyDoc,
        language: ENUM_MESSAGE_LANGUAGE,
        { size, ...aws }: AwsS3Dto,
        options?: IDatabaseSaveOptions
    ): Promise<TermPolicyDoc>;
    delete(
        repository: TermPolicyDoc,
        options?: IDatabaseDeleteOptions
    ): Promise<TermPolicyDoc>;
    createMany(
        country: string,
        types: Record<ENUM_TERM_POLICY_TYPE, TermPolicyDocumentEntity[]>
    ): Promise<void>;
    deleteMany(options?: IDatabaseDeleteOptions): Promise<void>;
}
