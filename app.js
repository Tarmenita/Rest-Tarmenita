// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBvMVibRJkHixtCsY0nPWJ-oyEOp3RZdYY",
    authDomain: "tarm-e33a2.firebaseapp.com",
    databaseURL: "https://tarm-e33a2-default-rtdb.firebaseio.com/",
    projectId: "tarm-e33a2",
    storageBucket: "tarm-e33a2.appspot.com",
    messagingSenderId: "422202688287",
    appId: "1:422202688287:web:86ebe5bfe7c7554194262a"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Configurar persistencia
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// Referencias a elementos del DOM
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const mainContent = document.getElementById('mainContent');

// Credenciales del administrador
const adminEmail = "tarmenita@hotmail.com";
const adminPassword = "tarmenita123";

// Mostrar el modal de inicio de sesión
loginBtn.onclick = () => {
    loginModal.style.display = "block";
};

// Cerrar el modal si se hace clic fuera de él
window.onclick = (event) => {
    if (event.target === loginModal) {
        loginModal.style.display = "none";
    }
};

// Manejar el inicio de sesión
loginForm.onsubmit = (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !password) {
        mostrarNotificacion("Por favor, completa todos los campos", "error");
        return;
    }

    firebase.auth().signInWithEmailAndPassword(username, password)
        .then((userCredential) => {
            const user = userCredential.user;
            loginModal.style.display = "none";
            verificarRolUsuario(user);
        })
        .catch((error) => {
            manejarError(error, "iniciar sesión");
        });
};

// Manejar el cierre de sesión
logoutBtn.onclick = () => {
    firebase.auth().signOut().then(() => {
        loginBtn.style.display = "block";
        logoutBtn.style.display = "none";
        mainContent.innerHTML = '';
        mostrarNotificacion("Has cerrado sesión exitosamente");
    }).catch((error) => {
        manejarError(error, "cerrar sesión");
    });
};

// Verificar rol del usuario
function verificarRolUsuario(user) {
    if (user.email === adminEmail) {
        cargarInterfazAdmin();
    } else {
        firebase.database().ref('users/' + user.uid).once('value')
            .then((snapshot) => {
                const userData = snapshot.val();
                if (!userData) {
                    mostrarNotificacion("El usuario no tiene un rol asignado", "error");
                    return;
                }
                if (userData.role === 'mesera') {
                    cargarInterfazMesera(user.email);
                } else {
                    mostrarNotificacion("Rol desconocido", "error");
                }
            })
            .catch((error) => {
                manejarError(error, "verificar el rol del usuario");
            });
    }
    loginBtn.style.display = "none";
    logoutBtn.style.display = "block";
}

// Cargar interfaz de administrador
function cargarInterfazAdmin() {
    mainContent.innerHTML = `
        <h2><i class="fas fa-user-cog"></i> Panel de Administrador</h2>
        <div class="admin-buttons">
            <button onclick="mostrarFormularioCrearUsuario()" class="btn-primary">
                <i class="fas fa-user-plus"></i> Crear Usuario
            </button>
            <button onclick="mostrarGestorMenu()" class="btn-primary">
                <i class="fas fa-utensils"></i> Gestionar Menú
            </button>
            <button onclick="mostrarReportes()" class="btn-primary">
                <i class="fas fa-chart-bar"></i> Ver Reportes
            </button>
        </div>
        <div id="ordersContainer"></div>
    `;
    escucharPedidos();
}

// Cargar interfaz de mesera
function cargarInterfazMesera(email) {
    mainContent.innerHTML = `
        <h2><i class="fas fa-concierge-bell"></i> Panel de Mesera</h2>
        <button onclick="mostrarFormularioPedido()" class="btn-primary">
            <i class="fas fa-clipboard-list"></i> Tomar Pedido
        </button>
        <div id="menuContainer"></div>
    `;
    cargarMenu();
    escucharNotificacionesPedidos(email);
}

// Cargar menú
function cargarMenu() {
    const menuContainer = document.getElementById('menuContainer');
    firebase.database().ref('menu').on('value', (snapshot) => {
        menuContainer.innerHTML = '<h3>Menú Actual</h3>';
        
        if (!snapshot.exists()) {
            menuContainer.innerHTML += `
                <div class="empty-menu">
                    <p>No hay platos disponibles en el menú</p>
                </div>
            `;
            return;
        }

        let hayPlatos = false;

        snapshot.forEach((childSnapshot) => {
            const item = childSnapshot.val();
            if (item && item.name && item.type) {
                const precioTexto = item.type === 'segundo' ? `S/ ${item.price.toFixed(2)}` : 'Cortesía';
                menuContainer.innerHTML += `
                    <div class="menu-item">
                        <p><strong>${item.name}</strong> - ${precioTexto}</p>
                    </div>
                `;
                hayPlatos = true;
            }
        });

        if (!hayPlatos) {
            menuContainer.innerHTML += `
                <div class="empty-menu">
                    <p>No hay platos disponibles en el menú</p>
                </div>
            `;
        }
    });
}


// Mostrar formulario para crear usuario
function mostrarFormularioCrearUsuario() {
    mainContent.innerHTML = `
        <button onclick="cargarInterfazAdmin()" class="btn-secondary back-button">
            <i class="fas fa-arrow-left"></i> Volver
        </button>
        <h2><i class="fas fa-user-plus"></i> Crear Nuevo Usuario</h2>
        <form id="createUserForm">
            <div class="input-group">
                <i class="fas fa-envelope"></i>
                <input type="email" id="newUsername" placeholder="Correo electrónico" required>
            </div>
            <div class="input-group">
                <i class="fas fa-lock"></i>
                <input type="password" id="newPassword" placeholder="Contraseña" required>
            </div>
            <select id="newRole" required>
                <option value="mesera">Mesera</option>
            </select>
            <button type="submit" class="btn-primary">
                <i class="fas fa-user-plus"></i> Crear Usuario
            </button>
        </form>
    `;
    document.getElementById('createUserForm').onsubmit = (e) => {
        e.preventDefault();
        crearNuevoUsuario();
    };
}

// Crear un nuevo usuario
function crearNuevoUsuario() {
    const email = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value.trim();
    const role = document.getElementById('newRole').value;

    if (!email || !password || !role) {
        mostrarNotificacion("Por favor, completa todos los campos", "error");
        return;
    }

    firebase.auth().createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            return firebase.database().ref('users/' + user.uid).set({
                email,
                role
            });
        })
        .then(() => {
            mostrarNotificacion("Usuario creado exitosamente");
            cargarInterfazAdmin();
        })
        .catch((error) => {
            manejarError(error, "crear un nuevo usuario");
        });
}

// Mostrar gestor de menú
function mostrarGestorMenu() {
    mainContent.innerHTML = `
        <button onclick="cargarInterfazAdmin()" class="btn-secondary back-button">
            <i class="fas fa-arrow-left"></i> Volver
        </button>
        <h2><i class="fas fa-utensils"></i> Gestionar Menú</h2>
        <form id="addDishForm">
            <div class="input-group">
                <i class="fas fa-hamburger"></i>
                <input type="text" id="newDishName" placeholder="Nombre del plato" required>
            </div>
            <div id="priceContainer" class="input-group" style="display: none;">
                <i class="fas fa-money-bill-wave"></i>
                <input type="number" id="newDishPrice" placeholder="Precio en soles" step="0.01">
            </div>
            <select id="newDishType" required onchange="togglePriceVisibility()">
                <option value="entrada">Entrada</option>
                <option value="segundo">Segundo</option>
            </select>
            <button type="submit" class="btn-primary">
                <i class="fas fa-plus-circle"></i> Agregar Plato
            </button>
        </form>
        <div class="menu-columns">
            <div class="menu-column">
                <h3><i class="fas fa-leaf"></i> Entradas</h3>
                <div id="entradas"></div>
            </div>
            <div class="menu-column">
                <h3><i class="fas fa-drumstick-bite"></i> Segundos</h3>
                <div id="segundos"></div>
            </div>
        </div>
    `;
    document.getElementById('addDishForm').onsubmit = (e) => {
        e.preventDefault();
        agregarItemMenu();
    };
    cargarItemsMenu();
}

// Mostrar/ocultar el campo de precio según el tipo de plato
function togglePriceVisibility() {
    const dishType = document.getElementById('newDishType').value;
    const priceContainer = document.getElementById('priceContainer');
    const priceInput = document.getElementById('newDishPrice');
    
    if (dishType === 'entrada') {
        priceContainer.style.display = 'none';
        priceInput.removeAttribute('required');
        priceInput.value = '';
    } else {
        priceContainer.style.display = 'block';
        priceInput.setAttribute('required', 'required');
    }
}

// Cargar items del menú (para el administrador)
function cargarItemsMenu() {
    const entradasContainer = document.getElementById('entradas');
    const segundosContainer = document.getElementById('segundos');
    firebase.database().ref('menu').on('value', (snapshot) => {
        entradasContainer.innerHTML = '';
        segundosContainer.innerHTML = '';
        
        if (!snapshot.exists()) {
            entradasContainer.innerHTML = '<p>No hay entradas disponibles</p>';
            segundosContainer.innerHTML = '<p>No hay segundos disponibles</p>';
            return;
        }

        let hayEntradas = false;
        let haySegundos = false;

        snapshot.forEach((childSnapshot) => {
            const item = childSnapshot.val();
            if (item && item.name && item.type) {
                const precioTexto = item.type === 'segundo' ? `S/ ${item.price.toFixed(2)}` : 'Cortesía';
                const itemHtml = `
                    <div class="menu-item">
                        <p><strong>${item.name}</strong> - ${precioTexto}</p>
                        <button onclick="eliminarItemMenu('${childSnapshot.key}')" class="btn-danger">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                `;
                if (item.type === 'entrada') {
                    entradasContainer.innerHTML += itemHtml;
                    hayEntradas = true;
                } else if (item.type === 'segundo') {
                    segundosContainer.innerHTML += itemHtml;
                    haySegundos = true;
                }
            }
        });

        if (!hayEntradas) {
            entradasContainer.innerHTML = '<p>No hay entradas disponibles</p>';
        }
        if (!haySegundos) {
            segundosContainer.innerHTML = '<p>No hay segundos disponibles</p>';
        }
    });
}

// Agregar item al menú
function agregarItemMenu() {
    const name = document.getElementById('newDishName').value.trim();
    const type = document.getElementById('newDishType').value;
    const price = type === 'segundo' ? parseFloat(document.getElementById('newDishPrice').value) : 0;

    if (!name || (type === 'segundo' && isNaN(price))) {
        mostrarNotificacion("Por favor, completa todos los campos correctamente", "error");
        return;
    }

    firebase.database().ref('menu').push({
        name: name,
        price: price,
        type: type
    }).then(() => {
        document.getElementById('newDishName').value = '';
        if (type === 'segundo') {
            document.getElementById('newDishPrice').value = '';
        }
        mostrarNotificacion("Plato agregado exitosamente");
    }).catch((error) => {
        manejarError(error, "agregar plato al menú");
    });
}

// Eliminar item del menú
function eliminarItemMenu(key) {
    if (confirm('¿Estás seguro de que quieres eliminar este plato?')) {
        firebase.database().ref('menu/' + key).remove()
            .then(() => {
                mostrarNotificacion("Plato eliminado exitosamente");
            })
            .catch((error) => {
                manejarError(error, "eliminar plato del menú");
            });
    }
}


// Mostrar formulario para tomar pedidos
function mostrarFormularioPedido() {
    mainContent.innerHTML = `
        <button onclick="cargarInterfazMesera('${firebase.auth().currentUser.email}')" class="btn-secondary back-button">
            <i class="fas fa-arrow-left"></i> Volver
        </button>
        <h2><i class="fas fa-clipboard-list"></i> Tomar Pedido</h2>
        <form id="orderForm">
            <div class="input-group">
                <i class="fas fa-utensils"></i>
                <select id="orderType" required>
                    <option value="mesa">Para la mesa</option>
                    <option value="llevar">Para llevar</option>
                </select>
            </div>
            <div id="tableNumberContainer" class="input-group">
                <i class="fas fa-table"></i>
                <input type="number" id="tableNumber" placeholder="Número de mesa" required>
            </div>
            <div class="menu-columns">
                <div class="menu-column">
                    <h3><i class="fas fa-leaf"></i> Entradas</h3>
                    <div id="entradasOrder"></div>
                </div>
                <div class="menu-column">
                    <h3><i class="fas fa-drumstick-bite"></i> Segundos</h3>
                    <div id="segundosOrder"></div>
                </div>
            </div>
            <button type="submit" class="btn-primary">
                <i class="fas fa-paper-plane"></i> Enviar Pedido
            </button>
        </form>
    `;
    document.getElementById('orderForm').onsubmit = (e) => {
        e.preventDefault();
        enviarPedido();
    };
    document.getElementById('orderType').onchange = toggleTableNumberVisibility;
    cargarMenuParaPedido();
}

// Mostrar/ocultar el campo de número de mesa según el tipo de pedido
function toggleTableNumberVisibility() {
    const orderType = document.getElementById('orderType').value;
    const tableNumberContainer = document.getElementById('tableNumberContainer');
    if (orderType === 'llevar') {
        tableNumberContainer.style.display = 'none';
        document.getElementById('tableNumber').removeAttribute('required');
    } else {
        tableNumberContainer.style.display = 'block';
        document.getElementById('tableNumber').setAttribute('required', 'required');
    }
}

// Cargar menú para tomar pedidos
function cargarMenuParaPedido() {
    const entradasContainer = document.getElementById('entradasOrder');
    const segundosContainer = document.getElementById('segundosOrder');
    firebase.database().ref('menu').on('value', (snapshot) => {
        entradasContainer.innerHTML = '';
        segundosContainer.innerHTML = '';
        
        if (!snapshot.exists()) {
            entradasContainer.innerHTML = '<p>No hay entradas disponibles</p>';
            segundosContainer.innerHTML = '<p>No hay segundos disponibles</p>';
            return;
        }

        let hayEntradas = false;
        let haySegundos = false;

        snapshot.forEach((childSnapshot) => {
            const item = childSnapshot.val();
            if (item && item.name && item.type) {
                const precioTexto = item.type === 'segundo' ? `S/ ${item.price.toFixed(2)}` : 'Cortesía';
                const itemHtml = `
                    <div class="menu-item-order">
                        <span class="item-name">${item.name} - ${precioTexto}</span>
                        <div class="quantity-control">
                            <button type="button" onclick="cambiarCantidad('${childSnapshot.key}', -1)" class="btn-quantity">
                                <i class="fas fa-minus"></i>
                            </button>
                            <input type="number" id="${childSnapshot.key}" name="orderItem" min="0" value="0" 
                                   data-name="${item.name}" data-price="${item.price || 0}" data-type="${item.type}" 
                                   class="quantity-input" readonly>
                            <button type="button" onclick="cambiarCantidad('${childSnapshot.key}', 1)" class="btn-quantity">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    </div>
                `;
                if (item.type === 'entrada') {
                    entradasContainer.innerHTML += itemHtml;
                    hayEntradas = true;
                } else if (item.type === 'segundo') {
                    segundosContainer.innerHTML += itemHtml;
                    haySegundos = true;
                }
            }
        });

        if (!hayEntradas) {
            entradasContainer.innerHTML = '<p>No hay entradas disponibles</p>';
        }
        if (!haySegundos) {
            segundosContainer.innerHTML = '<p>No hay segundos disponibles</p>';
        }
    });
}

// Función para cambiar la cantidad de un plato
function cambiarCantidad(id, cambio) {
    const input = document.getElementById(id);
    let cantidad = parseInt(input.value) + cambio;
    input.value = Math.max(0, cantidad);
}

// Enviar pedido
function enviarPedido() {
    const orderType = document.getElementById('orderType').value;
    const tableNumber = document.getElementById('tableNumber').value;
    const orderItems = document.querySelectorAll('input[name="orderItem"]');
    
    if ((orderType === 'mesa' && !tableNumber) || !Array.from(orderItems).some(item => parseInt(item.value) > 0)) {
        mostrarNotificacion("Por favor, completa todos los campos requeridos y selecciona al menos un plato", "error");
        return;
    }

    const order = {
        type: orderType,
        table: orderType === 'mesa' ? tableNumber : 'Para llevar',
        items: Array.from(orderItems)
            .filter(item => parseInt(item.value) > 0)
            .map(item => ({
                name: item.dataset.name,
                price: parseFloat(item.dataset.price),
                type: item.dataset.type,
                quantity: parseInt(item.value)
            })),
        status: 'pendiente',
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        waiter: firebase.auth().currentUser.email
    };

    firebase.database().ref('orders').push(order)
        .then(() => {
            mostrarNotificacion("Pedido enviado exitosamente");
            cargarInterfazMesera(firebase.auth().currentUser.email);
        })
        .catch((error) => {
            manejarError(error, "enviar pedido");
        });
}

// Escuchar nuevos pedidos (para la cocina)
function escucharPedidos() {
    const ordersContainer = document.getElementById('ordersContainer');
    firebase.database().ref('orders').on('value', (snapshot) => {
        ordersContainer.innerHTML = '<h3><i class="fas fa-clipboard-check"></i> Pedidos Actuales</h3>';
        snapshot.forEach((childSnapshot) => {
            const order = childSnapshot.val();
            const orderHtml = `
                <div class="order-item">
                    <p><strong>Tipo:</strong> ${order.type === 'mesa' ? 'Para la mesa' : 'Para llevar'}</p>
                    <p><strong>${order.type === 'mesa' ? 'Mesa' : 'Pedido'}:</strong> ${order.table}</p>
                    <p><strong>Platos:</strong></p>
                    <ul>
                        ${order.items.map(item => `<li>${item.quantity}x ${item.name} (${item.type})</li>`).join('')}
                    </ul>
                    <p><strong>Estado:</strong> ${order.status}</p>
                    <p><strong>Mesera:</strong> ${order.waiter}</p>
                    <div class="order-buttons">
                        ${order.status !== 'listo' ? `
                            <button onclick="actualizarEstadoPedido('${childSnapshot.key}', 'preparando')" class="btn-primary">
                                <i class="fas fa-fire"></i> Preparando
                            </button>
                            <button onclick="actualizarEstadoPedido('${childSnapshot.key}', 'listo')" class="btn-primary">
                                <i class="fas fa-check"></i> Listo
                            </button>
                        ` : ''}
                        ${order.status === 'listo' ? `
                            <button onclick="eliminarPedido('${childSnapshot.key}')" class="btn-danger">
                                <i class="fas fa-trash"></i> Eliminar
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
            ordersContainer.innerHTML += orderHtml;
        });
    });
}

// Actualizar estado del pedido
function actualizarEstadoPedido(orderId, status) {
    firebase.database().ref('orders/' + orderId).update({status: status})
        .then(() => {
            mostrarNotificacion(`Estado del pedido actualizado a: ${status}`);
        })
        .catch((error) => {
            manejarError(error, "actualizar el estado del pedido");
        });
}

// Eliminar pedido
function eliminarPedido(orderId) {
    if (confirm('¿Estás seguro de que quieres eliminar este pedido?')) {
        firebase.database().ref('orders/' + orderId).once('value', (snapshot) => {
            const deletedOrder = snapshot.val();
            firebase.database().ref('deletedOrders').push(deletedOrder)
                .then(() => {
                    return firebase.database().ref('orders/' + orderId).remove();
                })
                .then(() => {
                    mostrarNotificacion("Pedido eliminado y agregado al reporte exitosamente");
                })
                .catch((error) => {
                    manejarError(error, "eliminar el pedido");
                });
        });
    }
}

// Escuchar notificaciones de pedidos listos (para las meseras)
function escucharNotificacionesPedidos(waiterEmail) {
    firebase.database().ref('orders').on('child_changed', (snapshot) => {
        const order = snapshot.val();
        if (order.status === 'listo' && order.waiter === waiterEmail) {
            mostrarNotificacion(`¡El pedido ${order.type === 'mesa' ? 'de la mesa ' + order.table : 'para llevar'} está listo!`);
            // Hacer vibrar el dispositivo si está disponible
            if ('vibrate' in navigator) {
                navigator.vibrate([200, 100, 200]);
            }
        }
    });
}

// Mostrar notificación
function mostrarNotificacion(mensaje, tipo = 'success') {
    const notificationContainer = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <i class="fas ${tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${mensaje}</span>
    `;
    notificationContainer.appendChild(notification);

    // Hacer vibrar el dispositivo si está disponible
    if ('vibrate' in navigator) {
        navigator.vibrate(200);
    }

    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Mostrar reportes
function mostrarReportes() {
    mainContent.innerHTML = `
        <button onclick="cargarInterfazAdmin()" class="btn-secondary back-button">
            <i class="fas fa-arrow-left"></i> Volver
        </button>
        <h2><i class="fas fa-chart-bar"></i> Reportes</h2>
        <div class="report-buttons">
            <button onclick="generarReporteVentas()" class="btn-primary">
                <i class="fas fa-file-invoice-dollar"></i> Generar Reporte de Ventas
            </button>
            <button onclick="eliminarReporteVentas()" class="btn-danger">
                <i class="fas fa-trash-alt"></i> Eliminar Reporte de Ventas
            </button>
        </div>
        <div id="reportContent"></div>
    `;
}

// Generar reporte de ventas
function generarReporteVentas() {
    const reportContent = document.getElementById('reportContent');
    reportContent.innerHTML = '<h3>Cargando reporte...</h3>';

    firebase.database().ref('deletedOrders').once('value')
        .then((snapshot) => {
            const deletedOrders = snapshot.val();
            let ventasPorMesa = {};
            let ventasTotales = 0;
            let ventasPorMenu = {};

            for (let id in deletedOrders) {
                const order = deletedOrders[id];
                const mesa = order.table;
                if (!ventasPorMesa[mesa]) {
                    ventasPorMesa[mesa] = 0;
                }

                order.items.forEach(item => {
                    if (item.type === 'segundo') {
                        ventasPorMesa[mesa] += item.price * item.quantity;
                        ventasTotales += item.price * item.quantity;
                    }

                    const menuKey = `${item.name} (${item.type})`;
                    if (!ventasPorMenu[menuKey]) {
                        ventasPorMenu[menuKey] = { cantidad: 0, total: 0 };
                    }
                    ventasPorMenu[menuKey].cantidad += item.quantity;
                    if (item.type === 'segundo') {
                        ventasPorMenu[menuKey].total += item.price * item.quantity;
                    }
                });
            }

            let reporteHtml = `
                <h3>Reporte de Ventas (Pedidos Eliminados)</h3>
                <h4>Ventas por Mesa</h4>
                <table>
                    <tr>
                        <th>Mesa</th>
                        <th>Total Vendido</th>
                    </tr>
                    ${Object.entries(ventasPorMesa).map(([mesa, total]) => `
                        <tr>
                            <td>${mesa}</td>
                            <td>S/ ${total.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </table>

                <h4>Ventas por Plato</h4>
                <table>
                    <tr>
                        <th>Plato</th>
                        <th>Cantidad</th>
                        <th>Total Vendido</th>
                    </tr>
                    ${Object.entries(ventasPorMenu).map(([menu, datos]) => `
                        <tr>
                            <td>${menu}</td>
                            <td>${datos.cantidad}</td>
                            <td>S/ ${datos.total.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </table>

                <h4>Total de Ventas: S/ ${ventasTotales.toFixed(2)}</h4>
            `;

            reportContent.innerHTML = reporteHtml;
        })
        .catch((error) => {
            manejarError(error, "generar el reporte de ventas");
        });
}

// Eliminar reporte de ventas
function eliminarReporteVentas() {
    if (confirm('¿Estás seguro de que quieres eliminar el reporte de ventas? Esta acción eliminará todos los pedidos eliminados registrados.')) {
        firebase.database().ref('deletedOrders').remove()
            .then(() => {
                mostrarNotificacion("Reporte de ventas eliminado exitosamente");
                document.getElementById('reportContent').innerHTML = '';
            })
            .catch((error) => {
                manejarError(error, "eliminar el reporte de ventas");
            });
    }
}


function manejarError(error, accion) {
    console.error(`Error al ${accion}:`, error);
    mostrarNotificacion(`Ocurrió un error al ${accion}. Por favor, intenta de nuevo.`, "error");
}


firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        loginBtn.style.display = "none";
        logoutBtn.style.display = "block";
        verificarRolUsuario(user);
    } else {
        loginBtn.style.display = "block";
        logoutBtn.style.display = "none";
        mainContent.innerHTML = '';
    }
});


window.mostrarFormularioCrearUsuario = mostrarFormularioCrearUsuario;
window.mostrarGestorMenu = mostrarGestorMenu;
window.mostrarReportes = mostrarReportes;
window.eliminarItemMenu = eliminarItemMenu;
window.actualizarEstadoPedido = actualizarEstadoPedido;
window.eliminarPedido = eliminarPedido;
window.cargarInterfazAdmin = cargarInterfazAdmin;
window.cargarInterfazMesera = cargarInterfazMesera;
window.generarReporteVentas = generarReporteVentas;
window.eliminarReporteVentas = eliminarReporteVentas;
window.togglePriceVisibility = togglePriceVisibility;
window.cambiarCantidad = cambiarCantidad;