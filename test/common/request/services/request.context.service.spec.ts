import { describe, expect, it } from 'vitest';

import { RequestContextService } from '@common/request/services/request.context.service';

describe('RequestContextService', () => {
    const service = new RequestContextService();

    it('resolves a known city and its fallback', () => {
        expect(
            service.resolveCity({
                latitude: 1,
                longitude: 2,
                country: 'IT',
                region: 'RM',
                city: 'Rome',
            })
        ).toBe('Rome');
        expect(service.resolveCity(null)).toBe('Unknown Location');
    });

    it.each([
        [
            { device: { type: null, vendor: 'Apple', model: 'iPhone' } },
            'Apple iPhone',
        ],
        [{ os: { name: 'Linux', version: null } }, 'Linux'],
        [
            {
                browser: {
                    name: 'Firefox',
                    version: null,
                    major: null,
                    type: null,
                },
            },
            'Firefox',
        ],
        [{}, 'Unknown Device'],
    ])('resolves the device label by priority', (userAgent, expected) => {
        expect(service.resolveDevice(userAgent)).toBe(expected);
    });
});
