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

// Manejo de errores
function handleError(error, action) {
    console.error(`Error al ${action}:`, error);
    alert(`Ocurrió un error al ${action}. Mensaje: ${error.message}`);
}

// Funciones adicionales (a implementar)
function showMenuManager() {
    alert("Función de gestión de menú aún no implementada");
}

function showReports() {
    alert("Función de reportes aún no implementada");
}

function listenForOrders() {
    alert("Función de escucha de pedidos aún no implementada");
}

function showTakeOrderForm() {
    alert("Función de toma de pedidos aún no implementada");
}

function loadMenu() {
    alert("Función de carga de menú aún no implementada");
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

