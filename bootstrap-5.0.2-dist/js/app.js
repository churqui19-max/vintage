// ================================================================
// CONFIGURACIÓN DE FIREBASE
// ================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔥 CONFIGURACIÓN REAL DE TU PROYECTO
const firebaseConfig = {
    apiKey: "AIzaSyBvAtLrh_VQ9AwrKaW5Kz4KVHvKGkYEqwI",
    authDomain: "ropa-hombre-de9d6.firebaseapp.com",
    projectId: "ropa-hombre-de9d6",
    storageBucket: "ropa-hombre-de9d6.firebasestorage.app",
    messagingSenderId: "410923042288",
    appId: "1:410923042288:android:db3cc91e25d6ccda278935"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("✅ Firebase inicializado correctamente");

// ================================================================
// CONFIGURACIÓN
// ================================================================
const PRODUCTOS_POR_PAGINA = 12;
const IMAGEN_POR_DEFECTO = 'bootstrap-5.0.2-dist/media/sin-imagen.png';

// ================================================================
// REFERENCIA A LA COLECCIÓN "inventario"
// ================================================================
const productosRef = collection(db, "inventario");
// Ordenar por fechaCreación descendente (más reciente primero)
const q = query(productosRef, orderBy("fechaCreacion", "desc"));

// ================================================================
// ESTADO GLOBAL
// ================================================================
let todosLosProductos = [];
let paginaActual = 1;
let totalPaginas = 1;
let categoriaFiltro = 'todos';

// ================================================================
// FUNCIÓN PARA ABRIR MODAL CON DETALLES DEL PRODUCTO
// ================================================================
function abrirModal(producto) {
    const modalHTML = `
        <div class="modal fade" id="modalProducto" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content bg-dark text-white" style="border-radius: 0;">
                    <div class="modal-header border-secondary">
                        <h5 class="modal-title text-uppercase fw-bold" style="color: #20c997;">${producto.nombre || 'Producto'}</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <div id="carouselProducto" class="carousel slide" data-bs-ride="carousel">
                                    <div class="carousel-inner">
                                        ${producto.imagenes && producto.imagenes.length > 0 ? 
                                            producto.imagenes.map((img, index) => {
                                                let imgSrc = img.startsWith('http') ? img : `bootstrap-5.0.2-dist/media/${img}`;
                                                return `
                                                    <div class="carousel-item ${index === 0 ? 'active' : ''}">
                                                        <img src="${imgSrc}" class="d-block w-100" alt="${producto.nombre}" 
                                                             style="height: 400px; object-fit: cover;"
                                                             onerror="this.src='${IMAGEN_POR_DEFECTO}'">
                                                    </div>
                                                `;
                                            }).join('')
                                            : `
                                                <div class="carousel-item active">
                                                    <img src="${IMAGEN_POR_DEFECTO}" class="d-block w-100" alt="Sin imagen"
                                                         style="height: 400px; object-fit: cover;">
                                                </div>
                                            `
                                        }
                                    </div>
                                    ${producto.imagenes && producto.imagenes.length > 1 ? `
                                        <button class="carousel-control-prev" type="button" data-bs-target="#carouselProducto" data-bs-slide="prev">
                                            <span class="carousel-control-prev-icon"></span>
                                        </button>
                                        <button class="carousel-control-next" type="button" data-bs-target="#carouselProducto" data-bs-slide="next">
                                            <span class="carousel-control-next-icon"></span>
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="col-md-6">
                                <h3 class="mb-3" style="color: #20c997;">${producto.nombre || 'Producto sin nombre'}</h3>
                                <p class="price-tag display-6 mb-3">${producto.precio || 0} BS</p>
                                ${producto.categoria ? `<p><strong>Categoría:</strong> ${producto.categoria}</p>` : ''}
                                ${producto.colores ? `<p><strong>Colores:</strong> ${producto.colores}</p>` : ''}
                                ${(() => {
                                    let tallasTexto = '';
                                    if (producto.tallasDisponibles && typeof producto.tallasDisponibles === 'object') {
                                        const tallasActivas = Object.keys(producto.tallasDisponibles)
                                            .filter(talla => producto.tallasDisponibles[talla] === true)
                                            .join(', ');
                                        if (tallasActivas) tallasTexto = `Tallas: ${tallasActivas}`;
                                    } else if (producto.tallas && typeof producto.tallas === 'string') {
                                        tallasTexto = `Tallas: ${producto.tallas}`;
                                    }
                                    return tallasTexto ? `<p><strong>${tallasTexto}</strong></p>` : '';
                                })()}
                                ${producto.descripcion ? `<p class="mt-3"><strong>Descripción:</strong><br>${producto.descripcion}</p>` : ''}
                                <div class="mt-4">
                                    <a href="https://wa.me/59179635114?text=Hola! Me interesa ${producto.nombre}" 
                                       class="btn btn-ws w-100" target="_blank">
                                        <i class="bi bi-whatsapp pe-2"></i>Consultar por WhatsApp
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer border-secondary">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const modalExistente = document.getElementById('modalProducto');
    if (modalExistente) modalExistente.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modalElement = document.getElementById('modalProducto');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
    
    modalElement.addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

// ================================================================
// FUNCIÓN PARA RENDERIZAR PRODUCTOS
// ================================================================
function renderizarProductos(productos) {
    const contenedor = document.getElementById('contenedor-productos');
    if (!contenedor) {
        console.error("❌ No se encontró el contenedor #contenedor-productos");
        return;
    }

    if (productos.length === 0) {
        contenedor.innerHTML = `
            <div class="col-12 text-center">
                <p class="text-muted">No hay productos disponibles en el catálogo.</p>
            </div>
        `;
        return;
    }

    let html = '';
    productos.forEach(producto => {
        const nombre = producto.nombre || 'Producto sin nombre';
        const categoria = producto.categoria || 'general';
        
        let imgSrc = IMAGEN_POR_DEFECTO;
        if (producto.imagenes && producto.imagenes.length > 0) {
            const nombreImagen = producto.imagenes[0];
            if (nombreImagen.startsWith('http')) {
                imgSrc = nombreImagen;
            } else {
                imgSrc = `bootstrap-5.0.2-dist/media/${nombreImagen}`;
            }
        }

        html += `
            <div class="col-6 col-md-4 col-lg-3 producto-item" data-categoria="${categoria.toLowerCase()}" data-id="${producto.id}">
                <div class="card card-product" style="cursor: pointer;" onclick="abrirModal(${JSON.stringify(producto).replace(/"/g, '&quot;')})">
                    <div class="img-container">
                        <img src="${imgSrc}" class="product-img" alt="${nombre}" loading="lazy" 
                             onerror="this.onerror=null; this.src='${IMAGEN_POR_DEFECTO}'">
                    </div>
                    <div class="card-body p-3 text-center">
                        <h6 class="mb-0 text-uppercase fw-bold" style="font-size: 1rem; color: #20c997; letter-spacing: 0.5px; text-shadow: 0 0 20px rgba(32, 201, 151, 0.3);">
                            ${nombre}
                        </h6>
                    </div>
                </div>
            </div>
        `;
    });

    contenedor.innerHTML = html;
}

// ================================================================
// FUNCIÓN PARA ACTUALIZAR LA PAGINACIÓN
// ================================================================
function actualizarPaginacion() {
    // Obtener productos según el filtro
    let productosFiltrados = todosLosProductos;
    if (categoriaFiltro !== 'todos') {
        productosFiltrados = todosLosProductos.filter(p => 
            p.categoria?.toLowerCase() === categoriaFiltro
        );
    }
    
    totalPaginas = Math.ceil(productosFiltrados.length / PRODUCTOS_POR_PAGINA);
    if (totalPaginas === 0) totalPaginas = 1;
    if (paginaActual > totalPaginas) paginaActual = totalPaginas;
    
    const inicio = (paginaActual - 1) * PRODUCTOS_POR_PAGINA;
    const fin = inicio + PRODUCTOS_POR_PAGINA;
    const productosPagina = productosFiltrados.slice(inicio, fin);
    
    renderizarProductos(productosPagina);
    actualizarControlesPaginacion();
    
    console.log(`📄 Página ${paginaActual} de ${totalPaginas} - Mostrando ${productosPagina.length} productos`);
}

// ================================================================
// FUNCIÓN PARA ACTUALIZAR CONTROLES DE PAGINACIÓN
// ================================================================
function actualizarControlesPaginacion() {
    const contenedorPaginacion = document.getElementById('paginacion-container');
    if (!contenedorPaginacion) return;
    
    if (totalPaginas <= 1) {
        contenedorPaginacion.innerHTML = '';
        return;
    }
    
    let html = `
        <div class="d-flex justify-content-center align-items-center gap-2 mt-4">
            <button class="btn btn-outline-light btn-sm" id="btn-pagina-anterior" ${paginaActual === 1 ? 'disabled' : ''}>
                <i class="bi bi-chevron-left"></i> Anterior
            </button>
            
            <span class="text-light mx-2" style="font-size: 0.9rem;">
                Página ${paginaActual} de ${totalPaginas}
            </span>
            
            <button class="btn btn-outline-light btn-sm" id="btn-pagina-siguiente" ${paginaActual === totalPaginas ? 'disabled' : ''}>
                Siguiente <i class="bi bi-chevron-right"></i>
            </button>
        </div>
    `;
    
    contenedorPaginacion.innerHTML = html;
    
    // Eventos de los botones
    document.getElementById('btn-pagina-anterior')?.addEventListener('click', function() {
        if (paginaActual > 1) {
            paginaActual--;
            actualizarPaginacion();
            // Scroll al inicio de productos
            document.getElementById('contenedor-productos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
    
    document.getElementById('btn-pagina-siguiente')?.addEventListener('click', function() {
        if (paginaActual < totalPaginas) {
            paginaActual++;
            actualizarPaginacion();
            document.getElementById('contenedor-productos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
}

// ================================================================
// FUNCIÓN PARA GENERAR CATEGORÍAS DINÁMICAS
// ================================================================
function generarCategorias(productos) {
    const menu = document.getElementById('categorias-menu');
    if (!menu) return;

    const categoriasSet = new Set();
    productos.forEach(producto => {
        const cat = producto.categoria?.trim();
        if (cat && cat.toLowerCase() !== 'todos') {
            categoriasSet.add(cat);
        }
    });

    const categorias = Array.from(categoriasSet).sort();

    const primerElemento = menu.querySelector('li:first-child');
    const divisor = menu.querySelector('hr');
    
    menu.innerHTML = '';
    if (primerElemento) menu.appendChild(primerElemento);
    if (divisor) menu.appendChild(divisor);

    if (categorias.length === 0) {
        const item = document.createElement('li');
        item.innerHTML = `<a class="dropdown-item disabled" href="#">Sin categorías</a>`;
        menu.appendChild(item);
        return;
    }

    categorias.forEach(categoria => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.className = 'dropdown-item filtro-categoria';
        a.href = '#productos';
        a.dataset.categoria = categoria.toLowerCase();
        a.textContent = categoria.charAt(0).toUpperCase() + categoria.slice(1);
        li.appendChild(a);
        menu.appendChild(li);
    });

    document.querySelectorAll('.filtro-categoria').forEach(enlace => {
        enlace.addEventListener('click', function(e) {
            e.preventDefault();
            const categoria = this.dataset.categoria;
            categoriaFiltro = categoria;
            paginaActual = 1;
            actualizarPaginacion();
            
            const dropdown = this.closest('.dropdown-menu');
            if (dropdown) {
                const toggle = dropdown.parentElement.querySelector('.dropdown-toggle');
                if (toggle) toggle.click();
            }
            
            setTimeout(() => {
                document.getElementById('contenedor-productos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
        });
    });
}

// ================================================================
// EVENTO ESPECÍFICO PARA "TODOS LOS PRODUCTOS"
// ================================================================
document.addEventListener('DOMContentLoaded', function() {
    let btnTodos = document.getElementById('btn-todos-productos');
    if (!btnTodos) {
        btnTodos = document.querySelector('.filtro-categoria[data-categoria="todos"]');
    }
    if (!btnTodos) {
        const todosLosEnlaces = document.querySelectorAll('.dropdown-item');
        todosLosEnlaces.forEach(enlace => {
            if (enlace.textContent.trim().toLowerCase() === 'todos los productos') {
                btnTodos = enlace;
            }
        });
    }
    
    if (btnTodos) {
        const nuevoBtn = btnTodos.cloneNode(true);
        btnTodos.parentNode.replaceChild(nuevoBtn, btnTodos);
        nuevoBtn.addEventListener('click', function(e) {
            e.preventDefault();
            categoriaFiltro = 'todos';
            paginaActual = 1;
            actualizarPaginacion();
            
            const dropdown = this.closest('.dropdown-menu');
            if (dropdown) {
                const toggle = dropdown.parentElement.querySelector('.dropdown-toggle');
                if (toggle) toggle.click();
            }
            
            setTimeout(() => {
                document.getElementById('contenedor-productos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
        });
    }
    
    // Crear contenedor de paginación después del grid de productos
    const productosSection = document.getElementById('productos');
    if (productosSection && !document.getElementById('paginacion-container')) {
        const pagContainer = document.createElement('div');
        pagContainer.id = 'paginacion-container';
        pagContainer.className = 'container mt-3';
        productosSection.appendChild(pagContainer);
    }
});

// ================================================================
// EXPONER FUNCIONES GLOBALMENTE
// ================================================================
window.abrirModal = abrirModal;

// ================================================================
// ESCUCHAR CAMBIOS EN TIEMPO REAL
// ================================================================
const unsubscribe = onSnapshot(q, (snapshot) => {
    const lista = [];
    snapshot.forEach((doc) => {
        const data = doc.data();
        if (!data.fechaCreacion) {
            data.fechaCreacion = new Date().toISOString();
        }
        lista.push({ id: doc.id, ...data });
    });
    
    todosLosProductos = lista;
    paginaActual = 1;
    generarCategorias(lista);
    actualizarPaginacion();
    
    console.log(`🔄 Productos actualizados: ${lista.length} total`);
}, (error) => {
    console.error("❌ Error al escuchar cambios:", error);
    document.getElementById('contenedor-productos').innerHTML = `
        <div class="col-12 text-center">
            <p class="text-danger">Error al cargar productos. Revisa la consola.</p>
        </div>
    `;
});

// ================================================================
// DETENER LISTENER AL SALIR
// ================================================================
window.addEventListener('beforeunload', () => {
    if (unsubscribe) unsubscribe();
    console.log('👋 Listener de Firestore desconectado');
});

console.log(`✅ app.js cargado: ${PRODUCTOS_POR_PAGINA} productos por página`);
console.log(`🖼️ Imagen por defecto: ${IMAGEN_POR_DEFECTO}`);
console.log('🖱️ Haz clic en cualquier producto para ver detalles');