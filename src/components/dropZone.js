// Zona de arrastrar y soltar + selector de archivos.

/**
 * @param {HTMLElement} zone elemento que recibe el arrastre
 * @param {HTMLInputElement} input <input type="file">
 * @param {(file: File) => void} onFile
 */
export function setupDropZone(zone, input, onFile) {
  const prevent = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  ['dragenter', 'dragover'].forEach((type) =>
    zone.addEventListener(type, (e) => {
      prevent(e);
      zone.classList.add('is-dragover');
    })
  );
  ['dragleave', 'dragend', 'drop'].forEach((type) =>
    zone.addEventListener(type, (e) => {
      prevent(e);
      zone.classList.remove('is-dragover');
    })
  );
  zone.addEventListener('drop', (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) onFile(file);
  });
  zone.addEventListener('keydown', (e) => {
    // Solo cuando el foco está en la zona misma, no en los botones que contiene.
    if (e.target === zone && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      input.click();
    }
  });

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file) onFile(file);
    input.value = ''; // permite volver a cargar el mismo archivo
  });

  // Evita que soltar un archivo fuera de la zona haga que el navegador lo abra.
  window.addEventListener('dragover', prevent);
  window.addEventListener('drop', prevent);
}
