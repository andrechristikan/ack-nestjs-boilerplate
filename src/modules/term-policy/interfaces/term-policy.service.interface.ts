import {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { IAwsS3 } from '@common/aws/interfaces/aws.interface';
import {
    ITermPolicyContent,
    ITermPolicyCreate,
} from '@modules/term-policy/interfaces/term-policy.interface';
import { Prisma, TermPolicy } from '@generated/prisma-client';

export interface ITermPolicyService {
    mapPublicContent(
        newItems: IAwsS3[],
        contents: ITermPolicyContent[]
    ): ITermPolicyContent[];
    getListByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.TermPolicyWhereInput>,
        type?: Record<string, IPaginationIn>,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<TermPolicy>>;
    getListPublished(
        pagination: IPaginationQueryCursorParams<Prisma.TermPolicyWhereInput>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<TermPolicy>>;
    createByAdmin(
        data: ITermPolicyCreate,
        createdBy: string
    ): Promise<TermPolicy>;
    deleteByAdmin(termPolicyId: string): Promise<TermPolicy>;
    publishByAdmin(termPolicyId: string, updatedBy: string): Promise<void>;
}
