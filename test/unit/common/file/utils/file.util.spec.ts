import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { FileUtil } from '@common/file/utils/file.util';
import type { IFile } from '@common/file/interfaces/file.interface';

describe('FileUtil', () => {
    let util: FileUtil;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [FileUtil],
        }).compile();

        util = module.get(FileUtil);
    });

    describe('isEmptyInput', () => {
        it('treats null as empty', () => {
            expect(util.isEmptyInput(null)).toBe(true);
        });

        it('treats an empty field map as empty', () => {
            expect(util.isEmptyInput({})).toBe(true);
        });

        it('treats an empty array as empty', () => {
            expect(util.isEmptyInput([])).toBe(true);
        });

        it('treats a file as non-empty', () => {
            expect(util.isEmptyInput({ originalname: 'a.csv' } as IFile)).toBe(
                false
            );
        });

        it('treats a non-empty array as non-empty', () => {
            expect(
                util.isEmptyInput([{ originalname: 'a.csv' } as IFile])
            ).toBe(false);
        });

        it('treats a non-empty field map as non-empty', () => {
            expect(
                util.isEmptyInput({
                    photo: [{ originalname: 'a.png' } as IFile],
                })
            ).toBe(false);
        });
    });
});
