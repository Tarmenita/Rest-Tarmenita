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
const submitLogin = document.getElementById('submitLogin');
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
submitLogin.onclick = () => {
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
                    loadWaiterInterface();
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
        <button onclick="showCreateUserForm()">Crear Usuario</button>
        <button onclick="showMenuManager()">Gestionar Menú</button>
        <button onclick="showReports()">Ver Reportes</button>
        <div id="ordersContainer"></div>
    `;
    listenForOrders();
}

// Cargar interfaz de mesera
function loadWaiterInterface() {
    mainContent.innerHTML = `
        <h2>Panel de Mesera</h2>
        <button onclick="showTakeOrderForm()">Tomar Pedido</button>
        <div id="menuContainer"></div>
    `;
    loadMenu();
}

// Mostrar formulario para crear usuario
function showCreateUserForm() {
    mainContent.innerHTML = `
        <h2>Crear Nuevo Usuario</h2>
        <input type="email" id="newUsername" placeholder="Correo electrónico">
        <input type="password" id="newPassword" placeholder="Contraseña">
        <select id="newRole">
            <option value="mesera">Mesera</option>
        </select>
        <button id="createUserBtn" onclick="createNewUser()">Crear Usuario</button>
    `;
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
        <div>
            <input type="text" id="newDishName" placeholder="Nombre del plato">
            <input type="number" id="newDishPrice" placeholder="Precio">
            <button onclick="addMenuItem()">Agregar Plato</button>
        </div>
        <div id="menuItems"></div>
    `;
    loadMenuItems();
}

// Cargar items del menú
function loadMenuItems() {
    const menuItems = document.getElementById('menuItems');
    firebase.database().ref('menu').on('value', (snapshot) => {
        menuItems.innerHTML = '';
        snapshot.forEach((childSnapshot) => {
            const item = childSnapshot.val();
            menuItems.innerHTML += `
                <div class="menu-item">
                    <p>${item.name} - $${item.price}</p>
                    <button onclick="removeMenuItem('${childSnapshot.key}')">Eliminar</button>
                </div>
            `;
        });
    });
}

// Agregar item al menú
function addMenuItem() {
    const name = document.getElementById('newDishName').value.trim();
    const price = parseFloat(document.getElementById('newDishPrice').value);

    if (!name || isNaN(price)) {
        alert("Por favor, ingresa un nombre y un precio válido.");
        return;
    }

    firebase.database().ref('menu').push({
        name: name,
        price: price
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
        <input type="number" id="tableNumber" placeholder="Número de mesa">
        <div id="menuItems"></div>
        <button onclick="submitOrder()">Enviar Pedido</button>
    `;
    loadMenuForOrder();
}

// Cargar menú para tomar pedidos
function loadMenuForOrder() {
    const menuItems = document.getElementById('menuItems');
    firebase.database().ref('menu').on('value', (snapshot) => {
        menuItems.innerHTML = '';
        snapshot.forEach((childSnapshot) => {
            const item = childSnapshot.val();
            menuItems.innerHTML += `
                <div class="menu-item">
                    <input type="checkbox" id="${childSnapshot.key}" name="orderItem" value="${item.name}">
                    <label for="${childSnapshot.key}">${item.name} - $${item.price}</label>
                </div>
            `;
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
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    firebase.database().ref('orders').push(order)
        .then(() => {
            alert("Pedido enviado exitosamente");
            loadWaiterInterface();
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
                    <button onclick="updateOrderStatus('${childSnapshot.key}', 'preparando')">Preparando</button>
                    <button onclick="updateOrderStatus('${childSnapshot.key}', 'listo')">Listo</button>
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

