import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, get, child } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyC9T3b1oICEdwnXp2xEOpM9IKQU0GNah5U",
  authDomain: "matchmaker-app-ab055.firebaseapp.com",
  projectId: "matchmaker-app-ab055",
  storageBucket: "matchmaker-app-ab055.firebasestorage.app",
  messagingSenderId: "485923486814",
  appId: "1:485923486814:web:1f36a7e22f13f7601048cf",
  measurementId: "G-95PP7Q5X6D"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const preguntas = [
  { id: "q1", texto: "¿Prefieres playa o montaña?", opA: "Playa 🏖️", opB: "Montaña ⛰️" },
  { id: "q2", texto: "¿Plan ideal de fin de semana?", opA: "Fiesta 🥳", opB: "Peli y manta 🍿" },
  { id: "q3", texto: "¿Madrugar o trasnochar?", opA: "Madrugar 🌅", opB: "Trasnochar 🌙" },
  { id: "q4", texto: "¿Gatos o perros?", opA: "Gatos 🐱", opB: "Perros 🐶" }
  { id: "q5", texto: "¿Música alta o tranquila?", opA: "Alta", opB: "Tranquila", regla: "igual" }
{ id: "q6", texto: "¿Hablar mucho o escuchar?", opA: "Hablar", opB: "Escuchar", regla: "opuesto" }
];

function cargarPreguntas() {
  const container = document.getElementById("questions-container");
  if (!container) return;
  container.innerHTML = preguntas.map(q => `
    <div class="question-block">
      <p><b>${q.texto}</b></p>
      <div class="options">
        <label><input type="radio" name="${q.id}" value="A" checked> ${q.opA}</label>
        <label><input type="radio" name="${q.id}" value="B"> ${q.opB}</label>
      </div>
    </div>
  `).join('');
}

window.guardarYEmparejar = async function() {
  const nombre = document.getElementById("username").value.trim();
  if (!nombre) return alert("Por favor, introduce tu nombre");

  const submitBtn = document.getElementById("submit-btn");
  submitBtn.innerText = "Guardando...";
  submitBtn.disabled = true;

  const respuestas = {};
  preguntas.forEach(q => {
    const seleccion = document.querySelector(`input[name="${q.id}"]:checked`);
    respuestas[q.id] = seleccion ? seleccion.value : "A";
  });

  const usuarioActual = { nombre, respuestas, fecha: Date.now() };

  try {
    const dbRef = ref(db);
    
    // 1. Leer usuarios existentes
    const snapshot = await get(child(dbRef, "usuarios"));
    const usuariosGuardados = [];
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.values(data).forEach(user => usuariosGuardados.push(user));
    }

    // 2. Guardar el nuevo usuario
    await push(ref(db, "usuarios"), usuarioActual);

    // 3. Comparar respuestas
    const resultados = usuariosGuardados
      .filter(u => u.nombre.toLowerCase() !== nombre.toLowerCase())
      .map(u => {
        let coincidencias = 0;
        preguntas.forEach(q => {
          if (u.respuestas && u.respuestas[q.id] === usuarioActual.respuestas[q.id]) {
            coincidencias++;
          }
        });
        const porcentaje = Math.round((coincidencias / preguntas.length) * 100);
        return { nombre: u.nombre, porcentaje };
      })
      .sort((a, b) => b.porcentaje - a.porcentaje);

    mostrarResultados(resultados);
  } catch (error) {
    console.error("Error en Base de Datos:", error);
    alert("Error al conectar. Revisa las reglas de Realtime Database.");
  } finally {
    submitBtn.innerText = "Guardar y Buscar Matches";
    submitBtn.disabled = false;
  }
};

function mostrarResultados(resultados) {
  document.getElementById("quiz-section").classList.add("hidden");
  const resultsSection = document.getElementById("results-section");
  const matchesList = document.getElementById("matches-list");
  resultsSection.classList.remove("hidden");

  if (resultados.length === 0) {
    matchesList.innerHTML = "<p>¡Eres el primer usuario guardado en la nube! Pásale la web a tus amigos para ver si coinciden.</p>";
    return;
  }

  matchesList.innerHTML = resultados.map(r => `
    <div class="match-item">
      <span>${r.nombre}</span>
      <span class="percentage">${r.porcentaje}% de Match</span>
    </div>
  `).join('');
}

window.reiniciar = function() {
  document.getElementById("quiz-section").classList.remove("hidden");
  document.getElementById("results-section").classList.add("hidden");
};

window.onload = cargarPreguntas;
