$(document).ready(function() {
    const SUPABASE_URL = window.ENV.SUPABASE_URL;
    const SUPABASE_KEY = window.ENV.SUPABASE_KEY;
    const userId = sessionStorage.getItem('user_id');

    if (!userId) {
        window.location.href = '../index.html';
        return;
    }

    // Mostra username e gestisci logout
    $('#username-display').text(sessionStorage.getItem('username'));
    $('#logout-btn').on('click', function() {
        sessionStorage.removeItem('user_id');
        sessionStorage.removeItem('username');
        window.location.href = '../index.html';
    });

    async function loadAllAuthors() {
        const headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
        };

        try {
            // Carica tutti gli autori
            const authorsResponse = await $.ajax({
                url: `${SUPABASE_URL}/rest/v1/author?select=*`,
                method: 'GET',
                headers: headers
            });

            displayAuthors(authorsResponse);
        } catch (error) {
            displayAuthors([]);
        }
    }

    function displayAuthors(authors) {
        const container = $('#authors-grid');
        container.empty();

        if (authors.length === 0) {
            container.append(`
                <div class="text-center py-8">
                    <h3 class="text-xl font-bold text-gray-800">Nessun autore trovato</h3>
                </div>
            `);
            return;
        }

        authors.forEach(author => {
            const card = `
                <div class="bg-white p-4 rounded-lg shadow mb-4">
                    <h3 class="text-lg font-bold">${author.name}</h3>
                </div>
            `;
            container.append(card);
        });
    }

    // Caricamento iniziale
    loadAllAuthors();
}); 