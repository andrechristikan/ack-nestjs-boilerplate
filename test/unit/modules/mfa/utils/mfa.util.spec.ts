import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { MfaUtil } from '@modules/mfa/utils/mfa.util';

describe('MfaUtil', () => {
    let util: MfaUtil;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [MfaUtil, HelperNumberService],
        }).compile();
        util = module.get(MfaUtil);
    });

    describe('mapAdoption', () => {
        it('computes the rate from the enabled count and the active user count', () => {
            expect(util.mapAdoption(4, 8)).toEqual({
                enabled: 4,
                total: 8,
                rate: 50,
            });
        });
    });
});
