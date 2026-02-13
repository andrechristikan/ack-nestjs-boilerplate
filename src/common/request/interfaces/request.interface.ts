import { Request } from 'express';
import { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import { IPaginationQuery } from '@common/pagination/interfaces/pagination.interface';
import { ApiKey } from '@prisma/client';
import { RoleAbilityDto } from '@modules/role/dtos/role.ability.dto';
import { IUser } from '@modules/user/interfaces/user.interface';
import { RequestUserAgentDto } from '@common/request/dtos/request.user-agent.dto';

export interface IRequestApp<T = IAuthJwtAccessTokenPayload> extends Request {
    correlationId: string;
    user?: T;

    __apiKey?: ApiKey;
    __user?: IUser;
    __abilities?: RoleAbilityDto[];

    __pagination?: IPaginationQuery;

    __language: string;
    __version: string;
}

export interface IRequestLog {
    userAgent: RequestUserAgentDto;
    ipAddress: string;
}
