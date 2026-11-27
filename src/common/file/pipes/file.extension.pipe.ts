import { Injectable, mixin } from '@nestjs/common';
import type { PipeTransform, Type } from '@nestjs/common';
import type {
    IFile,
    IFileFieldMap,
    IFileInput,
} from '@common/file/interfaces/file.interface';
import { EnumFileExtension } from '@common/file/enums/file.enum';
import { FileService } from '@common/file/services/file.service';
import { FileUtil } from '@common/file/utils/file.util';
import { FileExtensionInvalidException } from '@common/file/exceptions/file.extension-invalid.exception';

export function FileExtensionPipe(
    allowedExtensions: EnumFileExtension[]
): Type<PipeTransform> {
    @Injectable()
    class MixinFileExtensionPipe implements PipeTransform {
        private readonly extensions: ReadonlySet<string> = new Set(
            allowedExtensions
        );

        constructor(
            private readonly fileService: FileService,
            private readonly fileUtil: FileUtil
        ) {}

        private extractFilesToValidate(value: IFileInput): IFile[] {
            const isEmpty = this.fileUtil.isEmptyInput(value);
            if (isEmpty) {
                return [];
            }

            if (Array.isArray(value)) {
                return value;
            }

            const isFile = this.isFile(value);

            return isFile ? [value] : Object.values(value).flat();
        }

        private isFile(value: IFile | IFileFieldMap): value is IFile {
            return 'originalname' in value;
        }

        private async validate(file: IFile): Promise<void> {
            if (!file?.originalname) {
                throw new FileExtensionInvalidException();
            }

            const declared = this.fileService.extractExtensionFromFilename(
                file.originalname
            );
            const hasDeclaredExtension = this.extensions.has(declared);
            if (!hasDeclaredExtension) {
                throw new FileExtensionInvalidException();
            }

            const isContent = await this.fileService.isContentOfExtension(
                file.buffer,
                declared
            );
            if (!isContent) {
                throw new FileExtensionInvalidException();
            }
        }

        async transform(value: IFileInput): Promise<IFileInput> {
            if (!value) {
                return value;
            }

            const filesToValidate = this.extractFilesToValidate(value);
            await Promise.all(filesToValidate.map(file => this.validate(file)));

            return value;
        }
    }

    return mixin(MixinFileExtensionPipe);
}
