document.addEventListener("DOMContentLoaded", () => {
  const mode = document.body.dataset.mode;
  const unsafeLink = document.getElementById("link-unsafe");
  const safeLink = document.getElementById("link-safe");
  const textarea = document.getElementById("comment");
  const resetForm = document.getElementById("resetForm");

  if (mode === "unsafe" && unsafeLink) {
    unsafeLink.classList.add("active-route");
  }

  if (mode === "safe" && safeLink) {
    safeLink.classList.add("active-route");
  }

  if (textarea) {
    textarea.focus();
  }

  if (resetForm) {
    resetForm.addEventListener("submit", (event) => {
      const confirmed = window.confirm("¿Deseas eliminar todos los comentarios almacenados?");
      if (!confirmed) {
        event.preventDefault();
      }
    });
  }
});
