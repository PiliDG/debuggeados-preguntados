"use strict";

const state = { questions: [], selectedCategory: "", editingId: null, deletingId: null };

function $(selector) {
  return document.querySelector(selector);
}

async function requestJSON(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `HTTP ${response.status}`);
  }
  return response.json();
}

function showToast(message, type = "info") {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.dataset.type = type;
  toast.classList.add("show");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove("show"), 2400);
}

function questionsInCategory() {
  return state.questions.filter((question) => question.category === state.selectedCategory);
}

function renderCategories() {
  const select = $("#categoriaSelect");
  if (!select) return;
  const categories = [...new Set(state.questions.map((question) => question.category))].sort();
  select.innerHTML = categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("");
  state.selectedCategory = categories.includes(state.selectedCategory) ? state.selectedCategory : categories[0] || "";
  select.value = state.selectedCategory;
}

function renderQuestions() {
  const list = $("#listaPreguntas");
  if (!list) return;
  list.innerHTML = questionsInCategory().map((question) => {
    const item = document.createElement("li");
    item.className = "question-row";
    item.innerHTML = `<div class="question-row__content"><span class="question-id">${escapeHtml(question.id)}</span><span class="question-texto">${escapeHtml(question.text)}</span></div><div class="question-actions"><button type="button" class="btn" data-edit="${question.id}">Editar</button><button type="button" class="btn ghost" data-delete="${question.id}">Eliminar</button></div>`;
    return item.outerHTML;
  }).join("");

  list.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => loadQuestion(button.dataset.edit)));
  list.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => openDelete(button.dataset.delete)));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function resetForm() {
  $("#formPregunta")?.reset();
  $("#respuestaCorrecta").value = "0";
  state.editingId = null;
}

function loadQuestion(id) {
  const question = state.questions.find((item) => item.id === id);
  if (!question) return;
  state.editingId = id;
  $("#categoriaSelect").value = question.category;
  $("#preguntaTexto").value = question.text;
  question.options.forEach((option, index) => { $(`#opcion${index}`).value = option; });
  $("#respuestaCorrecta").value = String(question.answer_index);
  $("#preguntaTexto").focus();
}

function formPayload() {
  return {
    category: state.selectedCategory,
    text: $("#preguntaTexto").value.trim(),
    options: [0, 1, 2, 3].map((index) => $(`#opcion${index}`).value.trim()),
    answer_index: Number($("#respuestaCorrecta").value),
  };
}

async function saveQuestion(event) {
  event.preventDefault();
  const editing = Boolean(state.editingId);
  const payload = formPayload();
  if (!payload.category || !payload.text || payload.options.some((option) => !option)) {
    showToast("Completá todos los campos", "error");
    return;
  }
  try {
    const url = state.editingId ? `/api/admin/questions/${encodeURIComponent(state.editingId)}` : "/api/admin/questions";
    await requestJSON(url, { method: state.editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    await loadQuestions();
    resetForm();
    showToast(editing ? "Pregunta actualizada" : "Pregunta creada", "success");
  } catch (error) {
    showToast("No se pudo guardar la pregunta", "error");
  }
}

function openDelete(id) {
  state.deletingId = id;
  const dialog = $("#modalEliminarPregunta");
  if (dialog?.showModal) dialog.showModal();
}

async function deleteQuestion() {
  if (!state.deletingId) return;
  try {
    await requestJSON(`/api/admin/questions/${encodeURIComponent(state.deletingId)}`, { method: "DELETE" });
    await loadQuestions();
    resetForm();
    showToast("Pregunta eliminada", "success");
  } catch (error) {
    showToast("No se pudo eliminar la pregunta", "error");
  } finally {
    $("#modalEliminarPregunta")?.close();
    state.deletingId = null;
  }
}

async function loadQuestions() {
  try {
    state.questions = await requestJSON("/api/admin/questions");
    renderCategories();
    renderQuestions();
  } catch (error) {
    showToast("No se pudieron cargar las preguntas", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  $("#categoriaSelect")?.addEventListener("change", (event) => {
    state.selectedCategory = event.target.value;
    resetForm();
    renderQuestions();
  });
  $("#formPregunta")?.addEventListener("submit", saveQuestion);
  $("#btnCancelarEdicion")?.addEventListener("click", resetForm);
  $("#btnCancelEliminarPregunta")?.addEventListener("click", () => $("#modalEliminarPregunta")?.close());
  $("#btnConfirmEliminarPregunta")?.addEventListener("click", deleteQuestion);
  loadQuestions();
});
