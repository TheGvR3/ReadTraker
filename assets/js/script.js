$(document).ready(function() {
    // Verifica configurazione e autenticazione
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

    // Funzione per caricare i libri
    async function loadBooks() {
        const headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
        };

        try {
            const myBooksResponse = await $.ajax({
                url: `${SUPABASE_URL}/rest/v1/my_book?select=*&id_user=eq.${userId}`,
                method: 'GET',
                headers: headers
            });

            const bookPromises = myBooksResponse.map(myBook => 
                $.ajax({
                    url: `${SUPABASE_URL}/rest/v1/book?select=*&id=eq.${myBook.id_book}`,
                    method: 'GET',
                    headers: headers
                }).catch(error => {
                    console.error('Error fetching book data:', error);
                    return [];
                })
            );

            const booksResponses = await Promise.all(bookPromises);

            const books = await Promise.all(myBooksResponse.map(async (myBook, index) => {
                const bookData = booksResponses[index][0];
                
                const authorsResponse = await $.ajax({
                    url: `${SUPABASE_URL}/rest/v1/writtenBy?select=author!inner(name)&id_book=eq.${myBook.id_book}`,
            method: 'GET',
                    headers: headers
                }).catch(error => {
                    console.error('Error fetching authors:', error);
                    return [];
                });

                const authors = authorsResponse.map(a => a.author.name).join(', ');
                
                return {
                    id: myBook.id,
                    title: bookData?.name || 'Title not available',
                    authors: authors || 'Unknown author',
                    status: myBook.status,
                    last_update: myBook.created_at
                };
            }));

            displayBooks(books);
        } catch (error) {
            console.error('Error loading books:', error);
            displayBooks([]);
        }
    }

    // Funzione per visualizzare i libri
    function displayBooks(books) {
        const container = $('#books-grid');
        container.empty();

        // Aggiungi il pulsante "Aggiungi libro" come floating action button
        const addButton = `
            <button id="add-book-btn" class="fixed bottom-4 right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-blue-700">
                <span>+</span>
            </button>
        `;
        $('body').append(addButton);

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
            let card = `
                <div class="bg-white p-4 rounded-lg shadow mb-4">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <h3 class="text-lg font-bold">${book.title}</h3>
                            <p class="text-gray-600 text-sm">${book.authors}</p>
            `;
        
            // Aggiungi la data solo se il libro non è "to-read"
            if (book.status !== 'to-read') {
                card += `<p class="text-gray-500 text-xs">Lettura: ${new Date(book.last_update).toLocaleDateString('it-IT', { year: 'numeric', month: 'numeric' })}</p>`;
            }
        
            card += `
                        </div>
                        <button class="book-options-btn px-2 py-1 text-gray-600" data-book-id="${book.id}">
                            ⋮
                        </button>
                    </div>
                    <span class="inline-block text-sm ${statusColors[book.status] || 'bg-gray-100 text-gray-800'} px-3 py-1 rounded-full">
                        ${statusLabels[book.status] || 'Non in lista'}
                    </span>
                </div>
            `;
        
            container.append(card);
        });

        // Event listener per il pulsante opzioni
        $('.book-options-btn').on('click', function(e) {
            const bookId = $(this).data('book-id');
            showBookOptionsModal(bookId);
        });
    }

    // Funzione per mostrare il modal di aggiornamento stato
    function showUpdateStatusModal(bookId) {
        const modal = `
            <div id="update-status-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-end z-50">
                <div class="bg-white rounded-t-lg p-6 w-full animate-slide-up">
                    <h2 class="text-xl font-bold mb-4">Aggiorna stato</h2>
                    <select id="new-status" class="w-full p-3 text-lg border rounded-lg mb-4">
                        <option value="to-read">Da leggere</option>
                        <option value="reading">In lettura</option>
                        <option value="read">Letto</option>
                    </select>
                    <div class="flex flex-col space-y-3">
                        <button id="confirm-update" class="w-full py-3 bg-blue-600 text-white rounded-lg text-lg">Aggiorna</button>
                        <button id="cancel-update" class="w-full py-3 border rounded-lg text-lg">Annulla</button>
                    </div>
                </div>
            </div>
        `;

        $('body').append(modal);

        $('#cancel-update').on('click', function() {
            $('#update-status-modal').remove();
        });

        $('#confirm-update').on('click', async function() {
            const newStatus = $('#new-status').val();
            try {
                await $.ajax({
                    url: `${SUPABASE_URL}/rest/v1/my_book?id=eq.${bookId}`,
                    method: 'PATCH',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    data: JSON.stringify({ status: newStatus })
                });

                $('#update-status-modal').remove();
                loadBooks();
            } catch (error) {
                console.error('Errore nell\'aggiornamento dello stato:', error);
                alert('Errore nell\'aggiornamento dello stato');
            }
        });
    }

    // Nuova funzione per mostrare il modal delle opzioni
    function showBookOptionsModal(bookId) {
        const modal = `
            <div id="book-options-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-end z-50">
                <div class="bg-white rounded-t-lg w-full animate-slide-up">
                    <div class="p-4 flex flex-col">
                        <button id="update-status-btn" class="w-full py-4 text-left text-lg border-b">
                            Cambia stato
                        </button>
                        <button id="remove-book-btn" class="w-full py-4 text-left text-lg text-red-600">
                            Rimuovi dai miei libri
                        </button>
                        <button id="cancel-options" class="w-full py-4 text-left text-lg font-medium">
                            Annulla
                        </button>
                    </div>
                </div>
            </div>
        `;

        $('body').append(modal);

        // Event listeners per le opzioni
        $('#update-status-btn').on('click', function() {
            $('#book-options-modal').remove();
            showUpdateStatusModal(bookId);
        });

        $('#remove-book-btn').on('click', async function() {
            if (confirm('Sei sicuro di voler rimuovere questo libro dalla tua lista?')) {
                try {
                    await $.ajax({
                        url: `${SUPABASE_URL}/rest/v1/my_book?id=eq.${bookId}`,
                        method: 'DELETE',
                        headers: {
                            'apikey': SUPABASE_KEY,
                            'Authorization': `Bearer ${SUPABASE_KEY}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    $('#book-options-modal').remove();
                    loadBooks();
                } catch (error) {
                    alert('Errore nella rimozione del libro');
                }
            }
        });

        $('#cancel-options').on('click', function() {
            $('#book-options-modal').remove();
        });

        // Chiudi il modal cliccando fuori
        $('#book-options-modal').on('click', function(e) {
            if (e.target === this) {
                $(this).remove();
            }
        });
    }

    // Event listener per il pulsante di aggiunta libro
    $(document).on('click', '#add-book-btn', function() {
        showAddBookModal();
    });

    // Funzione per mostrare il modal di aggiunta libro
    async function showAddBookModal() {
        const modal = `
            <div id="add-book-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-end z-50">
                <div class="bg-white rounded-t-lg p-6 w-full animate-slide-up">
                    <h2 class="text-xl font-bold mb-4">Add New Book</h2>
                    <div id="add-book-error" class="hidden mb-4 p-3 text-red-700 bg-red-100 rounded-lg"></div>
                    <form id="add-book-form" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input type="text" id="book-title" required class="w-full p-3 text-lg border rounded-lg">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Author</label>
                            <input type="text" id="book-author" required class="w-full p-3 text-lg border rounded-lg">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select id="book-status" required class="w-full p-3 text-lg border rounded-lg">
                                <option value="to-read">To Read</option>
                                <option value="reading">Reading</option>
                                <option value="read">Read</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Reading Date</label>
                            <input type="month" id="reading-date" class="w-full p-3 text-lg border rounded-lg">
                        </div>
                        <div class="flex flex-col space-y-3 pt-4">
                            <button type="submit" class="w-full py-3 bg-blue-600 text-white rounded-lg text-lg">Add</button>
                            <button type="button" id="cancel-add" class="w-full py-3 border rounded-lg text-lg">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    
        $('body').append(modal);
    
        $('#cancel-add').on('click', function() {
            $('#add-book-modal').remove();
        });
    
        $('#add-book-form').on('submit', async function(e) {
            e.preventDefault();
            
            $('#add-book-error').addClass('hidden').text('');
    
            try {
                const title = $('#book-title').val();
                const author = $('#book-author').val();
                const status = $('#book-status').val();
                const readingDate = $('#reading-date').val();
    
                // Set default day to 1 if no date is provided
                const createdAt = readingDate ? new Date(readingDate + '-01').toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

                // Check if the book already exists
                const bookSearchResponse = await $.ajax({
                    url: `${SUPABASE_URL}/rest/v1/book?name=eq.${encodeURIComponent(title)}`,
                    method: 'GET',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Content-Type': 'application/json'
                    }
                });
    
                if (bookSearchResponse.length > 0) {
                    throw new Error('A book with this title already exists');
                }
    
                // Insert the book without created_at
                const bookResponse = await $.ajax({
                    url: `${SUPABASE_URL}/rest/v1/book`,
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    data: JSON.stringify({ name: title }) // No created_at here
                });
    
                const bookId = bookResponse[0].id;
    
                // Check if the author exists
                const authorSearchResponse = await $.ajax({
                    url: `${SUPABASE_URL}/rest/v1/author?name=eq.${encodeURIComponent(author)}`,
                    method: 'GET',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Content-Type': 'application/json'
                    }
                });
    
                let authorId;
                
                if (authorSearchResponse.length > 0) {
                    authorId = authorSearchResponse[0].id;
                } else {
                    const authorResponse = await $.ajax({
                        url: `${SUPABASE_URL}/rest/v1/author`,
                        method: 'POST',
                        headers: {
                            'apikey': SUPABASE_KEY,
                            'Authorization': `Bearer ${SUPABASE_KEY}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        data: JSON.stringify({ name: author })
                    });
                    authorId = authorResponse[0].id;
                }
    
                // Link author and book
                await $.ajax({
                    url: `${SUPABASE_URL}/rest/v1/writtenBy`,
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    data: JSON.stringify({
                        id_book: bookId,
                        id_author: authorId
                    })
                });
    
                // Add to personal list with created_at as reading start date
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
                        status: status,
                        created_at: createdAt // Use created_at as reading start date
                    })
                });
    
                $('#add-book-modal').remove();
                loadBooks();
            } catch (error) {
                console.error('Error adding book:', error);
                if (error.responseJSON) {
                    console.error('Error details:', error.responseJSON);
                } else {
                    console.error('Error message:', error.message);
                }
                $('#add-book-error')
                    .removeClass('hidden')
                    .text(error.message);
            }
        });
    }

    // Gestione filtri
    $('#status-filter').on('change', function() {
        loadBooks();
    });

    // Caricamento iniziale
    loadBooks();
}); 