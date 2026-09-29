import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { NextFunction, Response } from 'express';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestWorkspaceMiddleware } from '@common/request/middlewares/request.workspace.middleware';

describe('RequestWorkspaceMiddleware', () => {
    const configGet = vi.fn<(key: string) => string>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    let middleware: RequestWorkspaceMiddleware;
    let res: Response;
    let next: NextFunction;

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation((key: string) => {
            const values: Record<string, string> = {
                'workspace.headerName': 'x-workspace-id',
                'workspace.storeKey': 'WorkspaceStore',
            };
            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RequestWorkspaceMiddleware,
                { provide: ConfigService, useValue: configService },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        middleware = module.get(RequestWorkspaceMiddleware);

        res = {} as Response;
        next = vi.fn();
    });

    describe('use', () => {
        it('stores the workspace header value when present', () => {
            const req = {
                headers: { 'x-workspace-id': 'workspace-1' },
            } as unknown as IRequestApp;

            middleware.use(req, res, next);

            expect(requestStoreService.set).toHaveBeenCalledWith(
                'WorkspaceStore',
                'workspace-1'
            );
            expect(next).toHaveBeenCalledTimes(1);
        });

        it('stores null when the workspace header is absent', () => {
            const req = { headers: {} } as unknown as IRequestApp;

            middleware.use(req, res, next);

            expect(requestStoreService.set).toHaveBeenCalledWith(
                'WorkspaceStore',
                null
            );
        });

        it('stores null when the workspace header is not a string', () => {
            const req = {
                headers: { 'x-workspace-id': ['a', 'b'] },
            } as unknown as IRequestApp;

            middleware.use(req, res, next);

            expect(requestStoreService.set).toHaveBeenCalledWith(
                'WorkspaceStore',
                null
            );
        });
    });
});
