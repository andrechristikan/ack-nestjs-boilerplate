import {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
import { ISession } from '@modules/session/interfaces/session.interface';
import { ISessionHttpService } from '@modules/session/interfaces/session.http.service.interface';
import { SessionService } from '@modules/session/services/session.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SessionHttpService implements ISessionHttpService {
    constructor(private readonly sessionService: SessionService) {}

    async getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams<Prisma.SessionWhereInput>,
        isRevoked?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<ISession>> {
        const { data, ...others } =
            await this.sessionService.getListOffsetByAdmin(
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
    ): Promise<IResponsePagingReturn<ISession>> {
        const { data, ...others } = await this.sessionService.getListCursor(
            userId,
            pagination
        );
        return {
            data,
            ...others,
        };
    }

    async revoke(userId: string, sessionId: string): Promise<void> {
        await this.sessionService.revoke(userId, sessionId);

        return;
    }

    async revokeByAdmin(
        userId: string,
        sessionId: string,
        revokedBy: string
    ): Promise<IResponseReturn<void>> {
        await this.sessionService.revokeByAdmin(userId, sessionId, revokedBy);

        return {};
    }
}
