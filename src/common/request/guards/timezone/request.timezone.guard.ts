import { Injectable, CanActivate, ExecutionContext, Scope } from '@nestjs/common';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import {GqlExecutionContext} from "@nestjs/graphql";

@Injectable({ scope: Scope.REQUEST })
export class RequestTimezoneGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const gqlContext=GqlExecutionContext.create(context)
        const req: IRequestApp = gqlContext.getContext().req;
        req.__timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return true;
    }
}
