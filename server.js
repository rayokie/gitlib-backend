const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/libgen', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.json([]);
        console.log(`Searching Libgen for: ${query}`);

        const searchUrl = `https://libgen.is/search.php?req=${encodeURIComponent(query)}&res=25&view=simple&column=def`;
        const { data: searchHtml } = await axios.get(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' },
            timeout: 10000
        });

        const $ = cheerio.load(searchHtml);
        const ids = [];
        $('table.c tr').each((i, el) => {
            if (i === 0) return; 
            const id = $(el).find('td').eq(0).text().trim();
            if (id && !isNaN(id)) ids.push(id);
        });

        if (ids.length === 0) return res.json([]);

        const idString = ids.slice(0, 25).join(',');
        const jsonUrl = `https://libgen.is/json.php?ids=${idString}&fields=id,title,author,year,publisher,extension,md5,coverurl`;
        const { data: books } = await axios.get(jsonUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' }
        });

        const formattedBooks = books.map(b => ({
            id: `libgen_${b.id}`,
            title: b.title || 'Unknown Title',
            authors: b.author || 'Unknown Author',
            publisher: `${b.publisher || ''} ${b.year ? '('+b.year+')' : ''} [${(b.extension || '').toUpperCase()}]`.trim(),
            coverUrl: b.coverurl ? `https://libgen.is/covers/${b.coverurl}` : '',
            source: 'Libgen',
            badgeClass: 'badge-libgen',
            actionLabel: 'Download / Mirror',
            actionUrl: b.md5 ? `http://library.lol/main/${b.md5.toLowerCase()}` : '#',
            isDirectDownload: true
        }));
        res.json(formattedBooks);
    } catch (err) {
        console.error('Backend Error:', err.message);
        res.json([]); 
    }
});

app.listen(PORT, () => {
    console.log(`GitLib is live! Open http://localhost:${PORT} in your browser.`);
});
