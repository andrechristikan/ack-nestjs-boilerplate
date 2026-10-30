import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import type { IFeatureFlagMetadata } from '@modules/feature-flag/interfaces/feature-flag.interface';
import { FeatureFlagUtil } from '@modules/feature-flag/utils/feature-flag.util';

describe('FeatureFlagUtil', () => {
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();

    const hashForTenPercent = '0000000a'.padEnd(64, '0');
    const hashForFiftyPercent = '00000032'.padEnd(64, '0');

    let util: FeatureFlagUtil;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FeatureFlagUtil,
                { provide: HelperHashService, useValue: helperHashService },
            ],
        }).compile();

        util = module.get(FeatureFlagUtil);
    });

    describe('isInRollout', () => {
        it('hashes "<key>:<identifier>" and returns true when the bucket is under the rollout', () => {
            helperHashService.sha256Hash.mockReturnValue(hashForTenPercent);

            const result = util.isInRollout(50, 'loginWithGoogle', 'user-1');

            expect(result).toBe(true);
            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                'loginWithGoogle:user-1'
            );
        });

        it('returns false when the bucket is at or above the rollout', () => {
            helperHashService.sha256Hash.mockReturnValue(hashForFiftyPercent);

            const result = util.isInRollout(50, 'loginWithGoogle', 'user-1');

            expect(result).toBe(false);
        });
    });

    describe('isMetadataValid', () => {
        it('returns true when keys match and every value keeps its type', () => {
            const oldMetadata: IFeatureFlagMetadata = {
                newFeature: true,
                maxRetries: 3,
            };
            const newMetadata: IFeatureFlagMetadata = {
                newFeature: false,
                maxRetries: 5,
            };

            expect(util.isMetadataValid(oldMetadata, newMetadata)).toBe(true);
        });

        it('returns false when the stored metadata is null', () => {
            const newMetadata: IFeatureFlagMetadata = { newFeature: true };

            expect(util.isMetadataValid(null, newMetadata)).toBe(false);
        });

        it('returns false when the key sets differ', () => {
            const oldMetadata: IFeatureFlagMetadata = { newFeature: true };
            const newMetadata: IFeatureFlagMetadata = { maxRetries: 3 };

            expect(util.isMetadataValid(oldMetadata, newMetadata)).toBe(false);
        });

        it('returns false when a value changes primitive type', () => {
            const oldMetadata: IFeatureFlagMetadata = { newFeature: true };
            const newMetadata: IFeatureFlagMetadata = { newFeature: 'true' };

            expect(util.isMetadataValid(oldMetadata, newMetadata)).toBe(false);
        });

        it('returns false when an array value changes element type', () => {
            const oldMetadata: IFeatureFlagMetadata = {
                allowedRegions: ['sg', 'id'],
            };
            const newMetadata: IFeatureFlagMetadata = {
                allowedRegions: [1, 2],
            };

            expect(util.isMetadataValid(oldMetadata, newMetadata)).toBe(false);
        });

        it('returns true when an array value keeps its element type', () => {
            const oldMetadata: IFeatureFlagMetadata = {
                allowedRegions: ['sg'],
            };
            const newMetadata: IFeatureFlagMetadata = {
                allowedRegions: ['sg', 'id'],
            };

            expect(util.isMetadataValid(oldMetadata, newMetadata)).toBe(true);
        });

        it('returns false when a new value is undefined', () => {
            const oldMetadata: IFeatureFlagMetadata = { label: 'a' };
            const newMetadata = {
                label: undefined,
            } as unknown as IFeatureFlagMetadata;

            expect(util.isMetadataValid(oldMetadata, newMetadata)).toBe(false);
        });

        it('returns false when a new value is null', () => {
            const oldMetadata: IFeatureFlagMetadata = { label: 'a' };
            const newMetadata = {
                label: null,
            } as unknown as IFeatureFlagMetadata;

            expect(util.isMetadataValid(oldMetadata, newMetadata)).toBe(false);
        });

        it('returns false when a new value is an empty string', () => {
            const oldMetadata: IFeatureFlagMetadata = { label: 'a' };
            const newMetadata: IFeatureFlagMetadata = { label: '' };

            expect(util.isMetadataValid(oldMetadata, newMetadata)).toBe(false);
        });

        it('returns false when a new array value is empty', () => {
            const oldMetadata: IFeatureFlagMetadata = {
                allowedRegions: ['sg'],
            };
            const newMetadata: IFeatureFlagMetadata = { allowedRegions: [] };

            expect(util.isMetadataValid(oldMetadata, newMetadata)).toBe(false);
        });
    });

    describe('metadataValueType', () => {
        it('returns "array" for an empty array', () => {
            expect(util['metadataValueType']([])).toBe('array');
        });

        it('returns "array:<element type>" for a non-empty array', () => {
            expect(util['metadataValueType'](['sg', 'id'])).toBe(
                'array:string'
            );
            expect(util['metadataValueType']([1, 2])).toBe('array:number');
        });

        it('returns the primitive typeof for a non-array value', () => {
            expect(util['metadataValueType']('a')).toBe('string');
            expect(util['metadataValueType'](3)).toBe('number');
            expect(util['metadataValueType'](true)).toBe('boolean');
        });
    });
});
