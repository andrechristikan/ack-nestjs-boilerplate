import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { HelperHashService } from '@common/helper/services/helper.hash.service';

describe('HelperHashService', () => {
    let service: HelperHashService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [HelperHashService],
        }).compile();

        service = module.get(HelperHashService);
    });

    describe('bcryptGenerateSalt', () => {
        it('generates a salt of the requested cost', async () => {
            const pending = service.bcryptGenerateSalt(10);
            const salt = await pending;

            expect(pending).toBeInstanceOf(Promise);
            expect(salt).toEqual(expect.any(String));
            expect(salt.startsWith('$2')).toBe(true);
        });
    });

    describe('bcryptHash', () => {
        it('hashes a password with the given salt', async () => {
            const salt = await service.bcryptGenerateSalt(10);

            const pending = service.bcryptHash('Password123!', salt);
            const hashed = await pending;

            expect(pending).toBeInstanceOf(Promise);
            expect(hashed).toEqual(expect.any(String));
            expect(hashed).not.toEqual('Password123!');
        });
    });

    describe('bcryptCompare', () => {
        it('returns true when the password matches the hash', async () => {
            const salt = await service.bcryptGenerateSalt(10);
            const hashed = await service.bcryptHash('Password123!', salt);

            const pending = service.bcryptCompare('Password123!', hashed);
            const result = await pending;

            expect(pending).toBeInstanceOf(Promise);
            expect(result).toBe(true);
        });

        it('returns false when the password does not match the hash', async () => {
            const salt = await service.bcryptGenerateSalt(10);
            const hashed = await service.bcryptHash('Password123!', salt);

            const result = await service.bcryptCompare(
                'WrongPassword1!',
                hashed
            );

            expect(result).toBe(false);
        });
    });

    describe('sha256Hash', () => {
        it('digests a value into its sha256 hex form', () => {
            const result = service.sha256Hash('value');

            expect(result).toBe(
                'cd42404d52ad55ccfa9aca4adc828aa5800ad9d385a0671fbcbf724118320619'
            );
        });
    });

    describe('sha256Compare', () => {
        it('returns true for two equal hashes', () => {
            const hash = service.sha256Hash('value');

            const result = service.sha256Compare(hash, hash);

            expect(result).toBe(true);
        });

        it('returns false for hashes of different length', () => {
            const result = service.sha256Compare('abc', 'abcd');

            expect(result).toBe(false);
        });

        it('returns false for two different hashes of equal length', () => {
            const hashOne = service.sha256Hash('one');
            const hashTwo = service.sha256Hash('two');

            const result = service.sha256Compare(hashOne, hashTwo);

            expect(result).toBe(false);
        });
    });
});
