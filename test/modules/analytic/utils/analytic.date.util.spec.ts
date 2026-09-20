import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';

import { HelperStringService } from '@common/helper/services/helper.string.service';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';

describe('AnalyticDateUtil', () => {
    const util = new AnalyticDateUtil(
        new ConfigService({
            'analytic.cache.windowTokenPattern': '{start}:{end}',
            'analytic.cache.workspaceWindowTokenPattern':
                '{workspaceId}:{start}:{end}',
        }),
        new HelperStringService()
    );
    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const endDate = new Date('2026-01-02T00:00:00.000Z');

    it('builds stable cache tokens', () => {
        expect(util.cacheToken(startDate)).toBe('2026-01-01T00:00:00.000Z');
        expect(util.cacheToken()).toBe('_');
        expect(util.windowToken(startDate, endDate)).toBe(
            '2026-01-01T00:00:00.000Z:2026-01-02T00:00:00.000Z'
        );
        expect(util.workspaceWindowToken('workspace-id')).toBe(
            'workspace-id:_:_'
        );
    });
});
