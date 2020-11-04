
import { AuthGuard } from '@nestjs/passport';
import {
    Injectable,
    UnauthorizedException,
  } from '@nestjs/common';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {

    handleRequest(err, user, info) {
        // You can throw an exception based on either "info" or "err" arguments
        if (err || !user) {
            throw new UnauthorizedException({
                'statusCode': 401,
                'message': 'zzzz'
            });
        }
        return user;
    }
}
