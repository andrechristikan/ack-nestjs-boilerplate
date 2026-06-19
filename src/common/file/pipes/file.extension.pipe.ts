import {
    Injectable,
    PipeTransform,
    Type,
    mixin,
} from '@nestjs/common';
import { IFile, IFileInput } from '@common/file/interfaces/file.interface';
import { EnumFileExtension } from '@common/file/enums/file.enum';
import { FileService } from '@common/file/services/file.service';
import { FileExtensionInvalidException } from '@common/file/exceptions/file.extension-invalid.exception';

/**
 * Builds a pipe that rejects uploaded files whose extension is outside `allowedExtensions`.
 */
export function FileExtensionPipe(
    allowedExtensions: EnumFileExtension[]
): Type<PipeTransform> {
    @Injectable()
    class MixinFileExtensionPipe implements PipeTransform {
        private readonly extensions: ReadonlySet<string> = new Set(
            allowedExtensions
        );

        constructor(private readonly fileService: FileService) {}

        async transform(value: IFileInput): Promise<IFileInput> {
            if (!value) {
                return value;
            }
            const fileToValidate = this.extractFilesToValidate(value);
            if (!fileToValidate) {
                return value;
            }
            this.validate(fileToValidate);
            return value;
        }

        private extractFilesToValidate(value: IFileInput): IFile | null {
            if (this.isEmptyValue(value)) {
                return null;
            }
            return value as IFile;
        }

        private isEmptyValue(value: unknown): boolean {
            return (
                !value ||
                (typeof value === 'object' &&
                    !Array.isArray(value) &&
                    Object.keys(value).length === 0) ||
                (Array.isArray(value) && value.length === 0)
            );
        }

        private validate(file: IFile): void {
            if (!file?.originalname) {
                throw new FileExtensionInvalidException();
            }
            this.validateExtension(file.originalname);
        }

        private validateExtension(originalname: string): void {
            const extension =
                this.fileService.extractExtensionFromFilename(originalname);
            if (!this.extensions.has(extension)) {
                throw new FileExtensionInvalidException();
            }
        }
    }

    return mixin(MixinFileExtensionPipe);
}
