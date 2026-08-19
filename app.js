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
  { 
    id: "q1", 
    texto: "¿Prefieres obedecer o ser obedecido?", 
    opA: "Obedecer 🙇", 
    opB: "Ser obedecido 👑", 
    regla: "opuesto" 
  },
  { 
    id: "q2", 
    texto: "¿Te gustan las inmovilizaciones?", 
    opA: "Sí ⛓️", 
    opB: "No 🚫", 
    regla: "igual" 
  },
  { 
    id: "q3", 
    texto: "¿Restricciones sensoriales?", 
    opA: "Sí 🙈", 
    opB: "No 🚫", 
    regla: "igual" 
  },
  { 
    id: "q4", 
    texto: "¿Te gusta la humillación suave?", 
    opA: "Sí 😳", 
    opB: "No 🚫", 
    regla: "igual" 
  },
  { 
    id: "q5", 
    texto: "¿Prefieres 24/7 o sesiones puntuales?", 
    opA: "24/7 ⏰", 
    opB: "Sesiones puntuales 📅", 
    regla: "igual" 
  },
  
  // Pregunta detonante (Padre)
  { 
    id: "q6", 
    texto: "¿A la hora de tener relación con alguien, debéis tener la misma ideología política?", 
    opA: "Sí 🗳️", 
    opB: "No 🚫", 
    regla: "igual" 
  },
  
  // Pregunta condicional (Hija): Solo aparece si en q6 se responde "A" (Sí)
  { 
    id: "q6_sub", 
    texto: "¿De derechas o de izquierdas?", 
    opA: "Derechas ➡️", 
    opB: "Izquierdas ⬅️", 
    regla: "igual", 
    dependeDe: { preguntaId: "q6", valorRequerido: "A" } 
  }
];
function cargarPreguntas() {
  const container = document.getElementById("questions-container");
  if (!container) return;

  // Se eliminaron los atributos 'checked' para que naciendo desmarcadas por defecto
  container.innerHTML = preguntas.map(q => {
    const esCondicional = q.dependeDe ? "hidden" : "";
    return `
      <div class="question-block ${esCondicional}" id="block-${q.id}">
        <p><b>${q.texto}</b></p>
        <div class="options">
          <label><input type="radio" name="${q.id}" value="A"> ${q.opA}</label>
          <label><input type="radio" name="${q.id}" value="B"> ${q.opB}</label>
        </div>
      </div>
    `;
  }).join('');

  container.addEventListener("change", evaluarCondicionales);
}

function evaluarCondicionales() {
  preguntas.forEach(q => {
    if (q.dependeDe) {
      const padre = document.querySelector(`input[name="${q.dependeDe.preguntaId}"]:checked`);
      const bloqueHijo = document.getElementById(`block-${q.id}`);
      
      if (padre && padre.value === q.dependeDe.valorRequerido) {
        bloqueHijo.classList.remove("hidden");
      } else {
        bloqueHijo.classList.add("hidden");
        // Desmarcar respuestas si la pregunta condicional se oculta
        const seleccionados = bloqueHijo.querySelectorAll(`input[name="${q.id}"]`);
        seleccionados.forEach(input => input.checked = false);
      }
    }
  });
}

window.guardarYEmparejar = async function() {
  const nombre = document.getElementById("username").value.trim();
  if (!nombre) return alert("Por favor, introduce tu nombre.");

  // VALIDACIÓN: Verificar que todas las preguntas visibles hayan sido respondidas
  const respuestas = {};
  for (const q of preguntas) {
    const bloque = document.getElementById(`block-${q.id}`);
    const estaVisible = !bloque.classList.contains("hidden");

    if (estaVisible) {
      const seleccion = document.querySelector(`input[name="${q.id}"]:checked`);
      if (!seleccion) {
        return alert(`Por favor, responde a la pregunta: "${q.texto}"`);
      }
      respuestas[q.id] = seleccion.value;
    }
  }

  const submitBtn = document.getElementById("submit-btn");
  submitBtn.innerText = "Guardando...";
  submitBtn.disabled = true;

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

    // Comparación de respuestas
    const resultados = usuariosGuardados
      .filter(u => u.nombre.toLowerCase() !== nombre.toLowerCase())
      .map(u => {
        let aciertos = 0;
        let preguntasComparables = 0;

        preguntas.forEach(q => {
          const miRes = usuarioActual.respuestas[q.id];
          const suRes = u.respuestas ? u.respuestas[q.id] : null;

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
