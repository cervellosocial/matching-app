// 1. IMPORTACIONES DE FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, get, child, update, onValue, off } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
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

let listenerChatActivo = null; 
let refChatActiva = null;
let usuarioActualGlobal = null;

signInAnonymously(auth)
  .then(() => console.log("Sesión anónima iniciada"))
  .catch((e) => console.error("Error Auth:", e));

// 4. DATOS Y PREGUNTAS
const preguntasRompehielos = [
  "¿Cuál ha sido el último concierto/evento al que has ido? ¿O el próximo que tienes ganas de ir?",
"¿Algún viaje que tengas pendiente o que hayas hecho recientemente y me quieras contar?",
"¿Tienes alguna habilidad rara o inútil que sorprenda a la gente?",
  "Si pudieras cenar con tres personas (vivas o muertas), ¿con quién sería?",
"¿Qué superpoder elegirías si tuvieras que usarlo todos los días obligatoriamente?",
"Si te tocase la lotería mañana pero tuvieras que seguir trabajando en algo, ¿qué harías?",
  "¿Hay algo que la gente suele asumir de ti que no es cierto?",
"¿Qué es lo último que te ha hecho reír en voz alta?",
"¿Tienes alguna manía o ritual extraño que hagas sin pensar?"
];

const preguntas = [
  { id: "q1", texto: "¿Prefieres obedecer o ser obedecido?", opA: "Obedecer 🙇", opB: "Ser obedecido 👑", regla: "opuesto" },
  { id: "q2", texto: "¿Te gustan las inmovilizaciones?", opA: "Sí ⛓️", opB: "No 🚫", regla: "igual" },
  { id: "q3", texto: "¿Restricciones sensoriales?", opA: "Sí 🙈", opB: "No 🚫", regla: "igual" },
  { id: "q4", texto: "¿Te gusta la humillación suave?", opA: "Sí 😳", opB: "No 🚫", regla: "igual" },
  { id: "q5", texto: "¿Prefieres 24/7 o sesiones puntuales?", opA: "24/7 ⏰", opB: "Sesiones puntuales 📅", regla: "igual" },
  { id: "q6", texto: "¿A la hora de tener relación con alguien, debéis tener la misma ideología política?", opA: "Sí 🗳️", opB: "No 🚫", regla: "igual" },
  { id: "q6_sub", texto: "¿De derechas o de izquierdas?", opA: "Derechas ➡️", opB: "Izquierdas ⬅️", regla: "igual", dependeDe: { preguntaId: "q6", valorRequerido: "A" } }
];

// Helper para ID de chat único
function obtenerChatId(user1, user2) {
  return [user1.toLowerCase(), user2.toLowerCase()].sort().join("_");
}

function cargarPreguntas() {
  const container = document.getElementById("questions-container");
  if (!container) return;

  container.innerHTML = preguntas.map(q => `
    <div class="question-block ${q.dependeDe ? "hidden" : ""}" id="block-${q.id}">
      <p><b>${q.texto}</b></p>
      <div class="options">
        <label><input type="radio" name="${q.id}" value="A"> ${q.opA}</label>
        <label><input type="radio" name="${q.id}" value="B"> ${q.opB}</label>
      </div>
    </div>
  `).join('');

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
        bloqueHijo.querySelectorAll(`input[name="${q.id}"]`).forEach(input => input.checked = false);
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

  if (!nombre || !pin || pin.length !== 4) return alert("Nombre y PIN de 4 dígitos obligatorios.");

  const submitBtn = document.getElementById("submit-btn");
  submitBtn.innerText = "Verificando...";
  submitBtn.disabled = true;

  try {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, "usuarios"));
    let usuarioExistente = null;
    const otrosUsuarios = [];

    if (snapshot.exists()) {
      Object.values(snapshot.val()).forEach(u => {
        if (u.nombre.toLowerCase() === nombre.toLowerCase()) usuarioExistente = u;
        else otrosUsuarios.push(u);
      });
    }

    if (usuarioExistente) {
      if (usuarioExistente.pin !== pin) return alert("PIN incorrecto.");
      usuarioActualGlobal = usuarioExistente.nombre;
      const resultados = calcularEmparejamientos(usuarioExistente, otrosUsuarios);
      mostrarResultados(resultados, usuarioExistente.nombre);
      return;
    }

    if (isNaN(edad) || edad < 18 || isNaN(minEdad) || isNaN(maxEdad) || minEdad > maxEdad) {
      return alert("Revisa los rangos de edad.");
    }

    const respuestas = {};
    for (const q of preguntas) {
      const bloque = document.getElementById(`block-${q.id}`);
      if (bloque && !bloque.classList.contains("hidden")) {
        const sel = document.querySelector(`input[name="${q.id}"]:checked`);
        if (!sel) return alert(`Responde: "${q.texto}"`);
        respuestas[q.id] = sel.value;
      }
    }

    const nuevoUsuario = { nombre, pin, edad, rangoBuscado: { min: minEdad, max: maxEdad }, respuestas, fecha: Date.now() };
    await push(ref(db, "usuarios"), nuevoUsuario);
    usuarioActualGlobal = nombre;

    const resultados = calcularEmparejamientos(nuevoUsuario, otrosUsuarios);
    mostrarResultados(resultados, nuevoUsuario.nombre);

  } catch (e) {
    console.error(e);
    alert("Error conectando con la base de datos.");
  } finally {
    submitBtn.innerText = "Guardar y Buscar Matches";
    submitBtn.disabled = false;
  }
};

function calcularEmparejamientos(usuarioActual, listaUsuarios) {
  return listaUsuarios
    .filter(u => {
      if (!u.edad || !u.rangoBuscado) return false; 
      return usuarioActual.edad >= u.rangoBuscado.min && usuarioActual.edad <= u.rangoBuscado.max &&
             u.edad >= usuarioActual.rangoBuscado.min && u.edad <= usuarioActual.rangoBuscado.max;
    })
    .map(u => {
      let aciertos = 0, desaciertos = 0, comparables = 0;

      preguntas.forEach(q => {
        const miRes = usuarioActual.respuestas[q.id];
        const suRes = u.respuestas ? u.respuestas[q.id] : null;
        if (miRes && suRes) {
          comparables++;
          const esMisma = (miRes === suRes);
          if ((q.regla === "igual" && esMisma) || (q.regla === "opuesto" && !esMisma)) aciertos++;
          else desaciertos++;
        }
      });

      const porcentajeMatch = comparables > 0 ? Math.round((aciertos / comparables) * 100) : 0;
      const porcentajeGilicrush = comparables > 0 ? Math.round((desaciertos / comparables) * 100) : 0;

      return { 
        nombre: u.nombre, edad: u.edad, porcentajeMatch, porcentajeGilicrush,
        esMatch: porcentajeMatch >= 90, esGilicrush: porcentajeGilicrush >= 90
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
    matchesList.innerHTML = "<p>¡Perfil guardado! Aún no hay nadie con el 90% de afinidad/desafinidad.</p>";
    return;
  }

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
          <p class="icebreaker-question"><b>🎲 Pregunta sugerida:</b></p>
          <p class="question-text"><i>"${preguntaElegida}"</i></p>
          <button id="btn-send-${index}">💬 Iniciar Chat con ${r.nombre}</button>
        </div>
      </div>
    `;
  }).join('');

  resultados.forEach((r, index) => {
    const esGilicrush = r.esGilicrush;
    const textoPorcentaje = esGilicrush ? `${r.porcentajeGilicrush}% Opuestos` : `${r.porcentajeMatch}% Compatible`;
    const preguntaElegida = preguntasRompehielos[Math.floor(Math.random() * preguntasRompehielos.length)];
    
    const btn = document.getElementById(`btn-send-${index}`);
    if (btn) {
      btn.onclick = () => window.iniciarOCargarChat(miNombre, r.nombre, preguntaElegida, textoPorcentaje);
    }
  });
}

// 5. FUNCIONES GLOBALES DE CHAT Y BUZÓN

window.accederBuzon = async function() {
  const nombre = document.getElementById("login-name").value.trim().toLowerCase();
  const pin = document.getElementById("login-pin").value.trim();

  if (!nombre || !pin) return alert("Ingresa tu nombre y PIN.");

  try {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, "usuarios"));
    let usuarioValido = false;

    if (snapshot.exists()) {
      Object.values(snapshot.val()).forEach(u => {
        if (u.nombre.toLowerCase() === nombre && u.pin === pin) {
          usuarioValido = true;
          usuarioActualGlobal = u.nombre;
        }
      });
    }

    if (!usuarioValido) return alert("Nombre o PIN incorrectos.");
    await window.cargarListaChats(usuarioActualGlobal);

  } catch (e) {
    console.error(e);
    alert("Error al acceder al buzón.");
  }
};

window.cargarListaChats = async function(miNombre) {
  ocultarSecciones();
  const mailbox = document.getElementById("mailbox-section");
  const list = document.getElementById("notifications-list");
  mailbox.classList.remove("hidden");

  // Ocultar cualquier caja de envío antigua que esté fija en el HTML del buzón
  const replyBoxEstatica = mailbox.querySelector(".reply-box");
  if (replyBoxEstatica) replyBoxEstatica.style.display = "none";

  try {
    const dbRef = ref(db);
    const chatsSnapshot = await get(child(dbRef, "chats"));

    if (!chatsSnapshot.exists()) {
      list.innerHTML = "<p>Aún no tienes conversaciones abiertas.</p>";
      return;
    }

    const chatsData = chatsSnapshot.val();
    const misChats = [];

    Object.keys(chatsData).forEach(chatId => {
      const chat = chatsData[chatId];
      if (chat.participantes && chat.participantes.map(p => p.toLowerCase()).includes(miNombre.toLowerCase())) {
        const otroNombre = chat.participantes.find(p => p.toLowerCase() !== miNombre.toLowerCase());
        misChats.push({ chatId, otroNombre, porcentaje: chat.porcentaje || "", ultimoMsg: chat.ultimoMensaje || "" });
      }
    });

    if (misChats.length === 0) {
      list.innerHTML = "<p>Aún no tienes conversaciones abiertas.</p>";
      return;
    }

    list.innerHTML = misChats.map((c, idx) => `
      <div class="match-item" style="cursor: pointer;" id="chat-item-${idx}">
        <p><b>💬 Chat con ${c.otroNombre}</b> <small>(${c.porcentaje})</small></p>
        <p style="color: #ccc; font-size: 0.9em;">"${c.ultimoMsg || 'Haz clic para abrir el chat'}"</p>
      </div>
    `).join('');

    misChats.forEach((c, idx) => {
      const el = document.getElementById(`chat-item-${idx}`);
      if (el) el.onclick = () => window.abrirSalaChat(miNombre, c.otroNombre, c.porcentaje);
    });
  } catch (e) {
    console.error("Error al cargar chats:", e);
    list.innerHTML = "<p>Error al cargar la lista de chats.</p>";
  }
};

window.iniciarOCargarChat = async function(miNombre, otroNombre, primerMensaje, porcentajeText) {
  try {
    const chatId = obtenerChatId(miNombre, otroNombre);
    const chatRef = ref(db, `chats/${chatId}`);
    const snapshot = await get(chatRef);

    if (!snapshot.exists()) {
      await update(chatRef, {
        participantes: [miNombre, otroNombre],
        porcentaje: porcentajeText,
        ultimoMensaje: primerMensaje,
        fecha: Date.now()
      });

      await push(ref(db, `chats/${chatId}/mensajes`), {
        de: miNombre,
        texto: primerMensaje,
        fecha: Date.now()
      });
    }

    window.abrirSalaChat(miNombre, otroNombre, porcentajeText);
  } catch (e) {
    console.error("Error al crear/iniciar chat:", e);
    alert("Ocurrió un error al abrir la sala de chat.");
  }
};

window.abrirSalaChat = function(miNombre, otroNombre, porcentajeText) {
  ocultarSecciones();
  const mailbox = document.getElementById("mailbox-section");
  const list = document.getElementById("notifications-list");
  mailbox.classList.remove("hidden");

  // Ocultar elementos estáticos del HTML que interfieren con la interfaz del chat
  const replyBoxEstatica = mailbox.querySelector(".reply-box");
  if (replyBoxEstatica) replyBoxEstatica.style.display = "none";

  const chatId = obtenerChatId(miNombre, otroNombre);

  list.innerHTML = `
    <div style="margin-bottom: 12px; text-align: left;">
      <button onclick="window.cargarListaChats('${miNombre}')" style="padding: 8px 14px; cursor: pointer; border-radius: 6px;">⬅️ Volver a mis chats</button>
      <h3 style="margin-top:10px; color: #ffffff;">💬 Chat con ${otroNombre} <small style="color: #ccc;">(${porcentajeText})</small></h3>
    </div>
    
    <div id="chat-messages-box" style="height: 280px; overflow-y: auto; border: 1px solid #444; padding: 12px; border-radius: 8px; background: #ffffff !important; margin-bottom: 12px; text-align: left;">
      <p style="color: #374151;">Cargando mensajes...</p>
    </div>
    
    <!-- Nueva barra de entrada de texto sustituta e independiente -->
    <div style="display: flex !important; flex-direction: column !important; gap: 8px !important; width: 100% !important; box-sizing: border-box !important;">
      <input 
        type="text" 
        id="chat-input" 
        placeholder="Escribe tu mensaje aquí..." 
        style="width: 100% !important; height: 48px !important; padding: 0 14px !important; font-size: 16px !important; color: #000000 !important; background-color: #ffffff !important; border: 2px solid #888 !important; border-radius: 6px !important; box-sizing: border-box !important; display: block !important;" 
      />
      <button 
        id="btn-send-msg" 
        style="width: 100% !important; height: 44px !important; font-size: 16px !important; font-weight: bold !important; cursor: pointer !important; border-radius: 6px !important; background: #9d174d !important; color: #ffffff !important; border: none !important;"
      >
        Enviar mensaje
      </button>
    </div>
  `;

  if (refChatActiva && listenerChatActivo) {
    off(refChatActiva, "value", listenerChatActivo);
  }

  const msgsRef = ref(db, `chats/${chatId}/mensajes`);
  refChatActiva = msgsRef;
listenerChatActivo = onValue(msgsRef, (snapshot) => {
    const box = document.getElementById("chat-messages-box");
    if (!box) return;

    if (snapshot.exists()) {
      const msgsObj = snapshot.val();
      const msgsArray = Object.values(msgsObj);

      // 1. Renderizar mensajes normales
      let htmlContent = msgsArray.map(m => {
        const esMio = m.de.toLowerCase() === miNombre.toLowerCase();
        const alineacion = esMio ? "text-align: right;" : "text-align: left;";
        const fondoBurbuja = esMio ? "#dcf8c6" : "#f1f5f9";

        return `
          <div style="${alineacion} margin-bottom: 10px;">
            <div style="display: inline-block; background: ${fondoBurbuja} !important; padding: 10px 14px; border-radius: 12px; border: 1px solid #cbd5e1; max-width: 85%; text-align: left; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
              <small style="color: #000000 !important; font-size: 0.85em; font-weight: bold; display: block; margin-bottom: 2px;">${m.de}</small>
              <span style="font-size: 15px !important; line-height: 1.3 !important; color: #000000 !important; font-weight: 500 !important;">${m.texto}</span>
            </div>
          </div>
        `;
      }).join('');

      // 2. Contar interacción de ambos usuarios
      const misMensajes = msgsArray.filter(m => m.de.toLowerCase() === miNombre.toLowerCase()).length;
      const susMensajes = msgsArray.filter(m => m.de.toLowerCase() === otroNombre.toLowerCase()).length;

      // 3. Inyectar eventos según el número de respuestas
      if (misMensajes >= 3 && susMensajes >= 3) { //Aquí CAMBIAS EL MENSAJE DEL CHAT TRAS EL TERCER MENSAJE DE AMBOS
        htmlContent += `
          <div style="background: linear-gradient(135deg, #fbcfe8 0%, #f472b6 100%); border: 2px dashed #be185d; padding: 12px; border-radius: 10px; margin: 15px 0; text-align: center; color: #831843; box-shadow: 0 2px 5px rgba(0,0,0,0.15);">
            <p style="font-weight: bold; font-size: 15px; margin: 0 0 4px 0;">🔥 ¡CUPIDO DETECTA BUENA QUÍMICA!</p>
            <p style="font-size: 13px; margin: 0 0 8px 0; line-height: 1.3;">Habéis superado los 3 mensajes básicos. Desafío rápido: <b>¿Cuál es vuestro mayor defecto al empezar a conocer a alguien?</b></p>
          </div>
        `;
      }

      box.innerHTML = htmlContent;
      box.scrollTop = box.scrollHeight;
    } else {
      box.innerHTML = "<p style='color: #6b7280;'>No hay mensajes aún.</p>";
    }
  });

  const btnSend = document.getElementById("btn-send-msg");
  const inputEl = document.getElementById("chat-input");

  const enviar = async () => {
    const txt = inputEl.value.trim();
    if (!txt) return;

    inputEl.value = "";
    try {
      await push(ref(db, `chats/${chatId}/mensajes`), { de: miNombre, texto: txt, fecha: Date.now() });
      await update(ref(db, `chats/${chatId}`), { ultimoMensaje: txt, fecha: Date.now() });
    } catch (e) {
      console.error("Error al enviar mensaje:", e);
      alert("No se pudo enviar el mensaje.");
    }
  };

  btnSend.onclick = enviar;
  inputEl.onkeypress = (e) => { if (e.key === 'Enter') enviar(); };
};

window.mostrarSeccion = function(id) {
  ocultarSecciones();
  document.getElementById(id).classList.remove("hidden");
};

function ocultarSecciones() {
  if (refChatActiva && listenerChatActivo) {
    off(refChatActiva, "value", listenerChatActivo);
    listenerChatActivo = null;
    refChatActiva = null;
  }
  ['mode-selector', 'quiz-section', 'login-section', 'mailbox-section', 'results-section'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });
}

window.onload = cargarPreguntas;
