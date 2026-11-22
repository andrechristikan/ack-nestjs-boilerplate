import type { ArgumentMetadata, PipeTransform, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import { FileRequiredPipe } from '@common/file/pipes/file.required.pipe';
import type { IFile, IFileInput } from '@common/file/interfaces/file.interface';

describe('FileRequiredPipe', () => {
    const metadata = {} as ArgumentMetadata;
    let pipe: PipeTransform<IFileInput, IFileInput>;

    beforeEach(async () => {
        vi.resetAllMocks();
        const PipeClass: Type<PipeTransform<IFileInput, IFileInput>> =
            FileRequiredPipe();
        const module = await Test.createTestingModule({
            providers: [PipeClass],
        }).compile();
        pipe = module.get(PipeClass);
    });

    describe('transform', () => {
        it('throws when the value is undefined', () => {
            let caught: unknown;

            try {
                pipe.transform(undefined as unknown as IFileInput, metadata);
                throw new Error('expected throw');
            } catch (error) {
                caught = error;
            }

            expect(caught).toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.required,
                statusCodeKey:
                    EnumFileStatusCodeError[EnumFileStatusCodeError.required],
                messagePath: 'file.error.required',
            });
        });

        it('throws when the value is null', () => {
            let caught: unknown;

            try {
                pipe.transform(null as unknown as IFileInput, metadata);
                throw new Error('expected throw');
            } catch (error) {
                caught = error;
            }

            expect(caught).toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.required,
                statusCodeKey:
                    EnumFileStatusCodeError[EnumFileStatusCodeError.required],
                messagePath: 'file.error.required',
            });
        });

        it('throws when the value is an empty plain object', () => {
            let caught: unknown;

            try {
                pipe.transform({} as unknown as IFileInput, metadata);
                throw new Error('expected throw');
            } catch (error) {
                caught = error;
            }

            expect(caught).toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.required,
                statusCodeKey:
                    EnumFileStatusCodeError[EnumFileStatusCodeError.required],
                messagePath: 'file.error.required',
            });
        });

        it('throws when the value is an empty array', () => {
            let caught: unknown;

            try {
                pipe.transform([], metadata);
                throw new Error('expected throw');
            } catch (error) {
                caught = error;
            }

            expect(caught).toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.required,
                statusCodeKey:
                    EnumFileStatusCodeError[EnumFileStatusCodeError.required],
                messagePath: 'file.error.required',
            });
        });

        it('returns a single file unchanged', () => {
            const file = { originalname: 'a.csv' } as IFile;

            expect(pipe.transform(file, metadata)).toBe(file);
        });

        it('returns a non-empty array of files unchanged', () => {
            const files = [{ originalname: 'a.csv' } as IFile];

            expect(pipe.transform(files, metadata)).toBe(files);
        });
    });

    describe('isEmptyValue', () => {
        it('treats a non-empty plain object as non-empty', () => {
            const mixin = pipe as unknown as {
                isEmptyValue(value: unknown): boolean;
            };

            expect(mixin['isEmptyValue']({ originalname: 'a.csv' })).toBe(
                false
            );
        });

        it('treats a truthy primitive as non-empty', () => {
            const mixin = pipe as unknown as {
                isEmptyValue(value: unknown): boolean;
            };

            expect(mixin['isEmptyValue']('a.csv')).toBe(false);
        });
    });
});
