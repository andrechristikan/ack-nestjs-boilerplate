import { createMock } from '@golevelup/ts-vitest';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestWorkspaceMiddleware } from '@common/request/middlewares/request.workspace.middleware';
import { RequestStoreService } from '@common/request/services/request.store.service';

describe('RequestWorkspaceMiddleware', () => {
    const configService: Pick<ConfigService, 'get'> = { get: vi.fn() };
    const configGet = vi.mocked(configService.get);
    const requestStoreService: Pick<RequestStoreService, 'set'> = {
        set: vi.fn(),
    };
    const requestStoreSet = vi.mocked(requestStoreService.set);
    const next = vi.fn<() => void>();

    let middleware: RequestWorkspaceMiddleware;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation(key =>
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
        const request = createMock<IRequestApp>({
            headers: { 'x-workspace-id': header },
        });

        middleware.use(request, createMock<Response>(), next);

        expect(requestStoreSet).toHaveBeenCalledWith('workspaceId', expected);
        expect(next).toHaveBeenCalledTimes(1);
    });
});
