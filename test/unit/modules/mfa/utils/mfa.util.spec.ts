import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { MfaUtil } from '@modules/mfa/utils/mfa.util';

describe('MfaUtil', () => {
    const helperNumberService: MockProxy<HelperNumberService> =
        mock<HelperNumberService>();

    let util: MfaUtil;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MfaUtil,
                {
                    provide: HelperNumberService,
                    useValue: helperNumberService,
                },
            ],
        }).compile();
        util = module.get(MfaUtil);
    });

    describe('mapAdoption', () => {
        it('computes the rate from the enabled count and the active user count', () => {
            helperNumberService.percent.mockReturnValue(50);

            expect(util.mapAdoption(4, 8)).toEqual({
                enabled: 4,
                total: 8,
                rate: 50,
            });
            expect(helperNumberService.percent).toHaveBeenCalledWith(4, 8);
        });
    });
});
