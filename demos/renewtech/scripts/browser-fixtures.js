// Playwright CLI callback. Isolated UI fixtures only, never a live-dataset proof.
async(page) => {
    const source = await (await page.request.get('http://127.0.0.1:5173/demos/renewtech/workspace/catalogue/products.json')).json();
    await page.route('https://fixture.invalid/**', async route => {
        const req = route.request().postDataJSON() || {};
        function result(q) {
            if (q.$type?.includes('ContentSearch')) return { results: [], hits: 0, facets: { items: [] } };
            if (q.$type?.includes('SearchTermPrediction')) return { predictions: [] };
            let rows = source;
            const ids = [];
            function walk(o) {
                if (!o || typeof o !== 'object') return;
                if (o.productIds) ids.push(...o.productIds);
                Object.values(o).forEach(v => {
                    if (typeof v === 'object') Array.isArray(v) ? v.forEach(walk) : walk(v);
                });
            }
            walk(q.filters);
            if (ids.length) rows = rows.filter(p => ids.includes(p.id));
            if (q.term) rows = rows.filter(p => (p.name['en-gb'] + ' ' + p.facets.MPN).toLowerCase().includes(q.term.toLowerCase()));
            for (const condition of ['Factory Sealed', 'Refurbished', 'New Spare']) {
                if (JSON.stringify(q.filters).includes(condition)) rows = rows.filter(p => p.facets.Condition === condition);
            }
            const locale = q.language?.value || 'en-gb', currency = q.currency?.value || 'EUR';
            return {
                results: rows.slice(q.skip || 0, (q.skip || 0) + (q.take ?? 12)).map((p, i) => ({
                    rank: i + 1, productId: p.id, displayName: p.name[locale],
                    brand: { id: p.brandId, displayName: p.brandName },
                    salesPrice: p.salesPrice[currency], listPrice: p.listPrice[currency], categoryPaths: [],
                    data: Object.fromEntries(Object.entries({ ...p.facets, Description: p.description[locale], ImageUrl: p.imageUrl, SoldOut: 'false' }).map(([k, v]) => [k, {
                        type: Array.isArray(v) ? 'StringList' : 'String',
                        value: Array.isArray(v) ? { $values: v } : typeof v === 'object' ? v[locale] : v,
                    }])),
                })), hits: rows.length, facets: { items: [{ field: 'Category', nodes: [] }] },
            };
        }
        const response = req.requests ? { responses: req.requests.map(result) } : result(req);
        await route.fulfill({ json: response });
    });
    await page.evaluate(() => localStorage.setItem('shopContext', JSON.stringify({
        selectedDatasetIndex: 0, selectedLanguage: 'en-gb', selectedCurrencyCode: 'EUR',
        datasets: [{ datasetId: 'fixture', apiKey: 'fixture', serverUrl: 'https://fixture.invalid', allLanguages: ['en-gb', 'da-dk'], allCurrencies: ['EUR', 'DKK'], displayName: 'Local UI fixtures', hideSoldOutProducts: true, trackingEnabled: false }],
    })));
    await page.goto('http://127.0.0.1:5173/?demo=renewtech');
};
