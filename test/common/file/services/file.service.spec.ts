import { Test } from '@nestjs/testing';
import { FileService } from 'src/common/file/services/file.service';
import { Buffer } from 'buffer';

describe('FileService', () => {
    let service: FileService;

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                FileService,
                {
                    provide: Buffer,
                    useValue: {
                        from: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<FileService>(FileService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('writeCsv', () => {
        it('should write CSV', () => {
            expect(service.writeCsv({ data: ['data'] })).toBeInstanceOf(Buffer);
        });
    });

    describe('writeCsvFromArray', () => {
        it('should write CSV from array', () => {
            expect(service.writeCsvFromArray([['data']])).toBeInstanceOf(
                Buffer
            );
        });
    });

    describe('writeExcel', () => {
        it('should write excel', () => {
            expect(service.writeExcel([{ data: ['data'] }])).toBeInstanceOf(
                Buffer
            );
        });
    });

    describe('writeExcelFromArray', () => {
        it('should write Excel from array', () => {
            expect(
                service.writeExcelFromArray([['test', 'data']])
            ).toBeInstanceOf(Buffer);
        });
    });

    describe('readCsv', () => {
        it('should read CSV', () => {
            const result = service.readCsv(Buffer.from('mocked CSV', 'utf8'));
            expect(result).toBeInstanceOf(Object);
        });
    });

    describe('readExcel', () => {
        it('should read Excel', () => {
            const result = service.readExcel(
                Buffer.from('mocked Excel', 'utf8')
            );
            expect(result).toBeInstanceOf(Object);
        });
    });
});
