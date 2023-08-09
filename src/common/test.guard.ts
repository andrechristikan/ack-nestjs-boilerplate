import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import {GqlContextType, GqlExecutionContext} from "@nestjs/graphql";
import {Response} from "express";
import {IRequestApp} from "./request/interfaces/request.interface";
import {DatabaseDefaultUUID} from "./database/constants/database.function.constant";

@Injectable()
export class TestGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {

        if (context.getType<GqlContextType>() === 'graphql') {
            const ctx: GqlExecutionContext =GqlExecutionContext.create(context);
            const response:Response = ctx.getContext().res; // or use a custom interface for response

            const request: IRequestApp = ctx.getContext().req; // or use a custom interface for request

            request.__xCustomLang='AM'
        }

        return true;
    }
}