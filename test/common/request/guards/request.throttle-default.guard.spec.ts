import type { ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { getOptionsToken, getStorageToken } from '@nestjs/throttler';
import type {
    ThrottlerModuleOptions,
    ThrottlerStorage,
} from '@nestjs/throttler';
import { mock } from 'vitest-mock-extended';
import { RequestThrottleDefaultGuard } from '@common/request/guards/request.throttle-default.guard';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestUtil } from '@common/request/utils/request.util';

describe('RequestThrottleDefaultGuard', () => {
    const options = {} as ThrottlerModuleOptions;
    const storageService = mock<ThrottlerStorage>();
    const reflector = mock<Reflector>();
    const requestUtil = mock<RequestUtil>();
    let guard: RequestThrottleDefaultGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RequestThrottleDefaultGuard,
                { provide: getOptionsToken(), useValue: options },
                { provide: getStorageToken(), useValue: storageService },
                { provide: Reflector, useValue: reflector },
                { provide: RequestUtil, useValue: requestUtil },
            ],
        }).compile();
        guard = module.get(RequestThrottleDefaultGuard);
    });

    describe('getTracker', () => {
        it('resolves the tracker through RequestUtil.resolveThrottleTrackerIp', async () => {
            const req = mock<IRequestApp>();
            requestUtil.resolveThrottleTrackerIp.mockReturnValue('127.0.0.1');

            const result = await guard['getTracker'](req);

            expect(result).toBe('127.0.0.1');
            expect(requestUtil.resolveThrottleTrackerIp).toHaveBeenCalledWith(
                req
            );
        });
    });

    describe('generateKey', () => {
        it('returns the suffix unchanged, ignoring context and name', () => {
            const context = mock<ExecutionContext>();

            const result = guard['generateKey'](context, 'suffix', 'name');

            expect(result).toBe('suffix');
        });
    });
});
