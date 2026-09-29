export interface OpenRouterCatalogModel {
    id: string;
    name?: string;
    description?: string;
    pricing?: {
        prompt?: string;
        completion?: string;
        request?: string;
    };
    context_length?: number;
}

export interface OpenRouterAvailableModel {
    id: string;
    name: string;
    description?: string;
    isFree: boolean;
    isWorking: boolean;
    context_length?: number;
    pricing?: string;
}

function isZeroPrice(value: string | undefined): boolean {
    if (value === undefined) {
        return true;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed === 0;
}

/**
 * OpenRouter marks some free variants with :free. Pricing metadata is also
 * checked because catalog aliases can be free without using that suffix.
 */
export function isFreeOpenRouterModel(model: OpenRouterCatalogModel): boolean {
    if (model.id.endsWith(':free')) {
        return true;
    }

    if (!model.pricing) {
        return false;
    }

    return isZeroPrice(model.pricing.prompt)
        && isZeroPrice(model.pricing.completion)
        && isZeroPrice(model.pricing.request);
}

export function mapOpenRouterModel(model: OpenRouterCatalogModel): OpenRouterAvailableModel {
    const isFree = isFreeOpenRouterModel(model);
    const promptPrice = model.pricing?.prompt;
    const completionPrice = model.pricing?.completion;

    return {
        id: model.id,
        name: model.name || model.id.split('/').pop()?.replace(':free', '') || model.id,
        description: model.description,
        isFree,
        isWorking: true,
        context_length: model.context_length,
        pricing: isFree
            ? 'Free'
            : (promptPrice !== undefined || completionPrice !== undefined)
                ? `prompt: ${promptPrice ?? 'n/a'}, completion: ${completionPrice ?? 'n/a'}`
                : undefined
    };
}

function codeTestingScore(model: OpenRouterAvailableModel): number {
    const searchable = `${model.id} ${model.name} ${model.description || ''}`.toLowerCase();
    let score = 0;

    const weightedHints: Array<[string, number]> = [
        ['coder', 8],
        ['coding', 7],
        ['code', 6],
        ['programming', 5],
        ['software', 4],
        ['developer', 4],
        ['testing', 4],
        ['test', 3],
        ['reasoning', 2],
        ['instruct', 1]
    ];

    for (const [hint, weight] of weightedHints) {
        if (searchable.includes(hint)) {
            score += weight;
        }
    }

    if (model.context_length) {
        score += Math.min(4, Math.log2(Math.max(1, model.context_length / 32768)));
    }

    return score;
}

/**
 * Rank only free models for automatic fallback. Stable deterministic ordering
 * keeps behavior predictable when model metadata has equal relevance.
 */
export function rankFreeModels(
    models: OpenRouterAvailableModel[],
    excludedModelId?: string
): OpenRouterAvailableModel[] {
    return models
        .filter(model => model.isFree && model.id !== excludedModelId)
        .map((model, index) => ({ model, index, score: codeTestingScore(model) }))
        .sort((a, b) => b.score - a.score || a.index - b.index || a.model.id.localeCompare(b.model.id))
        .map(entry => entry.model);
}
