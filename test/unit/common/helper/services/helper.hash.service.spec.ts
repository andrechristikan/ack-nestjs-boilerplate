import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { argon2 } from 'node:crypto';
import { HelperHashService } from '@common/helper/services/helper.hash.service';

vi.mock('node:crypto', async importOriginal => {
    const actual = await importOriginal<typeof import('node:crypto')>();

    return { ...actual, argon2: vi.fn(actual.argon2) };
});

describe('HelperHashService', () => {
    const configGet = vi.fn<(key: string) => object | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let service: HelperHashService;

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation((key: string) =>
            key === 'helper.argon2'
                ? {
                      memoryInBytes: 19922944,
                      passes: 2,
                      parallelism: 1,
                      saltLength: 16,
                      tagLength: 32,
                  }
                : undefined
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HelperHashService,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        service = module.get(HelperHashService);
    });

    describe('argon2Hash', () => {
        it('answers a PHC string carrying the configured parameters that argon2Compare accepts', async () => {
            const hashed = await service.argon2Hash('Password123!');

            expect(hashed).toMatch(
                /^\$argon2id\$v=19\$m=19456,t=2,p=1\$[A-Za-z0-9+/]{22}\$[A-Za-z0-9+/]{43}$/
            );
            await expect(
                service.argon2Compare('Password123!', hashed)
            ).resolves.toBe(true);
        });

        it('salts every hash', async () => {
            const [one, two] = await Promise.all([
                service.argon2Hash('Password123!'),
                service.argon2Hash('Password123!'),
            ]);

            expect(one).not.toBe(two);
        });
    });

    describe('argon2Compare', () => {
        it('returns false for a wrong value', async () => {
            const hashed = await service.argon2Hash('Password123!');

            const result = await service.argon2Compare(
                'WrongPassword1!',
                hashed
            );

            expect(result).toBe(false);
        });

        it('returns false for a tampered tag', async () => {
            const hashed = await service.argon2Hash('Password123!');
            const tag = hashed.slice(hashed.lastIndexOf('$') + 1);
            const flipped = (tag.startsWith('A') ? 'B' : 'A') + tag.slice(1);
            const tampered = hashed.replace(tag, flipped);

            const result = await service.argon2Compare(
                'Password123!',
                tampered
            );

            expect(result).toBe(false);
        });

        it('reads the parameters from the string, not from config', async () => {
            const hashed = await service.argon2Hash('Password123!');
            const lighter = hashed.replace('m=19456,t=2,p=1', 'm=8,t=1,p=1');

            const result = await service.argon2Compare('Password123!', lighter);

            expect(result).toBe(false);
        });

        it('rejects with the node:crypto error when the string carries parameters argon2 refuses', async () => {
            const hashed = await service.argon2Hash('Password123!');
            const refused = hashed.replace('m=19456,t=2,p=1', 'm=1,t=2,p=1');

            await expect(
                service.argon2Compare('Password123!', refused)
            ).rejects.toThrow(/memory/i);
        });

        it('rejects with the error argon2 hands to its callback', async () => {
            const failure = new Error('argon2 failed');
            const hashed = await service.argon2Hash('Password123!');
            vi.mocked(argon2).mockImplementationOnce(
                (_algorithm, _parameters, callback) => {
                    callback(failure, Buffer.alloc(0));
                }
            );

            await expect(
                service.argon2Compare('Password123!', hashed)
            ).rejects.toBe(failure);
        });

        it.each([
            ['an empty string', ''],
            ['a hash of another scheme', '$2b$10$notAnArgonHash'],
            ['too few segments', '$argon2id$v=19$m=19456,t=2,p=1$salt'],
            [
                'another algorithm',
                '$argon2i$v=19$m=19456,t=2,p=1$c2FsdHNhbHQ$dGFn',
            ],
            [
                'another version',
                '$argon2id$v=16$m=19456,t=2,p=1$c2FsdHNhbHQ$dGFn',
            ],
            [
                'non numeric parameters',
                '$argon2id$v=19$m=x,t=y,p=z$c2FsdHNhbHQ$dGFn',
            ],
        ])('returns false for %s', async (_label, malformed) => {
            const result = await service.argon2Compare(
                'Password123!',
                malformed
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
