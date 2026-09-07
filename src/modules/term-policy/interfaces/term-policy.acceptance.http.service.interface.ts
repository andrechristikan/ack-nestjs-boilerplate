import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { TermPolicyAcceptRequestDto } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';
import { ITermPolicyUserAcceptance } from '@modules/term-policy/interfaces/term-policy.interface';
import { IUser } from '@modules/user/interfaces/user.interface';
import { Prisma } from '@generated/prisma-client';

export interface ITermPolicyAcceptanceHttpService {
    getListUserAccepted(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.TermPolicyUserAcceptanceWhereInput>
    ): Promise<IResponsePagingReturn<ITermPolicyUserAcceptance>>;
    userAccept(
        user: IUser,
        body: TermPolicyAcceptRequestDto
    ): Promise<IResponseReturn<void>>;
}
