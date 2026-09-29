import { GUARDS_METADATA } from '@nestjs/common/constants';
import { DocResponseEntryMetaKey } from '@common/doc/constants/doc.constant';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { HttpStatus } from '@nestjs/common';
import { FeatureFlagKeyPathMetaKey } from '@modules/feature-flag/constants/feature-flag.constant';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';
import { FeatureFlagGuard } from '@modules/feature-flag/guards/feature-flag.guard';
import { FeatureFlagProtected } from '@modules/feature-flag/decorators/feature-flag.decorator';

function buildDescriptor(): {
    target: object;
    propertyKey: string;
    descriptor: PropertyDescriptor;
    handler: () => void;
} {
    function handler(): void {}

    return {
        target: {},
        propertyKey: 'handler',
        descriptor: {
            value: handler,
            writable: true,
            enumerable: false,
            configurable: true,
        },
        handler,
    };
}

describe('FeatureFlagProtected', () => {
    it('mounts FeatureFlagGuard and stores the bare key on the metadata key', () => {
        const { target, propertyKey, descriptor, handler } = buildDescriptor();

        FeatureFlagProtected('changePassword')(target, propertyKey, descriptor);

        expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
            FeatureFlagGuard,
        ]);
        expect(Reflect.getMetadata(FeatureFlagKeyPathMetaKey, handler)).toBe(
            'changePassword'
        );
    });

    it('documents the predefined-key error kit at 500 and the service-unavailable error at 503', () => {
        const { target, propertyKey, descriptor, handler } = buildDescriptor();

        FeatureFlagProtected('changePassword')(target, propertyKey, descriptor);

        const entries = Reflect.getMetadata(
            DocResponseEntryMetaKey,
            handler
        ) as IDocResponseEntry[];

        expect(entries).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                    statusCode:
                        EnumFeatureFlagStatusCodeError.predefinedKeyNotFound,
                    messagePath: 'featureFlag.error.predefinedKeyNotFound',
                }),
                expect.objectContaining({
                    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                    statusCode:
                        EnumFeatureFlagStatusCodeError.predefinedKeyLengthExceeded,
                    messagePath:
                        'featureFlag.error.predefinedKeyLengthExceeded',
                }),
                expect.objectContaining({
                    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                    statusCode:
                        EnumFeatureFlagStatusCodeError.predefinedKeyEmpty,
                    messagePath: 'featureFlag.error.predefinedKeyEmpty',
                }),
                expect.objectContaining({
                    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
                    statusCode:
                        EnumFeatureFlagStatusCodeError.serviceUnavailable,
                    messagePath: 'featureFlag.error.serviceUnavailable',
                }),
            ])
        );
    });
});
