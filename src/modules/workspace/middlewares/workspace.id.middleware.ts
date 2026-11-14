import { Injectable } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import { RequestWorkspaceIdHeaderName } from '@common/request/constants/request.constant';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { WorkspaceIdStoreKey } from '@modules/workspace/constants/workspace.constant';

@Injectable()
export class WorkspaceIdMiddleware implements NestMiddleware {
    constructor(private readonly requestStoreService: RequestStoreService) {}

    use(req: IRequestApp, _res: Response, next: NextFunction): void {
        const workspaceId = req.headers[RequestWorkspaceIdHeaderName];

        this.requestStoreService.set<string | null>(
            WorkspaceIdStoreKey,
            typeof workspaceId === 'string' ? workspaceId : null
        );

        next();
    }
}
