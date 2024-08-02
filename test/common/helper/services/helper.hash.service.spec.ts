import { Test } from '@nestjs/testing';
import { compareSync, genSaltSync, hashSync } from 'bcryptjs';
import { SHA256 } from 'crypto-js';
import { HelperHashService } from 'src/common/helper/services/helper.hash.service';

jest.mock('bcryptjs', () => ({
    compareSync: jest.fn(),
    genSaltSync: jest.fn(),
    hashSync: jest.fn(),
}));
jest.mock('crypto-js', () => ({
    SHA256: jest.fn(),
    enc: jest.fn(),
}));

describe('HelperHashService', () => {
    let service: HelperHashService;
    let result: string;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            providers: [HelperHashService],
        }).compile();

        service = moduleRef.get<HelperHashService>(HelperHashService);
        result = 'result';
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('randomSalt', () => {
        it('should return random salt', () => {
            (genSaltSync as jest.Mock).mockReturnValue(result);
            expect(service.randomSalt(10)).toEqual(result);
        });
    });

    describe('bcrypt', () => {
        it('should return hash', () => {
            (hashSync as jest.Mock).mockReturnValue(result);
            expect(service.bcrypt('password', 'salt')).toEqual(result);
        });
    });

    describe('bcryptCompare', () => {
        it('should compare password', () => {
            (compareSync as jest.Mock).mockReturnValue(true);
            expect(service.bcryptCompare('password', 'passwordHashed')).toEqual(
                true
            );
        });
    });

    describe('sha256', () => {
        it('should convert to sha256', () => {
            (SHA256 as jest.Mock).mockReturnValue(result);
            expect(service.sha256('password')).toEqual(result);
        });
    });

    describe('sha256Compare', () => {
        it('should compare sha256', () => {
            expect(service.sha256Compare('password', 'password')).toEqual(true);
        });
    });
});
