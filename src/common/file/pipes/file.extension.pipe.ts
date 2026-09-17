import { Injectable, mixin } from '@nestjs/common';
import type { PipeTransform, Type } from '@nestjs/common';
import type { IFile, IFileInput } from '@common/file/interfaces/file.interface';
import { EnumFileExtension } from '@common/file/enums/file.enum';
import { FileExtensionSignatures } from '@common/file/constants/file.constant';
import { FileService } from '@common/file/services/file.service';
import { FileExtensionInvalidException } from '@common/file/exceptions/file.extension-invalid.exception';

/**
 * Builds a pipe that rejects uploaded files whose declared extension or magic bytes fall outside `allowedExtensions`.
 */
export function FileExtensionPipe(
    allowedExtensions: EnumFileExtension[]
): Type<PipeTransform> {
    @Injectable()
    class MixinFileExtensionPipe implements PipeTransform {
        private readonly extensions: ReadonlySet<string> = new Set(
            allowedExtensions
        );

        private readonly signedExtensions: ReadonlySet<string>;

        private readonly signaturelessExtensions: ReadonlySet<string>;

        constructor(private readonly fileService: FileService) {
            this.signedExtensions = new Set(
                allowedExtensions.flatMap(
                    extension => this.signaturesOf(extension) ?? []
                )
            );
            this.signaturelessExtensions = new Set(
                allowedExtensions.filter(extension => {
                    const signatures = this.signaturesOf(extension);

                    return signatures !== undefined && signatures.length === 0;
                })
            );
        }

        private signaturesOf(
            extension: EnumFileExtension
        ): readonly string[] | undefined {
            if (!(extension in FileExtensionSignatures)) {
                return undefined;
            }

            return FileExtensionSignatures[
                extension as keyof typeof FileExtensionSignatures
            ];
        }

        private extractFilesToValidate(value: IFileInput): IFile[] {
            if (this.isEmptyValue(value)) {
                return [];
            }

            return Array.isArray(value) ? value : [value];
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

        private async validate(file: IFile): Promise<void> {
            if (!file?.originalname) {
                throw new FileExtensionInvalidException();
            }

            const declared = this.fileService.extractExtensionFromFilename(
                file.originalname
            );
            if (!this.extensions.has(declared)) {
                throw new FileExtensionInvalidException();
            }

            const sniffed = await this.fileService.sniffExtensionFromBuffer(
                file.buffer
            );
            if (sniffed === null) {
                if (!this.signaturelessExtensions.has(declared)) {
                    throw new FileExtensionInvalidException();
                }

                return;
            }

            if (!this.signedExtensions.has(sniffed)) {
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
