import {
    CallHandler,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/common/request/constants/request.status-code.constant';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

@Injectable()
export class RequestUserAgentInterceptor
    implements NestInterceptor<Promise<any>>
{
    constructor(private readonly configService: ConfigService) {}

    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Promise<Observable<Promise<any> | string>> {
        if (context.getType() === 'http') {
            const request: IRequestApp = context
                .switchToHttp()
                .getRequest<IRequestApp>();

            const os: string[] = this.configService.get<string[]>(
                'middleware.userAgent.os'
            );
            const browser: string[] = this.configService.get<string[]>(
                'middleware.userAgent.browser'
            );

            const userAgent = request.userAgent;

            if (!os.some((val) => val.match(new RegExp(userAgent.os.name)))) {
                throw new ForbiddenException({
                    statusCode:
                        ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_USER_AGENT_OS_INVALID_ERROR,
                    message: 'middleware.error.userAgentOsInvalid',
                });
            }

            if (
                !browser.some((val) =>
                    val.match(new RegExp(userAgent.browser.name))
                )
            ) {
                throw new ForbiddenException({
                    statusCode:
                        ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_USER_AGENT_BROWSER_INVALID_ERROR,
                    message: 'middleware.error.userAgentBrowserInvalid',
                });
            }
        }

        return next.handle();
    }
}
