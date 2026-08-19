const preguntas = [
  { id: "q1", texto: "¿Prefieres playa o montaña?", opA: "Playa 🏖️", opB: "Montaña ⛰️" },
  { id: "q2", texto: "¿Plan ideal de fin de semana?", opA: "Fiesta 🥳", opB: "Peli y manta 🍿" },
  { id: "q3", texto: "¿Madrugar o trasnochar?", opA: "Madrugar 🌅", opB: "Trasnochar 🌙" },
  { id: "q4", texto: "¿Gatos o perros?", opA: "Gatos 🐱", opB: "Perros 🐶" }
];

// Cargar preguntas en la interfaz
function cargarPreguntas() {
  const container = document.getElementById("questions-container");
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

function guardarYEmparejar() {
  const nombre = document.getElementById("username").value.trim();
  if (!nombre) return alert("Por favor, introduce tu nombre");

  // Capturar respuestas actuales
  const respuestas = {};
  preguntas.forEach(q => {
    const seleccion = document.querySelector(`input[name="${q.id}"]:checked`);
    respuestas[q.id] = seleccion ? seleccion.value : "A";
  });

  const usuarioActual = { nombre, respuestas };

  // Obtener usuarios almacenados previamente
  let usuariosGuardados = JSON.parse(localStorage.getItem("usuarios_match")) || [];

  // Calcular porcentaje de coincidencia con otros usuarios
  const resultados = usuariosGuardados
    .filter(u => u.nombre.toLowerCase() !== nombre.toLowerCase())
    .map(u => {
      let coincidencias = 0;
      preguntas.forEach(q => {
        if (u.respuestas[q.id] === usuarioActual.respuestas[q.id]) {
          coincidencias++;
        }
      });
      const porcentaje = Math.round((coincidencias / preguntas.length) * 100);
      return { nombre: u.nombre, porcentaje };
    })
    .sort((a, b) => b.porcentaje - a.porcentaje);

  // Guardar usuario actual si no existía
  const existe = usuariosGuardados.some(u => u.nombre.toLowerCase() === nombre.toLowerCase());
  if (!existe) {
    usuariosGuardados.push(usuarioActual);
    localStorage.setItem("usuarios_match", JSON.stringify(usuariosGuardados));
  }

  mostrarResultados(resultados);
}

function mostrarResultados(resultados) {
  document.getElementById("quiz-section").classList.add("hidden");
  const resultsSection = document.getElementById("results-section");
  const matchesList = document.getElementById("matches-list");
  resultsSection.classList.remove("hidden");

  if (resultados.length === 0) {
    matchesList.innerHTML = "<p>Eres el primer usuario registrado. ¡Vuelve a probar cuando haya más perfiles!</p>";
    return;
  }

  matchesList.innerHTML = resultados.map(r => `
    <div class="match-item">
      <span>${r.nombre}</span>
      <span class="percentage">${r.porcentaje}% de Match</span>
    </div>
  `).join('');
}

function reiniciar() {
  document.getElementById("quiz-section").classList.remove("hidden");
  document.getElementById("results-section").classList.add("hidden");
}

window.onload = cargarPreguntas;