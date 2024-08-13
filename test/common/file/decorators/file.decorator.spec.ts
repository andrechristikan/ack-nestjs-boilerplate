import { createMock } from '@golevelup/ts-jest';
import {
    applyDecorators,
    ExecutionContext,
    UseInterceptors,
} from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import {
    FileFieldsInterceptor,
    FileInterceptor,
    FilesInterceptor,
} from '@nestjs/platform-express';
import { FILE_SIZE_IN_BYTES } from 'src/common/file/constants/file.constant';
import {
    FileUploadSingle,
    FileUploadMultiple,
    FileUploadMultipleFields,
    FilePartNumber,
} from 'src/common/file/decorators/file.decorator';

/* eslint-disable */
function getParamDecoratorFactory(decorator: any) {
    class Test {
        public test(@decorator() value) {}
    }

    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
    return args[Object.keys(args)[0]].factory;
}
/* eslint-enable */

describe('File Decorators', () => {
    describe('FileUploadSingle', () => {
        it('should apply the FileInterceptor with correct options', () => {
            const decorator = FileUploadSingle({
                field: 'testFile',
                fileSize: 1024,
            });

            const mockApplyDecorator = applyDecorators(
                UseInterceptors(
                    FileInterceptor('testFile', {
                        limits: {
                            fileSize: 1024,
                            files: 1,
                        },
                    })
                )
            );

            expect(decorator.toString()).toEqual(mockApplyDecorator.toString());
        });

        it('should apply the FileInterceptor with no options', () => {
            const decorator = FileUploadSingle();

            const mockApplyDecorator = applyDecorators(
                UseInterceptors(
                    FileInterceptor('file', {
                        limits: {
                            fileSize: FILE_SIZE_IN_BYTES,
                            files: 1,
                        },
                    })
                )
            );

            expect(decorator.toString()).toEqual(mockApplyDecorator.toString());
        });
    });

    describe('FileUploadMultiple', () => {
        it('should apply the FilesInterceptor with correct options', () => {
            const decorator = FileUploadMultiple({
                field: 'testFiles',
                maxFiles: 5,
                fileSize: 2048,
            });

            const mockApplyDecorator = applyDecorators(
                UseInterceptors(
                    FilesInterceptor('testFiles', 5, {
                        limits: {
                            fileSize: 2048,
                        },
                    })
                )
            );

            expect(decorator.toString()).toEqual(mockApplyDecorator.toString());
        });

        it('should apply the FilesInterceptor with no options', () => {
            const decorator = FileUploadMultiple();

            const mockApplyDecorator = applyDecorators(
                UseInterceptors(
                    FilesInterceptor('files', 2, {
                        limits: {
                            fileSize: FILE_SIZE_IN_BYTES,
                        },
                    })
                )
            );

            expect(decorator.toString()).toEqual(mockApplyDecorator.toString());
        });
    });

    describe('FileUploadMultipleFields', () => {
        it('should apply the FileFieldsInterceptor with correct options', () => {
            const fields = [
                { field: 'file1', maxFiles: 1 },
                { field: 'file2', maxFiles: 2 },
            ];
            const decorator = FileUploadMultipleFields(fields, {
                fileSize: 4096,
            });

            const mockApplyDecorator = applyDecorators(
                UseInterceptors(
                    FileFieldsInterceptor(
                        [
                            { name: 'file1', maxCount: 1 },
                            { name: 'file2', maxCount: 2 },
                        ],
                        {
                            limits: {
                                fileSize: 4096,
                            },
                        }
                    )
                )
            );

            expect(decorator.toString()).toEqual(mockApplyDecorator.toString());
        });

        it('should apply the FileFieldsInterceptor with no options', () => {
            const fields = [
                { field: 'file1', maxFiles: 1 },
                { field: 'file2', maxFiles: 2 },
            ];
            const decorator = FileUploadMultipleFields(fields);

            const mockApplyDecorator = applyDecorators(
                UseInterceptors(
                    FileFieldsInterceptor(
                        [
                            { name: 'file1', maxCount: 1 },
                            { name: 'file2', maxCount: 2 },
                        ],
                        {
                            limits: {
                                fileSize: FILE_SIZE_IN_BYTES,
                            },
                        }
                    )
                )
            );

            expect(decorator.toString()).toEqual(mockApplyDecorator.toString());
        });
    });

    describe('FilePartNumber', () => {
        it('should return the correct part number from the headers', () => {
            const executionContext = createMock<ExecutionContext>({
                switchToHttp: jest.fn().mockReturnValue({
                    getRequest: jest.fn().mockReturnValue({
                        headers: {
                            'x-part-number': '5',
                        },
                    }),
                }),
            });

            const decorator = getParamDecoratorFactory(FilePartNumber);

            const result = decorator(null, executionContext);
            expect(result).toBeTruthy();
            expect(result).toBe(5);
        });

        it('should return 0 if part number header is not present', () => {
            const executionContext = createMock<ExecutionContext>({
                switchToHttp: jest.fn().mockReturnValue({
                    getRequest: jest.fn().mockReturnValue({
                        headers: {},
                    }),
                }),
            });

            const decorator = getParamDecoratorFactory(FilePartNumber);

            const result = decorator(null, executionContext);
            expect(result).toBeFalsy();
            expect(result).toBe(undefined);
        });
    });
});
