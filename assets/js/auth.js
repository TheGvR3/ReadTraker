$(document).ready(function() {
    // Aspetta un momento per assicurarsi che config.js sia caricato
    setTimeout(() => {
        if (!window.configLoaded || !window.ENV) {
            console.error('Error: config.js not loaded correctly', {
                configLoaded: window.configLoaded,
                hasEnv: !!window.ENV
            });
            return;
        }

        const SUPABASE_URL = window.ENV.SUPABASE_URL;
        const SUPABASE_KEY = window.ENV.SUPABASE_KEY;

        console.log('Config loaded successfully', {
            hasUrl: !!SUPABASE_URL,
            hasKey: !!SUPABASE_KEY
        });
    // Verifica se l'utente è già loggato
    if (sessionStorage.getItem('user_id')) {
        window.location.href = 'pages/home.html';
        return;
    }

    // Gestisci il click del pulsante login
    $('#login-button').on('click', function() {
        const username = $('#username').val();
        const password = $('#password').val();

        // Verifica che i campi siano compilati
        if (!username || !password) {
            $('#error-message')
                .text('Inserisci username e password')
                .removeClass('hidden');
            return;
        }

        $.ajax({
            url: `${SUPABASE_URL}/rest/v1/rpc/verify_login`,
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                input_username: username,
                input_password: password
            }),
            success: function(response) {
                if (response && response.authenticated) {
                    // Salva i dati dell'utente e reindirizza
                    sessionStorage.setItem('user_id', response.user_id);
                    sessionStorage.setItem('username', response.username);
                    window.location.href = 'pages/home.html';
                } else {
                    // Mostra errore
                    $('#error-message')
                        .text('Username o password non validi')
                        .removeClass('hidden');
                }
            },
            error: function(xhr, status, error) {
                console.error('Error in request:', error);
                $('#error-message')
                    .text('Errore durante il login')
                    .removeClass('hidden');
            }
        });
    });

    // Gestisci anche il tasto Enter nel form
    $('#login-form input').on('keypress', function(e) {
        if (e.which === 13) {
            e.preventDefault();
            $('#login-button').click();
        }
    });
}, 100);
});