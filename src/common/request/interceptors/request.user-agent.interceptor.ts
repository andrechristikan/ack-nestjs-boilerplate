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
import { IResult } from 'ua-parser-js';

@Injectable()
export class RequestUserAgentInterceptor
    implements NestInterceptor<Promise<any>>
{
    private readonly userAgentOs: string[];
    private readonly userAgentBrowser: string[];

    constructor(private readonly configService: ConfigService) {
        this.userAgentBrowser = this.configService.get<string[]>(
            'request.userAgent.browser'
        );
        this.userAgentOs = this.configService.get<string[]>(
            'request.userAgent.os'
        );
    }

    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Promise<Observable<Promise<any> | string>> {
        if (context.getType() === 'http') {
            const request: IRequestApp = context
                .switchToHttp()
                .getRequest<IRequestApp>();

            const userAgent: IResult = request.__userAgent;

            if (
                !this.userAgentOs.some((val) =>
                    val.match(new RegExp(userAgent.os.name))
                )
            ) {
                throw new ForbiddenException({
                    statusCode:
                        ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_USER_AGENT_OS_INVALID_ERROR,
                    message: 'request.error.userAgentOsInvalid',
                });
            }

            if (
                !this.userAgentBrowser.some((val) =>
                    val.match(new RegExp(userAgent.browser.name))
                )
            ) {
                throw new ForbiddenException({
                    statusCode:
                        ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_USER_AGENT_BROWSER_INVALID_ERROR,
                    message: 'request.error.userAgentBrowserInvalid',
                });
            }
        }

        return next.handle();
    }
}
