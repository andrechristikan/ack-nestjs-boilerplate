import { GUARDS_METADATA } from '@nestjs/common/constants';
import { DocResponseEntryMetaKey } from '@common/doc/constants/doc.constant';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { HttpStatus } from '@nestjs/common';
import { FeatureFlagKeyPathMetaKey } from '@modules/feature-flag/constants/feature-flag.constant';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';
import { FeatureFlagGuard } from '@modules/feature-flag/guards/feature-flag.guard';
import { FeatureFlagProtected } from '@modules/feature-flag/decorators/feature-flag.decorator';
import { FeatureFlagKeyEmptyException } from '@modules/feature-flag/exceptions/feature-flag.key-empty.exception';
import { FeatureFlagKeyNestedException } from '@modules/feature-flag/exceptions/feature-flag.key-nested.exception';

describe('feature-flag.decorator', () => {
    describe('FeatureFlagProtected', () => {
        const handler = vi.fn();
        const descriptor: PropertyDescriptor = {
            value: handler,
            writable: true,
            enumerable: false,
            configurable: true,
        };

        beforeAll(() => {
            FeatureFlagProtected('changePassword')({}, 'handler', descriptor);
        });

        it('mounts FeatureFlagGuard and stores the bare key on the metadata key', () => {
            expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
                FeatureFlagGuard,
            ]);
            expect(
                Reflect.getMetadata(FeatureFlagKeyPathMetaKey, handler)
            ).toBe('changePassword');
        });

        it('documents the notFound and disabled errors at 404', () => {
            const entries = Reflect.getMetadata(
                DocResponseEntryMetaKey,
                handler
            ) as IDocResponseEntry[];

            expect(entries).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        httpStatus: HttpStatus.NOT_FOUND,
                        statusCode: EnumFeatureFlagStatusCodeError.notFound,
                        messagePath: 'featureFlag.error.notFound',
                    }),
                    expect.objectContaining({
                        httpStatus: HttpStatus.NOT_FOUND,
                        statusCode: EnumFeatureFlagStatusCodeError.disabled,
                        messagePath: 'featureFlag.error.disabled',
                    }),
                ])
            );
        });

        it('throws at evaluation on an empty key', () => {
            expect(() => FeatureFlagProtected('')).toThrow(
                FeatureFlagKeyEmptyException
            );
        });

        it('throws at evaluation on a dotted key', () => {
            expect(() => FeatureFlagProtected('login.google')).toThrow(
                FeatureFlagKeyNestedException
            );
        });
    });
});
