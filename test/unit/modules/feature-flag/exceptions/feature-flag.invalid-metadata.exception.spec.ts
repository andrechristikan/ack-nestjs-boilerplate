import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';
import { FeatureFlagInvalidMetadataException } from '@modules/feature-flag/exceptions/feature-flag.invalid-metadata.exception';

describe('FeatureFlagInvalidMetadataException', () => {
    describe('constructor', () => {
        it('declares the featureFlag module contract for invalid metadata', () => {
            const exception = new FeatureFlagInvalidMetadataException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.invalidMetadata,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.invalidMetadata
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'featureFlag.error.invalidMetadata',
            });
        });
    });
});
