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
        alert("Por favor, completa todos los campos.");
        return;
    }

    firebase.auth().signInWithEmailAndPassword(username, password)
        .then((userCredential) => {
            const user = userCredential.user;
            loginModal.style.display = "none";
            checkUserRole(user);
        })
        .catch((error) => {
            handleError(error, "inicio de sesión");
        });
};

// Manejar el cierre de sesión
logoutBtn.onclick = () => {
    firebase.auth().signOut().then(() => {
        loginBtn.style.display = "block";
        logoutBtn.style.display = "none";
        mainContent.innerHTML = '';
    }).catch((error) => {
        handleError(error, "cerrar sesión");
    });
};

// Verificar rol del usuario
function checkUserRole(user) {
    if (user.email === adminEmail) {
        loadAdminInterface();
    } else {
        firebase.database().ref('users/' + user.uid).once('value')
            .then((snapshot) => {
                const userData = snapshot.val();
                if (!userData) {
                    alert("El usuario no tiene un rol asignado.");
                    return;
                }
                if (userData.role === 'mesera') {
                    loadWaiterInterface(user.email);
                } else {
                    alert("Rol desconocido.");
                }
            })
            .catch((error) => {
                handleError(error, "verificar el rol del usuario");
            });
    }
    loginBtn.style.display = "none";
    logoutBtn.style.display = "block";
}

// Cargar interfaz de administrador
function loadAdminInterface() {
    mainContent.innerHTML = `
        <h2>Panel de Administrador</h2>
        <button onclick="showCreateUserForm()" class="btn-primary">Crear Usuario</button>
        <button onclick="showMenuManager()" class="btn-primary">Gestionar Menú</button>
        <button onclick="showReports()" class="btn-primary">Ver Reportes</button>
        <div id="ordersContainer"></div>
    `;
    listenForOrders();
}

// Cargar interfaz de mesera
function loadWaiterInterface(email) {
    mainContent.innerHTML = `
        <h2>Panel de Mesera</h2>
        <button onclick="showTakeOrderForm()" class="btn-primary">Tomar Pedido</button>
        <div id="menuContainer"></div>
    `;
    loadMenu();
    listenForOrderNotifications(email);
}

// Mostrar formulario para crear usuario
function showCreateUserForm() {
    mainContent.innerHTML = `
        <h2>Crear Nuevo Usuario</h2>
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
            <button type="submit" class="btn-primary">Crear Usuario</button>
        </form>
    `;
    document.getElementById('createUserForm').onsubmit = (e) => {
        e.preventDefault();
        createNewUser();
    };
}

// Crear un nuevo usuario
function createNewUser() {
    const email = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value.trim();
    const role = document.getElementById('newRole').value;

    if (!email || !password || !role) {
        alert("Por favor, completa todos los campos.");
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
            alert("Usuario creado exitosamente");
            loadAdminInterface();
        })
        .catch((error) => {
            handleError(error, "crear un nuevo usuario");
        });
}

// Mostrar gestor de menú
function showMenuManager() {
    mainContent.innerHTML = `
        <h2>Gestionar Menú</h2>
        <form id="addDishForm">
            <div class="input-group">
                <input type="text" id="newDishName" placeholder="Nombre del plato" required>
            </div>
            <div class="input-group">
                <input type="number" id="newDishPrice" placeholder="Precio en soles" step="0.01" required>
            </div>
            <select id="newDishType" required>
                <option value="entrada">Entrada</option>
                <option value="segundo">Segundo</option>
            </select>
            <button type="submit" class="btn-primary">Agregar Plato</button>
        </form>
        <div class="menu-columns">
            <div class="menu-column">
                <h3>Entradas</h3>
                <div id="entradas"></div>
            </div>
            <div class="menu-column">
                <h3>Segundos</h3>
                <div id="segundos"></div>
            </div>
        </div>
    `;
    document.getElementById('addDishForm').onsubmit = (e) => {
        e.preventDefault();
        addMenuItem();
    };
    loadMenuItems();
}

// Cargar items del menú
function loadMenuItems() {
    const entradasContainer = document.getElementById('entradas');
    const segundosContainer = document.getElementById('segundos');
    firebase.database().ref('menu').on('value', (snapshot) => {
        entradasContainer.innerHTML = '';
        segundosContainer.innerHTML = '';
        snapshot.forEach((childSnapshot) => {
            const item = childSnapshot.val();
            const itemHtml = `
                <div class="menu-item">
                    <p>${item.name} - S/ ${item.price.toFixed(2)}</p>
                    <button onclick="removeMenuItem('${childSnapshot.key}')" class="btn-secondary">Eliminar</button>
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
function addMenuItem() {
    const name = document.getElementById('newDishName').value.trim();
    const price = parseFloat(document.getElementById('newDishPrice').value);
    const type = document.getElementById('newDishType').value;

    if (!name || isNaN(price) || !type) {
        alert("Por favor, ingresa un nombre, un precio válido y selecciona el tipo de plato.");
        return;
    }

    firebase.database().ref('menu').push({
        name: name,
        price: price,
        type: type
    }).then(() => {
        document.getElementById('newDishName').value = '';
        document.getElementById('newDishPrice').value = '';
    }).catch((error) => {
        handleError(error, "agregar plato al menú");
    });
}

// Eliminar item del menú
function removeMenuItem(key) {
    firebase.database().ref('menu/' + key).remove()
        .then(() => {
            alert("Plato eliminado exitosamente");
        })
        .catch((error) => {
            handleError(error, "eliminar plato del menú");
        });
}

// Mostrar formulario para tomar pedidos
function showTakeOrderForm() {
    mainContent.innerHTML = `
        <h2>Tomar Pedido</h2>
        <form id="orderForm">
            <div class="input-group">
                <input type="number" id="tableNumber" placeholder="Número de mesa" required>
            </div>
            <div class="menu-columns">
                <div class="menu-column">
                    <h3>Entradas</h3>
                    <div id="entradasOrder"></div>
                </div>
                <div class="menu-column">
                    <h3>Segundos</h3>
                    <div id="segundosOrder"></div>
                </div>
            </div>
            <button type="submit" class="btn-primary">Enviar Pedido</button>
        </form>
    `;
    document.getElementById('orderForm').onsubmit = (e) => {
        e.preventDefault();
        submitOrder();
    };
    loadMenuForOrder();
}

// Cargar menú para tomar pedidos
function loadMenuForOrder() {
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
function submitOrder() {
    const tableNumber = document.getElementById('tableNumber').value;
    const orderItems = document.querySelectorAll('input[name="orderItem"]:checked');
    
    if (!tableNumber || orderItems.length === 0) {
        alert("Por favor, ingresa un número de mesa y selecciona al menos un plato.");
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
            alert("Pedido enviado exitosamente");
            loadWaiterInterface(firebase.auth().currentUser.email);
        })
        .catch((error) => {
            handleError(error, "enviar pedido");
        });
}

// Escuchar nuevos pedidos (para la cocina)
function listenForOrders() {
    const ordersContainer = document.getElementById('ordersContainer');
    firebase.database().ref('orders').on('value', (snapshot) => {
        ordersContainer.innerHTML = '<h3>Pedidos Actuales</h3>';
        snapshot.forEach((childSnapshot) => {
            const order = childSnapshot.val();
            ordersContainer.innerHTML += `
                <div class="order-item">
                    <p>Mesa: ${order.table}</p>
                    <p>Platos: ${order.items.join(', ')}</p>
                    <p>Estado: ${order.status}</p>
                    <p>Mesera: ${order.waiter}</p>
                    <button onclick="updateOrderStatus('${childSnapshot.key}', 'preparando')" class="btn-primary">Preparando</button>
                    <button onclick="updateOrderStatus('${childSnapshot.key}', 'listo')" class="btn-primary">Listo</button>
                </div>
            `;
        });
    });
}

// Actualizar estado del pedido
function updateOrderStatus(orderId, status) {
    firebase.database().ref('orders/' + orderId).update({status: status})
        .then(() => {
            alert("Estado del pedido actualizado");
        })
        .catch((error) => {
            handleError(error, "actualizar el estado del pedido");
        });
}

// Escuchar notificaciones de pedidos listos (para las meseras)
function listenForOrderNotifications(waiterEmail) {
    firebase.database().ref('orders').on('child_changed', (snapshot) => {
        const order = snapshot.val();
        if (order.status === 'listo' && order.waiter === waiterEmail) {
            showNotification(`El pedido de la mesa ${order.table} está listo.`);
        }
    });
}

// Mostrar notificación
function showNotification(message) {
    const notificationContainer = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notificationContainer.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Mostrar reportes
function showReports() {
    mainContent.innerHTML = '<h2>Reportes de Ventas</h2><div id="salesReport"></div>';
    generateDailySalesReport();
}

// Generar reporte de ventas diarias
function generateDailySalesReport() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    firebase.database().ref('orders').orderByChild('timestamp').startAt(today.getTime())
        .once('value', (snapshot) => {
            const orders = snapshot.val();
            let totalSales = 0;
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
                <h3>Ventas del día</h3>
                <table>
                    <tr>
                        <th>Plato</th>
                        <th>Cantidad</th>
                    </tr>
                    ${Object.entries(dishCounts).map(([dish, count]) => `
                        <tr>
                            <td>${dish}</td>
                            <td>${count}</td>
                        </tr>
                    `).join('')}
                </table>
            `;
        });
}

// Manejo de errores
function handleError(error, action) {
    console.error(`Error al ${action}:`, error);
    alert(`Ocurrió un error al ${action}. Mensaje: ${error.message}`);
}

// Crear usuario administrador si no existe
firebase.auth().signInWithEmailAndPassword(adminEmail, adminPassword)
    .catch((error) => {
        if (error.code === 'auth/user-not-found') {
            firebase.auth().createUserWithEmailAndPassword(adminEmail, adminPassword)
                .then((userCredential) => {
                    const user = userCredential.user;
                    return firebase.database().ref('users/' + user.uid).set({
                        email: adminEmail,
                        role: 'admin'
                    });
                })
                .then(() => {
                    console.log("Usuario administrador creado exitosamente");
                })
                .catch((error) => {
                    console.error("Error al crear usuario administrador:", error);
                });
        }
    });

// Escuchar cambios en el estado de autenticación
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        loginBtn.style.display = "none";
        logoutBtn.style.display = "block";
        checkUserRole(user);
    } else {
        loginBtn.style.display = "block";
        logoutBtn.style.display = "none";
        mainContent.innerHTML = '';
    }
});

