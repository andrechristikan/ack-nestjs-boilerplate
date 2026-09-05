import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Response } from 'express';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';

/**
 * Reads the workspace header (`workspace.headerName`) into CLS at `workspace.storeKey`, for later guards to consume.
 */
@Injectable()
export class RequestWorkspaceMiddleware implements NestMiddleware {
    private readonly headerName: string;
    private readonly storeKey: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly requestStoreService: RequestStoreService
    ) {
        this.headerName = this.configService.get<string>(
            'workspace.headerName'
        )!;
        this.storeKey = this.configService.get<string>('workspace.storeKey')!;
    }

    use(req: IRequestApp, _res: Response, next: NextFunction): void {
        const workspaceId = req.headers[this.headerName];

        this.requestStoreService.set<string | null>(
            this.storeKey,
            typeof workspaceId === 'string' ? workspaceId : null
        );

        next();
    }
}
