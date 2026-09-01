"use strict";

// Navegación del menú principal (sin botón Salir)
document.addEventListener("DOMContentLoaded", async () => {
  const startButton = document.getElementById("btn-start-game");
  const emptyPlayers = document.getElementById("msg-no-players");

  function updateStartState(players) {
    const hasPlayers = Array.isArray(players) && players.length > 0;
    if (startButton) {
      startButton.disabled = !hasPlayers;
      startButton.setAttribute("aria-disabled", String(!hasPlayers));
    }
    if (emptyPlayers) {
      if (hasPlayers) {
        emptyPlayers.setAttribute("hidden", "");
      } else {
        emptyPlayers.removeAttribute("hidden");
      }
    }
  }

  async function loadPlayersForMenu() {
    try {
      const response = await fetch("/api/players");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      updateStartState(await response.json());
    } catch (error) {
      updateStartState([]);
      console.error("No se pudieron consultar los jugadores", error);
    }
  }

  // Agregar y administrar jugadores
  document.getElementById("btn-add-players")?.addEventListener("click", () => {
    window.location.href = "/static/add_players.html";
  });

  // Iniciar juego: validar jugadores
  startButton?.addEventListener("click", async (ev) => {
    ev.preventDefault();
    try{
      const response = await fetch("/api/players");
      const players = response.ok ? await response.json() : [];
      updateStartState(players);
      if (!Array.isArray(players) || players.length === 0) {
        return;
      }
      window.location.href = "/static/game.html";
    } catch (error) {
      updateStartState([]);
      console.error("No se pudo validar jugadores", error);
    }
  });

  document.getElementById("btn-podium")?.addEventListener("click", () => {
    window.location.href = "/static/podium.html";
  });

  document.getElementById("btn-instructions")?.addEventListener("click", () => {
    window.location.href = "/static/instructions.html";
  });

  document.getElementById("btn-admin-questions")?.addEventListener("click", () => {
    window.location.href = "/static/admin_questions.html";
  });

  await loadPlayersForMenu();
});

