import {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { IAwsS3 } from '@common/aws/interfaces/aws.interface';
import {
    ITermPolicy,
    ITermPolicyContentCreate,
    ITermPolicyCreate,
} from '@modules/term-policy/interfaces/term-policy.interface';
import {
    Prisma,
    TermPolicy,
    TermPolicyContent,
} from '@generated/prisma-client';

export interface ITermPolicyService {
    mapPublicContent(
        newItems: IAwsS3[],
        contents: TermPolicyContent[]
    ): ITermPolicyContentCreate[];
    getListByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.TermPolicyWhereInput>,
        type?: Record<string, IPaginationIn>,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<ITermPolicy>>;
    getListPublished(
        pagination: IPaginationQueryCursorParams<Prisma.TermPolicyWhereInput>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<ITermPolicy>>;
    createByAdmin(
        data: ITermPolicyCreate,
        createdBy: string
    ): Promise<ITermPolicy>;
    deleteByAdmin(termPolicyId: string): Promise<TermPolicy>;
    publishByAdmin(termPolicyId: string, updatedBy: string): Promise<void>;
}
