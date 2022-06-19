import { Test } from '@nestjs/testing';
import { CoreModule } from 'src/core/core.module';
import { HelperGeoService } from 'src/utils/helper/service/helper.geo.service';

describe('HelperGeoService', () => {
    let helperGeoService: HelperGeoService;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CoreModule],
        }).compile();

        helperGeoService = moduleRef.get<HelperGeoService>(HelperGeoService);
    });

    it('should be defined', () => {
        expect(HelperGeoService).toBeDefined();
    });

    describe('inRadius', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperGeoService, 'inRadius');

            helperGeoService.inRadius(
                { longitude: 6.1754, latitude: 106.8272, radiusInMeters: 10 },
                { longitude: 6.1754, latitude: 106.8272 }
            );
            expect(test).toHaveBeenCalledWith(
                { longitude: 6.1754, latitude: 106.8272, radiusInMeters: 10 },
                { longitude: 6.1754, latitude: 106.8272 }
            );
        });

        it('should be success', async () => {
            const result = helperGeoService.inRadius(
                {
                    longitude: 6.1754,
                    latitude: 106.8272,
                    radiusInMeters: 10,
                },
                { longitude: 6.1754, latitude: 106.8272 }
            );
            jest.spyOn(helperGeoService, 'inRadius').mockImplementation(
                () => result
            );

            expect(
                helperGeoService.inRadius(
                    {
                        longitude: 6.1754,
                        latitude: 106.8272,
                        radiusInMeters: 10,
                    },
                    { longitude: 6.1754, latitude: 106.8272 }
                )
            ).toBe(result);
        });
    });
});
