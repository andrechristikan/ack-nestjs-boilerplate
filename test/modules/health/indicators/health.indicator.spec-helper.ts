import { HealthIndicatorService } from '@nestjs/terminus';
import { mock } from 'vitest-mock-extended';

export function createHealthIndicatorHarness() {
    const health = mock<HealthIndicatorService>();
    const session = mock<ReturnType<HealthIndicatorService['check']>>();
    const up = { service: { status: 'up' } } as never;
    const down = { service: { status: 'down' } } as never;

    session.up.mockReturnValue(up);
    session.down.mockReturnValue(down);
    health.check.mockReturnValue(session);

    return { health, session, up, down };
}
