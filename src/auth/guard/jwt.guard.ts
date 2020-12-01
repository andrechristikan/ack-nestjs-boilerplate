import { AuthGuard } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ResponseService } from 'response/response.service';
import { Response } from 'response/response.decorator';
import { IApiErrorResponse } from 'response/response.interface';
import { SystemErrorStatusCode } from 'response/response.constant';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
    constructor(@Response() private readonly responseService: ResponseService) {
        super();
    }

    handleRequest<TUser = any>(
        err: Record<string, any>,
        user: TUser,
        info: string
    ): TUser {
        if (err || !user) {
            const response: IApiErrorResponse = this.responseService.error(
                SystemErrorStatusCode.UNAUTHORIZED_ERROR
            );

            throw new UnauthorizedException(response);
        }
        return user;
    }
}
