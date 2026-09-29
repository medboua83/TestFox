import * as assert from 'assert';
import {
    isFreeOpenRouterModel,
    mapOpenRouterModel,
    rankFreeModels,
    OpenRouterAvailableModel
} from '../../ai/openRouterModelUtils';

suite('OpenRouter model utilities', () => {
    test('detects free models by suffix or zero pricing', () => {
        assert.strictEqual(isFreeOpenRouterModel({ id: 'vendor/model:free' }), true);
        assert.strictEqual(isFreeOpenRouterModel({
            id: 'vendor/free-alias',
            pricing: { prompt: '0', completion: '0' }
        }), true);
        assert.strictEqual(isFreeOpenRouterModel({
            id: 'vendor/paid',
            pricing: { prompt: '0.000001', completion: '0.000002' }
        }), false);
    });

    test('maps OpenRouter catalog metadata', () => {
        const mapped = mapOpenRouterModel({
            id: 'vendor/coder:free',
            name: 'Coder Free',
            description: 'Coding model',
            context_length: 131072,
            pricing: { prompt: '0', completion: '0' }
        });

        assert.strictEqual(mapped.id, 'vendor/coder:free');
        assert.strictEqual(mapped.name, 'Coder Free');
        assert.strictEqual(mapped.isFree, true);
        assert.strictEqual(mapped.context_length, 131072);
        assert.strictEqual(mapped.pricing, 'Free');
    });

    test('ranks free coding/testing models before generic models and excludes primary', () => {
        const models: OpenRouterAvailableModel[] = [
            { id: 'vendor/generic:free', name: 'Generic', isFree: true, isWorking: true },
            { id: 'vendor/coder:free', name: 'Coder', description: 'Code and software testing', isFree: true, isWorking: true },
            { id: 'vendor/paid-coder', name: 'Paid Coder', description: 'code', isFree: false, isWorking: true },
            { id: 'vendor/primary:free', name: 'Primary Coder', description: 'coder', isFree: true, isWorking: true }
        ];

        const ranked = rankFreeModels(models, 'vendor/primary:free');

        assert.deepStrictEqual(ranked.map(model => model.id), [
            'vendor/coder:free',
            'vendor/generic:free'
        ]);
    });
});
