import { Injectable } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import {
    RequestWorkspaceIdHeaderName,
    RequestWorkspaceIdStoreKey,
} from '@common/request/constants/request.constant';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';

/**
 * Reads the workspace header into the request store, for later guards to consume.
 */
@Injectable()
export class RequestWorkspaceMiddleware implements NestMiddleware {
    constructor(private readonly requestStoreService: RequestStoreService) {}

    use(req: IRequestApp, _res: Response, next: NextFunction): void {
        const workspaceId = req.headers[RequestWorkspaceIdHeaderName];

        this.requestStoreService.set<string | null>(
            RequestWorkspaceIdStoreKey,
            typeof workspaceId === 'string' ? workspaceId : null
        );

        next();
    }
}
