
import { AuthGuard } from '@nestjs/passport';
import {
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { IApiError } from 'error/error.interface';
import { Error } from 'error/error.decorator';
import { ErrorService } from 'error/error.service';
import { SystemErrorStatusCode } from 'error/error.constant';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {

    constructor(
        @Error() private readonly errorService: ErrorService,
    ){
        super();
    }


    handleRequest<TUser = any>(err: Record<string, any>, user: TUser, info: string): TUser {
        const res: IApiError = this.errorService.setErrorMessage(
            SystemErrorStatusCode.UNAUTHORIZED_ERROR
        );

        if (err || !user) {
            throw new UnauthorizedException(res);
        }
        return user;
    }
}
