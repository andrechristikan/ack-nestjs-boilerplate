import { Injectable, CanActivate, ExecutionContext, Scope } from '@nestjs/common';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { UAParser, IResult } from 'ua-parser-js';
import {GqlExecutionContext} from "@nestjs/graphql";

@Injectable({ scope: Scope.REQUEST })
export class RequestUserAgentGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const gqlContext=GqlExecutionContext.create(context)
        const req: IRequestApp = gqlContext.getContext().req;
        const parserUserAgent = new UAParser(req['User-Agent']);
        const userAgent: IResult = parserUserAgent.getResult();

        req.__userAgent = userAgent;
        return true;
    }
}
