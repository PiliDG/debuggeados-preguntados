"use strict";

async function cargarPodioYEstadisticas() {
  try {
    const r = await fetch("/api/podium");
    if (!r.ok) throw new Error("HTTP " + r.status);
    const data = await r.json();

    const jugadores = Array.isArray(data.jugadores) ? data.jugadores : [];
    const estadisticas = data.estadisticas || {
      errores_por_categoria: {},
      tiempos_respuesta: { agil: 0, promedio: 0, tarde: 0 },
    };

    return { jugadores, estadisticas };
  } catch {
    return {
      jugadores: [
        { nombre: "Pilar", puntos: 8737 },
        { nombre: "Isabella", puntos: 8664 },
        { nombre: "Eddy", puntos: 8618 },
      ],
      estadisticas: {
        errores_por_categoria: {
          "Colecciones y datos": 4,
          "Lambda y funciones": 7,
          "Archivos y Excepciones": 2,
          "JSON y APIs": 5,
          "Recursividad y Algoritmos": 6,
        },
        tiempos_respuesta: {
          agil: 2,
          promedio: 5,
          tarde: 1,
        },
      },
    };
  }
}

function mostrarPodio(jugadores) {
  const el = document.getElementById("podio");
  if (!el) return;
  el.innerHTML = "";

  const ordenados = [...jugadores].sort((a, b) => (b.puntos || 0) - (a.puntos || 0));
  const top = ordenados.slice(0, 3);
  while (top.length < 3) top.push(null);

  const slots = [
    { idx: 1, clasePed: "p2", label: "2" },
    { idx: 0, clasePed: "p1", label: "1" },
    { idx: 2, clasePed: "p3", label: "3" },
  ];

  slots.forEach((slot) => {
    const data = top[slot.idx];
    const col = document.createElement("div");
    col.className = "podio-col";

    const nombre = document.createElement("div");
    nombre.className = "podio-name";
    nombre.textContent = data ? data.nombre : "—";

    const pts = document.createElement("div");
    pts.className = "podio-score";
    pts.textContent = data ? `${data.puntos} pts` : "";

    const ped = document.createElement("div");
    ped.className = `pedestal ${slot.clasePed}`;
    ped.textContent = slot.label;

    col.append(nombre, pts, ped);
    el.appendChild(col);
  });
}

function renderizarEstadisticas(estadisticas, jugadores) {
  const errores = estadisticas.errores_por_categoria || {};
  const tiempos = estadisticas.tiempos_respuesta || {
    agil: 0,
    promedio: 0,
    tarde: 0,
  };

  const listaErrores = document.getElementById("lista-errores");
  if (listaErrores) {
    listaErrores.innerHTML = "";
    const entries = Object.entries(errores);
    if (!entries.length) {
      const li = document.createElement("li");
      li.textContent = "Sin errores registrados.";
      listaErrores.appendChild(li);
    } else {
      entries.forEach(([cat, val]) => {
        const li = document.createElement("li");
        li.textContent = `${cat}: ${val}`;
        listaErrores.appendChild(li);
      });
    }
  }

  const listaTiempos = document.getElementById("lista-tiempos");
  if (listaTiempos) {
    listaTiempos.innerHTML = "";
    const items = [
      { label: "Ágil (0–5 s)", valor: tiempos.agil || 0 },
      { label: "Promedio", valor: tiempos.promedio || 0 },
      { label: "Tarde", valor: tiempos.tarde || 0 },
    ];

    items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = `${item.label}: ${item.valor}`;
      listaTiempos.appendChild(li);
    });
  }

  const listaCampeones = document.getElementById("lista-campeones");
  if (listaCampeones) {
    listaCampeones.innerHTML = "";
    const top = [...jugadores]
      .sort((a, b) => (b.puntos || 0) - (a.puntos || 0))
      .slice(0, 3);
    if (top.length === 0) {
      const li = document.createElement("li");
      li.textContent = "Sin resultados";
      listaCampeones.appendChild(li);
      return;
    }

    top.forEach((player, index) => {
      const li = document.createElement("li");
      li.textContent = `${index + 1}. ${player.nombre}`;
      listaCampeones.appendChild(li);
    });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const { jugadores, estadisticas } = await cargarPodioYEstadisticas();
  mostrarPodio(jugadores);
  renderizarEstadisticas(estadisticas, jugadores);
});

