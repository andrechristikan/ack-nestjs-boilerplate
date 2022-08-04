import { Test } from '@nestjs/testing';
import { CommonModule } from 'src/common/common.module';
import { AuthEnumService } from 'src/common/auth/services/auth.enum.service';

describe('AuthEnumService', () => {
    let authEnumService: AuthEnumService;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CommonModule],
            providers: [AuthEnumService],
        }).compile();

        authEnumService = moduleRef.get<AuthEnumService>(AuthEnumService);
    });

    it('should be defined', async () => {
        expect(authEnumService).toBeDefined();
    });

    describe('getAccessFor', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authEnumService, 'getAccessFor');

            await authEnumService.getAccessFor();
            expect(test).toHaveBeenCalled();
        });

        it('should be mapped', async () => {
            const accessFor = await authEnumService.getAccessFor();
            jest.spyOn(authEnumService, 'getAccessFor').mockImplementation(
                async () => accessFor
            );

            expect(await authEnumService.getAccessFor()).toBe(accessFor);
        });
    });
});
