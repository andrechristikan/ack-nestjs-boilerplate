import { createMock } from '@golevelup/ts-vitest';
import type { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FeatureFlagKeyPathMetaKey } from '@modules/feature-flag/constants/feature-flag.constant';
import { FeatureFlagGuard } from '@modules/feature-flag/guards/feature-flag.guard';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';

describe('FeatureFlagGuard', () => {
    const featureFlagService =
        createMock<Pick<FeatureFlagDomain, 'validateFeatureFlag'>>();
    const reflector = createMock<Pick<Reflector, 'get'>>();

    let guard: FeatureFlagGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                FeatureFlagGuard,
                { provide: FeatureFlagDomain, useValue: featureFlagService },
                { provide: Reflector, useValue: reflector },
                {
                    provide: ConfigService,
                    useValue: new ConfigService({
                        'featureFlag.anonymous.headerName': 'x-anonymous-id',
                        'featureFlag.anonymous.idMaxLength': 16,
                        'featureFlag.anonymous.idPattern': /^[a-z0-9-]+$/,
                    }),
                },
            ],
        }).compile();
        guard = moduleRef.get(FeatureFlagGuard);
    });

    it('passes the authenticated user and a valid anonymous id to the service', async () => {
        const handler = () => undefined;
        const context = createMock<ExecutionContext>({
            getHandler: () => handler,
            switchToHttp: () =>
                createMock<ReturnType<ExecutionContext['switchToHttp']>>({
                    getRequest: () => ({
                        headers: { 'x-anonymous-id': 'anonymous-1' },
                        user: { userId: 'user-id' },
                    }),
                }),
        });
        reflector.get.mockReturnValue('new-home');

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(reflector.get).toHaveBeenCalledWith(
            FeatureFlagKeyPathMetaKey,
            handler
        );
        expect(featureFlagService.validateFeatureFlag).toHaveBeenCalledWith(
            'new-home',
            'user-id',
            'anonymous-1'
        );
    });

    it.each(['', 'contains spaces', 'identifier-that-is-too-long'])(
        'normalizes invalid anonymous id %s to null',
        async anonymousId => {
            const context = createMock<ExecutionContext>({
                switchToHttp: () =>
                    createMock<ReturnType<ExecutionContext['switchToHttp']>>({
                        getRequest: () => ({
                            headers: { 'x-anonymous-id': anonymousId },
                        }),
                    }),
            });
            reflector.get.mockReturnValue('new-home');

            await guard.canActivate(context);

            expect(featureFlagService.validateFeatureFlag).toHaveBeenCalledWith(
                'new-home',
                null,
                null
            );
        }
    );
});
