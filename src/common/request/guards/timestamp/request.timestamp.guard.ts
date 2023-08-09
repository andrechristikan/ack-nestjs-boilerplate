import { Injectable, CanActivate, ExecutionContext, Scope } from '@nestjs/common';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { HelperNumberService } from 'src/common/helper/services/helper.number.service';
import {GqlExecutionContext} from "@nestjs/graphql";

@Injectable({ scope: Scope.REQUEST })
export class RequestTimestampGuard implements CanActivate {
    constructor(
        private readonly helperNumberService: HelperNumberService,
        private readonly helperDateService: HelperDateService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const gqlContext=GqlExecutionContext.create(context)
        const req: IRequestApp = gqlContext.getContext().req;
        req.__xTimestamp = req['x-timestamp']
            ? this.helperNumberService.create(req['x-timestamp'])
            : undefined;
        req.__timestamp = this.helperDateService.timestamp();
        return true;
    }
}
