const express = require('express');
const cors = require('cors');
const libgen = require('libgen');

const app = express();

// The magic unlocker that allows GitHub Pages to read the data
app.use(cors());

const PORT = process.env.PORT || 3000;

app.get('/api/libgen', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.json([]);
    console.log(`Searching Libgen for: ${query}`);

    try {
        // Automatically hunts down the fastest mirror that isn't blocking bots
        const mirror = await libgen.mirror();
        console.log(`Connected to active mirror: ${mirror}`);

        const options = {
            mirror: mirror,
            query: query,
            count: 15
        };

        // The package handles the mandatory "object" parameters and API formatting for us!
        const data = await libgen.search(options);

        // If Cloudflare still blocks it or no books are found, return empty safely
        if (!data || !data.length) return res.json([]);

        // Format the clean data to perfectly match your GitLib UI cards
        const formattedBooks = data.map(b => ({
            id: `libgen_${b.id}`,
            title: b.title || 'Unknown Title',
            authors: b.author || 'Unknown Author',
            publisher: `${b.publisher || ''} ${b.year ? '('+b.year+')' : ''} [${(b.extension || '').toUpperCase()}]`.trim(),
            coverUrl: b.coverurl ? `${mirror}/covers/${b.coverurl}` : '',
            source: 'Libgen',
            badgeClass: 'badge-libgen',
            actionLabel: 'Download / Mirror',
            actionUrl: b.md5 ? `https://library.lol/main/${b.md5.toLowerCase()}` : '#',
            isDirectDownload: true
        }));

        res.json(formattedBooks);

    } catch (err) {
        console.error('Libgen search failed:', err.message);
        res.json([]);
    }
});

app.listen(PORT, () => console.log(`GitLib Backend running on port ${PORT}`));

