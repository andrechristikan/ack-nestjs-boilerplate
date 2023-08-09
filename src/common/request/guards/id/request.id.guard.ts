import { Injectable, CanActivate, ExecutionContext, Scope } from '@nestjs/common';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { DatabaseDefaultUUID } from 'src/common/database/constants/database.function.constant';
import {GqlExecutionContext} from "@nestjs/graphql";

@Injectable({ scope: Scope.REQUEST })
export class RequestIdGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const gqlContext=GqlExecutionContext.create(context)


        const uuid: string = DatabaseDefaultUUID();

        const req: IRequestApp = gqlContext.getContext().req;
        req.__id = uuid;
        return true;
    }
}
