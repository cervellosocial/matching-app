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

// Propiedad 'dependeDe': { preguntaId: "q5", valorRequerido: "A" }
const preguntas = [
  { id: "q1", texto: "¿Prefieres playa o montaña?", opA: "Playa 🏖️", opB: "Montaña ⛰️", regla: "igual" },
  { id: "q2", texto: "¿Plan de cocina ideal?", opA: "Cocinar 👨‍🍳", opB: "Comer 🍽️", regla: "opuesto" },
  { id: "q3", texto: "¿Madrugar o trasnochar?", opA: "Madrugar 🌅", opB: "Trasnochar 🌙", regla: "igual" },
  
  // Pregunta detonante (Padre)
  { id: "q4", texto: "¿Te gustan las mascotas?", opA: "Sí 🐶", opB: "No 🚫", regla: "igual" },
  
  // Pregunta condicional (Hija): Solo aparece si en q4 se responde "A" (Sí)
  { 
    id: "q4_sub", 
    texto: "¿Gatos o perros?", 
    opA: "Gatos 🐱", 
    opB: "Perros 🐶", 
    regla: "igual", 
    dependeDe: { preguntaId: "q4", valorRequerido: "A" } 
  }
];

function cargarPreguntas() {
  const container = document.getElementById("questions-container");
  if (!container) return;

  container.innerHTML = preguntas.map(q => {
    // Si la pregunta depende de otra, nace oculta con la clase 'hidden'
    const esCondicional = q.dependeDe ? "hidden" : "";
    return `
      <div class="question-block ${esCondicional}" id="block-${q.id}">
        <p><b>${q.texto}</b></p>
        <div class="options">
          <label><input type="radio" name="${q.id}" value="A" ${!q.dependeDe ? 'checked' : ''}> ${q.opA}</label>
          <label><input type="radio" name="${q.id}" value="B"> ${q.opB}</label>
        </div>
      </div>
    `;
  }).join('');

  // Escuchar cambios para mostrar/ocultar preguntas condicionales
  container.addEventListener("change", evaluarCondicionales);
}

function evaluarCondicionales() {
  preguntas.forEach(q => {
    if (q.dependeDe) {
      const padre = document.querySelector(`input[name="${q.dependeDe.preguntaId}"]:checked`);
      const bloqueHijo = document.getElementById(`block-${q.id}`);
      
      if (padre && padre.value === q.dependeDe.valorRequerido) {
        bloqueHijo.classList.remove("hidden");
        // Asegurar que haya una opción marcada al aparecer
        const marcado = bloqueHijo.querySelector(`input[name="${q.id}"]:checked`);
        if (!marcado) bloqueHijo.querySelector(`input[name="${q.id}"][value="A"]`).checked = true;
      } else {
        bloqueHijo.classList.add("hidden");
        // Desmarcar respuestas si se oculta
        const seleccionados = bloqueHijo.querySelectorAll(`input[name="${q.id}"]`);
        seleccionados.forEach(input => input.checked = false);
      }
    }
  });
}

window.guardarYEmparejar = async function() {
  const nombre = document.getElementById("username").value.trim();
  if (!nombre) return alert("Por favor, introduce tu nombre");

  const submitBtn = document.getElementById("submit-btn");
  submitBtn.innerText = "Guardando...";
  submitBtn.disabled = true;

  // Guardar solo las respuestas visibles/contestadas
  const respuestas = {};
  preguntas.forEach(q => {
    const seleccion = document.querySelector(`input[name="${q.id}"]:checked`);
    if (seleccion) {
      respuestas[q.id] = seleccion.value;
    }
  });

  const usuarioActual = { nombre, respuestas, fecha: Date.now() };

  try {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, "usuarios"));
    const usuariosGuardados = [];
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.values(data).forEach(user => usuariosGuardados.push(user));
    }

    await push(ref(db, "usuarios"), usuarioActual);

    // Lógica de compatibilidad dinámica
    const resultados = usuariosGuardados
      .filter(u => u.nombre.toLowerCase() !== nombre.toLowerCase())
      .map(u => {
        let aciertos = 0;
        let preguntasComparables = 0;

        preguntas.forEach(q => {
          const miRes = usuarioActual.respuestas[q.id];
          const suRes = u.respuestas ? u.respuestas[q.id] : null;

          // Solo se evalúa si AMBOS respondieron a esa pregunta en concreto
          if (miRes && suRes) {
            preguntasComparables++;
            if (q.regla === "igual" && miRes === suRes) {
              aciertos++;
            } else if (q.regla === "opuesto" && miRes !== suRes) {
              aciertos++;
            }
          }
        });

        const porcentaje = preguntasComparables > 0 
          ? Math.round((aciertos / preguntasComparables) * 100) 
          : 0;

        return { nombre: u.nombre, porcentaje };
      })
      .sort((a, b) => b.porcentaje - a.porcentaje);

    mostrarResultados(resultados);
  } catch (error) {
    console.error("Error en Base de Datos:", error);
    alert("Error al conectar con la base de datos.");
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
