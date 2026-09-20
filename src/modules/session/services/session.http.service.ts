import type {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { ISessionList } from '@modules/session/interfaces/session.interface';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SessionHttpService {
    constructor(private readonly sessionDomain: SessionDomain) {}

    async getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams<Prisma.SessionWhereInput>,
        isRevoked?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<ISessionList>> {
        const { data, ...others } =
            await this.sessionDomain.getListOffsetByAdmin(
                userId,
                pagination,
                isRevoked
            );
        return {
            data,
            ...others,
        };
    }

    async getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.SessionWhereInput>
    ): Promise<IResponsePagingReturn<ISessionList>> {
        const { data, ...others } = await this.sessionDomain.getListCursor(
            userId,
            pagination
        );
        return {
            data,
            ...others,
        };
    }

    async revoke(userId: string, sessionId: string): Promise<void> {
        await this.sessionDomain.revoke(userId, sessionId);

        return;
    }

    async revokeByAdmin(
        userId: string,
        sessionId: string,
        revokedBy: string
    ): Promise<IResponseReturn<void>> {
        await this.sessionDomain.revokeByAdmin(userId, sessionId, revokedBy);

        return {};
    }

    async revokeAllByAdmin(
        userId: string,
        revokedBy: string
    ): Promise<IResponseReturn<void>> {
        await this.sessionDomain.revokeAllByAdmin(userId, revokedBy);

        return {};
    }
}
