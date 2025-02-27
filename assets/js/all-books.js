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

    async function loadAllBooks() {
        const headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
        };

        try {
            // Carica tutti i libri con i loro autori
            const booksResponse = await $.ajax({
                url: `${SUPABASE_URL}/rest/v1/book?select=*`,
                method: 'GET',
                headers: headers
            });

            const books = await Promise.all(booksResponse.map(async (book) => {
                // Ottieni gli autori per questo libro
                const authorsResponse = await $.ajax({
                    url: `${SUPABASE_URL}/rest/v1/writtenBy?select=author!inner(name)&id_book=eq.${book.id}`,
                    method: 'GET',
                    headers: headers
                });

                // Verifica se il libro è nella lista dell'utente
                const myBookResponse = await $.ajax({
                    url: `${SUPABASE_URL}/rest/v1/my_book?select=status&id_book=eq.${book.id}&id_user=eq.${userId}`,
                    method: 'GET',
                    headers: headers
                });

                const authors = authorsResponse.map(a => a.author.name).join(', ');
                
                return {
                    id: book.id,
                    title: book.name,
                    authors: authors || 'Autore sconosciuto',
                    inMyList: myBookResponse.length > 0,
                    status: myBookResponse[0]?.status
                };
            }));

            displayBooks(books);
        } catch (error) {
            displayBooks([]);
        }
    }

    function displayBooks(books) {
        const container = $('#books-grid');
        container.empty();

        if (books.length === 0) {
            container.append(`
                <div class="text-center py-8">
                    <h3 class="text-xl font-bold text-gray-800">Nessun libro trovato</h3>
                </div>
            `);
            return;
        }

        const statusLabels = {
            'read': 'Letto',
            'reading': 'In lettura',
            'to-read': 'Da leggere'
        };

        const statusColors = {
            'read': 'bg-green-100 text-green-800',
            'reading': 'bg-blue-100 text-blue-800',
            'to-read': 'bg-yellow-100 text-yellow-800'
        };

        books.forEach(book => {
            const card = `
                <div class="bg-white p-4 rounded-lg shadow mb-4">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <h3 class="text-lg font-bold">${book.title}</h3>
                            <p class="text-gray-600 text-sm">${book.authors}</p>
                        </div>
                        ${book.inMyList ? `
                            <span class="text-sm ${statusColors[book.status]} px-3 py-1 rounded-full">
                                ${statusLabels[book.status]}
                            </span>
                        ` : `
                            <button class="add-to-list-btn px-3 py-1 text-blue-600 border border-blue-600 rounded-full text-sm" data-book-id="${book.id}">
                                Aggiungi
                            </button>
                        `}
                    </div>
                </div>
            `;
            container.append(card);
        });

        // Event listener per il pulsante "Aggiungi"
        $('.add-to-list-btn').on('click', async function() {
            const bookId = $(this).data('book-id');
            try {
                await $.ajax({
                    url: `${SUPABASE_URL}/rest/v1/my_book`,
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    data: JSON.stringify({
                        id_book: bookId,
                        id_user: userId,
                        status: 'to-read'
                    })
                });
                loadAllBooks();
            } catch (error) {
                alert('Errore nell\'aggiunta del libro');
            }
        });
    }

    // Caricamento iniziale
    loadAllBooks();
}); 