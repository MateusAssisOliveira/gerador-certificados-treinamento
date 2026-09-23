// Navegação entre etapas e ajuste da prévia. A estrutura fica nos templates.
document.addEventListener("DOMContentLoaded", () => {
  const find = selector => document.querySelector(selector);
  const content = find(".tabs-content");
  const buttons = Array.from(document.querySelectorAll(".rail-nav .tab-btn"));
  const steps = buttons.map(button => button.querySelector(".rail-label").textContent);
  let current = 0;
  function selectStep(index, focus = false) {
    current = index;
    const target = buttons[index].dataset.tab;
    buttons.forEach((button, i) => {
      button.classList.toggle("active", i === index);
      if (i === index) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });
    content.querySelectorAll(".tab-pane").forEach(pane => pane.classList.toggle("active", pane.id === target));
    document.body.dataset.step = target;
    find(".workflow-counter").textContent = `Etapa ${index + 1} de ${buttons.length} · ${steps[index]}`;
    find("#stepBack").disabled = index === 0;
    find("#stepNext").hidden = index === buttons.length - 1;
    content.scrollTop = 0;
    if (target === "tabTexto") find("#btnVerFrente").click();
    document.dispatchEvent(new CustomEvent("workspace:stepchange", { detail: { target } }));
    if (focus) {
      const heading = find(`#${target} h2`);
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }
  buttons.forEach((button, index) => button.addEventListener("click", () => selectStep(index)));
  const advance = delta => {
    const index = current + delta;
    if (index < 0 || index >= buttons.length) return;
    selectStep(index, true);
  };
  find("#stepBack").addEventListener("click", () => advance(-1));
  find("#stepNext").addEventListener("click", () => advance(1));
  selectStep(0);
  find("#tabVerso").addEventListener("toggle", event => {
    if (event.target.open && find("#checkHabilitarVerso").checked) find("#btnVerVerso").click();
  });

  // Ajusta somente a prévia à largura disponível, sem alterar o documento.
  const viewport = find("#certificateViewport");
  const sheets = Array.from(viewport.querySelectorAll(".certificate-sheet"));
  const fitPreview = () => {
    if (!viewport.clientWidth) return;
    sheets.forEach(sheet => {
      if (sheet.offsetWidth) sheet.style.zoom = Math.min(1, (viewport.clientWidth - 56) / sheet.offsetWidth);
    });
  };
  new ResizeObserver(fitPreview).observe(viewport);
  const observer = new MutationObserver(fitPreview);
  sheets.forEach(sheet => observer.observe(sheet, { attributes: true, attributeFilter: ["class"] }));
  observer.observe(viewport, { attributes: true, attributeFilter: ["class"] });
});
