import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestWorkspaceMiddleware } from '@common/request/middlewares/request.workspace.middleware';
import { RequestStoreService } from '@common/request/services/request.store.service';

describe('RequestWorkspaceMiddleware', () => {
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const response: MockProxy<Response> = mock<Response>();
    const next = vi.fn<() => void>();

    let middleware: RequestWorkspaceMiddleware;

    beforeEach(async () => {
        vi.mocked(configService.get).mockImplementation(key =>
            key === 'workspace.headerName' ? 'x-workspace-id' : 'workspaceId'
        );
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                RequestWorkspaceMiddleware,
                { provide: ConfigService, useValue: configService },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();
        middleware = moduleRef.get(RequestWorkspaceMiddleware);
    });

    it.each([
        ['workspace-id', 'workspace-id'],
        [undefined, null],
        [['one', 'two'], null],
    ])('stores header %s as %s', (header, expected) => {
        const request: MockProxy<IRequestApp> = mock<IRequestApp>({
            headers: { 'x-workspace-id': header },
        });

        middleware.use(request, response, next);

        expect(requestStoreService.set).toHaveBeenCalledWith(
            'workspaceId',
            expected
        );
        expect(next).toHaveBeenCalledTimes(1);
    });
});
