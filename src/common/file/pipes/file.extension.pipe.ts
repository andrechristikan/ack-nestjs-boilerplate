import { Injectable, mixin } from '@nestjs/common';
import type { PipeTransform, Type } from '@nestjs/common';
import type { IFile, IFileInput } from '@common/file/interfaces/file.interface';
import { EnumFileExtension } from '@common/file/enums/file.enum';
import { FileExtensionContract } from '@common/file/contracts/file.extension.contract';
import { FileService } from '@common/file/services/file.service';
import { FileExtensionInvalidException } from '@common/file/exceptions/file.extension-invalid.exception';

export function FileExtensionPipe(
    allowedExtensions: EnumFileExtension[]
): Type<PipeTransform> {
    @Injectable()
    class MixinFileExtensionPipe implements PipeTransform {
        private readonly extensions: ReadonlySet<string> = new Set(
            allowedExtensions
        );

        constructor(private readonly fileService: FileService) {}

        private signaturesOf(
            extension: EnumFileExtension
        ): readonly string[] | null {
            if (!(extension in FileExtensionContract)) {
                return null;
            }

            return FileExtensionContract[
                extension as keyof typeof FileExtensionContract
            ];
        }

        private extractFilesToValidate(value: IFileInput): IFile[] {
            const isEmpty = this.isEmptyValue(value);
            if (isEmpty) {
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
            const hasDeclaredExtension = this.extensions.has(declared);
            if (!hasDeclaredExtension) {
                throw new FileExtensionInvalidException();
            }

            const sniffed = await this.fileService.sniffExtensionFromBuffer(
                file.buffer
            );
            const signatures = this.signaturesOf(declared as EnumFileExtension);
            if (signatures === null) {
                throw new FileExtensionInvalidException();
            }

            const isMatch =
                sniffed === null
                    ? signatures.length === 0
                    : signatures.includes(sniffed);
            if (!isMatch) {
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
