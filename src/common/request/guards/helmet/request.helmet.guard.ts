import { Injectable, CanActivate, ExecutionContext, Scope } from '@nestjs/common';
import helmet from 'helmet';
import {GqlExecutionContext} from "@nestjs/graphql";
import {IRequestApp} from "../../interfaces/request.interface";

@Injectable({ scope: Scope.REQUEST })
export class RequestHelmetGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        // const gqlContext=GqlExecutionContext.create(context)
        // const req: IRequestApp = gqlContext.getContext().req;
        // const res: Response= gqlContext.getContext().res;
        // console.log("req is"+JSON.stringify(req))
        // helmet()(req, res,true);
        return true;
    }
}