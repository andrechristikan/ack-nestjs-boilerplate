import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import type { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import type { TermPolicyRemoveContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.remove-content.request.dto';
import type {
    ITermPolicyContentCreate,
    ITermPolicyUserAcceptance,
} from '@modules/term-policy/interfaces/term-policy.interface';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
    Prisma,
} from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';

export interface ITermPolicyRepository {
    find(
        {
            where,
            ...others
        }: IPaginationQueryOffsetParams<Prisma.TermPolicyWhereInput>,
        type?: Record<string, IPaginationIn>,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<TermPolicy>>;
    findPublished(
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.TermPolicyWhereInput>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<TermPolicy>>;
    findUserAccepted(
        userId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.TermPolicyUserAcceptanceWhereInput>
    ): Promise<IResponsePagingReturn<ITermPolicyUserAcceptance>>;
    findOneById(termPolicyId: string): Promise<TermPolicy | null>;
    findLatestPublishedByType(type: EnumTermPolicyType): Promise<{
        id: string;
        type: EnumTermPolicyType;
        version: number;
    } | null>;
    existsAcceptanceByPolicyAndUser(
        userId: string,
        termPolicyId: string
    ): Promise<boolean>;
    existsByVersionAndType(
        version: number,
        type: EnumTermPolicyType
    ): Promise<boolean>;
    findStatusByVersionAndType(
        version: number,
        type: EnumTermPolicyType
    ): Promise<EnumTermPolicyStatus | null>;
    findPublishedByTypesInTx(
        tx: IDatabaseTransactionClient,
        types: EnumTermPolicyType[]
    ): Promise<{ id: string; type: EnumTermPolicyType }[]>;
    acceptInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        termPolicyId: string,
        createdBy: string,
        acceptedAt: Date
    ): Promise<ITermPolicyUserAcceptance>;
    create(
        termPolicyId: string,
        { type, version }: TermPolicyCreateRequestDto,
        contents: ITermPolicyContentCreate[]
    ): Promise<TermPolicy>;
    delete(termPolicyId: string): Promise<TermPolicy>;
    updateContent(
        termPolicyId: string,
        content: ITermPolicyContentCreate
    ): Promise<TermPolicy>;
    addContent(
        termPolicyId: string,
        newContent: ITermPolicyContentCreate
    ): Promise<TermPolicy>;
    removeContent(
        termPolicyId: string,
        { language }: TermPolicyRemoveContentRequestDto
    ): Promise<TermPolicy>;
    publishInTx(
        tx: IDatabaseTransactionClient,
        termPolicyId: string,
        contents: ITermPolicyContentCreate[]
    ): Promise<TermPolicy>;
}
