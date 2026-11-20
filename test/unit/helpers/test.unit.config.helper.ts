import type { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

export function buildConfigService(
    values: Record<string, unknown>
): MockProxy<ConfigService> {
    const configGet = vi.fn<(key: string) => unknown>();
    configGet.mockImplementation((key: string) => values[key]);

    return mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
}

export function stubConfigValues(
    configService: MockProxy<ConfigService>,
    values: Record<string, unknown>
): void {
    vi.mocked(configService.get).mockImplementation(
        ((key: string) => values[key]) as ConfigService['get']
    );
}
