import { EnumHelperPemLabel } from '@common/helper/enums/helper.enum';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { FirebaseUtil } from '@common/firebase/utils/firebase.util';

describe('FirebaseUtil', () => {
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    let util: FirebaseUtil;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FirebaseUtil,
                {
                    provide: HelperEncryptionService,
                    useValue: helperEncryptionService,
                },
            ],
        }).compile();

        util = module.get(FirebaseUtil);
    });

    describe('normalizePrivateKey', () => {
        it('returns null when the raw key is null', () => {
            expect(util.normalizePrivateKey(null)).toBeNull();
        });

        it('returns null when the raw key is blank after unescaping', () => {
            expect(util.normalizePrivateKey('   ')).toBeNull();
        });

        it('unescapes newlines and returns the key as-is when it already carries the PEM marker', () => {
            const pem =
                '-----BEGIN PRIVATE KEY-----\\nMIIBVQI\\n-----END PRIVATE KEY-----\\n';

            const result = util.normalizePrivateKey(pem);

            expect(result).toBe(pem.replace(/\\n/g, '\n'));
            expect(
                helperEncryptionService.derBase64ToPem
            ).not.toHaveBeenCalled();
        });

        it('frames a base64-encoded DER key as PEM through the kit helper', () => {
            helperEncryptionService.derBase64ToPem.mockReturnValue('pem-key');

            const result = util.normalizePrivateKey('base64-der');

            expect(result).toBe('pem-key');
            expect(helperEncryptionService.derBase64ToPem).toHaveBeenCalledWith(
                'base64-der',
                EnumHelperPemLabel.privateKey
            );
        });

        it('returns null when the kit helper rejects the bytes', () => {
            helperEncryptionService.derBase64ToPem.mockImplementation(() => {
                throw new Error('not a key');
            });

            const result = util.normalizePrivateKey('not-a-valid-key');

            expect(result).toBeNull();
        });
    });
});
