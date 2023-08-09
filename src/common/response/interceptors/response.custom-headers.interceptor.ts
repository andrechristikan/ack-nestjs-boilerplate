import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Response } from 'express';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import {GqlContextType, GqlExecutionContext} from "@nestjs/graphql";

// only for response success and error in controller
@Injectable()
export class ResponseCustomHeadersInterceptor
    implements NestInterceptor<Promise<any>>
{
    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Promise<Observable<Promise<any> | string>> {
        let request: IRequestApp;
        let response: Response;
        if (context.getType() === 'http') {
            const ctx: HttpArgumentsHost = context.switchToHttp();
            response = ctx.getResponse();
            request = ctx.getRequest();
        }
        else if (context.getType<GqlContextType>() === 'graphql') {
            // if it is GraphQL, switch to the GraphQL context
            const ctx: GqlExecutionContext = GqlExecutionContext.create(context);
            response = ctx.getContext().res;
            request = ctx.getContext().req;
        }


        response.setHeader('x-custom-lang', request.__xCustomLang);
            response.setHeader(
                'x-timestamp',
                request.__xTimestamp ?? request.__timestamp
            );
            response.setHeader('x-timezone', request.__timezone);
            response.setHeader('x-request-id', request.__id);

        response.setHeader('x-version', request.__version);
            response.setHeader('x-repo-version', request.__repoVersion);



        return next.handle();
    }
}
