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
        const seleccionados = bloqueHijo.querySelectorAll(`input[name="${q.id}"]`);
        seleccionados.forEach(input => input.checked = false);
      }
    }
  });
}

window.guardarYEmparejar = async function() {
  const nombre = document.getElementById("username").value.trim();
  const edad = parseInt(document.getElementById("user-age").value);
  const minEdad = parseInt(document.getElementById("min-age").value);
  const maxEdad = parseInt(document.getElementById("max-age").value);

  if (!nombre) return alert("Por favor, introduce tu nombre.");
  if (isNaN(edad) || edad < 18) return alert("Por favor, introduce una edad válida (mínimo 18 años).");
  if (isNaN(minEdad) || isNaN(maxEdad) || minEdad > maxEdad) {
    return alert("Por favor, selecciona un rango de edad válido.");
  }

  const respuestas = {};
  for (const q of preguntas) {
    const bloque = document.getElementById(`block-${q.id}`);
    const estaVisible = bloque && !bloque.classList.contains("hidden");

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

  const usuarioActual = { 
    nombre, 
    edad, 
    rangoBuscado: { min: minEdad, max: maxEdad }, 
    respuestas, 
    fecha: Date.now() 
  };

  try {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, "usuarios"));
    const usuariosGuardados = [];
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.values(data).forEach(user => usuariosGuardados.push(user));
    }

    await push(ref(db, "usuarios"), usuarioActual);

    // LÓGICA DE MATCH + GILICRUSH
    const resultados = usuariosGuardados
      .filter(u => u.nombre.toLowerCase() !== nombre.toLowerCase())
      .filter(u => {
        if (!u.edad || !u.rangoBuscado) return false; 
        const yoLeEncajo = usuarioActual.edad >= u.rangoBuscado.min && usuarioActual.edad <= u.rangoBuscado.max;
        const elMeEncaja = u.edad >= usuarioActual.rangoBuscado.min && u.edad <= usuarioActual.rangoBuscado.max;
        return yoLeEncajo && elMeEncaja;
      })
      .map(u => {
        let aciertos = 0;
        let desaciertos = 0;
        let preguntasComparables = 0;

        preguntas.forEach(q => {
          const miRes = usuarioActual.respuestas[q.id];
          const suRes = u.respuestas ? u.respuestas[q.id] : null;

          if (miRes && suRes) {
            preguntasComparables++;
            const esMismaOpcion = (miRes === suRes);

            if ((q.regla === "igual" && esMismaOpcion) || (q.regla === "opuesto" && !esMismaOpcion)) {
              aciertos++;
            } else {
              desaciertos++;
            }
          }
        });

        const porcentajeMatch = preguntasComparables > 0 
          ? Math.round((aciertos / preguntasComparables) * 100) 
          : 0;

        const porcentajeGilicrush = preguntasComparables > 0 
          ? Math.round((desaciertos / preguntasComparables) * 100) 
          : 0;

        // Se considera Gilicrush si la incompatibilidad es de 75% o más
        const esGilicrush = porcentajeGilicrush >= 90;

        return { 
          nombre: `${u.nombre} (${u.edad} años)`, 
          porcentajeMatch, 
          porcentajeGilicrush,
          esGilicrush
        };
      })
      .sort((a, b) => b.porcentajeMatch - a.porcentajeMatch);

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

  matchesList.innerHTML = resultados.map(r => {
    if (r.esGilicrush) {
      return `
        <div class="match-item gilicrush-item">
          <div>
            <span><b>${r.nombre}</b></span>
            <span class="gilicrush-badge">⚡ ¡TU GILICRUSH!</span>
          </div>
          <span class="percentage gilicrush-text">${r.porcentajeGilicrush}% Opuestos</span>
        </div>
      `;
    }

    return `
      <div class="match-item">
        <span>${r.nombre}</span>
        <span class="percentage">${r.porcentajeMatch}% de Match</span>
      </div>
    `;
  }).join('');
}

window.reiniciar = function() {
  document.getElementById("quiz-section").classList.remove("hidden");
  document.getElementById("results-section").classList.add("hidden");
};

window.onload = cargarPreguntas;

Paso 2: Añadir estilos para "Gilicrush" en style.css

Agrega este fragmento al final de tu archivo style.css para que las tarjetas de los Gilicrush resalten con bordes en tono rojo/sangre neón:
CSS

/* Estilos especiales para Gilicrush */
.match-item.gilicrush-item {
  border: 1px solid #991b1b;
  background: linear-gradient(135deg, #181824 0%, #2a0808 100%);
  box-shadow: 0 0 10px rgba(153, 27, 27, 0.4);
}

.gilicrush-badge {
  display: inline-block;
  background: #7f1d1d;
  color: #fecaca;
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
  border: 1px solid #dc2626;
}

.percentage.gilicrush-text {
  color: #f87171;
  text-shadow: 0 0 8px rgba(248, 113, 113, 0.5);
}
