import { Injectable, mixin } from '@nestjs/common';
import type { PipeTransform, Type } from '@nestjs/common';
import { FileRequiredException } from '@common/file/exceptions/file.required.exception';
import type { IFileInput } from '@common/file/interfaces/file.interface';

/**
 * Rejects an absent or empty upload. First pipe on a required @UploadedFile chain.
 */
export function FileRequiredPipe(): Type<PipeTransform> {
    @Injectable()
    class MixinFileRequiredPipe implements PipeTransform {
        private isEmptyValue(value: unknown): boolean {
            return (
                !value ||
                (typeof value === 'object' &&
                    !Array.isArray(value) &&
                    Object.keys(value).length === 0) ||
                (Array.isArray(value) && value.length === 0)
            );
        }

        transform(value: IFileInput): IFileInput {
            const isEmpty = this.isEmptyValue(value);
            if (isEmpty) {
                throw new FileRequiredException();
            }

            return value;
        }
    }

    return mixin(MixinFileRequiredPipe);
}
