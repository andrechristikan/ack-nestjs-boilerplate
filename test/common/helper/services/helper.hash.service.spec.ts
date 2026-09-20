import { describe, expect, it } from 'vitest';

import { HelperHashService } from '@common/helper/services/helper.hash.service';

describe('HelperHashService', () => {
    const service = new HelperHashService();

    describe('bcrypt', () => {
        it('hashes with the generated salt and verifies the password', () => {
            const salt = service.bcryptGenerateSalt(4);
            const hash = service.bcryptHash('secret', salt);

            expect(salt).toMatch(/^\$2[aby]\$04\$/);
            expect(hash).not.toBe('secret');
            expect(hash.startsWith(salt)).toBe(true);
            expect(service.bcryptCompare('secret', hash)).toBe(true);
        });

        it('rejects a wrong password', () => {
            const hash = service.bcryptHash(
                'secret',
                service.bcryptGenerateSalt(4)
            );

            expect(service.bcryptCompare('other', hash)).toBe(false);
        });
    });

    describe('sha256', () => {
        it('produces the known hex digest', () => {
            expect(service.sha256Hash('abc')).toBe(
                'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
            );
        });

        it('compares equal and different hashes', () => {
            expect(service.sha256Compare('a', 'a')).toBe(true);
            expect(service.sha256Compare('a', 'b')).toBe(false);
        });
    });
});
