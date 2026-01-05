// CONFIGURACIÓN DE SUPABASE
// REEMPLAZA ESTOS VALORES CON LOS DE TU PROYECTO DE SUPABASE
const SUPABASE_URL = 'https://dtggsvgpmktfidjyoszu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_K3HMoWMqAl0Y9Q6BFals2Q_b9AesPfp';

let supabase;
let dbTerms = [];

// Inicializar Supabase si las credenciales son válidas
try {
    if (SUPABASE_URL !== 'https://tu-proyecto.supabase.co' && window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
} catch (error) {
    console.error("Error inicializando Supabase:", error);
}

// Datos locales de respaldo (Fallback)
const localDictionary = [
    {
        term: "API",
        translation: "Interfaz de Programación de Aplicaciones",
        definition: "Conjunto de reglas que permite que diferentes aplicaciones se comuniquen entre sí.",
        context: "Cuando tu frontend pide datos a tu servidor, probablemente lo hace a través de una API REST."
    },
    {
        term: "Backend",
        translation: "Desarrollo del lado del servidor",
        definition: "La parte de una aplicación web que no es visible para el usuario final. Gestiona la lógica, bases de datos y seguridad.",
        context: "Node.js, Python (Django/Flask) y PHP son tecnologías comunes de Backend."
    },
    {
        term: "Frontend",
        translation: "Desarrollo del lado del cliente",
        definition: "La parte de la web con la que el usuario interactúa directamente. Se encarga de la estructura, diseño y dinamismo visual.",
        context: "HTML, CSS, JavaScript y frameworks como React o Vue viven aquí."
    },
    {
        term: "DOM",
        translation: "Modelo de Objetos del Documento",
        definition: "Representación estructurada de un documento HTML que permite a un lenguaje de programación (como JS) manipular el contenido y estilo.",
        context: "JavaScript usa 'document.getElementById' para encontrar elementos en el DOM."
    },
    {
        term: "Framework",
        translation: "Marco de trabajo",
        definition: "Estructura base que sirve como punto de partida para desarrollar software, ofreciendo herramientas y buenas prácticas predefinidas.",
        context: "React, Angular y Vue son frameworks (o librerías con ecosistema) de JS; Bootstrap es un framework de CSS."
    },
    {
        term: "Deploy",
        translation: "Despliegue",
        definition: "El proceso de poner una aplicación web o sitio disponible en un servidor para que sea accesible públicamente en internet.",
        context: "Acabo de hacer deploy de mi app en Vercel."
    },
    // ... más términos se cargarán de la BD si está disponible
];

async function loadTerms() {
    if (supabase) {
        const { data, error } = await supabase.from('vocabulary').select('*');
        if (!error && data && data.length > 0) {
            console.log("Cargando términos desde Supabase");
            return data;
        } else {
            console.warn("No se pudieron cargar términos de Supabase (o tabla vacía), usando local:", error);
        }
    }
    return localDictionary;
}

document.addEventListener('DOMContentLoaded', async () => {
    // Cargar datos
    const termDictionary = await loadTerms();

    const searchInput = document.getElementById('term-input');
    const suggestionsBox = document.getElementById('suggestions');
    const resultCard = document.getElementById('result-card');
    const placeholderState = document.getElementById('placeholder-state');

    // Auth Elements
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userInfo = document.getElementById('user-info');
    const userEmailSpan = document.getElementById('user-email');

    // Setup Auth UI
    if (supabase) {
        // Chequear sesión actual
        const { data: { session } } = await supabase.auth.getSession();
        updateAuthUI(session);

        // Listen for auth changes
        supabase.auth.onAuthStateChange((_event, session) => {
            updateAuthUI(session);
        });

        loginBtn.addEventListener('click', async () => {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
            });
            if (error) console.error("Login error:", error.message);
        });

        logoutBtn.addEventListener('click', async () => {
            const { error } = await supabase.auth.signOut();
            if (error) console.error("Logout error:", error.message);
        });
    } else {
        // Si no hay supabase configurado, ocultar login o mostrar aviso
        loginBtn.textContent = "Modo Offline (Sin Supabase)";
        loginBtn.disabled = true;
        loginBtn.style.opacity = "0.5";
    }

    function updateAuthUI(session) {
        if (session) {
            loginBtn.classList.add('hidden');
            userInfo.classList.remove('hidden');
            userEmailSpan.textContent = session.user.email;
        } else {
            loginBtn.classList.remove('hidden');
            userInfo.classList.add('hidden');
            userEmailSpan.textContent = '';
        }
    }


    // Populate Vocabulary Grid
    const vocabGrid = document.getElementById('vocab-grid');
    if (vocabGrid) {
        termDictionary.forEach(item => {
            const card = document.createElement('div');
            card.className = 'vocab-card';
            card.innerHTML = `
                <h4>${item.term}</h4>
                <p class="short-def">${item.translation}</p>
            `;
            card.addEventListener('click', () => {
                displayTerm(item);
                // Smooth scroll to translator
                document.getElementById('translator').scrollIntoView({ behavior: 'smooth' });
            });
            vocabGrid.appendChild(card);
        });
    }

    // Search Functionality
    searchInput.addEventListener('input', (e) => {
        const value = e.target.value.toLowerCase();
        suggestionsBox.innerHTML = '';

        if (value.length > 0) {
            const filteredTerms = termDictionary.filter(item =>
                item.term.toLowerCase().includes(value)
            );

            if (filteredTerms.length > 0) {
                suggestionsBox.style.display = 'block';
                filteredTerms.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'suggestion-item';
                    div.textContent = item.term;
                    div.addEventListener('click', () => {
                        displayTerm(item);
                        searchInput.value = item.term;
                        suggestionsBox.style.display = 'none';
                    });
                    suggestionsBox.appendChild(div);
                });
            } else {
                suggestionsBox.style.display = 'none';
            }
        } else {
            suggestionsBox.style.display = 'none';
            resetDisplay();
        }
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
            suggestionsBox.style.display = 'none';
        }
    });

    function displayTerm(item) {
        // Hide placeholder, show result
        placeholderState.classList.add('hidden');
        resultCard.classList.remove('hidden');

        // Animate content change
        resultCard.style.opacity = '0';
        setTimeout(() => {
            termDisplay.textContent = item.term;
            translationDisplay.textContent = item.translation;
            definitionDisplay.textContent = item.definition;
            contextDisplay.textContent = item.context;
            resultCard.style.opacity = '1';
        }, 200);
    }

    function resetDisplay() {
        placeholderState.classList.remove('hidden');
        resultCard.classList.add('hidden');
    }

    // Contact Form Handling
    if (messages) {
        messages.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = messages.querySelector('button');
            const originalText = btn.textContent;

            btn.textContent = 'Enviando...';
            btn.style.opacity = '0.7';

            setTimeout(() => {
                alert(`¡Gracias! Hemos recibido tu mensaje.\n(Esto es una demostración, no se ha enviado ningún email real)`);
                messages.reset();
                btn.textContent = originalText;
                btn.style.opacity = '1';
            }, 1000);
        });
    }
});
