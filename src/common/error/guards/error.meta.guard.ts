import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
    ERROR_CLASS_META_KEY,
    ERROR_FUNCTION_META_KEY,
} from 'src/common/error/constants/error.constant';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

@Injectable()
export class ErrorMetaGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<IRequestApp>();
        const cls = this.reflector.get<string>(
            ERROR_CLASS_META_KEY,
            context.getHandler()
        );
        const func = this.reflector.get<string>(
            ERROR_FUNCTION_META_KEY,
            context.getHandler()
        );

        const className = context.getClass().name;
        const methodKey = context.getHandler().name;

        request.__class = cls ?? className;
        request.__function = func ?? methodKey;

        return true;
    }
}
