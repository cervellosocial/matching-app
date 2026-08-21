window.toggleInteresTodos = function(elTodos) {
  const items = document.querySelectorAll('.gen-interest-item');
  items.forEach(item => {
    item.checked = elTodos.checked;
  });
};
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
let listenerJuegoActivo = null;
let refJuegoActiva = null;
let usuarioActualGlobal = null;

signInAnonymously(auth)
  .then(() => console.log("Sesión anónima iniciada"))
  .catch((e) => console.error("Error Auth:", e));

// 4. DATOS, PREGUNTAS Y REGLAS
const preguntas = [
  { id: "q1", texto: "¿Prefieres obedecer o ser obedecido?", opA: "Obedecer 🙇", opB: "Ser obedecido 👑", regla: "opuesto" },
  { id: "q2", texto: "¿Te gustan las inmovilizaciones?", opA: "Sí ⛓️", opB: "No 🚫", regla: "igual" },
  { id: "q3", texto: "¿Restricciones sensoriales?", opA: "Sí 🙈", opB: "No 🚫", regla: "igual" },
  { id: "q4", texto: "¿Te gusta la humillación suave?", opA: "Sí 😳", opB: "No 🚫", regla: "igual" },
  { id: "q5", texto: "¿Prefieres 24/7 o sesiones puntuales?", opA: "24/7 ⏰", opB: "Sesiones puntuales 📅", regla: "igual" },
  { id: "q6", texto: "¿A la hora de tener relación con alguien, debéis tener la misma ideología política?", opA: "Sí 🗳️", opB: "No 🚫", regla: "igual" },
  { id: "q6_sub", texto: "¿De derechas o de izquierdas?", opA: "Derechas ➡️", opB: "Izquierdas ⬅️", regla: "igual", dependeDe: { preguntaId: "q6", valorRequerido: "A" } },
  { id: "q_chat_pref", texto: "¿Qué tipo de experiencia de chat prefieres?", opA: "🎲 Pregunta aleatoria / Rompehielos", opB: "📜 Reglas de comportamiento y juegos", regla: "igual" }
];

// GRUPO 1: PREGUNTAS CASUALES (Chat Rompehielos)
const preguntasRompehielosCasual = [
  "Si tuvieras que crear un nuevo sabor de helado que no existe, ¿cuál sería y qué nombre le pondrías?",
  "¿Cuál es tu talento inútil favorito que te hace sentir increíblemente orgulloso/a?",
  "Si pudieras elegir un tema musical que sonara cada vez que entras a una habitación, ¿cuál sería?",
  "¿Qué animal te representa el lunes por la mañana y cuál el viernes por la tarde?",
  "Si fueras un villano de película, ¿cuál sería tu plan maestro y por qué siempre fracasaría al final?",
  "¿Cuál es esa cosa que todo el mundo parece amar pero tú secretamente odias?",
  "Si tu personalidad fuera un cóctel, ¿qué ingredientes llevaría y cómo se llamaría?",
  "¿Cuál es tu comida \"culpable\" que te comerías sin vergüenza frente a un chef de tres estrellas Michelin?",
  "¿Qué serie o película podrías ver una y otra vez sin cansarte jamás?",
  "Si tuvieras que vivir en un universo de ficción (sin poder volver), ¿cuál elegirías para no aburrirte nunca?",
  "Si despertaras con la habilidad de hablar con los objetos de tu casa, ¿cuál sería el primero con el que hablarías y qué le preguntarías?",
  "Si tuvieras que reemplazar tu mano derecha por un utensilio de cocina durante una semana, ¿cuál elegirías y cómo te las arreglarías?",
  "Si pudieras ser el director de un reality show durante un día, ¿a quién seguirías y qué título le pondrías al episodio?",
  "Si un genio te concediera el poder de hacer una tarea cotidiana de forma mágica, ¿cuál sería y por qué?",
  "Si tuvieras que crear una ley tonta pero obligatoria para todo el mundo durante un día, ¿cuál sería?",
  "¿Qué superpoder sería el más práctico para la vida diaria (sin ser algo obvio como volar o ser invisible)?",
  "Si tuvieras que elegir entre solo poder comer alimentos de un color durante un mes o solo escuchar una canción en bucle, ¿cuál elegirías?",
  "¿Cuál es tu estrategia infalible para procrastinar de forma creativa?",
  "Si pudieras eliminar una pequeña molestia del mundo para siempre (como los calcetines que desaparecen o los atascos), ¿cuál sería?",
  "¿Qué es algo que siempre quisiste probar pero nunca te has atrevido?"
];

// GRUPO 2: PREGUNTAS DE ROL Y LÍMITES (Chat Protocolar)
const preguntasRompehielosProtocolar = [
 
 
  "¿Qué vivencia dentro del BDSM te gustaría volver a vivir y por qué?",
  "¿Qué escenario te resulta más excitante: un lugar público y arriesgado o un espacio privado y controlado?",
  "¿Cuál es la fantasía que aún no has cumplido y más te gustaría experimentar?",
  "¿Estarías dispuesto/a a entregar o recibir el control total de los sentidos durante una sesión?",
  "¿Qué situación de intercambio de poder te ha generado la adrenalina más intensa hasta ahora?",
  "¿Qué elemento (cuerda, cuero, metal) despierta en ti una respuesta más fuerte y por qué?",
  "¿Qué límite tuyo ha sido desafiado de la manera más placentera?",
  "¿Qué tipo de juego (sensación, poder, rol) te ha provocado las emociones más profundas?",
  "¿Qué es lo más extremo que te gustaría probar bajo las condiciones adecuadas?",
  "¿Estarías dispuesto/a a participar en una experiencia sin saber qué esperar, confiando solo en tu pareja?",
  "¿Qué ambiente (iluminación, música, temperatura) consideras fundamental para una sesión inolvidable?",
  "¿Qué es lo que más te ha sorprendido de ti mismo/a en una situación límite?",
  "¿Qué tipo de negación (orgásmica, de movimiento, sensorial) te resulta más estimulante, ya sea aplicándola o recibiéndola?",
  "¿Qué es lo más largo que has estado en una dinámica de poder continua y qué sentiste al terminar?",
  "¿Estarías dispuesto/a a explorar una dinámica de poder intensa durante un fin de semana?",
  "¿Qué escenario natural (un bosque, la playa) te gustaría que fuera el escenario de una de tus vivencias?",
  "¿Qué es lo que más valoras que haga tu pareja después de una sesión intensa?",
  "¿Qué tipo de marca temporal (un arañazo, un morado) conservas o te gusta dejar con más gusto y por qué?",
  "¿Qué es lo más lejos que llegarías para explorar una fantasía junto a tu pareja?",
  "¿Qué situación de vulnerabilidad o de máxima responsabilidad te ha llevado a experimentar el mayor placer?"


];

// REGLAS DE COMPORTAMIENTO ALEATORIAS (Chat Protocolar)
const conjuntosDeNormas = [
  "Habéis entrado en un sala de baño en el mundo Goreano. Aquí las/os kajirae son tratadas como posesiones; su valor es menor que el de una vaca o un caballo, y pueden ser utilizadas en cualquier momento y lugar. Su poder de decisión es nulo. ",
  "Vuestras aldeas están en conflicto y uno de vosotros ha sido apresado por el otro e inmovilizado en un establo.",
  "Estáis en un laboratorio ciberpunk. Uno de vosotros ha hackeado el sistema neuronal del otro, tomando el control sobre la capacidad de decisión del otro. ",
  "Uno de vosotros ha cometido un delito y ha sido capturado por el otro, policía de profesión. Para ser liberado y librarte de la carcel, el detenido acepta el chantaje del otro."
];

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
      if (!bloqueHijo) return;
      
      if (padre && padre.value === q.dependeDe.valorRequerido) {
        bloqueHijo.classList.remove("hidden");
      } else {
        bloqueHijo.classList.add("hidden");
        bloqueHijo.querySelectorAll(`input[name="${q.id}"]`).forEach(input => input.checked = false);
      }
    }
  });
}

// 5. MÉTODOS EXPUESTOS A WINDOW PARA EVENTOS
window.mostrarSeccion = function(id) {
  ocultarSecciones();
  const el = document.getElementById(id);
  if (el) el.classList.remove("hidden");
};

function ocultarSecciones() {
  if (refChatActiva && listenerChatActivo) {
    off(refChatActiva, "value", listenerChatActivo);
    listenerChatActivo = null;
    refChatActiva = null;
  }
  if (refJuegoActiva && listenerJuegoActivo) {
    off(refJuegoActiva, "value", listenerJuegoActivo);
    listenerJuegoActivo = null;
    refJuegoActiva = null;
  }
  ['mode-selector', 'quiz-section', 'login-section', 'mailbox-section', 'results-section'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });
}

window.guardarYEmparejar = async function() {
  const nombreInput = document.getElementById("username");
  const pinInput = document.getElementById("user-pin");
  const edadInput = document.getElementById("user-age");
  const minEdadInput = document.getElementById("min-age");
  const maxEdadInput = document.getElementById("max-age");

  if (!nombreInput || !pinInput) return alert("Error interno: Faltan inputs del formulario.");

  const nombre = nombreInput.value.trim();
  const pin = pinInput.value.trim();
  const edad = edadInput ? parseInt(edadInput.value) : 18;
  const minEdad = minEdadInput ? parseInt(minEdadInput.value) : 18;
  const maxEdad = maxEdadInput ? parseInt(maxEdadInput.value) : 99;

  if (!nombre || !pin || pin.length !== 4) return alert("El Nombre y un PIN exacto de 4 dígitos son obligatorios.");

  // EXTRAER GÉNERO
  const generoSel = document.querySelector('input[name="user-gender"]:checked');
  if (!generoSel) return alert("Por favor, selecciona tu género.");
  const genero = generoSel.value;

  // EXTRAER INTERESES DE GÉNERO
  const interesesSel = Array.from(document.querySelectorAll('.gen-interest-item:checked')).map(el => el.value);
  const todosMarcado = document.getElementById("gen-interest-todos")?.checked;

  if (!todosMarcado && interesesSel.length === 0) {
    return alert("Por favor, selecciona al menos un género de tu interés (o 'Todos').");
  }

  const interesGenero = todosMarcado ? ["todos"] : interesesSel;

  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) {
    submitBtn.innerText = "Verificando...";
    submitBtn.disabled = true;
  }

  try {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, "usuarios"));
    let usuarioExistente = null;
    const otrosUsuarios = [];

    if (snapshot.exists()) {
      Object.values(snapshot.val()).forEach(u => {
        if (u.nombre && u.nombre.toLowerCase() === nombre.toLowerCase()) usuarioExistente = u;
        else otrosUsuarios.push(u);
      });
    }

    if (usuarioExistente) {
      if (usuarioExistente.pin !== pin) {
        alert("Este nombre ya está registrado con otro PIN.");
        if (submitBtn) { submitBtn.innerText = "Guardar y Buscar Matches"; submitBtn.disabled = false; }
        return;
      }
      
      alert("⚠️ Usuario verificado. Accediendo a tus chats.");
      usuarioActualGlobal = usuarioExistente.nombre;
      localStorage.setItem("sesion_usuario", JSON.stringify({ nombre: usuarioExistente.nombre, pin }));
      
      await window.cargarListaChats(usuarioExistente.nombre);
      return;
    }

    const respuestas = {};
    for (const q of preguntas) {
      const bloque = document.getElementById(`block-${q.id}`);
      if (bloque && !bloque.classList.contains("hidden")) {
        const sel = document.querySelector(`input[name="${q.id}"]:checked`);
        if (!sel) {
          if (submitBtn) { submitBtn.innerText = "Guardar y Buscar Matches"; submitBtn.disabled = false; }
          return alert(`Responde a la pregunta: "${q.texto}"`);
        }
        respuestas[q.id] = sel.value;
      }
    }

    const nuevoUsuario = { 
      nombre, 
      pin, 
      edad, 
      genero, 
      interesGenero, 
      rangoBuscado: { min: minEdad, max: maxEdad }, 
      respuestas, 
      fecha: Date.now() 
    };
    
    await push(ref(db, "usuarios"), nuevoUsuario);
    
    usuarioActualGlobal = nombre;
    localStorage.setItem("sesion_usuario", JSON.stringify({ nombre, pin }));

    const resultados = calcularEmparejamientos(nuevoUsuario, otrosUsuarios);
    mostrarResultados(resultados, nuevoUsuario.nombre);

  } catch (e) {
    console.error("Error al guardar/emparejar:", e);
    alert("Ocurrió un error al guardar en la base de datos: " + e.message);
  } finally {
    if (submitBtn) {
      submitBtn.innerText = "Guardar y Buscar Matches";
      submitBtn.disabled = false;
    }
  }
};

function calcularEmparejamientos(usuarioActual, listaUsuarios) {
  return listaUsuarios
    .filter(u => {
      // 1. FILTRO DE EDAD BIDIRECCIONAL
      if (u.edad && u.rangoBuscado) {
        const edadOk = usuarioActual.edad >= u.rangoBuscado.min && usuarioActual.edad <= u.rangoBuscado.max &&
                       u.edad >= usuarioActual.rangoBuscado.min && u.edad <= usuarioActual.rangoBuscado.max;
        if (!edadOk) return false;
      }

      // 2. FILTRO DE GÉNERO BIDIRECCIONAL
      if (usuarioActual.genero && usuarioActual.interesGenero && u.genero && u.interesGenero) {
        // ¿A mí me interesa su género?
        const aBuscaB = usuarioActual.interesGenero.includes("todos") || usuarioActual.interesGenero.includes(u.genero);
        // ¿A él/ella le interesa mi género?
        const bBuscaA = u.interesGenero.includes("todos") || u.interesGenero.includes(usuarioActual.genero);

        if (!aBuscaB || !bBuscaA) return false;
      }

      return true;
    })
    .map(u => {
      let aciertos = 0, desaciertos = 0, comparables = 0;

      preguntas.forEach(q => {
        const miRes = usuarioActual.respuestas ? usuarioActual.respuestas[q.id] : null;
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
        nombre: u.nombre, edad: u.edad || '?', porcentajeMatch, porcentajeGilicrush,
        esMatch: porcentajeMatch >= 90, esGilicrush: porcentajeGilicrush >= 90
      };
    })
    .sort((a, b) => b.porcentajeMatch - a.porcentajeMatch);
}
function mostrarResultados(resultados, miNombre) {
  ocultarSecciones();
  const resultsSection = document.getElementById("results-section");
  const matchesList = document.getElementById("matches-list");
  if (!resultsSection || !matchesList) return;

  resultsSection.classList.remove("hidden");

  const matchesFiltrados = resultados.filter(r => r.esMatch || r.esGilicrush);

  if (matchesFiltrados.length === 0) {
    matchesList.innerHTML = "<p style='color:#fff;'>¡Perfil registrado! Aún no hay perfiles con el 90% de compatibilidad en tu rango. Puedes acceder desde el Buzón cuando haya nuevos perfiles.</p>";
    return;
  }

  matchesList.innerHTML = matchesFiltrados.map((r, index) => {
    const esGilicrush = r.porcentajeGilicrush > r.porcentajeMatch;
    const claseCard = esGilicrush ? "match-item gilicrush-item" : "match-item";
    const etiqueta = esGilicrush ? "💀 ¡TU GILICRUSH!" : "💘 ¡NUEVO MATCH!";
    const textoPorcentaje = esGilicrush ? `${r.porcentajeGilicrush}% Opuestos` : `${r.porcentajeMatch}% Compatible`;

    return `
      <div class="${claseCard}">
        <div class="match-header">
          <h3>${etiqueta}</h3>
          <p>Has conectado con <b>${r.nombre} (${r.edad} años)</b> - <b>${textoPorcentaje}</b></p>
        </div>
        <div class="icebreaker-box">
          <button id="btn-send-${index}">💬 Iniciar Chat con ${r.nombre}</button>
        </div>
      </div>
    `;
  }).join('');

  matchesFiltrados.forEach((r, index) => {
    const esGilicrush = r.porcentajeGilicrush > r.porcentajeMatch;
    const textoPorcentaje = esGilicrush ? `${r.porcentajeGilicrush}% Opuestos` : `${r.porcentajeMatch}% Compatible`;
    
    const btn = document.getElementById(`btn-send-${index}`);
    if (btn) {
      btn.onclick = () => window.iniciarOCargarChat(miNombre, r.nombre, "", textoPorcentaje);
    }
  });
}

window.iniciarOCargarChat = async function(miNombre, otroNombre, mensajeInicial, porcentajeText) {
  const chatId = obtenerChatId(miNombre, otroNombre);
  try {
    const dbRef = ref(db);
    const snapshotUsuarios = await get(child(dbRef, "usuarios"));
    
    let prefMiUser = "A";
    let prefOtroUser = "A";

    if (snapshotUsuarios.exists()) {
      Object.values(snapshotUsuarios.val()).forEach(u => {
        if (u.nombre && u.nombre.toLowerCase() === miNombre.toLowerCase()) {
          if (u.respuestas && u.respuestas.q_chat_pref) prefMiUser = u.respuestas.q_chat_pref;
        }
        if (u.nombre && u.nombre.toLowerCase() === otroNombre.toLowerCase()) {
          if (u.respuestas && u.respuestas.q_chat_pref) prefOtroUser = u.respuestas.q_chat_pref;
        }
      });
    }

    // ALTERNATIVA 2: Si ambos eligen B -> Protocolar. Si coinciden en A o discrepan -> Rompehielos
    let tipoChatCalculado = "rompehielos";
    if (prefMiUser === "B" && prefOtroUser === "B") {
      tipoChatCalculado = "protocolar";
    }

    const chatRef = ref(db, `chats/${chatId}`);
    const snapshotChat = await get(chatRef);

    if (!snapshotChat.exists()) {
      const normaAleatoria = conjuntosDeNormas[Math.floor(Math.random() * conjuntosDeNormas.length)];

      await update(chatRef, {
        participantes: [miNombre, otroNombre],
        porcentaje: porcentajeText || "",
        tipoChat: tipoChatCalculado,
        normaAsignada: normaAleatoria,
        fecha: Date.now()
      });
    }

    window.abrirSalaChat(miNombre, otroNombre, porcentajeText || "");
  } catch (e) {
    console.error("Error al iniciar/cargar chat:", e);
    alert("Error al conectar con la sala de chat.");
  }
};

window.accederBuzon = async function() {
  const nombreInput = document.getElementById("login-name");
  const pinInput = document.getElementById("login-pin");

  if (!nombreInput || !pinInput) return alert("Campos de inicio de sesión no encontrados.");

  const nombre = nombreInput.value.trim();
  const pin = pinInput.value.trim();

  if (!nombre || !pin) return alert("Ingresa tu nombre y PIN de 4 dígitos.");

  try {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, "usuarios"));
    let usuarioValido = false;

    if (snapshot.exists()) {
      Object.values(snapshot.val()).forEach(u => {
        if (u.nombre && u.nombre.toLowerCase() === nombre.toLowerCase() && u.pin === pin) {
          usuarioValido = true;
          usuarioActualGlobal = u.nombre;
          localStorage.setItem("sesion_usuario", JSON.stringify({ nombre: u.nombre, pin }));
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
  if (!mailbox || !list) return;

  mailbox.classList.remove("hidden");
  list.innerHTML = "<p style='color: #ffffff;'>Cargando tu buzón...</p>";

  try {
    const dbRef = ref(db);
    const snapshotUsuarios = await get(child(dbRef, "usuarios"));
    let miUsuario = null;
    const otrosUsuarios = [];

    if (snapshotUsuarios.exists()) {
      Object.values(snapshotUsuarios.val()).forEach(u => {
        if (u.nombre && u.nombre.toLowerCase() === miNombre.toLowerCase()) miUsuario = u;
        else otrosUsuarios.push(u);
      });
    }

    if (!miUsuario) {
      list.innerHTML = "<p style='color: #ffffff;'>No se encontraron los datos de tu perfil.</p>";
      return;
    }

    const resultadosAfinidad = calcularEmparejamientos(miUsuario, otrosUsuarios);
    const snapshotChats = await get(child(dbRef, "chats"));
    const chatsExistentes = {};

    if (snapshotChats.exists()) {
      const chatsData = snapshotChats.val();
      Object.keys(chatsData).forEach(chatId => {
        const chat = chatsData[chatId];
        if (chat.participantes && chat.participantes.map(p => p.toLowerCase()).includes(miNombre.toLowerCase())) {
          const otroNombre = chat.participantes.find(p => p.toLowerCase() !== miNombre.toLowerCase());
          if (otroNombre) {
            chatsExistentes[otroNombre.toLowerCase()] = {
              chatId,
              ultimoMsg: chat.ultimoMensaje || "",
              porcentaje: chat.porcentaje || ""
            };
          }
        }
      });
    }

    const mapaFinalConexiones = new Map();
    resultadosAfinidad.forEach(r => {
      if (r.esMatch || r.esGilicrush) mapaFinalConexiones.set(r.nombre.toLowerCase(), r);
    });

    Object.keys(chatsExistentes).forEach(nombreOtro => {
      if (!mapaFinalConexiones.has(nombreOtro)) {
        const usuarioEncontrado = otrosUsuarios.find(u => u.nombre && u.nombre.toLowerCase() === nombreOtro);
        mapaFinalConexiones.set(nombreOtro, {
          nombre: usuarioEncontrado ? usuarioEncontrado.nombre : nombreOtro,
          edad: usuarioEncontrado ? usuarioEncontrado.edad : '?',
          porcentajeMatch: 50,
          porcentajeGilicrush: 50,
          esMatch: true,
          esGilicrush: false
        });
      }
    });

    const listaFinal = Array.from(mapaFinalConexiones.values());

    if (listaFinal.length === 0) {
      list.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 15px;">
          <h3 style="color: #ffffff; margin:0;">Tu Buzón</h3>
          <button onclick="window.cerrarSesion()" style="width: auto; padding: 6px 12px; background: #dc2626; color:#fff; border:none; font-size: 12px; cursor:pointer; border-radius:4px;">Cerrar Sesión</button>
        </div>
        <p style='color: #ffffff;'>Aún no hay conexiones registradas.</p>
      `;
      return;
    }

    let htmlOutput = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 15px;">
        <h3 style="color: #ffffff; margin:0;">Tu Buzón de Conexiones</h3>
        <button onclick="window.cerrarSesion()" style="width: auto; padding: 6px 12px; background: #dc2626; color:#fff; border:none; font-size: 12px; cursor:pointer; border-radius:4px;">Cerrar Sesión</button>
      </div>
    `;

    listaFinal.forEach((r, index) => {
      const chatIniciado = chatsExistentes[r.nombre.toLowerCase()];
      const esGilicrush = r.porcentajeGilicrush > r.porcentajeMatch;
      const claseCard = esGilicrush ? "match-item gilicrush-item" : "match-item";
      const etiqueta = esGilicrush ? "💀 GILICRUSH" : "💘 MATCH";
      const textoPorcentaje = chatIniciado && chatIniciado.porcentaje ? chatIniciado.porcentaje : (esGilicrush ? `${r.porcentajeGilicrush}% Opuestos` : `${r.porcentajeMatch}% Compatible`);

      htmlOutput += `
        <div class="${claseCard}" style="margin-bottom: 15px; text-align: left;">
          <div class="match-header">
            <h4>${etiqueta}: ${r.nombre} (${r.edad} años)</h4>
            <p><b>Afinidad:</b> ${textoPorcentaje}</p>
          </div>
          ${chatIniciado ? `
            <p style="color: #ddd; font-size: 0.9em; margin: 8px 0;"><b>Último mensaje:</b> "${chatIniciado.ultimoMsg}"</p>
            <button id="btn-buzon-chat-${index}" style="background: #2563eb; color: white; padding: 8px 12px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
              💬 Continuar Conversación
            </button>
          ` : ` 
            <p style="color: #bbb; font-size: 0.85em; margin: 8px 0;"><i>Aún no habéis hablado. ¡Inicia la conversación!</i></p>
            <button id="btn-buzon-chat-${index}" style="background: #db2777; color: white; padding: 8px 12px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
              💬 Iniciar Chat
            </button>
          `}
        </div>
      `;
    });

    list.innerHTML = htmlOutput;

    listaFinal.forEach((r, index) => {
      const chatIniciado = chatsExistentes[r.nombre.toLowerCase()];
      const esGilicrush = r.porcentajeGilicrush > r.porcentajeMatch;
      const textoPorcentaje = chatIniciado && chatIniciado.porcentaje ? chatIniciado.porcentaje : (esGilicrush ? `${r.porcentajeGilicrush}% Opuestos` : `${r.porcentajeMatch}% Compatible`);
      const btn = document.getElementById(`btn-buzon-chat-${index}`);
      
      if (btn) {
        btn.onclick = () => window.iniciarOCargarChat(miNombre, r.nombre, "", textoPorcentaje);
      }
    });

  } catch (e) {
    console.error("Error al cargar buzón:", e);
    list.innerHTML = "<p style='color: #ffffff;'>Error al recuperar la información del buzón.</p>";
  }
};

window.cerrarSesion = function() {
  localStorage.removeItem("sesion_usuario");
  usuarioActualGlobal = null;
  window.mostrarSeccion('mode-selector');
};

window.enviarPreguntaAleatoria = async function(chatId, miNombre, tipoChat) {
  const listaPreguntas = (tipoChat === "protocolar") ? preguntasRompehielosProtocolar : preguntasRompehielosCasual;
  const preguntaRandom = listaPreguntas[Math.floor(Math.random() * listaPreguntas.length)];
  const textoEnviar = `🎲 Pregunta rompehielos: "${preguntaRandom}"`;

  try {
    await push(ref(db, `chats/${chatId}/mensajes`), { de: miNombre, texto: textoEnviar, fecha: Date.now() });
    await update(ref(db, `chats/${chatId}`), { ultimoMensaje: textoEnviar, fecha: Date.now() });
  } catch (e) {
    console.error("Error al enviar pregunta aleatoria:", e);
  }
};

window.abrirSalaChat = async function(miNombre, otroNombre, porcentajeText) {
  ocultarSecciones();
  const mailbox = document.getElementById("mailbox-section");
  const list = document.getElementById("notifications-list");
  if (!mailbox || !list) return;

  mailbox.classList.remove("hidden");
  const chatId = obtenerChatId(miNombre, otroNombre);

  let tipoChat = "rompehielos";
  let normaAsignada = "";

  try {
    const chatSnap = await get(ref(db, `chats/${chatId}`));
    if (chatSnap.exists()) {
      const cData = chatSnap.val();
      if (cData.tipoChat) tipoChat = cData.tipoChat;
      if (cData.normaAsignada) normaAsignada = cData.normaAsignada;
    }
  } catch(e) {
    console.error("Error leyendo info del chat:", e);
  }

  // REGLAS FORMATEADAS PARA INCRUSTAR DENTRO DEL CHAT (MODO SISTEMA)
  let htmlNormasBlock = "";
  if (tipoChat === "protocolar" && normaAsignada) {
    const textoLimpio = normaAsignada.replace(/\*\*/g, ''); // Quita asteriscos de Markdown
    htmlNormasBlock = `
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 12px; border-radius: 8px; margin-bottom: 15px; text-align: left; color: #1e3a8a; font-size: 13px; line-height: 1.4;">
        <b style="display:block; margin-bottom:4px; font-size:14px;">📌 Normas de la sala:</b>
        ${textoLimpio.replace(/\n/g, '<br>')}
      </div>
    `;
  }

  list.innerHTML = `
    <div style="margin-bottom: 12px; text-align: left;">
      <button onclick="window.cargarListaChats('${miNombre}')" style="padding: 8px 14px; cursor: pointer; border-radius: 6px;">⬅️ Volver a mis chats</button>
      <h3 style="margin-top:10px; color: #ffffff;">
        Chat con ${otroNombre} 
        <small style="color: #ccc;">(${porcentajeText} - Modo: ${tipoChat === 'protocolar' ? '📜 Protocolar' : '🎲 Rompehielos'})</small>
      </h3>
    </div>

    <div style="margin-bottom: 12px; display: flex; gap: 8px; flex-direction: column;">
      <button id="btn-rompehielos" type="button" style="background: #eab308; color: #000; border: none; padding: 10px 16px; font-weight: bold; border-radius: 6px; cursor: pointer; width: 100%;">
        🎲 Enviar Pregunta Aleatoria
      </button>
      <button id="btn-toggle-juego" type="button" style="background: #2b2a2a; color: white; border: none; padding: 10px 16px; font-weight: bold; border-radius: 6px; cursor: pointer; width: 100%;">
        ⚪ Abrir / Ocultar 4 en Raya
      </button>
      
      <div id="juego-board-container" class="hidden" style="margin-top: 10px; background: #1e293b; padding: 12px; border-radius: 8px; border: 1px solid #475569;">
        <p id="juego-turn-info" style="color: #fff; font-weight: bold; margin-bottom: 10px; font-size: 14px;">Cargando tablero...</p>
        <div id="juego-grid" style="display: grid; grid-template-columns: repeat(7, 40px); grid-template-rows: repeat(7, 40px); gap: 2px; justify-content: center; background-color: #ffffff; padding: 6px; border-radius: 6px;"></div>
        <button id="btn-reiniciar-juego" style="margin-top: 12px; background: #dc2626; color: white; border: none; padding: 8px 16px; font-weight: bold; border-radius: 6px; cursor: pointer;">
          🔄 Reiniciar Juego
        </button>
      </div>
    </div>
    
    <!-- CONTENEDOR BLANCO DE MENSAJES -->
    <div id="chat-messages-box" style="height: 320px; overflow-y: auto; border: 1px solid #444; padding: 12px; border-radius: 8px; background: #ffffff !important; margin-bottom: 12px; text-align: left;">
      <p style="color: #374151;">Cargando mensajes...</p>
    </div>
    
    <div style="display: flex !important; flex-direction: column !important; gap: 8px !important; width: 100% !important; box-sizing: border-box !important;">
      <input 
        type="text" 
        id="chat-input" 
        placeholder="Escribe tu mensaje aquí..." 
        style="width: 100% !important; height: 48px !important; padding: 0 14px !important; font-size: 16px !important; color: #000000 !important; background-color: #ffffff !important; border: 2px solid #888 !important; border-radius: 6px !important; box-sizing: border-box !important;" 
      />
      <button 
        id="btn-send-msg" 
        style="width: 100% !important; height: 44px !important; font-size: 16px !important; font-weight: bold !important; cursor: pointer !important; border-radius: 6px !important; background: #9d174d !important; color: #ffffff !important; border: none !important;"
      >
        Enviar mensaje
      </button>
    </div>
  `;

  setTimeout(() => {
    const btnToggle = document.getElementById("btn-toggle-juego");
    const container = document.getElementById("juego-board-container");
    if (btnToggle && container) {
      btnToggle.onclick = () => container.classList.toggle("hidden");
    }

    const btnRompehielos = document.getElementById("btn-rompehielos");
    if (btnRompehielos) {
      btnRompehielos.onclick = () => window.enviarPreguntaAleatoria(chatId, miNombre, tipoChat);
    }
  }, 50);

  if (refChatActiva && listenerChatActivo) off(refChatActiva, "value", listenerChatActivo);

  const msgsRef = ref(db, `chats/${chatId}/mensajes`);
  refChatActiva = msgsRef;

  listenerChatActivo = onValue(msgsRef, (snapshot) => {
    const box = document.getElementById("chat-messages-box");
    if (!box) return;

    let htmlMensajes = "";

    if (snapshot.exists()) {
      const msgsObj = snapshot.val();
      const msgsArray = Object.values(msgsObj);

      htmlMensajes = msgsArray.map(m => {
        const esMio = m.de.toLowerCase() === miNombre.toLowerCase();
        const alineacion = esMio ? "text-align: right;" : "text-align: left;";
        const fondoBurbuja = esMio ? "#dcf8c6" : "#f1f5f9";

        return `
          <div style="${alineacion} margin-bottom: 10px;">
            <div style="display: inline-block; background: ${fondoBurbuja} !important; padding: 10px 14px; border-radius: 12px; border: 1px solid #cbd5e1; max-width: 85%; text-align: left;">
              <small style="color: #000000 !important; font-size: 0.85em; font-weight: bold; display: block; margin-bottom: 2px;">${m.de}</small>
              <span style="font-size: 15px !important; color: #000000 !important; font-weight: 500 !important;">${m.texto}</span>
            </div>
          </div>
        `;
      }).join('');
    } else {
      htmlMensajes = "<p style='color: #6b7280; font-size:14px; text-align:center;'>No hay mensajes aún.</p>";
    }

    // LAS REGLAS SE RENDERIZAN SIEMPRE PRIMERO EN LA CAJA BLANCA DE CHAT
    box.innerHTML = htmlNormasBlock + htmlMensajes;
    box.scrollTop = box.scrollHeight;
  });

  const btnSend = document.getElementById("btn-send-msg");
  const inputEl = document.getElementById("chat-input");

  const enviar = async () => {
    if (!inputEl) return;
    const txt = inputEl.value.trim();
    if (!txt) return;

    inputEl.value = "";
    try {
      await push(ref(db, `chats/${chatId}/mensajes`), { de: miNombre, texto: txt, fecha: Date.now() });
      await update(ref(db, `chats/${chatId}`), { ultimoMensaje: txt, fecha: Date.now() });
    } catch (e) {
      console.error("Error al enviar mensaje:", e);
    }
  };

  if (btnSend) btnSend.onclick = enviar;
  if (inputEl) inputEl.onkeypress = (e) => { if (e.key === 'Enter') enviar(); };

  window.inicializarJuegoCuatroEnRaya(chatId, miNombre, otroNombre);
};
// 6. JUEGO DE 4 EN RAYA (CUADRÍCULA 7x7)

function obtenerTableroCuatroEnRayaInicial(jugador1, jugador2) {
  const tablero = [];
  for (let r = 0; r < 7; r++) {
    tablero[r] = [];
    for (let c = 0; c < 7; c++) {
      tablero[r][c] = '';
    }
  }
  
  return {
    turno: jugador1,
    jugadorNegro: jugador1,
    jugadorGranate: jugador2,
    ganador: '',
    fichas: tablero
  };
}

window.inicializarJuegoCuatroEnRaya = function(chatId, miNombre, otroNombre) {
  if (refJuegoActiva) {
    off(refJuegoActiva);
    refJuegoActiva = null;
    listenerJuegoActivo = null;
  }

  const juegoRef = ref(db, `chats/${chatId}/cuatroEnRaya`);
  refJuegoActiva = juegoRef;

  listenerJuegoActivo = onValue(juegoRef, (snapshot) => {
    let estadoJuego = snapshot.val();
    if (!estadoJuego) {
      estadoJuego = obtenerTableroCuatroEnRayaInicial(miNombre, otroNombre);
      update(juegoRef, estadoJuego);
      return;
    }
    renderizarTableroCuatroEnRaya(estadoJuego, chatId, miNombre);
  });
};

function renderizarTableroCuatroEnRaya(estado, chatId, miNombre) {
  const grid = document.getElementById("juego-grid");
  const turnInfo = document.getElementById("juego-turn-info");
  const btnReiniciar = document.getElementById("btn-reiniciar-juego");
  if (!grid || !turnInfo) return;

  if (btnReiniciar) {
    btnReiniciar.onclick = async () => {
      const nuevoJuego = obtenerTableroCuatroEnRayaInicial(estado.jugadorNegro, estado.jugadorGranate);
      await update(ref(db, `chats/${chatId}/cuatroEnRaya`), nuevoJuego);
    };
  }

  if (estado.ganador) {
    turnInfo.innerHTML = `<span style="color: #f59e0b; font-size: 16px;">🏆 ¡FIN DEL JUEGO! Ganador: <b>${estado.ganador}</b></span>`;
  } else {
    const esMiTurno = estado.turno.toLowerCase() === miNombre.toLowerCase();
    const soyNegro = estado.jugadorNegro.toLowerCase() === miNombre.toLowerCase();
    const miColor = soyNegro ? '⚫ Negro' : '🔴 Granate';

    turnInfo.innerHTML = esMiTurno 
      ? `<span style="color: #4ade80;">🟢 Es tu turno (${miColor})</span>` 
      : `<span style="color: #f87171;">⏳ Turno de ${estado.turno}...</span>`;
  }

  grid.innerHTML = "";
  grid.style.gridTemplateColumns = "repeat(7, 40px)";
  grid.style.gridTemplateRows = "repeat(7, 40px)";
  
  const esMiTurno = estado.turno.toLowerCase() === miNombre.toLowerCase();

  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const cell = document.createElement("div");
      const contenidoFicha = estado.fichas[r][c];

      cell.style.width = "40px";
      cell.style.height = "40px";
      cell.style.display = "flex";
      cell.style.alignItems = "center";
      cell.style.justifyContent = "center";
      cell.style.backgroundColor = "#ffffff";
      cell.style.border = "1px solid #cbd5e1";
      cell.style.boxSizing = "border-box";
      cell.style.cursor = (esMiTurno && !estado.ganador && contenidoFicha === '') ? "pointer" : "default";

      if (contenidoFicha === 'N') {
        cell.innerHTML = "<div style='width:28px; height:28px; border-radius:50%; background:#000000; border:1px solid #333; box-shadow: 0 2px 4px rgba(0,0,0,0.3);'></div>";
      } else if (contenidoFicha === 'G') {
        cell.innerHTML = "<div style='width:28px; height:28px; border-radius:50%; background:#800020; border:1px solid #4a0013; box-shadow: 0 2px 4px rgba(0,0,0,0.3);'></div>";
      }

      cell.onclick = () => {
        if (estado.ganador || !esMiTurno || contenidoFicha !== '') return;
        marcarCasilla(estado, { r, c }, chatId, miNombre);
      };

      grid.appendChild(cell);
    }
  }
}

async function marcarCasilla(estado, posicion, chatId, miNombre) {
  const nuevasFichas = estado.fichas.map(row => [...row]);
  const soyNegro = estado.jugadorNegro.toLowerCase() === miNombre.toLowerCase();
  const miColorFicha = soyNegro ? 'N' : 'G';
  
  nuevasFichas[posicion.r][posicion.c] = miColorFicha;

  const esGanador = verificarCuatroEnRaya(nuevasFichas, miColorFicha, posicion);
  
  let tableroLleno = true;
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      if (nuevasFichas[r][c] === '') {
        tableroLleno = false;
        break;
      }
    }
    if (!tableroLleno) break;
  }

  const otroJugador = estado.jugadorNegro.toLowerCase() === miNombre.toLowerCase() 
    ? estado.jugadorGranate 
    : estado.jugadorNegro;

  if (esGanador) {
    await update(ref(db, `chats/${chatId}/cuatroEnRaya`), {
      ...estado,
      turno: '',
      ganador: miNombre,
      fichas: nuevasFichas
    });
  } else if (tableroLleno) {
    const nuevoTablero = obtenerTableroCuatroEnRayaInicial(estado.jugadorNegro, estado.jugadorGranate);
    await update(ref(db, `chats/${chatId}/cuatroEnRaya`), nuevoTablero);
    alert("¡Empate! Tablero lleno. Reiniciando juego...");
  } else {
    await update(ref(db, `chats/${chatId}/cuatroEnRaya`), {
      ...estado,
      turno: otroJugador,
      fichas: nuevasFichas
    });
  }
}

function verificarCuatroEnRaya(tablero, color, ultimaPosicion) {
  const r = ultimaPosicion.r;
  const c = ultimaPosicion.c;
  
  const direcciones = [
    { dr: 0, dc: 1 },  // Horizontal
    { dr: 1, dc: 0 },  // Vertical
    { dr: 1, dc: 1 },  // Diagonal \
    { dr: 1, dc: -1 }  // Diagonal /
  ];

  for (const { dr, dc } of direcciones) {
    let contador = 1;
    
    for (let i = 1; i < 4; i++) {
      const nr = r + dr * i;
      const nc = c + dc * i;
      if (nr >= 0 && nr < 7 && nc >= 0 && nc < 7 && tablero[nr][nc] === color) {
        contador++;
      } else {
        break;
      }
    }
    
    for (let i = 1; i < 4; i++) {
      const nr = r - dr * i;
      const nc = c - dc * i;
      if (nr >= 0 && nr < 7 && nc >= 0 && nc < 7 && tablero[nr][nc] === color) {
        contador++;
      } else {
        break;
      }
    }
    
    if (contador >= 4) return true;
  }
  
  return false;
}

// 7. ASIGNACIÓN INICIAL DE EVENTOS Y AUTO-LOGIN
document.addEventListener("DOMContentLoaded", () => {
  cargarPreguntas();
  window.mostrarSeccion("mode-selector");

  const btnSubmit = document.getElementById("submit-btn");
  if (btnSubmit) btnSubmit.onclick = () => window.guardarYEmparejar();

  const btnQuiz = document.getElementById("btn-ir-quiz");
  if (btnQuiz) btnQuiz.onclick = () => window.mostrarSeccion("quiz-section");

  const btnLogin = document.getElementById("btn-ir-login");
  if (btnLogin) btnLogin.onclick = () => window.mostrarSeccion("login-section");

  const btnEntrarBuzon = document.getElementById("btn-entrar-buzon");
  if (btnEntrarBuzon) btnEntrarBuzon.onclick = () => window.accederBuzon();

  const btnVolver = document.getElementById("btn-volver-selector");
  if (btnVolver) btnVolver.onclick = () => window.mostrarSeccion("mode-selector");
});
