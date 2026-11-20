import { ConfigService } from '@nestjs/config';
import { HttpClient } from '@nestjs/http-client';
import { HealthIndicatorService } from '@nestjs/terminus';
import { Test } from '@nestjs/testing';
import type { MockProxy } from 'vitest-mock-extended';
import { HealthAppleIndicator } from '@modules/health/indicators/health.apple.indicator';
import { HealthGoogleIndicator } from '@modules/health/indicators/health.google.indicator';
import { HealthSentryIndicator } from '@modules/health/indicators/health.sentry.indicator';
import { HealthJwksIndicator } from '@modules/health/indicators/health.jwks.indicator';

export async function createHealthGoogleIndicator(
    configService: MockProxy<ConfigService>,
    healthIndicatorService: MockProxy<HealthIndicatorService>
): Promise<HealthGoogleIndicator> {
    const module = await Test.createTestingModule({
        providers: [
            HealthGoogleIndicator,
            { provide: ConfigService, useValue: configService },
            {
                provide: HealthIndicatorService,
                useValue: healthIndicatorService,
            },
        ],
    }).compile();

    return module.get(HealthGoogleIndicator);
}

export async function createHealthAppleIndicator(
    configService: MockProxy<ConfigService>,
    healthIndicatorService: MockProxy<HealthIndicatorService>
): Promise<HealthAppleIndicator> {
    const module = await Test.createTestingModule({
        providers: [
            HealthAppleIndicator,
            { provide: ConfigService, useValue: configService },
            {
                provide: HealthIndicatorService,
                useValue: healthIndicatorService,
            },
        ],
    }).compile();

    return module.get(HealthAppleIndicator);
}

export async function createHealthJwksIndicator(
    configService: MockProxy<ConfigService>,
    healthIndicatorService: MockProxy<HealthIndicatorService>,
    httpClient: MockProxy<HttpClient>
): Promise<HealthJwksIndicator> {
    const module = await Test.createTestingModule({
        providers: [
            HealthJwksIndicator,
            { provide: ConfigService, useValue: configService },
            {
                provide: HealthIndicatorService,
                useValue: healthIndicatorService,
            },
            { provide: HttpClient, useValue: httpClient },
        ],
    }).compile();

    return module.get(HealthJwksIndicator);
}

export async function createHealthSentryIndicator(
    configService: MockProxy<ConfigService>,
    healthIndicatorService: MockProxy<HealthIndicatorService>
): Promise<HealthSentryIndicator> {
    const module = await Test.createTestingModule({
        providers: [
            HealthSentryIndicator,
            { provide: ConfigService, useValue: configService },
            {
                provide: HealthIndicatorService,
                useValue: healthIndicatorService,
            },
        ],
    }).compile();

    return module.get(HealthSentryIndicator);
}
