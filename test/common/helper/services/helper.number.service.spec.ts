import { Test } from '@nestjs/testing';
import { HelperNumberService } from 'src/common/helper/services/helper.number.service';

describe('HelperNumberService', () => {
    let service: HelperNumberService;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            providers: [HelperNumberService],
        }).compile();

        service = moduleRef.get<HelperNumberService>(HelperNumberService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('check', () => {
        it('should check number', () => {
            expect(service.check('10')).toEqual(true);
        });
    });

    describe('random', () => {
        it('should random number', () => {
            jest.spyOn(service, 'randomInRange').mockReturnValueOnce(1234);

            expect(service.random(4)).toEqual(1234);
        });
    });

    describe('randomInRange', () => {
        it('should random in range number', () => {
            expect(service.randomInRange(1, 1)).toEqual(1);
        });
    });

    describe('percent', () => {
        it('should return percentage', () => {
            expect(service.percent(1, 10)).toEqual(10);
        });

        it('should return percentage with unknown value', () => {
            expect(service.percent(NaN, 10)).toEqual(0);
        });
    });
});
