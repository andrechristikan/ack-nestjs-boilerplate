import { Injectable, mixin } from '@nestjs/common';
import type { PipeTransform, Type } from '@nestjs/common';
import { FileRequiredException } from '@common/file/exceptions/file.required.exception';
import type { IFileInput } from '@common/file/interfaces/file.interface';
import { FileUtil } from '@common/file/utils/file.util';

export function FileRequiredPipe(): Type<PipeTransform> {
    @Injectable()
    class MixinFileRequiredPipe implements PipeTransform {
        constructor(private readonly fileUtil: FileUtil) {}

        transform(value: IFileInput): IFileInput {
            const isEmpty = this.fileUtil.isEmptyInput(value ?? null);
            if (isEmpty) {
                throw new FileRequiredException();
            }

            return value;
        }
    }

    return mixin(MixinFileRequiredPipe);
}
