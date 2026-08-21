const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

// THIS IS THE MAGIC LINE I FORGOT! It allows GitHub Pages to talk to Render.
app.use(cors()); 

const PORT = process.env.PORT || 3000;
const MIRRORS = ['https://libgen.is', 'https://libgen.rs', 'https://libgen.st'];

app.get('/api/libgen', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.json([]);
    console.log(`Searching for: ${query}`);

    // The backend will try each mirror until one works
    for (let mirror of MIRRORS) {
        try {
            console.log(`Trying mirror: ${mirror}`);
            const searchUrl = `${mirror}/search.php?req=${encodeURIComponent(query)}&res=25&view=simple&column=def`;
            
            const { data: html } = await axios.get(searchUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' },
                timeout: 8000
            });

            const $ = cheerio.load(html);
            const ids = [];
            $('table.c tr').each((i, el) => {
                if (i === 0) return;
                const id = $(el).find('td').eq(0).text().trim();
                if (id && !isNaN(id)) ids.push(id);
            });

            if (ids.length === 0) continue; // If blocked, try the next mirror

            const idString = ids.slice(0, 25).join(',');
            const jsonUrl = `${mirror}/json.php?ids=${idString}&fields=id,title,author,year,publisher,extension,md5,coverurl`;
            
            const { data: books } = await axios.get(jsonUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' },
                timeout: 8000
            });

            const formattedBooks = books.map(b => ({
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

            return res.json(formattedBooks); // Success! Send to frontend and stop searching.

        } catch (e) {
            console.warn(`Mirror ${mirror} failed. Moving to next...`);
        }
    }
    
    // If all mirrors fail, return empty
    res.json([]);
});

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));

