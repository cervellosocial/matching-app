// 1. IMPORTACIONES DE FIREBASE (Todas vía CDN oficial)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, get, child, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 2. CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyC9T3b1oICEdwnXp2xEOpM9IKQU0GNah5U",
  authDomain: "matchmaker-app-ab055.firebaseapp.com",
  projectId: "matchmaker-app-ab055",
  storageBucket: "matchmaker-app-ab055.firebasestorage.app",
  messagingSenderId: "485923486814",
  appId: "1:485923486814:web:1f36a7e22f13f7601048cf",
  measurementId: "G-95PP7Q5X6D"
};

// 3. INICIALIZACIÓN DE SERVICIOS
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

signInAnonymously(auth)
  .then(() => {
    console.log("Sesión anónima iniciada con éxito en Firebase");
  })
  .catch((error) => {
    console.error("Error en autenticación anónima:", error);
  });

// 4. DATOS Y PREGUNTAS
const preguntasRompehielos = [
  "¿Si pudieras viajar a cualquier sitio mañana, a dónde irías?",
  "¿Cuál es tu película o serie favorita de todos los tiempos?",
  "¿Plan de fiesta hasta tarde o noche tranquila en casa?",
  "¿Qué alimento o comida nunca probarías jamás?",
  "¿Cuál es tu mayor placer culpable?"
];

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
  { 
    id: "q6", 
    texto: "¿A la hora de tener relación con alguien, debéis tener la misma ideología política?", 
    opA: "Sí 🗳️", 
    opB: "No 🚫", 
    regla: "igual" 
  },
  { 
    id: "q6_sub", 
    texto: "¿De derechas o de izquierdas?", 
    opA: "Derechas ➡️", 
    opB: "Izquierdas ⬅️", 
    regla: "igual", 
    dependeDe: { preguntaId: "q6", valorRequerido: "A" } 
  }
];

// 5. LÓGICA DE LA APLICACIÓN

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
  const pin = document.getElementById("user-pin").value.trim();
  const edad = parseInt(document.getElementById("user-age").value);
  const minEdad = parseInt(document.getElementById("min-age").value);
  const maxEdad = parseInt(document.getElementById("max-age").value);

  if (!nombre) return alert("Por favor, introduce tu nombre.");
  if (!pin || pin.length !== 4) return alert("Introduce un PIN de 4 dígitos.");

  const submitBtn = document.getElementById("submit-btn");
  submitBtn.innerText = "Verificando...";
  submitBtn.disabled = true;

  try {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, "usuarios"));
    let usuarioExistente = null;
    const otrosUsuarios = [];

    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.values(data).forEach(u => {
        if (u.nombre.toLowerCase() === nombre.toLowerCase()) {
          usuarioExistente = u;
        } else {
          otrosUsuarios.push(u);
        }
      });
    }

    // BLOQUEO DE TEST REPETIDO: Si ya existe, validamos PIN y le enseñamos resultados directamente
    if (usuarioExistente) {
      if (usuarioExistente.pin !== pin) {
        alert("Este nombre ya ha completado el test. El PIN introducido es incorrecto.");
        return;
      }

      alert(`¡Hola de nuevo, ${usuarioExistente.nombre}! Ya habías completado el test. Te mostramos tus matches actualizados.`);
      
      const resultados = calcularEmparejamientos(usuarioExistente, otrosUsuarios);
      mostrarResultados(resultados, usuarioExistente.nombre);
      return;
    }

    // VALIDACIONES PARA USUARIO NUEVO
    if (isNaN(edad) || edad < 18) return alert("Introduce una edad válida.");
    if (isNaN(minEdad) || isNaN(maxEdad) || minEdad > maxEdad) return alert("Rango de edad inválido.");

    const respuestas = {};
    for (const q of preguntas) {
      const bloque = document.getElementById(`block-${q.id}`);
      if (bloque && !bloque.classList.contains("hidden")) {
        const seleccion = document.querySelector(`input[name="${q.id}"]:checked`);
        if (!seleccion) return alert(`Por favor, responde: "${q.texto}"`);
        respuestas[q.id] = seleccion.value;
      }
    }

    const nuevoUsuario = { 
      nombre, 
      pin,
      edad, 
      rangoBuscado: { min: minEdad, max: maxEdad }, 
      respuestas, 
      fecha: Date.now() 
    };

    // Registrar nuevo usuario por primera vez
    await push(ref(db, "usuarios"), nuevoUsuario);

    const resultados = calcularEmparejamientos(nuevoUsuario, otrosUsuarios);
    mostrarResultados(resultados, nuevoUsuario.nombre);

  } catch (error) {
    console.error("Error:", error);
    alert("Error al conectar con la base de datos.");
  } finally {
    submitBtn.innerText = "Guardar y Buscar Matches";
    submitBtn.disabled = false;
  }
};

function calcularEmparejamientos(usuarioActual, listaUsuarios) {
  return listaUsuarios
    .filter(u => {
      if (!u.edad || !u.rangoBuscado) return false; 
      const yoLeEncajo = usuarioActual.edad >= u.rangoBuscado.min && usuarioActual.edad <= u.rangoBuscado.max;
      const elMeEncaja = u.edad >= usuarioActual.rangoBuscado.min && u.edad <= usuarioActual.rangoBuscado.max;
      return yoLeEncajo && elMeEncaja;
    })
    .map(u => {
      let aciertos = 0;
      let desaciertos = 0;
      let comparables = 0;

      preguntas.forEach(q => {
        const miRes = usuarioActual.respuestas[q.id];
        const suRes = u.respuestas ? u.respuestas[q.id] : null;

        if (miRes && suRes) {
          comparables++;
          const esMisma = (miRes === suRes);
          if ((q.regla === "igual" && esMisma) || (q.regla === "opuesto" && !esMisma)) {
            aciertos++;
          } else {
            desaciertos++;
          }
        }
      });

      const porcentajeMatch = comparables > 0 ? Math.round((aciertos / comparables) * 100) : 0;
      const porcentajeGilicrush = comparables > 0 ? Math.round((desaciertos / comparables) * 100) : 0;

      return { 
        nombre: u.nombre, 
        edad: u.edad,
        porcentajeMatch, 
        porcentajeGilicrush,
        esMatch: porcentajeMatch >= 90,        // Requiere mínimo 90%
        esGilicrush: porcentajeGilicrush >= 90 // Requiere mínimo 90%
      };
    })
    .filter(r => r.esMatch || r.esGilicrush) 
    .sort((a, b) => b.porcentajeMatch - a.porcentajeMatch);
}

function mostrarResultados(resultados, miNombre) {
  ocultarSecciones();
  const resultsSection = document.getElementById("results-section");
  const matchesList = document.getElementById("matches-list");
  resultsSection.classList.remove("hidden");

  if (resultados.length === 0) {
    matchesList.innerHTML = "<p>¡Perfil guardado! Aún no hay nadie que alcance el 90% de compatibilidad o incompatibilidad con tus respuestas.</p>";
    return;
  }

  // Plantillas de las tarjetas
  matchesList.innerHTML = resultados.map((r, index) => {
    const esGilicrush = r.esGilicrush;
    const claseCard = esGilicrush ? "match-item gilicrush-item" : "match-item";
    const etiqueta = esGilicrush ? "⚡ ¡TU GILICRUSH!" : "💘 ¡NUEVO MATCH!";
    const textoPorcentaje = esGilicrush ? `${r.porcentajeGilicrush}% Opuestos` : `${r.porcentajeMatch}% Compatible`;

    const preguntaElegida = preguntasRompehielos[Math.floor(Math.random() * preguntasRompehielos.length)];

    return `
      <div class="${claseCard}">
        <div class="match-header">
          <h3>${etiqueta}</h3>
          <p>Has conectado con <b>${r.nombre} (${r.edad} años)</b> - <b>${textoPorcentaje}</b></p>
        </div>
        
        <div class="icebreaker-box">
          <p class="icebreaker-question"><b>🎲 Pregunta Rompehielos para ${r.nombre}:</b></p>
          <p class="question-text"><i>"${preguntaElegida}"</i></p>
          <button id="btn-send-${index}">
            🎲 Enviar pregunta a ${r.nombre} para romper el hielo
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Asignación segura de eventos para evitar fallos
  resultados.forEach((r, index) => {
    const esGilicrush = r.esGilicrush;
    const textoPorcentaje = esGilicrush ? `${r.porcentajeGilicrush}% Opuestos` : `${r.porcentajeMatch}% Compatible`;
    const preguntaElegida = preguntasRompehielos[Math.floor(Math.random() * preguntasRompehielos.length)];
    
    const btn = document.getElementById(`btn-send-${index}`);
    if (btn) {
      btn.onclick = () => enviarPreguntaAC(r.nombre, miNombre, preguntaElegida, textoPorcentaje, index);
    }
  });
}

window.enviarPreguntaAC = async function(destinoNombre, miNombre, pregunta, porcentajeText, index) {
  const btnEl = document.getElementById(`btn-send-${index}`);
  if (btnEl) {
    btnEl.disabled = true;
    btnEl.innerText = "Enviando...";
  }

  try {
    await push(ref(db, `notificaciones/${destinoNombre.toLowerCase()}`), {
      de: miNombre,
      tipo: "Pregunta 🎲",
      pregunta: pregunta,
      porcentaje: porcentajeText,
      respuestaReceptor: "",
      respondido: false,
      fecha: Date.now()
    });

    if (btnEl) {
      btnEl.innerText = "✅ ¡Pregunta enviada a su buzón!";
      btnEl.style.background = "#22c55e";
    }
  } catch (e) {
    console.error(e);
    alert("Error al enviar la pregunta.");
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.innerText = "Reintentar";
    }
  }
};

window.accederBuzon = async function() {
  const nombre = document.getElementById("login-name").value.trim().toLowerCase();
  const pin = document.getElementById("login-pin").value.trim();

  if (!nombre || !pin) return alert("Ingresa tu nombre y PIN.");

  try {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, "usuarios"));
    let usuarioValido = false;

    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.values(data).forEach(u => {
        if (u.nombre.toLowerCase() === nombre && u.pin === pin) {
          usuarioValido = true;
        }
      });
    }

    if (!usuarioValido) {
      return alert("Nombre o PIN incorrectos.");
    }

    await cargarBuzon(nombre);

  } catch (e) {
    console.error(e);
    alert("Error al acceder al buzón.");
  }
};

async function cargarBuzon(nombreUsuario) {
  const dbRef = ref(db);
  const notifSnapshot = await get(child(dbRef, `notificaciones/${nombreUsuario}`));
  
  ocultarSecciones();
  const mailbox = document.getElementById("mailbox-section");
  const list = document.getElementById("notifications-list");
  mailbox.classList.remove("hidden");

  if (notifSnapshot.exists()) {
    const notifsObj = notifSnapshot.val();
    const notifKeys = Object.keys(notifsObj).reverse();

    list.innerHTML = notifKeys.map(key => {
      const n = notifsObj[key];
      const porcentajeDisplay = n.porcentaje ? n.porcentaje : "";

      // PASO 1: Pregunta recibida
      if (n.tipo === "Pregunta 🎲") {
        if (n.respondido) {
          return `
            <div class="match-item">
              <p><b>🎲 Pregunta de ${n.de} ${porcentajeDisplay ? `(${porcentajeDisplay})` : ''}:</b> <i>"${n.pregunta}"</i></p>
              <p style="color: #22c55e;"><b>Tu respuesta enviada:</b> "${n.respuestaReceptor}"</p>
            </div>
          `;
        } else {
          return `
            <div class="match-item gilicrush-item">
              <p><b>🎲 ¡${n.de} te ha enviado una pregunta rompehielos! ${porcentajeDisplay ? `(${porcentajeDisplay})` : ''}</b></p>
              <p class="icebreaker-question"><i>"${n.pregunta}"</i></p>
              <div class="reply-box">
                <input type="text" id="reply-input-${key}" placeholder="Escribe tu respuesta para ${n.de}..." />
                <button id="btn-reply-${key}">Responder a ${n.de}</button>
              </div>
            </div>
          `;
        }
      }

      // PASO 2: Respuesta recibida (Con opción de réplica)
      if (n.tipo === "Respuesta 💬") {
        if (n.respondido) {
          return `
            <div class="match-item">
              <p><b>💬 ¡${n.de} respondió a tu pregunta! ${porcentajeDisplay ? `(${porcentajeDisplay})` : ''}</b></p>
              <p class="question-text"><b>Su respuesta:</b> "${n.respuesta}"</p>
              <p style="color: #22c55e;"><b>Tu réplica enviada:</b> "${n.respuestaFinal}"</p>
            </div>
          `;
        } else {
          return `
            <div class="match-item gilicrush-item">
              <p><b>💬 ¡${n.de} ha respondido a tu pregunta! ${porcentajeDisplay ? `(${porcentajeDisplay})` : ''}</b></p>
              <p class="question-text"><b>Respuesta:</b> "${n.respuesta}"</p>
              <div class="reply-box">
                <input type="text" id="reply-input-${key}" placeholder="Escribe una última respuesta para ${n.de}..." />
                <button id="btn-final-${key}">Enviar réplica a ${n.de}</button>
              </div>
            </div>
          `;
        }
      }

      // PASO 3: Réplica final recibida (Mensaje de cierre definitivo)
      if (n.tipo === "Respuesta Final 💬") {
        return `
          <div class="match-item">
            <p><b>💬 Réplica final de ${n.de} ${porcentajeDisplay ? `(${porcentajeDisplay})` : ''}:</b></p>
            <p class="question-text">"${n.respuesta}"</p>
          </div>
        `;
      }

      return `
        <div class="match-item">
          <p><b>${n.tipo}</b> con <b>${n.de}</b> ${porcentajeDisplay ? `(${porcentajeDisplay})` : ''}</p>
        </div>
      `;
    }).join('');

    // Asignar los eventos onclick a cada tipo de botón
    notifKeys.forEach(key => {
      const n = notifsObj[key];
      if (n.tipo === "Pregunta 🎲" && !n.respondido) {
        const btnReply = document.getElementById(`btn-reply-${key}`);
        if (btnReply) {
          btnReply.onclick = () => responderPregunta(nombreUsuario, key, n.de, n.porcentaje || "");
        }
      }
      if (n.tipo === "Respuesta 💬" && !n.respondido) {
        const btnFinal = document.getElementById(`btn-final-${key}`);
        if (btnFinal) {
          btnFinal.onclick = () => enviarRespuestaFinal(nombreUsuario, key, n.de, n.porcentaje || "");
        }
      }
    });

  } else {
    list.innerHTML = "<p>Tu buzón está vacío como el cerebro de algunos influencers.</p>";
  }
}

window.responderPregunta = async function(miNombre, notifKey, nombreEmisor, porcentajeText) {
  const inputEl = document.getElementById(`reply-input-${notifKey}`);
  const respuestaText = inputEl ? inputEl.value.trim() : "";

  if (!respuestaText) {
    return alert("Escribe tu respuesta antes de enviarla.");
  }

  try {
    const updates = {};
    updates[`notificaciones/${miNombre}/${notifKey}/respuestaReceptor`] = respuestaText;
    updates[`notificaciones/${miNombre}/${notifKey}/respondido`] = true;
    await update(ref(db), updates);

    await push(ref(db, `notificaciones/${nombreEmisor.toLowerCase()}`), {
      de: miNombre,
      tipo: "Respuesta 💬",
      respuesta: respuestaText,
      porcentaje: porcentajeText || "",
      fecha: Date.now()
    });

    alert("¡Respuesta enviada con éxito!");
    cargarBuzon(miNombre);
  } catch (e) {
    console.error(e);
    alert("Error al responder la pregunta.");
  }
};

window.enviarRespuestaFinal = async function(miNombre, notifKey, nombreEmisor, porcentajeText) {
  const inputEl = document.getElementById(`reply-input-${notifKey}`);
  const respuestaText = inputEl ? inputEl.value.trim() : "";

  if (!respuestaText) {
    return alert("Escribe tu respuesta antes de enviarla.");
  }

  try {
    const updates = {};
    updates[`notificaciones/${miNombre}/${notifKey}/respuestaFinal`] = respuestaText;
    updates[`notificaciones/${miNombre}/${notifKey}/respondido`] = true;
    await update(ref(db), updates);

    await push(ref(db, `notificaciones/${nombreEmisor.toLowerCase()}`), {
      de: miNombre,
      tipo: "Respuesta Final 💬",
      respuesta: respuestaText,
      porcentaje: porcentajeText || "",
      fecha: Date.now()
    });

    alert("¡Réplica enviada con éxito!");
    cargarBuzon(miNombre);
  } catch (e) {
    console.error(e);
    alert("Error al enviar la réplica.");
  }
};

window.mostrarSeccion = function(id) {
  ocultarSecciones();
  document.getElementById(id).classList.remove("hidden");
};

function ocultarSecciones() {
  ['mode-selector', 'quiz-section', 'login-section', 'mailbox-section', 'results-section'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });
}

window.onload = cargarPreguntas;
