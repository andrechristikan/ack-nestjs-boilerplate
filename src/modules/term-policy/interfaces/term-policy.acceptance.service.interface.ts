import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ITermPolicyUserAcceptance } from '@modules/term-policy/interfaces/term-policy.interface';
import { IUser } from '@modules/user/interfaces/user.interface';
import { EnumTermPolicyType, Prisma } from '@generated/prisma-client';

export interface ITermPolicyAcceptanceService {
    validateTermPolicyGuard(
        user: IUser | null,
        requiredTermPolicies: EnumTermPolicyType[]
    ): Promise<void>;
    getListUserAccepted(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.TermPolicyUserAcceptanceWhereInput>
    ): Promise<IResponsePagingReturn<ITermPolicyUserAcceptance>>;
    userAccept(user: IUser, type: EnumTermPolicyType): Promise<void>;
}
