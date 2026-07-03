// ================================================================
// CHATBOT - VINTAGE MEN LP
// ================================================================

(function() {
    'use strict';

    const WORKER_URL = 'https://vintage-chatbot-api.churqui19.workers.dev/';

    // Productos hardcodeados (si no se cargan de Firestore, al menos el chatbot tiene contexto)
    const productos = [
        {
            id: 1,
            nombre: 'Camisa Retro Slim',
            precio: 180,
            moneda: 'BS',
            nuevo: true,
            descripcion: 'Camisa de corte slim, cuello inglés, manga larga. Ideal para looks formales o smart casual.',
            colores: ['Blanco', 'Negro', 'Azul marino'],
            tallas: ['S', 'M', 'L', 'XL'],
            material: '100% algodón peruano, suave y transpirable',
            cuidados: 'Lavar en frío, no usar blanqueador, planchar a baja temperatura'
        },
        {
            id: 2,
            nombre: 'Chaqueta Cuero Urban',
            precio: 450,
            moneda: 'BS',
            nuevo: false,
            descripcion: 'Chaqueta de cuero sintético, diseño biker, cierre frontal con cremallera, cuello con solapas.',
            colores: ['Negro', 'Café'],
            tallas: ['M', 'L', 'XL', 'XXL'],
            material: 'Cuero ecológico de alta durabilidad, forro interior de poliéster',
            cuidados: 'Limpiar con paño húmedo, no exponer al sol directo, no usar detergentes fuertes'
        },
        {
            id: 3,
            nombre: 'Jean Clásico Dark',
            precio: 220,
            moneda: 'BS',
            nuevo: false,
            descripcion: 'Jean recto, tiro medio, acabado oscuro (dark wash). Combina con todo.',
            colores: ['Azul índigo', 'Negro'],
            tallas: ['30', '32', '34', '36'],
            material: 'Denim de algodón elástico (98% algodón, 2% elastano)',
            cuidados: 'Lavar del revés, secar a la sombra, no usar secadora'
        },
        {
            id: 4,
            nombre: 'Polera Oversize White',
            precio: 130,
            moneda: 'BS',
            nuevo: false,
            descripcion: 'Polera oversize, cuello redondo, manga corta, corte holgado. Estilo urbano y cómodo.',
            colores: ['Blanco', 'Negro'],
            tallas: ['S', 'M', 'L', 'XL'],
            material: 'Algodón peinado 180g/m², suave y duradero',
            cuidados: 'Lavar en agua fría, no usar secadora, planchar a temperatura media'
        }
    ];

    // Construir contexto
    let CONTEXTO_TIENDA = `
Eres el asistente oficial de la tienda online "Vintage Men LP", especializada en ropa urbana para hombre, con envíos a toda Bolivia desde La Paz.

Información de la tienda:
- WhatsApp de contacto: +591 79635114
- Horario: Lunes a Sábado de 10:00 a 20:00 (hora Bolivia).
- Formas de pago: Transferencia bancaria, QR (BNB, BCP, FASSIL), efectivo contraentrega en La Paz.
- Tiempo de envío: 24-48 horas en La Paz, 3-5 días hábiles a provincias.

Productos disponibles:\n`;

    productos.forEach(p => {
        CONTEXTO_TIENDA += `\n${p.nombre} - ${p.precio} ${p.moneda}`;
        if (p.nuevo) CONTEXTO_TIENDA += ' (NUEVO)';
        CONTEXTO_TIENDA += `\n  Descripción: ${p.descripcion}`;
        CONTEXTO_TIENDA += `\n  Colores disponibles: ${p.colores.join(', ')}`;
        CONTEXTO_TIENDA += `\n  Tallas disponibles: ${p.tallas.join(', ')}`;
        CONTEXTO_TIENDA += `\n  Material: ${p.material}`;
        CONTEXTO_TIENDA += `\n  Cuidados: ${p.cuidados}\n`;
    });

    CONTEXTO_TIENDA += `\nPolíticas de devolución: Se aceptan cambios dentro de los 7 días posteriores a la compra, siempre que el producto esté con etiquetas y en perfecto estado.
Responde siempre en español, de forma cordial y profesional. Si te preguntan sobre temas ajenos a la tienda, redirige amablemente a los productos. Sé específico y útil.`;

    // Estado del chat
    let historial = [];

    const stored = localStorage.getItem('chatHistorial');
    if (stored) {
        try {
            historial = JSON.parse(stored);
        } catch (e) {
            historial = [];
        }
    }

    if (historial.length === 0) {
        historial.push({
            role: 'model',
            text: '¡Hola! Bienvenido a Vintage Men LP. ¿En qué puedo ayudarte hoy?'
        });
        localStorage.setItem('chatHistorial', JSON.stringify(historial));
    }

    // Referencias DOM (con verificación de existencia)
    const chatBody = document.getElementById('chat-body');
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const chatToggleBtn = document.getElementById('chat-toggle-btn');
    const chatCloseBtn = document.getElementById('chat-close-btn');
    const chatWindow = document.getElementById('chat-window');

    if (!chatBody || !chatInput || !chatSendBtn || !chatToggleBtn || !chatCloseBtn || !chatWindow) {
        console.error('❌ Chatbot: No se encontraron algunos elementos del DOM');
        return;
    }

    // Funciones
    function renderizarMensajes() {
        chatBody.innerHTML = '';
        historial.forEach(msg => {
            const esUsuario = msg.role === 'user';
            const clase = esUsuario ? 'chat-badge-user' : 'chat-badge-bot';
            const alineacion = esUsuario ? 'text-end' : 'text-start';
            const html = `
                <div class="mb-2 ${alineacion}">
                    <span class="badge ${clase} p-2 text-wrap text-start" style="max-width: 85%; font-weight: normal; font-size: 13px; line-height: 1.4;">
                        ${msg.text}
                    </span>
                </div>
            `;
            chatBody.innerHTML += html;
        });
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    function guardarHistorial() {
        localStorage.setItem('chatHistorial', JSON.stringify(historial));
    }

    function agregarMensaje(role, text) {
        historial.push({ role, text });
        renderizarMensajes();
        guardarHistorial();
    }

    function mostrarIndicador() {
        const indicador = document.createElement('div');
        indicador.id = 'typing-indicator';
        indicador.className = 'mb-2 text-start';
        indicador.innerHTML = `<span class="badge chat-badge-bot p-2">⏳ Escribiendo...</span>`;
        chatBody.appendChild(indicador);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    function ocultarIndicador() {
        const indicador = document.getElementById('typing-indicator');
        if (indicador) indicador.remove();
    }

    async function enviarMensajeWeb(mensaje = null) {
        const texto = mensaje || chatInput.value.trim();
        if (!texto) return;

        if (!mensaje) chatInput.value = '';

        agregarMensaje('user', texto);
        mostrarIndicador();

        try {
            const response = await fetch(WORKER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mensaje: texto })
            });

            ocultarIndicador();

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Error Worker:', errorData);
                const msgError = errorData.error || 'Hubo un problema al procesar tu mensaje.';
                agregarMensaje('model', '⛔ ' + msgError);
                return;
            }

            const data = await response.json();
            const respuesta = data.respuesta || 'No pude entender tu consulta.';
            agregarMensaje('model', respuesta);

        } catch (error) {
            console.error('Error en enviarMensajeWeb:', error);
            ocultarIndicador();
            agregarMensaje('model', '⛔ Error de conexión con el servidor.');
        }
    }

    function enviarMensajePredefinido(mensaje) {
        enviarMensajeWeb(mensaje);
    }

    function toggleChat() {
        chatWindow.classList.toggle('d-none');
        if (!chatWindow.classList.contains('d-none')) {
            chatInput.focus();
            renderizarMensajes();
        }
    }

    // Eventos
    document.addEventListener('DOMContentLoaded', function() {
        renderizarMensajes();

        chatToggleBtn.addEventListener('click', toggleChat);
        chatCloseBtn.addEventListener('click', toggleChat);

        chatSendBtn.addEventListener('click', function() {
            enviarMensajeWeb();
        });

        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                enviarMensajeWeb();
            }
        });

        document.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const mensaje = this.getAttribute('data-mensaje');
                enviarMensajePredefinido(mensaje);
            });
        });
    });

    // Exponer funciones globales
    window.enviarMensajeWeb = enviarMensajeWeb;
    window.toggleChat = toggleChat;
    window.enviarMensajePredefinido = enviarMensajePredefinido;

    console.log('✅ Chatbot cargado correctamente.');
})();