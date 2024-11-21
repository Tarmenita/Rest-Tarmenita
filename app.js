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
        snapshot.forEach((childSnapshot) => {
            const item = childSnapshot.val();
            menuContainer.innerHTML += `
                <div class="menu-item">
                    <p><strong>${item.name}</strong> - S/ ${item.price.toFixed(2)} (${item.type})</p>
                </div>
            `;
        });
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
            <div class="input-group">
                <i class="fas fa-money-bill-wave"></i>
                <input type="number" id="newDishPrice" placeholder="Precio en soles" step="0.01" required>
            </div>
            <select id="newDishType" required>
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

// Cargar items del menú
function cargarItemsMenu() {
    const entradasContainer = document.getElementById('entradas');
    const segundosContainer = document.getElementById('segundos');
    firebase.database().ref('menu').on('value', (snapshot) => {
        entradasContainer.innerHTML = '';
        segundosContainer.innerHTML = '';
        snapshot.forEach((childSnapshot) => {
            const item = childSnapshot.val();
            const itemHtml = `
                <div class="menu-item">
                    <p><strong>${item.name}</strong> - S/ ${item.price.toFixed(2)}</p>
                    <button onclick="eliminarItemMenu('${childSnapshot.key}')" class="btn-danger">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            `;
            if (item.type === 'entrada') {
                entradasContainer.innerHTML += itemHtml;
            } else if (item.type === 'segundo') {
                segundosContainer.innerHTML += itemHtml;
            }
        });
    });
}

// Agregar item al menú
function agregarItemMenu() {
    const name = document.getElementById('newDishName').value.trim();
    const price = parseFloat(document.getElementById('newDishPrice').value);
    const type = document.getElementById('newDishType').value;

    if (!name || isNaN(price) || !type) {
        mostrarNotificacion("Por favor, completa todos los campos correctamente", "error");
        return;
    }

    firebase.database().ref('menu').push({
        name: name,
        price: price,
        type: type
    }).then(() => {
        document.getElementById('newDishName').value = '';
        document.getElementById('newDishPrice').value = '';
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
    cargarMenuParaPedido();
}

// Cargar menú para tomar pedidos
function cargarMenuParaPedido() {
    const entradasContainer = document.getElementById('entradasOrder');
    const segundosContainer = document.getElementById('segundosOrder');
    firebase.database().ref('menu').on('value', (snapshot) => {
        entradasContainer.innerHTML = '';
        segundosContainer.innerHTML = '';
        snapshot.forEach((childSnapshot) => {
            const item = childSnapshot.val();
            const itemHtml = `
                <div class="menu-item">
                    <input type="checkbox" id="${childSnapshot.key}" name="orderItem" value="${item.name}">
                    <label for="${childSnapshot.key}">${item.name} - S/ ${item.price.toFixed(2)}</label>
                </div>
            `;
            if (item.type === 'entrada') {
                entradasContainer.innerHTML += itemHtml;
            } else if (item.type === 'segundo') {
                segundosContainer.innerHTML += itemHtml;
            }
        });
    });
}

// Enviar pedido
function enviarPedido() {
    const tableNumber = document.getElementById('tableNumber').value;
    const orderItems = document.querySelectorAll('input[name="orderItem"]:checked');
    
    if (!tableNumber || orderItems.length === 0) {
        mostrarNotificacion("Por favor, ingresa un número de mesa y selecciona al menos un plato", "error");
        return;
    }

    const order = {
        table: tableNumber,
        items: Array.from(orderItems).map(item => item.value),
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
                    <p><strong>Mesa:</strong> ${order.table}</p>
                    <p><strong>Platos:</strong> ${order.items.join(', ')}</p>
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
        firebase.database().ref('orders/' + orderId).remove()
            .then(() => {
                mostrarNotificacion("Pedido eliminado exitosamente");
            })
            .catch((error) => {
                manejarError(error, "eliminar el pedido");
            });
    }
}

// Escuchar notificaciones de pedidos listos (para las meseras)
function escucharNotificacionesPedidos(waiterEmail) {
    firebase.database().ref('orders').on('child_changed', (snapshot) => {
        const order = snapshot.val();
        if (order.status === 'listo' && order.waiter === waiterEmail) {
            mostrarNotificacion(`¡El pedido de la mesa ${order.table} está listo!`);
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
        <h2><i class="fas fa-chart-bar"></i> Reporte de Segundos</h2>
        <div id="salesReport"></div>
    `;
    generarReporteVentasDiarias();
}

// Generar reporte de ventas diarias
function generarReporteVentasDiarias() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    firebase.database().ref('orders').orderByChild('timestamp').startAt(today.getTime())
        .once('value', (snapshot) => {
            const orders = snapshot.val();
            let dishCounts = {};

            for (let id in orders) {
                const order = orders[id];
                order.items.forEach(item => {
                    if (dishCounts[item]) {
                        dishCounts[item]++;
                    } else {
                        dishCounts[item] = 1;
                    }
                });
            }

            const salesReport = document.getElementById('salesReport');
            salesReport.innerHTML = `
                <h3>Segundos vendidos hoy</h3>
                <table>
                    <tr>
                        <th>Plato</th>
                        <th>Cantidad</th>
                    </tr>
                    ${Object.entries(dishCounts)
                        .filter(([dish, count]) => {
                            // Verificar si el plato es un segundo
                            const menuItem = Object.values(snapshot.val()).find(order => order.items.includes(dish));
                            return menuItem && menuItem.type === 'segundo';
                        })
                        .map(([dish, count]) => `
                            <tr>
                                <td>${dish}</td>
                                <td>${count}</td>
                            </tr>
                        `).join('')
                    }
                </table>
            `;
        });
}

// Manejo de errores
function manejarError(error, accion) {
    console.error(`Error al ${accion}:`, error);
    mostrarNotificacion(`Ocurrió un error al ${accion}. Por favor, intenta de nuevo.`, "error");
}

// Escuchar cambios en el estado de autenticación
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

