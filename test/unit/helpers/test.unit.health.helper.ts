import { ConfigService } from '@nestjs/config';
import { HealthIndicatorService } from '@nestjs/terminus';
import { Test } from '@nestjs/testing';
import type { MockProxy } from 'vitest-mock-extended';
import type { HealthAppleIndicator } from '@modules/health/indicators/health.apple.indicator';
import type { HealthGoogleIndicator } from '@modules/health/indicators/health.google.indicator';
import type { HealthSentryIndicator } from '@modules/health/indicators/health.sentry.indicator';
import type { HealthJwksIndicator } from '@modules/health/indicators/health.jwks.indicator';

export async function createHealthGoogleIndicator(
    configService: MockProxy<ConfigService>,
    healthIndicatorService: MockProxy<HealthIndicatorService>
): Promise<HealthGoogleIndicator> {
    const { HealthGoogleIndicator: HealthGoogleIndicatorClass } =
        await import('@modules/health/indicators/health.google.indicator');

    const module = await Test.createTestingModule({
        providers: [
            HealthGoogleIndicatorClass,
            { provide: ConfigService, useValue: configService },
            {
                provide: HealthIndicatorService,
                useValue: healthIndicatorService,
            },
        ],
    }).compile();

    return module.get(HealthGoogleIndicatorClass);
}

export async function createHealthAppleIndicator(
    configService: MockProxy<ConfigService>,
    healthIndicatorService: MockProxy<HealthIndicatorService>
): Promise<HealthAppleIndicator> {
    const { HealthAppleIndicator: HealthAppleIndicatorClass } =
        await import('@modules/health/indicators/health.apple.indicator');

    const module = await Test.createTestingModule({
        providers: [
            HealthAppleIndicatorClass,
            { provide: ConfigService, useValue: configService },
            {
                provide: HealthIndicatorService,
                useValue: healthIndicatorService,
            },
        ],
    }).compile();

    return module.get(HealthAppleIndicatorClass);
}

export async function createHealthJwksIndicator(
    configService: MockProxy<ConfigService>,
    healthIndicatorService: MockProxy<HealthIndicatorService>
): Promise<HealthJwksIndicator> {
    const { HealthJwksIndicator: HealthJwksIndicatorClass } =
        await import('@modules/health/indicators/health.jwks.indicator');

    const module = await Test.createTestingModule({
        providers: [
            HealthJwksIndicatorClass,
            { provide: ConfigService, useValue: configService },
            {
                provide: HealthIndicatorService,
                useValue: healthIndicatorService,
            },
        ],
    }).compile();

    return module.get(HealthJwksIndicatorClass);
}

export async function createHealthSentryIndicator(
    configService: MockProxy<ConfigService>,
    healthIndicatorService: MockProxy<HealthIndicatorService>
): Promise<HealthSentryIndicator> {
    const { HealthSentryIndicator: HealthSentryIndicatorClass } =
        await import('@modules/health/indicators/health.sentry.indicator');

    const module = await Test.createTestingModule({
        providers: [
            HealthSentryIndicatorClass,
            { provide: ConfigService, useValue: configService },
            {
                provide: HealthIndicatorService,
                useValue: healthIndicatorService,
            },
        ],
    }).compile();

    return module.get(HealthSentryIndicatorClass);
}
