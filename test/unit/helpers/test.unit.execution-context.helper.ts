import type { ExecutionContext } from '@nestjs/common';
import type { HttpArgumentsHost } from '@nestjs/common/interfaces/index';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

export function buildHttpExecutionContext(
    request: object
): MockProxy<ExecutionContext> {
    const executionContext: MockProxy<ExecutionContext> =
        mock<ExecutionContext>();
    const httpArgumentsHost: MockProxy<HttpArgumentsHost> =
        mock<HttpArgumentsHost>();
    const handler = vi.fn();
    executionContext.getHandler.mockReturnValue(handler);
    executionContext.switchToHttp.mockReturnValue(httpArgumentsHost);
    httpArgumentsHost.getRequest.mockReturnValue(request);

    return executionContext;
}
