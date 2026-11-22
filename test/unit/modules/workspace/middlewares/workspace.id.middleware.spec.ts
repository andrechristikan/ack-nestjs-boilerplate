import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { NextFunction, Response } from 'express';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import {
    WorkspaceIdHeaderName,
    WorkspaceIdStoreKey,
} from '@modules/workspace/constants/workspace.constant';
import { WorkspaceIdMiddleware } from '@modules/workspace/middlewares/workspace.id.middleware';

describe('WorkspaceIdMiddleware', () => {
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    let middleware: WorkspaceIdMiddleware;
    let res: Response;
    let next: NextFunction;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceIdMiddleware,
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        middleware = module.get(WorkspaceIdMiddleware);

        res = {} as Response;
        next = vi.fn();
    });

    describe('use', () => {
        it('stores the workspace header value when present', () => {
            const req = {
                headers: { [WorkspaceIdHeaderName]: 'workspace-1' },
            } as unknown as IRequestApp;

            middleware.use(req, res, next);

            expect(requestStoreService.set).toHaveBeenCalledWith(
                WorkspaceIdStoreKey,
                'workspace-1'
            );
            expect(next).toHaveBeenCalledTimes(1);
        });

        it('stores null when the workspace header is absent', () => {
            const req = { headers: {} } as unknown as IRequestApp;

            middleware.use(req, res, next);

            expect(requestStoreService.set).toHaveBeenCalledWith(
                WorkspaceIdStoreKey,
                null
            );
        });

        it('stores null when the workspace header is not a string', () => {
            const req = {
                headers: { [WorkspaceIdHeaderName]: ['a', 'b'] },
            } as unknown as IRequestApp;

            middleware.use(req, res, next);

            expect(requestStoreService.set).toHaveBeenCalledWith(
                WorkspaceIdStoreKey,
                null
            );
        });
    });
});
