import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { ConfigService } from '@nestjs/config';
import { HelperDecryptFailedException } from '@common/helper/exceptions/helper.decrypt-failed.exception';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import type { TestPaginationCursorDto } from '@test/unit/helpers/test.unit.pagination-cursor.helper';
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
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();
    const secret = Buffer.alloc(48, 7).toString('base64url');
    const digest =
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const token = {
        values: { createdAt: { $date: '2026-01-02T03:04:05.000Z' }, id: 'x' },
        fingerprint: 'aaaaaaaaaaaaaaaa',
    };
    const asc = EnumPaginationOrderDirectionType.asc;
    const desc = EnumPaginationOrderDirectionType.desc;

    let util: PaginationCursorUtil;
    let configService: MockProxy<ConfigService>;

    beforeEach(async () => {
        vi.resetAllMocks();
        helperDateService.createFromIso.mockImplementation(
            iso => new Date(iso)
        );
        helperHashService.sha256Hash.mockReturnValue(digest);
        configService = buildConfigService({
            'app.encryptionSecretKey': secret,
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PaginationCursorUtil,
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: HelperEncryptionService,
                    useValue: helperEncryptionService,
                },
                { provide: HelperHashService, useValue: helperHashService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        util = module.get(PaginationCursorUtil);
    });

    describe('seal', () => {
        it('encrypts the JSON token under the cursor purpose and context with the app secret and returns the result as is', () => {
            helperEncryptionService.aes256Encrypt.mockReturnValue('sealed');

            expect(util.seal(token)).toBe('sealed');
            expect(helperEncryptionService.aes256Encrypt).toHaveBeenCalledWith(
                JSON.stringify(token),
                secret,
                PaginationCursorEncryptionPurpose,
                PaginationCursorEncryptionContext
            );
        });
    });

    describe('open', () => {
        it('decrypts the cursor as is under the same arguments and returns the parsed token', () => {
            helperEncryptionService.aes256Decrypt.mockReturnValue(
                JSON.stringify(token)
            );

            expect(util.open('sealed')).toEqual(token);
            expect(helperEncryptionService.aes256Decrypt).toHaveBeenCalledWith(
                'sealed',
                secret,
                PaginationCursorEncryptionPurpose,
                PaginationCursorEncryptionContext
            );
        });

        it('returns null when the decryption throws', () => {
            helperEncryptionService.aes256Decrypt.mockImplementation(() => {
                throw new HelperDecryptFailedException();
            });

            expect(util.open('sealed')).toBeNull();
        });

        it('returns null when the decrypted text is not JSON', () => {
            helperEncryptionService.aes256Decrypt.mockReturnValue('not json');

            expect(util.open('sealed')).toBeNull();
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
            expect(helperDateService.createFromIso).toHaveBeenCalledWith(
                '2026-01-02T03:04:05.000Z'
            );
        });

        it('keeps a date-shaped string a string', () => {
            expect(
                util.decodeValues(
                    { createdAt: '2026-01-02T03:04:05.000Z', id: 'x' },
                    orderBy
                )
            ).toEqual({ createdAt: '2026-01-02T03:04:05.000Z', id: 'x' });
            expect(helperDateService.createFromIso).not.toHaveBeenCalled();
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

        it('hashes the exact canonical text and returns the leading characters of the digest', () => {
            const dto: TestPaginationCursorDto = {
                search: ' a ',
                status: ' x,y ',
            };

            const result = util.fingerprint('PinScope', dto, [
                ...PaginationDefaultOrderBy,
            ]);

            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                '{"filters":{"search":"a","status":"x,y"},"orderBy":[{"createdAt":"desc"}],"scope":"PinScope"}'
            );
            expect(result).toBe(
                digest.slice(0, PaginationCursorFingerprintLength)
            );
        });

        it('hashes the given order by terms', () => {
            util.fingerprint(scope, {}, [{ name: asc }]);

            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                `{"filters":{},"orderBy":[{"name":"asc"}],"scope":"${scope}"}`
            );
        });

        it.each<[string, TestPaginationCursorDto, string]>([
            [
                'perPage and cursor left out',
                { search: 'a', perPage: 50, cursor: 'Ab-_1' },
                '{"search":"a"}',
            ],
            ['the raw order by left out', { orderBy: 'name:asc' }, '{}'],
            ['a number filter', { level: 1 }, '{"level":1}'],
            [
                'a Date filter as its ISO string',
                { createdAt: new Date('2025-01-01T00:00:00.000Z') },
                '{"createdAt":"2025-01-01T00:00:00.000Z"}',
            ],
            [
                'filter keys sorted',
                { status: 'a', search: 'b' },
                '{"search":"b","status":"a"}',
            ],
            [
                'filter keys sorted from the reverse order',
                { search: 'b', status: 'a' },
                '{"search":"b","status":"a"}',
            ],
            [
                'the value order of a comma-separated filter',
                { status: 'b,a' },
                '{"status":"b,a"}',
            ],
            ['a blank filter left out', { status: '  ' }, '{}'],
            ['a null filter left out', { status: null }, '{}'],
            ['an undefined filter left out', { status: undefined }, '{}'],
            ['an empty array filter left out', { status: [] }, '{}'],
            ['a blank search left out', { search: '  ' }, '{}'],
            ['a trimmed search', { search: ' a ' }, '{"search":"a"}'],
            ['a trimmed string filter', { status: ' a ' }, '{"status":"a"}'],
            [
                'the whitespace inside a comma-separated filter',
                { status: 'a, b' },
                '{"status":"a, b"}',
            ],
            [
                'a non-string filter untrimmed',
                { status: [' a'] },
                '{"status":[" a"]}',
            ],
        ])('hashes %s', (_label, dto, filters) => {
            util.fingerprint(scope, dto, orderBy);

            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                `{"filters":${filters},"orderBy":[{"createdAt":"desc"}],"scope":"${scope}"}`
            );
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
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.cursorTooLong
                    ],
                messagePath: 'pagination.error.cursorTooLong',
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
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.invalidCursorFormat
                    ],
                messagePath: 'pagination.error.invalidCursorFormat',
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
