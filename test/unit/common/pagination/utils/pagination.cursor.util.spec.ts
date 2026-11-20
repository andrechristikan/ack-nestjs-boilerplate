import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { TestUnitKitConfigValues } from '@test/unit/helpers/test.unit.kit.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import type { ITestPaginationCursorDto } from '@test/unit/helpers/test.unit.pagination-cursor.helper';
import { PaginationCursorUtil } from '@common/pagination/utils/pagination.cursor.util';
import {
    PaginationCursorEncryptionContext,
    PaginationCursorEncryptionPurpose,
    PaginationCursorFingerprintLength,
    PaginationDefaultOrderBy,
    PaginationMaxCursorLength,
} from '@common/pagination/constants/pagination.constant';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';
import { PaginationCursorTooLongException } from '@common/pagination/exceptions/pagination.cursor-too-long.exception';
import { PaginationInvalidCursorFormatException } from '@common/pagination/exceptions/pagination.invalid-cursor-format.exception';
import type { IPaginationOrderBy } from '@common/pagination/interfaces/pagination.interface';

describe('PaginationCursorUtil', () => {
    const secret = Buffer.alloc(48, 7).toString('base64url');
    const token = {
        values: { createdAt: { $date: '2026-01-02T03:04:05.000Z' }, id: 'x' },
        fingerprint: 'aaaaaaaaaaaaaaaa',
    };
    const asc = EnumPaginationOrderDirectionType.asc;
    const desc = EnumPaginationOrderDirectionType.desc;

    let util: PaginationCursorUtil;
    let configService: MockProxy<ConfigService>;
    let helperEncryptionService: HelperEncryptionService;

    beforeEach(async () => {
        configService = buildConfigService({
            ...TestUnitKitConfigValues,
            'app.encryptionSecret': secret,
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PaginationCursorUtil,
                HelperDateService,
                HelperEncryptionService,
                HelperHashService,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        util = module.get(PaginationCursorUtil);
        helperEncryptionService = module.get(HelperEncryptionService);
    });

    describe('seal', () => {
        it('encrypts the JSON token under the cursor purpose and context with the app secret', () => {
            const sealed = util.seal(token);

            expect(
                helperEncryptionService.aes256Decrypt(
                    sealed,
                    secret,
                    PaginationCursorEncryptionPurpose,
                    PaginationCursorEncryptionContext
                )
            ).toBe(JSON.stringify(token));
        });
    });

    describe('encryptionSecret', () => {
        it('reads the app secret once at construction, not per seal or open', () => {
            vi.mocked(configService.get).mockClear();

            util.open(util.seal(token));

            expect(configService.get).not.toHaveBeenCalled();
        });
    });

    describe('open', () => {
        it('returns the parsed token of a cursor it sealed', () => {
            expect(util.open(util.seal(token))).toEqual(token);
        });

        it('returns null when the decryption fails', () => {
            expect(util.open('not.a.sealed.cursor')).toBeNull();
        });

        it('returns null when the decrypted text is not JSON', () => {
            const sealed = helperEncryptionService.aes256Encrypt(
                'not json',
                secret,
                PaginationCursorEncryptionPurpose,
                PaginationCursorEncryptionContext
            );

            expect(util.open(sealed)).toBeNull();
        });
    });

    describe('encodeValues', () => {
        it('tags a Date under the date key and keeps other values', () => {
            const result = util.encodeValues(
                {
                    createdAt: new Date('2026-01-02T03:04:05.000Z'),
                    id: 'x',
                    extra: 1,
                },
                [{ createdAt: desc }, { id: desc }]
            );

            expect(result).toEqual(token.values);
        });

        it('returns null when a term value is null', () => {
            expect(
                util.encodeValues({ createdAt: null, id: 'x' }, [
                    { createdAt: desc },
                    { id: desc },
                ])
            ).toBeNull();
        });

        it('returns null when a term value is absent', () => {
            expect(
                util.encodeValues({ id: 'x' }, [
                    { createdAt: desc },
                    { id: desc },
                ])
            ).toBeNull();
        });
    });

    describe('decodeValues', () => {
        const orderBy: IPaginationOrderBy[] = [
            { createdAt: desc },
            { id: desc },
        ];

        it('restores a Date from the date key', () => {
            expect(util.decodeValues(token.values, orderBy)).toEqual({
                createdAt: new Date('2026-01-02T03:04:05.000Z'),
                id: 'x',
            });
        });

        it('keeps a date-shaped string a string', () => {
            expect(
                util.decodeValues(
                    { createdAt: '2026-01-02T03:04:05.000Z', id: 'x' },
                    orderBy
                )
            ).toEqual({ createdAt: '2026-01-02T03:04:05.000Z', id: 'x' });
        });

        it.each([
            ['an extra key', { ...token.values, name: 'a' }],
            ['a missing key', { id: 'x' }],
            ['a renamed key', { createdAt: 'a', ident: 'x' }],
        ])('returns null for %s', (_label, values) => {
            expect(util.decodeValues(values, orderBy)).toBeNull();
        });
    });

    describe('keyset', () => {
        it('builds a greater-than chain for ascending terms', () => {
            expect(
                util.keyset([{ name: asc }, { id: asc }], {
                    name: 'a',
                    id: 'x',
                })
            ).toEqual({
                OR: [{ name: { gt: 'a' } }, { name: 'a', id: { gt: 'x' } }],
            });
        });

        it('builds a less-than chain for descending terms', () => {
            expect(
                util.keyset([{ name: desc }, { id: desc }], {
                    name: 'a',
                    id: 'x',
                })
            ).toEqual({
                OR: [{ name: { lt: 'a' } }, { name: 'a', id: { lt: 'x' } }],
            });
        });

        it('mixes operators by term direction', () => {
            expect(
                util.keyset([{ name: asc }, { id: desc }], {
                    name: 'a',
                    id: 'x',
                })
            ).toEqual({
                OR: [{ name: { gt: 'a' } }, { name: 'a', id: { lt: 'x' } }],
            });
        });

        it.each([
            { direction: asc, value: false, expected: [{ isActive: true }] },
            { direction: asc, value: true, expected: [] },
            { direction: desc, value: true, expected: [{ isActive: false }] },
            { direction: desc, value: false, expected: [] },
        ])(
            'builds the boolean step for $direction from $value',
            ({ direction, value, expected }) => {
                expect(
                    util.keyset([{ isActive: direction }], { isActive: value })
                ).toEqual({ OR: expected });
            }
        );

        it('carries equality on a prior boolean term into the next term', () => {
            expect(
                util.keyset([{ isActive: asc }, { id: asc }], {
                    isActive: true,
                    id: 'x',
                })
            ).toEqual({ OR: [{ isActive: true, id: { gt: 'x' } }] });
        });
    });

    describe('fingerprint', () => {
        const scope = 'RoleSystemListCursorScope';
        const orderBy: IPaginationOrderBy[] = [...PaginationDefaultOrderBy];

        it('returns the leading characters of the digest of the exact canonical text', () => {
            const dto: ITestPaginationCursorDto = {
                search: ' a ',
                status: ' x,y ',
            };

            const result = util.fingerprint('PinScope', dto, [
                ...PaginationDefaultOrderBy,
            ]);

            expect(result).toBe('a290740b355c9b83');
            expect(result).toHaveLength(PaginationCursorFingerprintLength);
        });

        it('hashes the given order by terms', () => {
            expect(util.fingerprint(scope, {}, [{ name: asc }])).toBe(
                '1646c59d010b6eb4'
            );
        });

        it('answers a different fingerprint for two different preset term sets', () => {
            const first = util.fingerprint(scope, {}, [{ createdAt: desc }]);
            const second = util.fingerprint(scope, {}, [{ name: asc }]);

            expect(first).not.toBe(second);
        });

        it.each<[string, ITestPaginationCursorDto, string]>([
            [
                'perPage and cursor left out',
                { search: 'a', perPage: 50, cursor: 'Ab-_1' },
                'badbdb2411d8964c',
            ],
            [
                'the raw order by left out',
                { orderBy: 'name:asc' },
                'db6f76f6d1a4dedf',
            ],
            ['a number filter', { level: 1 }, 'b19d56a0c21eb75d'],
            [
                'a Date filter as its ISO string',
                { createdAt: new Date('2025-01-01T00:00:00.000Z') },
                'c24bb9dfdc131e63',
            ],
            [
                'filter keys sorted',
                { status: 'a', search: 'b' },
                '4747d36d974eecdb',
            ],
            [
                'filter keys sorted from the reverse order',
                { search: 'b', status: 'a' },
                '4747d36d974eecdb',
            ],
            [
                'the value order of a comma-separated filter',
                { status: 'b,a' },
                '28ca5566869106c5',
            ],
            ['a blank filter left out', { status: '  ' }, 'db6f76f6d1a4dedf'],
            ['a null filter left out', { status: null }, 'db6f76f6d1a4dedf'],
            [
                'an undefined filter left out',
                { status: undefined },
                'db6f76f6d1a4dedf',
            ],
            [
                'an empty array filter left out',
                { status: [] },
                'db6f76f6d1a4dedf',
            ],
            ['a blank search left out', { search: '  ' }, 'db6f76f6d1a4dedf'],
            ['a trimmed search', { search: ' a ' }, 'badbdb2411d8964c'],
            ['a trimmed string filter', { status: ' a ' }, 'a05910a90930a7c9'],
            [
                'the whitespace inside a comma-separated filter',
                { status: 'a, b' },
                'ba15c0329dbaf543',
            ],
            [
                'a non-string filter untrimmed',
                { status: [' a'] },
                'c211b9750d961386',
            ],
        ])('fingerprints %s', (_label, dto, expected) => {
            expect(util.fingerprint(scope, dto, orderBy)).toBe(expected);
        });
    });

    describe('checkFormat', () => {
        it('returns the too long exception for a cursor over the maximum length', () => {
            const result = util.checkFormat(
                'a'.repeat(PaginationMaxCursorLength + 1)
            );

            expect(result).toBeInstanceOf(PaginationCursorTooLongException);
            expect(result).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.cursorTooLong,
                messageProperties: {
                    maxCursorLength: PaginationMaxCursorLength,
                },
            });
        });

        it('returns the invalid format exception for a cursor outside the URL-safe alphabet', () => {
            const result = util.checkFormat('not url safe!');

            expect(result).toBeInstanceOf(
                PaginationInvalidCursorFormatException
            );
            expect(result).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.invalidCursorFormat,
                messageProperties: null,
            });
        });

        it('returns null for a cursor with dots', () => {
            expect(util.checkFormat('a.b-c_d.e')).toBeNull();
        });

        it('returns null for a valid cursor at the maximum length', () => {
            expect(
                util.checkFormat('a'.repeat(PaginationMaxCursorLength))
            ).toBeNull();
        });
    });

    describe('canonicalize', () => {
        it('renders a Date as its ISO string', () => {
            expect(
                util['canonicalize'](new Date('2025-01-01T00:00:00.000Z'))
            ).toBe('"2025-01-01T00:00:00.000Z"');
        });

        it('renders an array in its own order', () => {
            expect(util['canonicalize'](['b', 'a'])).toBe('["b","a"]');
        });

        it('renders an object with sorted keys, nested values included', () => {
            expect(util['canonicalize']({ b: 1, a: { d: 2, c: 3 } })).toBe(
                '{"a":{"c":3,"d":2},"b":1}'
            );
        });

        it('renders a scalar as JSON', () => {
            expect(util['canonicalize']('a')).toBe('"a"');
        });

        it('renders null as JSON', () => {
            expect(util['canonicalize'](null)).toBe('null');
        });
    });

    describe('isFilled', () => {
        it.each([
            ['null', null, false],
            ['undefined', undefined, false],
            ['an empty string', '', false],
            ['a filled string', 'a', true],
            ['an empty array', [], false],
            ['a filled array', ['a'], true],
            ['a number', 0, true],
        ])('returns the fill state of %s', (_label, value, expected) => {
            expect(util['isFilled'](value)).toBe(expected);
        });
    });
});
