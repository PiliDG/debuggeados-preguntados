# Debuggeadas — Preguntados Ciber

Juego web interactivo desarrollado como proyecto académico para Programación III.

El objetivo fue crear una aplicación de preguntas y respuestas inspirada en juegos como Preguntados y Kahoot, aplicando conceptos de programación orientada a objetos, modularización, estructuras de datos, APIs REST y persistencia de información.

> Proyecto académico desarrollado en equipo por Pilar y Delfina.

---

## Vista de la aplicación

### Menú principal

<img src="docs/screenshots/menu.png" alt="Menú principal de Debuggeadas" width="100%">

<table>
  <tr>
    <td width="50%">
      <strong>Juego y ruleta de categorías</strong><br><br>
      <img src="docs/screenshots/juego.png" alt="Ruleta de categorías">
    </td>
    <td width="50%">
      <strong>Podio y estadísticas</strong><br><br>
      <img src="docs/screenshots/podio.png" alt="Podio y estadísticas">
    </td>
  </tr>
</table>

---

## Tecnologías

**Frontend:** HTML, CSS, JavaScript  
**Backend:** Python, FastAPI  
**API:** REST  
**Persistencia:** JSON  
**Servidor:** Uvicorn  
**Control de versiones:** Git, GitHub  
**Entorno de desarrollo:** Visual Studio Code  
**Deploy:** Railway

---

## Funcionalidades principales

- Gestión de jugadores.
- Ruleta de categorías.
- Sistema de turnos.
- Preguntas con cuatro opciones.
- Temporizador de respuesta.
- Cálculo automático de puntajes.
- Podio con los tres mejores jugadores.
- Estadísticas por categoría y tiempos de respuesta.
- Administración de preguntas y categorías.
- CRUD completo de preguntas.

---

## Categorías

El juego incluye diferentes categorías relacionadas con contenidos de programación:

1. Colecciones y datos
2. Lambda y funciones
3. Archivos y excepciones
4. JSON y APIs
5. Recursividad y algoritmos

---

## Arquitectura del proyecto

El backend fue modularizado para separar responsabilidades:

```text
backend/
├── models.py
├── storage.py
├── game.py
└── main.py
