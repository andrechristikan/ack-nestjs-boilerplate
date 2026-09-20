import type { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { FeatureFlagKeyPathMetaKey } from '@modules/feature-flag/constants/feature-flag.constant';
import { FeatureFlagGuard } from '@modules/feature-flag/guards/feature-flag.guard';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';

describe('FeatureFlagGuard', () => {
    const featureFlagDomain: MockProxy<FeatureFlagDomain> =
        mock<FeatureFlagDomain>();
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const configGet = vi.mocked(configService.get);
    const buildContext = (
        request: unknown,
        handler?: () => void
    ): MockProxy<ExecutionContext> => {
        const httpHost: MockProxy<
            ReturnType<ExecutionContext['switchToHttp']>
        > = mock<ReturnType<ExecutionContext['switchToHttp']>>();
        httpHost.getRequest.mockReturnValue(request);
        const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
        context.switchToHttp.mockReturnValue(httpHost);
        if (handler) {
            context.getHandler.mockReturnValue(handler);
        }

        return context;
    };

    let guard: FeatureFlagGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation(
            (key: string) =>
                ({
                    'featureFlag.anonymous.headerName': 'x-anonymous-id',
                    'featureFlag.anonymous.idMaxLength': 16,
                    'featureFlag.anonymous.idPattern': /^[a-z0-9-]+$/,
                })[key]
        );
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                FeatureFlagGuard,
                { provide: FeatureFlagDomain, useValue: featureFlagDomain },
                { provide: Reflector, useValue: reflector },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        guard = moduleRef.get(FeatureFlagGuard);
    });

    it('passes the authenticated user and a valid anonymous id to the service', async () => {
        const handler = () => undefined;
        const context = buildContext(
            {
                headers: { 'x-anonymous-id': 'anonymous-1' },
                user: { userId: 'user-id' },
            },
            handler
        );
        reflector.get.mockReturnValue('new-home');

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(reflector.get).toHaveBeenCalledWith(
            FeatureFlagKeyPathMetaKey,
            handler
        );
        expect(featureFlagDomain.validateFeatureFlag).toHaveBeenCalledWith(
            'new-home',
            'user-id',
            'anonymous-1'
        );
    });

    it.each(['', 'contains spaces', 'identifier-that-is-too-long'])(
        'normalizes invalid anonymous id %s to null',
        async anonymousId => {
            const context = buildContext({
                headers: { 'x-anonymous-id': anonymousId },
            });
            reflector.get.mockReturnValue('new-home');

            await guard.canActivate(context);

            expect(featureFlagDomain.validateFeatureFlag).toHaveBeenCalledWith(
                'new-home',
                null,
                null
            );
        }
    );
});
