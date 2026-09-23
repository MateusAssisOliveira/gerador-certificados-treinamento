/**
 * CertificaFlow • Estúdio Visual de Certificados
 * Lógica da Interface e Comunicação com a API
 */

// Estado Global da Aplicação
const state = {
  activeTab: "tabTexto",
  previewMode: "tags", // "tags" ou "simulado"
  dataSource: "tabela", // "tabela" ou "arquivo"
  tema: "ouro_azul",
  orientacao: "retrato",
  selectedParticipantIdx: 0,
  
  // Logotipos inseridos pelo usuário (Base64 / DataURL)
  logoPrestadora: null,
  logoContratante: null,

  // Configuração do Verso (Folha de Trás)
  habilitarVerso: true,
  previewSide: "frente", // "frente", "verso" ou "ambos"
  
  // Participantes na tabela manual
  participantesTabela: [
    {
      NOME: "Carlos Eduardo da Silva",
      CPF: "123.456.789-00",
      CURSO: "Inteligência Artificial Aplicada",
      DATA: "11/09/2026",
      CARGA_HORARIA: "40 horas",
      CIDADE: "São Paulo - SP"
    },
    {
      NOME: "Mariana Souza Oliveira",
      CPF: "987.654.321-11",
      CURSO: "Gestão Ágil e Projetos",
      DATA: "11/09/2026",
      CARGA_HORARIA: "30 horas",
      CIDADE: "Rio de Janeiro - RJ"
    },
    {
      NOME: "Rodrigo Mendes Albuquerque",
      CPF: "456.789.123-22",
      CURSO: "Segurança da Informação",
      DATA: "11/09/2026",
      CARGA_HORARIA: "60 horas",
      CIDADE: "Belo Horizonte - MG"
    }
  ],
  
  planilhaSelecionada: null,
  planilhaDados: null,
  detectedVariables: ["NOME", "CPF", "CURSO", "DATA", "CARGA_HORARIA"]
};

// ---------------------------------------------------------------------------
// Inicialização
// ---------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  initThemeToggle();
  initTabs();
  initLogoUploads();
  initVersoControls();
  initFaceToggle();
  initVariablesToolbar();
  initLivePreviewEvents();
  initDesignControls();
  initTableManagement();
  initFileUploads();
  initGeneration();
  initQuickActions();
  initPersistence();
  initQuickTemplates();
  await loadSavedConfig();
  fetchServerStatus();
  updateDetectedVariables();
  renderTable();
  updateLivePreview();
});

// ---------------------------------------------------------------------------
// 0. Alternância de Tema Canônico (Dual-Theming SKILL.md)
// ---------------------------------------------------------------------------
function initThemeToggle() {
  const btn = document.getElementById("btnToggleTheme");
  const lbl = document.getElementById("themeSwitchText");
  const sunIco = document.querySelector(".theme-icon-sun");
  const moonIco = document.querySelector(".theme-icon-moon");

  const applyTheme = (themeName) => {
    const isLight = themeName === "verde_petroleo";
    document.documentElement.setAttribute("data-theme", themeName);
    document.body.setAttribute("data-theme", themeName);

    if (isLight) {
      document.body.classList.remove("dark-theme");
      document.body.classList.add("light-theme");
      if (sunIco) sunIco.style.display = "inline-block";
      if (moonIco) moonIco.style.display = "none";
      if (lbl) lbl.textContent = "Modo Claro";
    } else {
      document.body.classList.remove("light-theme");
      document.body.classList.add("dark-theme");
      if (sunIco) sunIco.style.display = "none";
      if (moonIco) moonIco.style.display = "inline-block";
      if (lbl) lbl.textContent = "Modo Escuro";
    }
    localStorage.setItem("certificaflow_theme", themeName);
  };

  const saved = localStorage.getItem("certificaflow_theme") || "verde_petroleo";
  applyTheme(saved);

  if (btn) {
    btn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "verde_petroleo";
      const next = current === "verde_petroleo" ? "mustard" : "verde_petroleo";
      applyTheme(next);
      showToast(`Tema alterado para ${next === "verde_petroleo" ? "Modo Claro Corporativo" : "Modo Escuro Padrão"}`, "info");
    });
  }
}

// ---------------------------------------------------------------------------
// 1. Gerenciamento das Abas
// ---------------------------------------------------------------------------
function initTabs() {
  document.addEventListener("workspace:stepchange", event => {
    state.activeTab = event.detail.target;
    atualizarResumoGeracao();
  });
}

// ---------------------------------------------------------------------------
// 2. Upload e Gerenciamento de Logotipos (Prestadora & Contratante)
// ---------------------------------------------------------------------------
function setLogoPrestadora(dataUrl, triggerSave = true) {
  state.logoPrestadora = dataUrl;
  const imgPreviewP = document.getElementById("imgPreviewLogoPrestadora");
  const placeholderP = document.getElementById("phLogoPrestadora");
  const btnRemoveP = document.getElementById("btnRemoveLogoPrestadora");
  const fileInputP = document.getElementById("fileLogoPrestadora");

  if (imgPreviewP && placeholderP && btnRemoveP) {
    if (dataUrl) {
      imgPreviewP.src = dataUrl;
      imgPreviewP.style.display = "block";
      placeholderP.style.display = "none";
      btnRemoveP.classList.remove("is-hidden");
    } else {
      imgPreviewP.src = "";
      imgPreviewP.style.display = "none";
      placeholderP.style.display = "flex";
      btnRemoveP.classList.add("is-hidden");
      if (fileInputP) fileInputP.value = "";
    }
  }
  updateLivePreview();
  if (triggerSave && typeof scheduleAutoSave === "function") {
    scheduleAutoSave();
  }
}

function setLogoContratante(dataUrl, triggerSave = true) {
  state.logoContratante = dataUrl;
  const imgPreviewC = document.getElementById("imgPreviewLogoContratante");
  const placeholderC = document.getElementById("phLogoContratante");
  const btnRemoveC = document.getElementById("btnRemoveLogoContratante");
  const fileInputC = document.getElementById("fileLogoContratante");

  if (imgPreviewC && placeholderC && btnRemoveC) {
    if (dataUrl) {
      imgPreviewC.src = dataUrl;
      imgPreviewC.style.display = "block";
      placeholderC.style.display = "none";
      btnRemoveC.classList.remove("is-hidden");
    } else {
      imgPreviewC.src = "";
      imgPreviewC.style.display = "none";
      placeholderC.style.display = "flex";
      btnRemoveC.classList.add("is-hidden");
      if (fileInputC) fileInputC.value = "";
    }
  }
  updateLivePreview();
  if (triggerSave && typeof scheduleAutoSave === "function") {
    scheduleAutoSave();
  }
}

function initLogoUploads() {
  // --- Logo Prestadora (Lado Esquerdo) ---
  const fileInputP = document.getElementById("fileLogoPrestadora");
  const dropzoneP = document.getElementById("dropzoneLogoPrestadora");
  const btnUploadP = document.getElementById("btnUploadLogoPrestadora");
  const btnSampleP = document.getElementById("btnSampleLogoPrestadora");
  const btnRemoveP = document.getElementById("btnRemoveLogoPrestadora");

  if (btnUploadP && fileInputP) {
    btnUploadP.addEventListener("click", () => fileInputP.click());
  }

  if (dropzoneP && fileInputP) {
    dropzoneP.addEventListener("click", (e) => {
      if (e.target !== btnRemoveP && (!btnRemoveP || !btnRemoveP.contains(e.target))) {
        fileInputP.click();
      }
    });

    dropzoneP.addEventListener("dragover", (e) => { e.preventDefault(); dropzoneP.classList.add("dragover"); });
    dropzoneP.addEventListener("dragleave", () => dropzoneP.classList.remove("dragover"));
    dropzoneP.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzoneP.classList.remove("dragover");
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => setLogoPrestadora(ev.target.result);
        reader.readAsDataURL(file);
      }
    });
  }

  if (fileInputP) {
    fileInputP.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        setLogoPrestadora(ev.target.result);
        showToast("Logotipo da Prestadora carregado com sucesso!", "success");
      };
      reader.readAsDataURL(file);
    });
  }

  if (btnRemoveP) {
    btnRemoveP.addEventListener("click", (e) => {
      e.stopPropagation();
      setLogoPrestadora(null);
      showToast("Logotipo da Prestadora removido.", "info");
    });
  }

  if (btnSampleP) {
    btnSampleP.addEventListener("click", (e) => {
      e.stopPropagation();
      setLogoPrestadora(getSampleLogoPrestadora());
      showToast("Logotipo de exemplo institucional aplicado!", "info");
    });
  }

  // --- Logo Contratante (Lado Direito) ---
  const fileInputC = document.getElementById("fileLogoContratante");
  const dropzoneC = document.getElementById("dropzoneLogoContratante");
  const btnUploadC = document.getElementById("btnUploadLogoContratante");
  const btnSampleC = document.getElementById("btnSampleLogoContratante");
  const btnRemoveC = document.getElementById("btnRemoveLogoContratante");

  if (btnUploadC && fileInputC) {
    btnUploadC.addEventListener("click", () => fileInputC.click());
  }

  if (dropzoneC && fileInputC) {
    dropzoneC.addEventListener("click", (e) => {
      if (e.target !== btnRemoveC && (!btnRemoveC || !btnRemoveC.contains(e.target))) {
        fileInputC.click();
      }
    });

    dropzoneC.addEventListener("dragover", (e) => { e.preventDefault(); dropzoneC.classList.add("dragover"); });
    dropzoneC.addEventListener("dragleave", () => dropzoneC.classList.remove("dragover"));
    dropzoneC.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzoneC.classList.remove("dragover");
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => setLogoContratante(ev.target.result);
        reader.readAsDataURL(file);
      }
    });
  }

  if (fileInputC) {
    fileInputC.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        setLogoContratante(ev.target.result);
        showToast("Logotipo da Contratante carregado com sucesso!", "success");
      };
      reader.readAsDataURL(file);
    });
  }

  if (btnRemoveC) {
    btnRemoveC.addEventListener("click", (e) => {
      e.stopPropagation();
      setLogoContratante(null);
      showToast("Logotipo da Contratante removido.", "info");
    });
  }

  if (btnSampleC) {
    btnSampleC.addEventListener("click", (e) => {
      e.stopPropagation();
      setLogoContratante(getSampleLogoContratante());
      showToast("Logotipo de exemplo corporativo aplicado!", "info");
    });
  }
}

function getSampleLogoPrestadora() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 80" width="280" height="80">
    <rect width="280" height="80" rx="8" fill="#1A2B4C"/>
    <g transform="translate(15, 12)">
      <polygon points="28,4 52,18 4,18" fill="#C5A059"/>
      <rect x="10" y="22" width="6" height="26" fill="#C5A059"/>
      <rect x="25" y="22" width="6" height="26" fill="#C5A059"/>
      <rect x="40" y="22" width="6" height="26" fill="#C5A059"/>
      <rect x="4" y="48" width="48" height="6" rx="2" fill="#C5A059"/>
    </g>
    <text x="76" y="34" font-family="'Segoe UI', Arial, sans-serif" font-size="16" font-weight="bold" fill="#FFFFFF">INSTITUTO DE EDUCAÇÃO</text>
    <text x="76" y="54" font-family="'Segoe UI', Arial, sans-serif" font-size="11" letter-spacing="2" fill="#C5A059">CAPACITAÇÃO PROFISSIONAL</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function getSampleLogoContratante() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 80" width="280" height="80">
    <rect width="280" height="80" rx="8" fill="#0F3D2E"/>
    <g transform="translate(15, 15)">
      <circle cx="25" cy="25" r="22" fill="none" stroke="#B08E3C" stroke-width="3"/>
      <polygon points="25,8 39,34 11,34" fill="#B08E3C"/>
      <circle cx="25" cy="25" r="5" fill="#0F3D2E"/>
    </g>
    <text x="74" y="34" font-family="'Segoe UI', Arial, sans-serif" font-size="16" font-weight="bold" fill="#FFFFFF">CORP &amp; PARTNERS</text>
    <text x="74" y="54" font-family="'Segoe UI', Arial, sans-serif" font-size="11" letter-spacing="1.5" fill="#B08E3C">SOLUÇÕES CORPORATIVAS</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// ---------------------------------------------------------------------------
// 3. Gerenciamento do Verso do Certificado (Folha de Trás)
// ---------------------------------------------------------------------------
function setVersoHabilitado(habilitar, triggerSave = true) {
  state.habilitarVerso = !!habilitar;
  const checkHabilitar = document.getElementById("checkHabilitarVerso");
  const containerConfig = document.getElementById("containerConfigVerso");
  const badgeStatus = document.getElementById("badgeVersoStatus");
  const badgeDot = document.getElementById("badgeVersoDot");

  if (checkHabilitar) checkHabilitar.checked = state.habilitarVerso;
  if (containerConfig) containerConfig.style.display = state.habilitarVerso ? "block" : "none";
  if (badgeStatus) {
    badgeStatus.textContent = state.habilitarVerso ? "Ativo" : "Desativado";
    badgeStatus.className = state.habilitarVerso ? "tab-badge" : "tab-badge badge-muted";
  }
  if (badgeDot) {
    badgeDot.style.display = state.habilitarVerso ? "block" : "none";
  }
  if (!state.habilitarVerso && state.previewSide === "verso") {
    setPreviewFace("frente");
  }
  updateLivePreview();
  if (triggerSave && typeof scheduleAutoSave === "function") {
    scheduleAutoSave();
  }
}

function initVersoControls() {
  const checkHabilitar = document.getElementById("checkHabilitarVerso");
  const selectPresets = document.getElementById("selectPresetsEmenta");
  const textareaConteudo = document.getElementById("textareaVersoConteudo");

  // Presets de Conteúdo Programático
  const presetsEmenta = {
    tecnologia: `• Módulo 1: Fundamentos de Inteligência Artificial, LLMs & Agentes Autônomos\n• Módulo 2: Arquitetura de Software Moderno, APIs REST e Automação de Processos\n• Módulo 3: Segurança da Informação, LGPD e Governança de Dados\n• Módulo 4: Projeto Prático Aplicado e Validação de Resultados no Mercado`,
    gestao: `• Módulo 1: Fundamentos de Gestão Ágil, Métodos Ágeis e Framework Scrum\n• Módulo 2: Liderança Humanizada, Inteligência Emocional e Gestão de Equipes\n• Módulo 3: Planejamento Estratégico, Definição de Metas e Indicadores OKR\n• Módulo 4: Técnicas de Negociação, Resolução de Conflitos e Cultura de Feedback`,
    seguranca: `• Módulo 1: Introdução às Normas Regulamentadoras NR-01, NR-06 e NR-10\n• Módulo 2: Identificação de Riscos Ambientais e Mapas de Risco no Trabalho\n• Módulo 3: Procedimentos de Emergência, Uso de EPIs/EPCs e Prevenção de Acidentes\n• Módulo 4: Simulação Prática de Primeiros Socorros e Evacuação de Áreas`,
    saude: `• Módulo 1: Princípios Gerais de Biossegurança, Higienização e Controle de Infecções\n• Módulo 2: Avaliação Primária e Secundária em Situações de Urgência\n• Módulo 3: Protocolos Clínicos, Técnicas de Imobilização e Suporte Básico de Vida\n• Módulo 4: Ética Profissional em Saúde e Documentação de Atendimentos`,
    personalizado: `• Módulo 1: Tópico Introdutório e Fundamentação Teórica\n• Módulo 2: Práticas Operacionais e Aplicações em Cenários Reais\n• Módulo 3: Avaliação de Competências e Estudos Dirigidos`
  };

  if (checkHabilitar) {
    checkHabilitar.addEventListener("change", () => {
      setVersoHabilitado(checkHabilitar.checked, true);
    });
  }

  if (selectPresets && textareaConteudo) {
    selectPresets.addEventListener("change", () => {
      const escolhido = selectPresets.value;
      if (presetsEmenta[escolhido]) {
        textareaConteudo.value = presetsEmenta[escolhido];
        updateLivePreview();
        if (typeof scheduleAutoSave === "function") scheduleAutoSave();
      }
    });
  }

  const inputsVerso = [
    "inputVersoTitulo",
    "textareaVersoConteudo",
    "inputVersoLivro",
    "inputVersoFolha",
    "inputVersoRegistro",
    "textareaVersoAmparoLegal",
    "inputVersoAssNome",
    "inputVersoAssCargo"
  ];

  inputsVerso.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", () => {
        updateLivePreview();
        if (typeof scheduleAutoSave === "function") scheduleAutoSave();
      });
    }
  });
}

// ---------------------------------------------------------------------------
// 4. Alternância de Face no Live Preview (Frente / Verso / Ambos)
// ---------------------------------------------------------------------------
function initFaceToggle() {
  const btnFrente = document.getElementById("btnVerFrente");
  const btnVerso = document.getElementById("btnVerVerso");
  const btnAmbos = document.getElementById("btnVerAmbos");

  btnFrente.addEventListener("click", () => setPreviewFace("frente"));
  btnVerso.addEventListener("click", () => {
    if (!state.habilitarVerso) {
      showToast("O Verso está desativado. Ative-o na aba 'Verso' para visualizar.", "warning");
      return;
    }
    setPreviewFace("verso");
  });
  btnAmbos.addEventListener("click", () => {
    if (!state.habilitarVerso) {
      showToast("O Verso está desativado. Ative-o na aba 'Verso' para visualizar ambos.", "warning");
      return;
    }
    setPreviewFace("ambos");
  });
}

function setPreviewFace(side) {
  state.previewSide = side;
  const viewport = document.getElementById("certificateViewport");
  const btnFrente = document.getElementById("btnVerFrente");
  const btnVerso = document.getElementById("btnVerVerso");
  const btnAmbos = document.getElementById("btnVerAmbos");

  btnFrente.classList.toggle("active", side === "frente");
  btnVerso.classList.toggle("active", side === "verso");
  btnAmbos.classList.toggle("active", side === "ambos");

  viewport.className = `certificate-viewport view-mode-${side}`;
  updateLivePreview();
}

// ---------------------------------------------------------------------------
// 5. Toolbar de Variáveis & Inserção no Cursor
// ---------------------------------------------------------------------------
function initVariablesToolbar() {
  const textarea = document.getElementById("textareaTextoCorpo");
  const toolbar = document.getElementById("variablesToolbar");

  // Inserção das tags pré-existentes
  toolbar.addEventListener("click", (e) => {
    const chip = e.target.closest(".tag-chip[data-tag]");
    if (chip) {
      const tag = chip.getAttribute("data-tag");
      inserirTextoNoCursor(textarea, tag);
      updateDetectedVariables();
      updateLivePreview();
      renderTable();
    }
  });

  // Modal de Nova Variável
  const btnNovaVar = document.getElementById("btnNovaVariavel");
  const modal = document.getElementById("modalNovaVariavel");
  const btnFecharModal = document.getElementById("btnFecharModalNovaVar");
  const btnCancelarModal = document.getElementById("btnCancelarNovaVar");
  const btnConfirmar = document.getElementById("btnConfirmarNovaVar");
  const inputNomeVar = document.getElementById("inputNomeNovaVar");

  btnNovaVar.addEventListener("click", () => {
    inputNomeVar.value = "";
    modal.classList.add("active");
    inputNomeVar.focus();
  });

  const fecharModal = () => modal.classList.remove("active");
  btnFecharModal.addEventListener("click", fecharModal);
  btnCancelarModal.addEventListener("click", fecharModal);

  btnConfirmar.addEventListener("click", () => {
    let nome = inputNomeVar.value.trim().toUpperCase();
    nome = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // remove acentos
    nome = nome.replace(/[^A-Z0-9_]/g, "_").replace(/^_+|_+$/g, ""); // formato seguro

    if (!nome) {
      showToast("Digite um nome para a variável!", "warning");
      return;
    }

    const tagCompleta = `{{${nome}}}`;
    
    // Cria novo chip visual se não existir
    if (!document.querySelector(`[data-tag="${tagCompleta}"]`)) {
      const novoChip = document.createElement("button");
      novoChip.type = "button";
      novoChip.className = "tag-chip tag-cyan";
      novoChip.setAttribute("data-tag", tagCompleta);
      novoChip.textContent = `+ ${tagCompleta}`;
      btnNovaVar.parentNode.insertBefore(novoChip, btnNovaVar);
    }

    inserirTextoNoCursor(textarea, tagCompleta);
    fecharModal();
    updateDetectedVariables();
    updateLivePreview();
    renderTable();
    showToast(`Variável ${tagCompleta} adicionada com sucesso!`, "success");
  });
}

function inserirTextoNoCursor(textarea, texto) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const valorOriginal = textarea.value;

  textarea.value = valorOriginal.substring(0, start) + " " + texto + " " + valorOriginal.substring(end);
  const novaPos = start + texto.length + 2;
  textarea.setSelectionRange(novaPos, novaPos);
  textarea.focus();
}

function updateDetectedVariables() {
  const texto = document.getElementById("textareaTextoCorpo").value;
  const matches = texto.match(/\{\{([A-Za-z0-9_]+)\}\}/g) || [];
  
  const tagsUnicas = [];
  matches.forEach(m => {
    const limpa = m.replace(/[\{\}]/g, "").trim().toUpperCase();
    if (!tagsUnicas.includes(limpa)) tagsUnicas.push(limpa);
  });

  state.detectedVariables = tagsUnicas;
  const countElem = document.getElementById("detectedTagsCount");
  if (countElem) {
    countElem.textContent = `${tagsUnicas.length} variável(is) no texto`;
  }
}

// ---------------------------------------------------------------------------
// 3. Pré-visualização Ao Vivo (Live Preview)
// ---------------------------------------------------------------------------
function initLivePreviewEvents() {
  const inputs = [
    "inputInstituicao",
    "inputTitulo",
    "inputSubtitulo",
    "textareaTextoCorpo",
    "inputAss1Nome",
    "inputAss1Cargo",
    "inputAss2Nome",
    "inputAss2Cargo"
  ];

  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", () => {
        if (id === "textareaTextoCorpo") {
          updateDetectedVariables();
          renderTable();
        }
        updateLivePreview();
        if (typeof scheduleAutoSave === "function") scheduleAutoSave();
      });
    }
  });

  const checkCod = document.getElementById("checkCodigoAutenticacao");
  if (checkCod) {
    checkCod.addEventListener("change", () => {
      updateLivePreview();
      if (typeof scheduleAutoSave === "function") scheduleAutoSave();
    });
  }

  // Presets Rápidos de Título
  const selectPresets = document.getElementById("selectPresetsTitulo");
  if (selectPresets) {
    selectPresets.addEventListener("change", () => {
      document.getElementById("inputTitulo").value = selectPresets.value;
      updateLivePreview();
      if (typeof scheduleAutoSave === "function") scheduleAutoSave();
    });
  }

  // Alternância de Modo de Preview (Tags vs Simulado)
  const btnTags = document.getElementById("btnModoTags");
  const btnSimulado = document.getElementById("btnModoSimulado");
  const wrapperPerson = document.getElementById("wrapperSelectPerson");
  const selectPerson = document.getElementById("selectParticipantePreview");

  btnTags.addEventListener("click", () => {
    btnTags.classList.add("active");
    btnSimulado.classList.remove("active");
    wrapperPerson.style.display = "none";
    state.previewMode = "tags";
    updateLivePreview();
  });

  btnSimulado.addEventListener("click", () => {
    btnSimulado.classList.add("active");
    btnTags.classList.remove("active");
    wrapperPerson.style.display = "block";
    state.previewMode = "simulado";
    atualizarSelectParticipantesPreview();
    updateLivePreview();
  });

  selectPerson.addEventListener("change", () => {
    state.selectedParticipantIdx = parseInt(selectPerson.value) || 0;
    updateLivePreview();
  });

  // Botão Imprimir Certificado
  document.getElementById("btnImprimirNavegador").addEventListener("click", () => {
    window.print();
  });
}

function updateLivePreview() {
  const inst = document.getElementById("inputInstituicao").value || "INSTITUIÇÃO DE ENSINO";
  const tit = document.getElementById("inputTitulo").value || "CERTIFICADO";
  const sub = document.getElementById("inputSubtitulo").value || "DE CONCLUSÃO";
  const corpo = document.getElementById("textareaTextoCorpo").value || "";
  const a1n = document.getElementById("inputAss1Nome").value || "";
  const a1c = document.getElementById("inputAss1Cargo").value || "";
  const a2n = document.getElementById("inputAss2Nome").value || "";
  const a2c = document.getElementById("inputAss2Cargo").value || "";
  const showFoot = document.getElementById("checkCodigoAutenticacao").checked;

  const participante = getParticipanteAmostra();

  // =========================================================================
  // 1. RENDERIZAÇÃO DA FOLHA DA FRENTE
  // =========================================================================
  // Logotipos
  const imgP = document.getElementById("previewCertLogoPrestadora");
  if (imgP) {
    if (state.logoPrestadora) {
      imgP.src = state.logoPrestadora;
      imgP.style.display = "block";
    } else {
      imgP.src = "";
      imgP.style.display = "none";
    }
  }

  const imgC = document.getElementById("previewCertLogoContratante");
  if (imgC) {
    if (state.logoContratante) {
      imgC.src = state.logoContratante;
      imgC.style.display = "block";
    } else {
      imgC.src = "";
      imgC.style.display = "none";
    }
  }

  document.getElementById("previewInstituicao").textContent = inst.toUpperCase();
  document.getElementById("previewTitulo").textContent = tit.toUpperCase();
  document.getElementById("previewSubtitulo").textContent = sub.toUpperCase();
  document.getElementById("previewAss1Nome").textContent = a1n;
  document.getElementById("previewAss1Cargo").textContent = a1c;
  document.getElementById("previewAss2Nome").textContent = a2n;
  document.getElementById("previewAss2Cargo").textContent = a2c;
  document.getElementById("previewFooter").style.display = showFoot ? "block" : "none";

  // Formata o corpo do texto da frente
  let corpoHtml = "";
  if (state.previewMode === "tags") {
    corpoHtml = corpo.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, '<span class="var-tag">{{$1}}</span>');
  } else {
    corpoHtml = corpo.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, (match, p1) => {
      const chave = p1.toUpperCase();
      const val = participante[chave] || `[${chave}]`;
      return `<span class="var-filled">${val}</span>`;
    });
  }
  document.getElementById("previewCorpo").innerHTML = corpoHtml;

  // =========================================================================
  // 2. RENDERIZAÇÃO DA FOLHA DO VERSO
  // =========================================================================
  const sheetVerso = document.getElementById("certificateSheetVerso");
  const viewport = document.getElementById("certificateViewport");

  if (sheetVerso) {
    // Cabeçalho e Título do Verso
    const elVInst = document.getElementById("previewVersoInstituicao");
    const elVTit = document.getElementById("previewVersoTitulo");
    const elVTitInput = document.getElementById("inputVersoTitulo");
    if (elVInst) elVInst.textContent = inst.toUpperCase();
    if (elVTit) elVTit.textContent = (elVTitInput ? elVTitInput.value : "CONTEÚDO PROGRAMÁTICO & REGISTRO").toUpperCase();

    // Ementa / Lista de Módulos
    const elEmentaInput = document.getElementById("textareaVersoConteudo");
    const elEmentaList = document.getElementById("previewVersoEmentaList");
    if (elEmentaList && elEmentaInput) {
      const linhas = elEmentaInput.value.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      let listHtml = "";
      linhas.forEach(linha => {
        let textoLinha = linha.replace(/^[•\-\*▪]\s*/, ""); // remove marcador inicial se houver
        if (state.previewMode === "tags") {
          textoLinha = textoLinha.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, '<span class="var-tag">{{$1}}</span>');
        } else {
          textoLinha = textoLinha.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, (match, p1) => {
            const chave = p1.toUpperCase();
            return `<span class="var-filled">${participante[chave] || `[${chave}]`}</span>`;
          });
        }
        listHtml += `
          <div class="ementa-item">
            <span class="ementa-bullet">▪</span>
            <span>${textoLinha}</span>
          </div>
        `;
      });
      elEmentaList.innerHTML = listHtml;
    }

    // Carga Horária no Verso
    const elVCh = document.getElementById("previewVersoCargaHoraria");
    if (elVCh) {
      if (state.previewMode === "tags") {
        elVCh.innerHTML = '<span class="var-tag">{{CARGA_HORARIA}}</span>';
      } else {
        elVCh.textContent = participante.CARGA_HORARIA || "40 horas";
      }
    }

    // Dados de Registro
    const elVLivro = document.getElementById("inputVersoLivro");
    const elVFolha = document.getElementById("inputVersoFolha");
    const elVReg = document.getElementById("inputVersoRegistro");
    
    const outLivro = document.getElementById("previewVersoLivroVal");
    const outFolha = document.getElementById("previewVersoFolhaVal");
    const outReg = document.getElementById("previewVersoRegVal");
    const outData = document.getElementById("previewVersoDataVal");

    if (outLivro) outLivro.textContent = elVLivro ? elVLivro.value : "01";
    if (outFolha) outFolha.textContent = elVFolha ? elVFolha.value : "45";

    if (outReg) {
      const regTemplate = elVReg ? elVReg.value : "REG-{{CPF}}";
      if (state.previewMode === "tags") {
        outReg.innerHTML = regTemplate.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, '<span class="var-tag">{{$1}}</span>');
      } else {
        outReg.textContent = regTemplate.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, (match, p1) => {
          const k = p1.toUpperCase();
          return participante[k] || "123.456.789-00";
        });
      }
    }

    if (outData) {
      if (state.previewMode === "tags") {
        outData.innerHTML = '<span class="var-tag">{{DATA}}</span>';
      } else {
        outData.textContent = participante.DATA || "11/09/2026";
      }
    }

    // Amparo Legal
    const elVAmparoInput = document.getElementById("textareaVersoAmparoLegal");
    const outAmparo = document.getElementById("previewVersoAmparo");
    if (outAmparo && elVAmparoInput) {
      outAmparo.textContent = elVAmparoInput.value;
    }

    // Assinatura Técnica do Verso
    const elVAssN = document.getElementById("inputVersoAssNome");
    const elVAssC = document.getElementById("inputVersoAssCargo");
    const outVAssN = document.getElementById("previewVersoAssNome");
    const outVAssC = document.getElementById("previewVersoAssCargo");
    if (outVAssN && elVAssN) outVAssN.textContent = elVAssN.value;
    if (outVAssC && elVAssC) outVAssC.textContent = elVAssC.value;

    // Hash de Autenticação Digital Simulado
    const outHash = document.getElementById("previewVersoHash");
    if (outHash) {
      const rawCpf = (participante.CPF || "123456").replace(/\D/g, "");
      const sliceCpf = rawCpf.length >= 6 ? rawCpf.substring(0, 6) : "89A4B2";
      outHash.textContent = `CERT-${sliceCpf}-2026`;
    }

    // Modo de visualização de faces (Frente / Verso / Ambos)
    if (!state.habilitarVerso) {
      viewport.className = "certificate-viewport view-mode-frente";
    } else {
      viewport.className = `certificate-viewport view-mode-${state.previewSide}`;
    }
  }
}

function getParticipanteAmostra() {
  if (state.dataSource === "tabela" && state.participantesTabela.length > 0) {
    const idx = Math.min(state.selectedParticipantIdx, state.participantesTabela.length - 1);
    return state.participantesTabela[idx];
  } else if (state.planilhaDados && state.planilhaDados.participantes && state.planilhaDados.participantes.length > 0) {
    const idx = Math.min(state.selectedParticipantIdx, state.planilhaDados.participantes.length - 1);
    return state.planilhaDados.participantes[idx];
  }
  return {
    NOME: "Ana Beatriz da Silva Santos",
    CPF: "123.456.789-01",
    CURSO: "Inteligência Artificial Aplicada",
    DATA: "11/09/2026",
    CARGA_HORARIA: "40 horas"
  };
}

function atualizarSelectParticipantesPreview() {
  const select = document.getElementById("selectParticipantePreview");
  select.innerHTML = "";

  const lista = (state.dataSource === "tabela")
    ? state.participantesTabela
    : (state.planilhaDados ? state.planilhaDados.participantes : []);

  if (!lista || lista.length === 0) {
    const opt = document.createElement("option");
    opt.value = 0;
    opt.textContent = "Exemplo padrão";
    select.appendChild(opt);
    return;
  }

  lista.forEach((p, idx) => {
    const opt = document.createElement("option");
    opt.value = idx;
    opt.textContent = `${idx + 1}. ${p.NOME || "Sem Nome"}`;
    select.appendChild(opt);
  });

  select.value = Math.min(state.selectedParticipantIdx, lista.length - 1);
}

// ---------------------------------------------------------------------------
// 6. Design, Temas e Orientação
// ---------------------------------------------------------------------------
function aplicarTemaCertificado(tema, triggerSave = true) {
  state.tema = tema;
  const sheetFrente = document.getElementById("certificateSheet");
  const sheetVerso = document.getElementById("certificateSheetVerso");

  document.querySelectorAll(".theme-card").forEach(c => c.classList.remove("active"));
  const radio = document.querySelector(`input[name="radioTema"][value="${tema}"]`);
  if (radio) {
    radio.checked = true;
    const card = radio.closest(".theme-card");
    if (card) card.classList.add("active");
  }

  [sheetFrente, sheetVerso].forEach(s => {
    if (s) {
      s.classList.remove("tema-ouro_azul", "tema-esmeralda", "tema-classico", "tema-rubi");
      s.classList.add(`tema-${tema}`);
    }
  });
  updateLivePreview();
  if (triggerSave && typeof scheduleAutoSave === "function") {
    scheduleAutoSave();
  }
}

function aplicarOrientacao(orient, triggerSave = true) {
  state.orientacao = orient;
  const isRetrato = orient === "retrato";
  const btnOrientRetrato = document.getElementById("btnOrientRetrato");
  const btnOrientPaisagem = document.getElementById("btnOrientPaisagem");
  const badgeSheet = document.getElementById("previewSheetBadge");
  const sheetFrente = document.getElementById("certificateSheet");
  const sheetVerso = document.getElementById("certificateSheetVerso");

  if (btnOrientRetrato) btnOrientRetrato.classList.toggle("active", isRetrato);
  if (btnOrientPaisagem) btnOrientPaisagem.classList.toggle("active", !isRetrato);
  if (badgeSheet) badgeSheet.textContent = isRetrato ? "A4 Vertical (Retrato)" : "A4 Horizontal (Paisagem)";

  [sheetFrente, sheetVerso].forEach(s => {
    if (s) {
      s.classList.remove("orientacao-paisagem", "orientacao-retrato");
      s.classList.add(`orientacao-${orient}`);
    }
  });

  document.querySelectorAll(".orientation-card").forEach(c => c.classList.remove("active"));
  const radio = document.querySelector(`input[name="radioOrientacao"][value="${orient}"]`);
  if (radio) {
    radio.checked = true;
    const card = radio.closest(".orientation-card");
    if (card) card.classList.add("active");
  }
  updateLivePreview();
  if (triggerSave && typeof scheduleAutoSave === "function") {
    scheduleAutoSave();
  }
}

function initDesignControls() {
  // Temas
  const radioTemas = document.querySelectorAll('input[name="radioTema"]');
  radioTemas.forEach(radio => {
    radio.addEventListener("change", () => {
      aplicarTemaCertificado(radio.value, true);
    });
  });

  // Orientação da Folha A4 (Sincronizado entre Sidebar e Aba Estilo)
  const btnOrientRetrato = document.getElementById("btnOrientRetrato");
  const btnOrientPaisagem = document.getElementById("btnOrientPaisagem");
  const radioOrient = document.querySelectorAll('input[name="radioOrientacao"]');

  if (btnOrientRetrato) {
    btnOrientRetrato.addEventListener("click", () => aplicarOrientacao("retrato", true));
  }
  if (btnOrientPaisagem) {
    btnOrientPaisagem.addEventListener("click", () => aplicarOrientacao("paisagem", true));
  }

  radioOrient.forEach(radio => {
    radio.addEventListener("change", () => {
      aplicarOrientacao(radio.value, true);
    });
  });

  aplicarOrientacao(state.orientacao || "paisagem", false);

  // Salvar Modelo em .DOCX
  const btnSalvarModelo = document.getElementById("btnSalvarModeloDocx");
  btnSalvarModelo.addEventListener("click", async () => {
    const payload = {
      titulo: document.getElementById("inputTitulo").value,
      subtitulo: document.getElementById("inputSubtitulo").value,
      instituicao: document.getElementById("inputInstituicao").value,
      texto_corpo: document.getElementById("textareaTextoCorpo").value,
      assinatura_1_nome: document.getElementById("inputAss1Nome").value,
      assinatura_1_cargo: document.getElementById("inputAss1Cargo").value,
      assinatura_2_nome: document.getElementById("inputAss2Nome").value,
      assinatura_2_cargo: document.getElementById("inputAss2Cargo").value,
      tema: state.tema,
      orientacao: state.orientacao,
      nome_arquivo: "certificado_personalizado.docx",
      codigo_verificacao: document.getElementById("checkCodigoAutenticacao").checked,

      // Logotipos e Verso
      logo_prestadora_base64: state.logoPrestadora,
      logo_contratante_base64: state.logoContratante,
      habilitar_verso: state.habilitarVerso,
      verso_titulo: document.getElementById("inputVersoTitulo") ? document.getElementById("inputVersoTitulo").value : "CONTEÚDO PROGRAMÁTICO & REGISTRO",
      verso_conteudo: document.getElementById("textareaVersoConteudo") ? document.getElementById("textareaVersoConteudo").value : "",
      verso_livro: document.getElementById("inputVersoLivro") ? document.getElementById("inputVersoLivro").value : "01",
      verso_folha: document.getElementById("inputVersoFolha") ? document.getElementById("inputVersoFolha").value : "45",
      verso_registro: document.getElementById("inputVersoRegistro") ? document.getElementById("inputVersoRegistro").value : "REG-{{CPF}}",
      verso_amparo_legal: document.getElementById("textareaVersoAmparoLegal") ? document.getElementById("textareaVersoAmparoLegal").value : "",
      verso_assinatura_nome: document.getElementById("inputVersoAssNome") ? document.getElementById("inputVersoAssNome").value : "Coordenação Técnica Pedagógica",
      verso_assinatura_cargo: document.getElementById("inputVersoAssCargo") ? document.getElementById("inputVersoAssCargo").value : "Responsável Técnico(a)"
    };

    btnSalvarModelo.disabled = true;
    btnSalvarModelo.textContent = "Gerando arquivo .docx...";

    try {
      const res = await fetch("/api/modelo/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.ok) {
        showToast("Modelo Word oficial salvo com sucesso em 'modelo/'!", "success");
        await fetchServerStatus();
        document.getElementById("selectModelosDisponiveis").value = data.nome_arquivo;
      } else {
        showToast("Erro ao salvar modelo: " + (data.detail || "Desconhecido"), "error");
      }
    } catch (err) {
      showToast("Falha na requisição: " + err.message, "error");
    } finally {
      btnSalvarModelo.disabled = false;
      btnSalvarModelo.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          <polyline points="17 21 17 13 7 13 7 21"></polyline>
          <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
        Salvar Texto como Modelo Word (.docx)
      `;
    }
  });

  // Upload de DOCX próprio
  const inputUploadModelo = document.getElementById("fileUploadModelo");
  inputUploadModelo.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("arquivo", file);

    try {
      showToast("Enviando modelo Word...", "info");
      const res = await fetch("/api/modelo/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.ok) {
        showToast(`Modelo '${data.nome_arquivo}' carregado com sucesso!`, "success");
        await fetchServerStatus();
        document.getElementById("selectModelosDisponiveis").value = data.nome_arquivo;
      } else {
        showToast("Erro ao enviar modelo: " + data.detail, "error");
      }
    } catch (err) {
      showToast("Erro no upload: " + err.message, "error");
    }
  });
}

// ---------------------------------------------------------------------------
// 5. Gerenciamento de Participantes (Tabela & Planilha)
// ---------------------------------------------------------------------------
function initTableManagement() {
  // Alternância de Segmento (Tabela vs Arquivo)
  const segmentBtns = document.querySelectorAll(".segment-btn");
  const containerTabela = document.getElementById("containerFonteTabela");
  const containerArquivo = document.getElementById("containerFonteArquivo");

  segmentBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      segmentBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const source = btn.getAttribute("data-source");
      state.dataSource = source;

      if (source === "tabela") {
        containerTabela.classList.add("active");
        containerArquivo.classList.remove("active");
      } else {
        containerTabela.classList.remove("active");
        containerArquivo.classList.add("active");
      }

      atualizarResumoGeracao();
      atualizarSelectParticipantesPreview();
      updateLivePreview();
    });
  });

  // Botões de Ação da Tabela
  document.getElementById("btnAdicionarLinha").addEventListener("click", () => {
    const novaLinha = {};
    state.detectedVariables.forEach(v => novaLinha[v] = "");
    state.participantesTabela.push(novaLinha);
    renderTable();
    atualizarResumoGeracao();
    if (typeof scheduleAutoSave === "function") scheduleAutoSave();
  });

  document.getElementById("btnPreencherExemplos").addEventListener("click", () => {
    state.participantesTabela = [
      {
        NOME: "Carlos Eduardo da Silva",
        CPF: "123.456.789-00",
        CURSO: "Inteligência Artificial Aplicada",
        DATA: "11/09/2026",
        CARGA_HORARIA: "40 horas",
        CIDADE: "São Paulo - SP"
      },
      {
        NOME: "Mariana Souza Oliveira",
        CPF: "987.654.321-11",
        CURSO: "Gestão Ágil e Projetos",
        DATA: "11/09/2026",
        CARGA_HORARIA: "30 horas",
        CIDADE: "Rio de Janeiro - RJ"
      },
      {
        NOME: "Rodrigo Mendes Albuquerque",
        CPF: "456.789.123-22",
        CURSO: "Segurança da Informação",
        DATA: "11/09/2026",
        CARGA_HORARIA: "60 horas",
        CIDADE: "Belo Horizonte - MG"
      }
    ];
    renderTable();
    atualizarResumoGeracao();
    if (typeof scheduleAutoSave === "function") scheduleAutoSave();
    showToast("3 participantes de exemplo preenchidos!", "info");
  });

  document.getElementById("btnLimparTabela").addEventListener("click", () => {
    state.participantesTabela = [];
    renderTable();
    atualizarResumoGeracao();
    if (typeof scheduleAutoSave === "function") scheduleAutoSave();
  });

  // Download do Modelo Excel com as colunas certas
  document.getElementById("btnBaixarPlanilhaExemplo").addEventListener("click", () => {
    const colunas = state.detectedVariables.join(",");
    window.location.href = `/api/planilha/exemplo-download?colunas=${encodeURIComponent(colunas)}`;
  });
}

function renderTable() {
  const thead = document.getElementById("tabelaHead");
  const tbody = document.getElementById("tabelaBody");
  const badgeTotal = document.getElementById("badgeTotalParticipantes");

  if (!thead || !tbody) return;

  // Garante que NOME sempre seja a primeira coluna
  const cols = [...state.detectedVariables];
  if (!cols.includes("NOME")) cols.unshift("NOME");

  // Cabeçalho
  let headHtml = "<tr><th style='width: 38px;'>#</th>";
  cols.forEach(col => {
    headHtml += `<th>{{${col}}}</th>`;
  });
  headHtml += "<th style='width: 40px; text-align: center;'>Ação</th></tr>";
  thead.innerHTML = headHtml;

  // Linhas
  let bodyHtml = "";
  state.participantesTabela.forEach((p, rowIdx) => {
    bodyHtml += `<tr><td style="color: var(--text-muted); font-size: 0.75rem;">${rowIdx + 1}</td>`;
    cols.forEach(col => {
      const val = p[col] || "";
      bodyHtml += `
        <td>
          <input type="text" class="data-table-input" data-row="${rowIdx}" data-col="${col}" value="${escapeHtml(val)}" />
        </td>
      `;
    });
    bodyHtml += `
      <td style="text-align: center;">
        <button type="button" class="btn-remove-row" data-row="${rowIdx}" title="Remover participante">✕</button>
      </td>
    </tr>`;
  });

  tbody.innerHTML = bodyHtml;
  badgeTotal.textContent = state.participantesTabela.length;

  // Eventos de edição nas células
  tbody.querySelectorAll(".data-table-input").forEach(input => {
    input.addEventListener("input", (e) => {
      const row = parseInt(e.target.getAttribute("data-row"));
      const col = e.target.getAttribute("data-col");
      state.participantesTabela[row][col] = e.target.value;
      if (state.previewMode === "simulado") updateLivePreview();
      if (typeof scheduleAutoSave === "function") scheduleAutoSave();
    });
  });

  // Eventos de remoção de linha
  tbody.querySelectorAll(".btn-remove-row").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const row = parseInt(e.target.getAttribute("data-row"));
      state.participantesTabela.splice(row, 1);
      renderTable();
      atualizarResumoGeracao();
      if (state.previewMode === "simulado") {
        atualizarSelectParticipantesPreview();
        updateLivePreview();
      }
      if (typeof scheduleAutoSave === "function") scheduleAutoSave();
    });
  });
}

function escapeHtml(text) {
  return String(text).replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// 6. Upload de Planilha & Drag and Drop
// ---------------------------------------------------------------------------
function initFileUploads() {
  const dropzone = document.getElementById("dropzonePlanilha");
  const fileInput = document.getElementById("fileUploadPlanilha");
  const selectPlanilhas = document.getElementById("selectPlanilhasDisponiveis");

  ["dragenter", "dragover"].forEach(event => {
    dropzone.addEventListener(event, (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach(event => {
    dropzone.addEventListener(event, (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
    });
  });

  dropzone.addEventListener("drop", (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) processarUploadPlanilha(files[0]);
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) processarUploadPlanilha(e.target.files[0]);
  });

  selectPlanilhas.addEventListener("change", async () => {
    const nome = selectPlanilhas.value;
    if (nome) carregarPlanilhaExistente(nome);
  });
}

async function processarUploadPlanilha(file) {
  const formData = new FormData();
  formData.append("arquivo", file);

  try {
    showToast(`Carregando ${file.name}...`, "info");
    const res = await fetch("/api/planilha/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (data.ok) {
      showToast(`Planilha '${data.nome_arquivo}' processada com sucesso!`, "success");
      await fetchServerStatus();
      document.getElementById("selectPlanilhasDisponiveis").value = data.nome_arquivo;
      carregarPlanilhaExistente(data.nome_arquivo);
    } else {
      showToast("Erro ao processar planilha: " + data.detail, "error");
    }
  } catch (err) {
    showToast("Falha no upload: " + err.message, "error");
  }
}

async function carregarPlanilhaExistente(nome) {
  try {
    const res = await fetch(`/api/planilha/ler?nome=${encodeURIComponent(nome)}`);
    const data = await res.json();
    if (data.ok) {
      state.planilhaSelecionada = nome;
      state.planilhaDados = data;

      const card = document.getElementById("planilhaPreviewCard");
      card.style.display = "block";
      document.getElementById("prevNomePlanilha").textContent = nome;
      document.getElementById("prevInfoPlanilha").textContent = `${data.total_participantes} participantes encontrados`;

      const colsContainer = document.getElementById("prevColunasPlanilha");
      colsContainer.innerHTML = "";
      data.colunas.forEach(col => {
        const b = document.createElement("span");
        b.className = "col-badge";
        b.textContent = col;
        colsContainer.appendChild(b);
      });

      atualizarResumoGeracao();
      if (state.previewMode === "simulado") {
        atualizarSelectParticipantesPreview();
        updateLivePreview();
      }
    }
  } catch (err) {
    console.error(err);
  }
}

// ---------------------------------------------------------------------------
// 7. Geração em Lote
// ---------------------------------------------------------------------------
function initGeneration() {
  const btnGerar = document.getElementById("btnIniciarGeracao");
  const progressContainer = document.getElementById("progressContainer");
  const progressBar = document.getElementById("progressBarFill");
  const progressStatus = document.getElementById("progressStatusText");
  const progressPercent = document.getElementById("progressPercent");
  const executionLog = document.getElementById("executionLog");
  const logBody = document.getElementById("logBody");
  const successBanner = document.getElementById("successBanner");

  document.getElementById("btnClearLog").addEventListener("click", () => {
    logBody.innerHTML = "";
  });

  btnGerar.addEventListener("click", async () => {
    const modeloNome = document.getElementById("selectModelosDisponiveis").value;
    const gerarPdf = document.getElementById("checkGerarPdf").checked;
    const limparSaida = document.getElementById("checkLimparSaida").checked;

    if (!modeloNome) {
      showToast("Selecione um modelo Word antes de gerar!", "warning");
      return;
    }

    const payload = {
      modelo_nome: modeloNome,
      gerar_pdf: gerarPdf,
      limpar_saida_antes: limparSaida,
      origem_dados: state.dataSource,
      arquivo_planilha: state.dataSource === "arquivo" ? document.getElementById("selectPlanilhasDisponiveis").value : null,
      participantes_tabela: state.dataSource === "tabela" ? state.participantesTabela : null
    };

    if (state.dataSource === "tabela" && state.participantesTabela.length === 0) {
      showToast("Adicione pelo menos um participante na tabela!", "warning");
      return;
    }

    // UI de Início
    btnGerar.disabled = true;
    btnGerar.innerHTML = "⏳ Processando certificados...";
    progressContainer.style.display = "block";
    executionLog.style.display = "block";
    successBanner.style.display = "none";
    logBody.innerHTML = "";
    progressBar.style.width = "10%";
    progressPercent.textContent = "10%";
    progressStatus.textContent = "Iniciando geração em lote...";

    adicionarLog(`[INFO] Iniciando geração usando modelo '${modeloNome}'`, "info");
    if (gerarPdf) {
      adicionarLog(`[INFO] Conversão para PDF ativa via docx2pdf (Microsoft Word)`, "info");
    }

    try {
      progressBar.style.width = "40%";
      progressPercent.textContent = "40%";
      progressStatus.textContent = "Preenchendo documentos Word e convertendo para PDF...";

      const res = await fetch("/api/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.ok) {
        progressBar.style.width = "100%";
        progressPercent.textContent = "100%";
        progressStatus.textContent = "Geração concluída com êxito!";

        const resumo = data.resumo;
        adicionarLog(`--------------------------------------------------`, "info");
        adicionarLog(`[CONCLUÍDO] Total processado: ${resumo.total}`, "ok");
        adicionarLog(`[CONCLUÍDO] Certificados gerados com sucesso: ${resumo.sucessos}`, "ok");
        
        if (resumo.itens_sucesso) {
          resumo.itens_sucesso.forEach(it => {
            adicionarLog(`✓ [OK] ${it.nome} -> ${it.docx} ${it.pdf ? `+ ${it.pdf}` : ''}`, "ok");
          });
        }

        if (resumo.erros > 0) {
          adicionarLog(`[AVISO] Ocorreram ${resumo.erros} erro(s):`, "err");
          resumo.itens_erro.forEach(it => {
            adicionarLog(`✗ [ERRO] Linha ${it.linha}: ${it.nome} -> ${it.erro}`, "err");
          });
        }

        successBanner.style.display = "flex";
        document.getElementById("bannerTitle").textContent = `${resumo.sucessos} Certificado(s) Gerado(s)!`;
        document.getElementById("bannerDesc").textContent = `Arquivos prontos em 'saida/' (.docx ${gerarPdf ? 'e .pdf' : ''}).`;

        showToast("Todos os certificados foram gerados com sucesso!", "success");
        await fetchServerStatus();

      } else {
        adicionarLog(`[ERRO CRÍTICO] ${data.detail || "Erro desconhecido"}`, "err");
        showToast("Erro na geração: " + data.detail, "error");
      }
    } catch (err) {
      adicionarLog(`[FALHA] ${err.message}`, "err");
      showToast("Falha de comunicação: " + err.message, "error");
    } finally {
      btnGerar.disabled = false;
      btnGerar.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon-large">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
        </svg>
        GERAR TODOS OS CERTIFICADOS
      `;
    }
  });

  function adicionarLog(msg, tipo = "info") {
    const p = document.createElement("div");
    p.className = `log-entry ${tipo}`;
    p.textContent = msg;
    logBody.appendChild(p);
    logBody.scrollTop = logBody.scrollHeight;
  }
}

function atualizarResumoGeracao() {
  const resumoModelo = document.getElementById("resumoModelo");
  const resumoFonte = document.getElementById("resumoFonte");
  const resumoTotal = document.getElementById("resumoTotal");
  const resumoPdf = document.getElementById("resumoPdf");

  const selModelo = document.getElementById("selectModelosDisponiveis");
  if (resumoModelo && selModelo) {
    resumoModelo.textContent = selModelo.value || "Nenhum selecionado";
  }

  if (resumoFonte) {
    resumoFonte.textContent = state.dataSource === "tabela" ? "Tabela Direta na Tela" : "Planilha Excel (.xlsx)";
  }

  if (resumoTotal) {
    const qtd = state.dataSource === "tabela" 
      ? state.participantesTabela.length 
      : (state.planilhaDados ? state.planilhaDados.total_participantes : 0);
    resumoTotal.textContent = `${qtd} participante(s)`;
  }

  if (resumoPdf) {
    const checked = document.getElementById("checkGerarPdf").checked;
    resumoPdf.textContent = checked ? "Ativa (DOCX + PDF)" : "Apenas DOCX";
  }
}

// ---------------------------------------------------------------------------
// 8. Ações Rápidas da Barra Superior e Banners
// ---------------------------------------------------------------------------
function initQuickActions() {
  const abrirPastaHandler = async () => {
    try {
      const res = await fetch("/api/abrir-pasta", { method: "POST" });
      const data = await res.json();
      if (data.ok) showToast("Pasta de saída aberta no Windows Explorer!", "info");
      else showToast("Não foi possível abrir: " + data.erro, "warning");
    } catch (err) {
      showToast("Erro ao abrir pasta: " + err.message, "error");
    }
  };

  const baixarZipHandler = () => {
    window.location.href = "/api/download/zip";
  };

  document.getElementById("btnAbrirPastaNav").addEventListener("click", abrirPastaHandler);
  document.getElementById("btnBaixarZipNav").addEventListener("click", baixarZipHandler);
  
  const btnAbrirBanner = document.getElementById("btnAbrirPastaBanner");
  if (btnAbrirBanner) btnAbrirBanner.addEventListener("click", abrirPastaHandler);

  const btnZipBanner = document.getElementById("btnBaixarZipBanner");
  if (btnZipBanner) btnZipBanner.addEventListener("click", baixarZipHandler);
}

// ---------------------------------------------------------------------------
// 9. Status do Servidor e Atualização de Dropdowns
// ---------------------------------------------------------------------------
async function fetchServerStatus() {
  try {
    const res = await fetch("/api/status");
    const data = await res.json();

    if (data.status === "ok") {
      // Total gerados
      const totalGerados = document.getElementById("totalGeradosCount");
      if (totalGerados) totalGerados.textContent = data.total_gerados;

      // Status PDF
      const statusPdf = document.getElementById("statusPdf");
      if (statusPdf) {
        if (data.pdf_habilitado) {
          statusPdf.innerHTML = `<span class="status-icon">📄</span> PDF Word: Ativo`;
          statusPdf.style.borderColor = "rgba(16, 185, 129, 0.4)";
        } else {
          statusPdf.innerHTML = `<span class="status-icon">⚠️</span> PDF: Básico`;
        }
      }

      // Preenche select de modelos
      const selModelos = document.getElementById("selectModelosDisponiveis");
      const valAtual = selModelos.value;
      selModelos.innerHTML = "";
      if (data.modelos.length === 0) {
        selModelos.innerHTML = "<option value=''>Nenhum modelo encontrado</option>";
      } else {
        data.modelos.forEach(m => {
          const opt = document.createElement("option");
          opt.value = m.nome;
          opt.textContent = `${m.nome} (${m.tamanho_formatado})`;
          selModelos.appendChild(opt);
        });
        if (valAtual && data.modelos.some(m => m.nome === valAtual)) {
          selModelos.value = valAtual;
        }
      }

      // Preenche select de planilhas
      const selPlanilhas = document.getElementById("selectPlanilhasDisponiveis");
      const valPlanilhaAtual = selPlanilhas.value;
      selPlanilhas.innerHTML = "";
      if (data.planilhas.length === 0) {
        selPlanilhas.innerHTML = "<option value=''>Nenhuma planilha encontrada</option>";
      } else {
        data.planilhas.forEach(p => {
          const opt = document.createElement("option");
          opt.value = p.nome;
          opt.textContent = `${p.nome} (${p.tamanho_formatado})`;
          selPlanilhas.appendChild(opt);
        });
        if (valPlanilhaAtual && data.planilhas.some(p => p.nome === valPlanilhaAtual)) {
          selPlanilhas.value = valPlanilhaAtual;
        }
      }

      // Carrega primeira planilha se disponível e não carregada
      if (data.planilhas.length > 0 && !state.planilhaDados) {
        carregarPlanilhaExistente(selPlanilhas.value);
      }

      atualizarResumoGeracao();
    }
  } catch (err) {
    console.error("Falha ao obter status:", err);
  }
}

// ---------------------------------------------------------------------------
// 10. Sistema de Toast de Notificações
// ---------------------------------------------------------------------------
function showToast(mensagem, tipo = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${tipo}`;

  let icon = "ℹ️";
  if (tipo === "success") icon = "✅";
  if (tipo === "error") icon = "❌";
  if (tipo === "warning") icon = "⚠️";

  toast.innerHTML = `<span>${icon}</span> <span>${mensagem}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ---------------------------------------------------------------------------
// 11. Sistema de Persistência Automática, Predefinições e Sincronização
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG = {
  version: 1,
  front: {
    instituicao: "INSTITUTO DE EDUCAÇÃO & TECNOLOGIA",
    titulo: "CERTIFICADO",
    subtitulo: "DE CONCLUSÃO E PARTICIPAÇÃO",
    texto_corpo: "Certificamos para os devidos fins que {{NOME}}, inscrito(a) sob o CPF nº {{CPF}}, concluiu com êxito o curso de {{CURSO}}, realizado em {{DATA}}, com aproveitamento satisfatório e carga horária total de {{CARGA_HORARIA}}.",
    assinatura_1_nome: "Prof. Coordenador(a)",
    assinatura_1_cargo: "Coordenação Pedagógica",
    assinatura_2_nome: "Diretoria Acadêmica",
    assinatura_2_cargo: "Direção Geral",
    codigo_verificacao: true,
    logo_prestadora: null,
    logo_contratante: null
  },
  verso: {
    habilitar_verso: true,
    verso_titulo: "CONTEÚDO PROGRAMÁTICO & REGISTRO DE VALIDADE",
    verso_conteudo: "• Módulo 1: Fundamentos de Inteligência Artificial, LLMs & Agentes Autônomos\n• Módulo 2: Arquitetura de Software Moderno, APIs REST e Automação de Processos\n• Módulo 3: Segurança da Informação, LGPD e Governança de Dados\n• Módulo 4: Projeto Prático Aplicado e Validação de Resultados no Mercado",
    verso_livro: "01",
    verso_folha: "45",
    verso_registro: "REG-{{CPF}}",
    verso_amparo_legal: "Certificado de curso livre emitido com fundamento na Lei nº 9.394/1996 (Diretrizes e Bases da Educação Nacional) e no Decreto Presidencial nº 5.154/2004, com validade em todo o território nacional.",
    verso_assinatura_nome: "Coordenação Técnica Pedagógica",
    verso_assinatura_cargo: "Responsável Técnico(a) - Reg. Profissional 8942-SP"
  },
  style: {
    tema: "ouro_azul",
    orientacao: "paisagem"
  },
  table: {
    participantes: [
      {
        NOME: "Carlos Eduardo da Silva",
        CPF: "123.456.789-00",
        CURSO: "Inteligência Artificial Aplicada",
        DATA: "11/09/2026",
        CARGA_HORARIA: "40 horas",
        CIDADE: "São Paulo - SP"
      },
      {
        NOME: "Mariana Souza Oliveira",
        CPF: "987.654.321-11",
        CURSO: "Gestão Ágil e Projetos",
        DATA: "11/09/2026",
        CARGA_HORARIA: "30 horas",
        CIDADE: "Rio de Janeiro - RJ"
      },
      {
        NOME: "Rodrigo Mendes Albuquerque",
        CPF: "456.789.123-22",
        CURSO: "Segurança da Informação",
        DATA: "11/09/2026",
        CARGA_HORARIA: "60 horas",
        CIDADE: "Belo Horizonte - MG"
      }
    ]
  }
};

let autoSaveTimer = null;

function scheduleAutoSave() {
  updateSaveIndicators("saving");
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    executarAutoSave();
  }, 500);
}

async function executarAutoSave() {
  try {
    const config = collectCurrentConfig();
    const configJson = JSON.stringify(config);
    localStorage.setItem("certificaflow_active_config", configJson);

    // Persistência no disco do servidor
    fetch("/api/config/salvar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: configJson
    }).catch(err => console.warn("Sincronização em disco pendente:", err));

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    updateSaveIndicators("saved", timeStr);
  } catch (e) {
    console.error("Erro ao salvar configuração:", e);
    updateSaveIndicators("error");
  }
}

function updateSaveIndicators(status, timeStr = "") {
  const navDot = document.querySelector("#navSaveIndicator .save-status-dot");
  const navText = document.getElementById("navSaveStatusText");
  const cardDot = document.querySelector("#autoSaveIndicator .save-dot");
  const cardText = document.getElementById("saveStatusText");
  const cardTime = document.getElementById("saveLastTime");

  if (status === "saving") {
    if (navDot) {
      navDot.style.background = "#f59e0b";
      navDot.style.boxShadow = "0 0 8px rgba(245, 158, 11, 0.7)";
      navDot.classList.add("pulse");
    }
    if (navText) navText.textContent = "Salvando...";
    if (cardDot) {
      cardDot.style.background = "#f59e0b";
      cardDot.style.boxShadow = "0 0 8px rgba(245, 158, 11, 0.7)";
      cardDot.classList.add("pulse");
    }
    if (cardText) cardText.textContent = "Salvando alterações...";
    if (cardTime) cardTime.textContent = "Gravando...";
  } else if (status === "saved") {
    if (navDot) {
      navDot.style.background = "#10b981";
      navDot.style.boxShadow = "0 0 8px rgba(16, 185, 129, 0.5)";
      navDot.classList.remove("pulse");
    }
    if (navText) navText.textContent = "Salvo";
    if (cardDot) {
      cardDot.style.background = "#10b981";
      cardDot.style.boxShadow = "0 0 8px rgba(16, 185, 129, 0.5)";
      cardDot.classList.remove("pulse");
    }
    if (cardText) cardText.textContent = "Salvamento contínuo ativo";
    if (cardTime) cardTime.textContent = timeStr ? `Salvo às ${timeStr}` : "Salvo";
  } else if (status === "error") {
    if (navDot) {
      navDot.style.background = "#ef4444";
      navDot.style.boxShadow = "0 0 8px rgba(239, 68, 68, 0.5)";
      navDot.classList.remove("pulse");
    }
    if (navText) navText.textContent = "Não salvo";
    if (cardDot) {
      cardDot.style.background = "#ef4444";
      cardDot.style.boxShadow = "0 0 8px rgba(239, 68, 68, 0.5)";
      cardDot.classList.remove("pulse");
    }
    if (cardText) cardText.textContent = "Erro ao sincronizar";
    if (cardTime) cardTime.textContent = "Falha local";
  }
}

function collectCurrentConfig() {
  const getVal = (id, def = "") => {
    const el = document.getElementById(id);
    return el ? el.value : def;
  };
  const getChecked = (id, def = false) => {
    const el = document.getElementById(id);
    return el ? el.checked : def;
  };

  return {
    version: 1,
    savedAt: new Date().toISOString(),
    front: {
      instituicao: getVal("inputInstituicao"),
      titulo: getVal("inputTitulo"),
      subtitulo: getVal("inputSubtitulo"),
      texto_corpo: getVal("textareaTextoCorpo"),
      assinatura_1_nome: getVal("inputAss1Nome"),
      assinatura_1_cargo: getVal("inputAss1Cargo"),
      assinatura_2_nome: getVal("inputAss2Nome"),
      assinatura_2_cargo: getVal("inputAss2Cargo"),
      codigo_verificacao: getChecked("checkCodigoAutenticacao", true),
      logo_prestadora: state.logoPrestadora || null,
      logo_contratante: state.logoContratante || null
    },
    verso: {
      habilitar_verso: !!state.habilitarVerso,
      verso_titulo: getVal("inputVersoTitulo"),
      verso_conteudo: getVal("textareaVersoConteudo"),
      verso_livro: getVal("inputVersoLivro"),
      verso_folha: getVal("inputVersoFolha"),
      verso_registro: getVal("inputVersoRegistro"),
      verso_amparo_legal: getVal("textareaVersoAmparoLegal"),
      verso_assinatura_nome: getVal("inputVersoAssNome"),
      verso_assinatura_cargo: getVal("inputVersoAssCargo")
    },
    style: {
      tema: state.tema || "ouro_azul",
      orientacao: state.orientacao || "paisagem"
    },
    table: {
      participantes: Array.isArray(state.participantesTabela) ? [...state.participantesTabela] : []
    }
  };
}

function applyConfig(config, showNotification = false) {
  if (!config) return;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== null) el.value = val;
  };
  const setChecked = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== null) el.checked = !!val;
  };

  // 1. Frente
  if (config.front) {
    setVal("inputInstituicao", config.front.instituicao);
    setVal("inputTitulo", config.front.titulo);
    setVal("inputSubtitulo", config.front.subtitulo);
    setVal("textareaTextoCorpo", config.front.texto_corpo);
    setVal("inputAss1Nome", config.front.assinatura_1_nome);
    setVal("inputAss1Cargo", config.front.assinatura_1_cargo);
    setVal("inputAss2Nome", config.front.assinatura_2_nome);
    setVal("inputAss2Cargo", config.front.assinatura_2_cargo);
    setChecked("checkCodigoAutenticacao", config.front.codigo_verificacao);
    setLogoPrestadora(config.front.logo_prestadora || null, false);
    setLogoContratante(config.front.logo_contratante || null, false);
  }

  // 2. Verso
  if (config.verso) {
    setVersoHabilitado(config.verso.habilitar_verso !== false, false);
    setVal("inputVersoTitulo", config.verso.verso_titulo);
    setVal("textareaVersoConteudo", config.verso.verso_conteudo);
    setVal("inputVersoLivro", config.verso.verso_livro);
    setVal("inputVersoFolha", config.verso.verso_folha);
    setVal("inputVersoRegistro", config.verso.verso_registro);
    setVal("textareaVersoAmparoLegal", config.verso.verso_amparo_legal);
    setVal("inputVersoAssNome", config.verso.verso_assinatura_nome);
    setVal("inputVersoAssCargo", config.verso.verso_assinatura_cargo);
  }

  // 3. Estilo (Tema e Orientação)
  if (config.style) {
    if (config.style.tema) aplicarTemaCertificado(config.style.tema, false);
    if (config.style.orientacao) aplicarOrientacao(config.style.orientacao, false);
  }

  // 4. Participantes da Tabela
  if (config.table && Array.isArray(config.table.participantes)) {
    state.participantesTabela = [...config.table.participantes];
  }

  updateDetectedVariables();
  renderTable();
  updateLivePreview();
  atualizarSelectParticipantesPreview();
  atualizarResumoGeracao();

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  updateSaveIndicators("saved", timeStr);

  if (showNotification) {
    showToast("Estrutura e textos aplicados com sucesso!", "success");
  }
}

async function loadSavedConfig() {
  try {
    // 1. Tenta carregar do localStorage
    const localRaw = localStorage.getItem("certificaflow_active_config");
    let configCarregada = null;

    if (localRaw) {
      try {
        configCarregada = JSON.parse(localRaw);
      } catch (err) {
        console.warn("JSON corrompido no localStorage:", err);
      }
    }

    // 2. Se não houver no localStorage, busca no servidor (/api/config/carregar)
    if (!configCarregada) {
      try {
        const res = await fetch("/api/config/carregar");
        const data = await res.json();
        if (data.ok && data.config) {
          configCarregada = data.config;
          localStorage.setItem("certificaflow_active_config", JSON.stringify(data.config));
        }
      } catch (netErr) {
        console.warn("Não foi possível obter configuração do servidor:", netErr);
      }
    }

    if (configCarregada) {
      applyConfig(configCarregada, false);
      const timeStr = configCarregada.savedAt 
        ? new Date(configCarregada.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        : "Recuperado";
      updateSaveIndicators("saved", timeStr);
    } else {
      updateSaveIndicators("saved", "Padrão");
    }
  } catch (err) {
    console.error("Erro ao carregar dados persistidos:", err);
    updateSaveIndicators("error");
  }
}

function getPresets() {
  try {
    const raw = localStorage.getItem("certificaflow_presets");
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function savePresets(presets) {
  try {
    localStorage.setItem("certificaflow_presets", JSON.stringify(presets));
  } catch (e) {
    console.error("Erro ao gravar predefinições:", e);
  }
}

function renderPresetsDropdown() {
  const row = document.getElementById("rowPresetsSalvos");
  const sel = document.getElementById("selectPresetsSalvos");
  if (!sel) return;

  const presets = getPresets();
  const keys = Object.keys(presets);

  sel.innerHTML = "";
  if (keys.length === 0) {
    if (row) row.style.display = "none";
    return;
  }

  if (row) row.style.display = "flex";
  keys.forEach(k => {
    const opt = document.createElement("option");
    opt.value = k;
    const dateStr = presets[k].savedAt ? new Date(presets[k].savedAt).toLocaleDateString() : "";
    opt.textContent = `${k}${dateStr ? ` (${dateStr})` : ''}`;
    sel.appendChild(opt);
  });
}

function initPersistence() {
  renderPresetsDropdown();

  // 1. Salvar Predefinição (com nome escolhido pelo usuário)
  const btnSalvarPreset = document.getElementById("btnSalvarModeloPreset");
  if (btnSalvarPreset) {
    btnSalvarPreset.addEventListener("click", () => {
      const nome = prompt("Digite um nome para salvar esta predefinição:", "Meu Modelo " + (Object.keys(getPresets()).length + 1));
      if (!nome || !nome.trim()) return;
      const presets = getPresets();
      presets[nome.trim()] = collectCurrentConfig();
      savePresets(presets);
      renderPresetsDropdown();
      const sel = document.getElementById("selectPresetsSalvos");
      if (sel) sel.value = nome.trim();
      showToast(`Predefinição '${nome.trim()}' salva com sucesso!`, "success");
    });
  }

  // 2. Carregar Predefinição
  const btnCarregarPreset = document.getElementById("btnCarregarPreset");
  if (btnCarregarPreset) {
    btnCarregarPreset.addEventListener("click", () => {
      const sel = document.getElementById("selectPresetsSalvos");
      if (!sel || !sel.value) {
        showToast("Nenhuma predefinição selecionada.", "warning");
        return;
      }
      const presets = getPresets();
      if (presets[sel.value]) {
        applyConfig(presets[sel.value], true);
        scheduleAutoSave();
        showToast(`Predefinição '${sel.value}' carregada!`, "success");
      }
    });
  }

  // 3. Excluir Predefinição
  const btnExcluirPreset = document.getElementById("btnExcluirPreset");
  if (btnExcluirPreset) {
    btnExcluirPreset.addEventListener("click", () => {
      const sel = document.getElementById("selectPresetsSalvos");
      if (!sel || !sel.value) return;
      const nome = sel.value;
      if (confirm(`Deseja realmente excluir a predefinição '${nome}'?`)) {
        const presets = getPresets();
        delete presets[nome];
        savePresets(presets);
        renderPresetsDropdown();
        showToast(`Predefinição '${nome}' excluída.`, "info");
      }
    });
  }

  // 4. Exportar Configuração como .JSON
  const btnExportarJson = document.getElementById("btnExportarConfigJson");
  if (btnExportarJson) {
    btnExportarJson.addEventListener("click", () => {
      const config = collectCurrentConfig();
      const jsonStr = JSON.stringify(config, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateTag = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `modelo_certificado_${dateTag}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Arquivo .JSON baixado! Você pode importá-lo a qualquer momento.", "success");
    });
  }

  // 5. Importar Configuração de arquivo .JSON
  const fileImportJson = document.getElementById("fileImportConfigJson");
  if (fileImportJson) {
    fileImportJson.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = JSON.parse(ev.target.result);
          if (!imported.front && !imported.verso && !imported.texto_corpo) {
            throw new Error("Arquivo não reconhecido como estrutura válida de certificado.");
          }
          applyConfig(imported, true);
          scheduleAutoSave();
          showToast("Estrutura importada e aplicada com sucesso!", "success");
        } catch (err) {
          showToast("Falha ao importar JSON: " + err.message, "error");
        }
      };
      reader.readAsText(file);
      fileImportJson.value = "";
    });
  }

  // 6. Restaurar Padrões Originais de Fábrica
  const btnRestaurar = document.getElementById("btnRestaurarPadroes");
  if (btnRestaurar) {
    btnRestaurar.addEventListener("click", () => {
      if (confirm("Deseja realmente restaurar os textos e a estrutura padrão de fábrica? As alterações feitas serão substituídas.")) {
        applyConfig(DEFAULT_CONFIG, true);
        localStorage.removeItem("certificaflow_active_config");
        scheduleAutoSave();
        showToast("Textos e estrutura padrão restaurados!", "info");
      }
    });
  }
}

// ---------------------------------------------------------------------------
// 12. Catálogo Oficial de Modelos Pré-Prontos (EPI NR-06, Altura NR-35, etc.)
// ---------------------------------------------------------------------------

const OFFICIAL_PRESETS = {
  nr06_epi: {
    nome: "Treinamento de EPIs (NR-06) • Carga 8h",
    front: {
      instituicao: "CENTRO ESPECIALIZADO DE CAPACITAÇÃO EM SEGURANÇA DO TRABALHO",
      titulo: "CERTIFICADO DE CAPACITAÇÃO PROFISSIONAL",
      subtitulo: "TREINAMENTO DE EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL - NR-06",
      texto_corpo: "Certificamos que {{NOME}}, inscrito(a) sob o CPF nº {{CPF}}, concluiu com excelente aproveitamento o Treinamento Obrigatório sobre Uso, Guarda, Conservação e Higienização de Equipamentos de Proteção Individual (EPI), atendendo às exigências da Norma Regulamentadora NR-06 do Ministério do Trabalho e Emprego (MTE), ministrado em {{DATA}}, cumprindo a carga horária de {{CARGA_HORARIA}}.",
      assinatura_1_nome: "Eng. Roberto Carlos de Almeida",
      assinatura_1_cargo: "Engenheiro de Segurança do Trabalho - CREA 506.892/SP",
      assinatura_2_nome: "Dra. Vanessa Martins Silveira",
      assinatura_2_cargo: "Diretora Técnica de Saúde Ocupacional e SST",
      codigo_verificacao: true,
      logo_prestadora: null,
      logo_contratante: null
    },
    verso: {
      habilitar_verso: true,
      verso_titulo: "CONTEÚDO PROGRAMÁTICO & VALIDADE REGULAMENTAR - NR-06",
      verso_conteudo: "• Módulo 1: Conceito Legal, Definições e Finalidade dos Equipamentos de Proteção Individual (EPI)\n• Módulo 2: Responsabilidades do Empregador e Obrigações do Empregado segundo a NR-06\n• Módulo 3: Identificação de Riscos no Ambiente de Trabalho e Seleção Adequada por Função\n• Módulo 4: Certificado de Aprovação (CA), Validade, Inspeção Prévia e Critérios de Descarte\n• Módulo 5: Técnicas Corretas de Higienização, Acondicionamento, Guarda e Manutenção\n• Módulo 6: Avaliação Prática de Ajuste e Teste de Vedação para Protetores Respiratórios e Auditivos",
      verso_livro: "04",
      verso_folha: "18",
      verso_registro: "EPI-{{CPF}}",
      verso_amparo_legal: "Certificado de capacitação profissional emitido nos termos da Norma Regulamentadora NR-06 do MTE (Portaria GM nº 3.214/1978 e Portaria MTP nº 2.175/2022), Artigos 166 e 167 da CLT e Lei nº 9.394/1996, com validade em todo o território nacional.",
      verso_assinatura_nome: "Coordenação Pedagógica de SST",
      verso_assinatura_cargo: "Instrutor(a) Credenciado(a) - Reg. MTE 44.891"
    },
    style: {
      tema: "esmeralda",
      orientacao: "retrato"
    }
  },

  nr35_altura: {
    nome: "Trabalho em Altura (NR-35) • Carga 8h",
    front: {
      instituicao: "INSTITUTO NACIONAL DE SEGURANÇA E OPERAÇÕES INDUSTRIAIS",
      titulo: "CERTIFICADO DE CAPACITAÇÃO E AUTORIZAÇÃO",
      subtitulo: "TRABALHO EM ALTURA - NORMA REGULAMENTADORA NR-35",
      texto_corpo: "Certificamos que {{NOME}}, portador(a) do CPF nº {{CPF}}, concluiu com pleno aproveitamento o Curso de Capacitação para Trabalho em Altura, cumprindo rigorosamente os requisitos da Norma Regulamentadora NR-35 do MTE, realizado em {{DATA}}, com carga horária de {{CARGA_HORARIA}}, estando apto(a) a executar atividades acima de 2 metros de nível com diferença de altura.",
      assinatura_1_nome: "Instr. Fabiano Albuquerque Lima",
      assinatura_1_cargo: "Instrutor Credenciado de Trabalho em Altura - Reg. MTE 78.432",
      assinatura_2_nome: "Eng. Fernando Henrique Castilho",
      assinatura_2_cargo: "Responsável Técnico de Engenharia - CREA 458.129/MG",
      codigo_verificacao: true,
      logo_prestadora: null,
      logo_contratante: null
    },
    verso: {
      habilitar_verso: true,
      verso_titulo: "EMENTA TÉCNICA PROGRAMÁTICA & REGISTRO DE VALIDADE - NR-35",
      verso_conteudo: "• Módulo 1: Normas e Regulamentos Aplicáveis ao Trabalho em Altura (NR-35, NR-18 e NBRs)\n• Módulo 2: Análise Preliminar de Risco (APR) e Permissão de Trabalho (PT)\n• Módulo 3: Sistemas de Proteção Coletiva (SPCQ) e Individual (SPIQ) Contra Quedas\n• Módulo 4: Inspeção, Montagem e Uso de Cinturão Paraquedista, Talabartes e Trava-Quedas\n• Módulo 5: Tipos de Pontos de Ancoragem, Linhas de Vida e Cálculo do Fator de Queda\n• Módulo 6: Noções de Resgate, Síndrome da Suspensão Inerte e Primeiros Socorros em Altura",
      verso_livro: "07",
      verso_folha: "42",
      verso_registro: "ALT-{{CPF}}",
      verso_amparo_legal: "Certificado de capacitação em conformidade com o item 35.3 da Norma Regulamentadora NR-35 do MTE (Portaria MTP nº 4.218/2022), Art. 157 da CLT e Lei Federal nº 9.394/1996, com validade bienal de 2 (dois) anos em todo o país.",
      verso_assinatura_nome: "Supervisão Técnica de Trabalho em Altura",
      verso_assinatura_cargo: "Instrutor de Resgate e Acesso por Corda - N2"
    },
    style: {
      tema: "ouro_azul",
      orientacao: "retrato"
    }
  },

  nr10_eletrica: {
    nome: "Segurança em Eletricidade (NR-10) • Carga 40h",
    front: {
      instituicao: "ESCOLA TÉCNICA DE ENGENHARIA ELÉTRICA & ENERGIA",
      titulo: "CERTIFICADO DE HABILITAÇÃO PROFISSIONAL",
      subtitulo: "SEGURANÇA EM INSTALAÇÕES E SERVIÇOS EM ELETRICIDADE - NR-10",
      texto_corpo: "Certificamos que {{NOME}}, inscrito(a) no CPF sob o nº {{CPF}}, concluiu com distinção o Curso Básico de Segurança em Instalações e Serviços em Eletricidade - Norma Regulamentadora NR-10, realizado em {{DATA}}, cumprindo a carga horária oficial de {{CARGA_HORARIA}}, cumprindo todas as diretrizes do Ministério do Trabalho e Emprego.",
      assinatura_1_nome: "Eng. Marcelo Antunes Prado",
      assinatura_1_cargo: "Engenheiro Eletricista e de SST - CREA 321.456/SP",
      assinatura_2_nome: "Dr. Ricardo Gomes da Cunha",
      assinatura_2_cargo: "Diretor Técnico de Operações e Normas Regulamentadoras",
      codigo_verificacao: true,
      logo_prestadora: null,
      logo_contratante: null
    },
    verso: {
      habilitar_verso: true,
      verso_titulo: "CONTEÚDO PROGRAMÁTICO COMPLETO - CURSO BÁSICO NR-10 (40H)",
      verso_conteudo: "• Módulo 1: Introdução à Segurança com Eletricidade, Riscos em Instalações e Choque Elétrico\n• Módulo 2: Arcos Elétricos, Queimaduras e Campos Eletromagnéticos\n• Módulo 3: Medidas de Controle do Risco Elétrico: Desenergização, Aterramento e Bloqueio (LOTO)\n• Módulo 4: Normas Técnicas Brasileiras (NBR 5410, NBR 14039) e Regulamentações do MTE\n• Módulo 5: Equipamentos de Proteção Coletiva (EPC) e Individual (EPI Dielétrico) em Baixa e Média Tensão\n• Módulo 6: Rotinas e Procedimentos de Trabalho, Liberação de Instalações e Sinalização\n• Módulo 7: Técnicas de Combate a Princípios de Incêndio em Instalações Energizadas\n• Módulo 8: Primeiros Socorros Específicos para Acidentados por Eletricidade e Protocolos de RCP",
      verso_livro: "09",
      verso_folha: "88",
      verso_registro: "NR10-{{CPF}}",
      verso_amparo_legal: "Certificado emitido de acordo com o Anexo II da NR-10 do MTE (Portaria GM nº 598/2004 e atualizações), Artigo 200 da CLT e Lei Federal nº 9.394/1996, com validade de 2 anos em todo o território nacional.",
      verso_assinatura_nome: "Coordenação de Engenharia Elétrica",
      verso_assinatura_cargo: "Responsável Técnico Habilitado"
    },
    style: {
      tema: "rubi",
      orientacao: "retrato"
    }
  },

  nr33_confinado: {
    nome: "Espaço Confinado (NR-33) • Carga 16h",
    front: {
      instituicao: "INSTITUTO DE ESPECIALIZAÇÃO INDUSTRIAL & SEGURANÇA OCUPACIONAL",
      titulo: "CERTIFICADO DE CAPACITAÇÃO E APTIDÃO",
      subtitulo: "TRABALHADOR AUTORIZADO E VIGIA EM ESPAÇOS CONFINADOS - NR-33",
      texto_corpo: "Certificamos que {{NOME}}, inscrito(a) sob o CPF nº {{CPF}}, concluiu com êxito o Treinamento de Capacitação para Trabalhadores Autorizados e Vigias em Espaços Confinados, em conformidade com as exigências da Norma Regulamentadora NR-33 do MTE, realizado em {{DATA}}, cumprindo a carga horária de {{CARGA_HORARIA}}.",
      assinatura_1_nome: "Instr. Carlos Henrique Barbosa",
      assinatura_1_cargo: "Supervisor de Entrada em Espaço Confinado - Reg. MTE 61.209",
      assinatura_2_nome: "Engª. Patrícia Helena de Souza",
      assinatura_2_cargo: "Engenheira de Segurança do Trabalho - CREA 894.210/PR",
      codigo_verificacao: true,
      logo_prestadora: null,
      logo_contratante: null
    },
    verso: {
      habilitar_verso: true,
      verso_titulo: "MATRIZ CURRICULAR OBRIGATÓRIA - NR-33",
      verso_conteudo: "• Módulo 1: Definições, Reconhecimento e Identificação de Espaços Confinados\n• Módulo 2: Riscos Específicos: Asfixia, Toxicidade, Inflamabilidade e Riscos Mecânicos/Físicos\n• Módulo 3: Permissão de Entrada e Trabalho (PET): Emissão, Controle e Cancelamento\n• Módulo 4: Operação de Detectores de Gases Portáteis, Testes Atmosféricos e Ventilação Mecânica\n• Módulo 5: Funções e Responsabilidades do Vigia e do Trabalhador Autorizado\n• Módulo 6: Procedimentos de Emergência, Abandono Rápido, Resgate e Primeiros Socorros",
      verso_livro: "03",
      verso_folha: "62",
      verso_registro: "NR33-{{CPF}}",
      verso_amparo_legal: "Certificado emitido nos termos da Portaria MTP nº 1.690/2022 (NR-33), Portaria MTE nº 3.214/1978 e Lei nº 9.394/1996, com validade de 12 meses.",
      verso_assinatura_nome: "Instrutor Credenciado de NR-33",
      verso_assinatura_cargo: "Técnico em Emergências Industriais"
    },
    style: {
      tema: "esmeralda",
      orientacao: "retrato"
    }
  },

  nr11_empilhadeira: {
    nome: "Operador de Empilhadeira (NR-11) • Carga 16h",
    front: {
      instituicao: "CENTRO DE FORMAÇÃO TÉCNICA EM LOGÍSTICA & MÁQUINAS PESADAS",
      titulo: "CERTIFICADO DE QUALIFICAÇÃO PROFISSIONAL",
      subtitulo: "OPERADOR DE EMPILHADEIRA A COMBUSTÃO E ELÉTRICA - NR-11",
      texto_corpo: "Certificamos que {{NOME}}, portador(a) do CPF nº {{CPF}}, concluiu com pleno êxito o Curso de Formação de Operador de Empilhadeira, cumprindo integralmente as exigências da Norma Regulamentadora NR-11 do MTE e normas de segurança em movimentação e armazenagem de materiais, realizado em {{DATA}}, cumprindo a carga horária de {{CARGA_HORARIA}}.",
      assinatura_1_nome: "Instr. Gilberto Santana Mendes",
      assinatura_1_cargo: "Instrutor Operacional de Máquinas Pesadas - CNH E / Reg. 984",
      assinatura_2_nome: "Dr. Cláudio Magalhães Vilela",
      assinatura_2_cargo: "Diretor Geral de Formação Profissional e Logística",
      codigo_verificacao: true,
      logo_prestadora: null,
      logo_contratante: null
    },
    verso: {
      habilitar_verso: true,
      verso_titulo: "EMENTA TEÓRICA E PRÁTICA OPERACIONAL - NR-11",
      verso_conteudo: "• Módulo 1: Legislação de Trânsito, Normas de Segurança NR-11 e Responsabilidade Civil do Operador\n• Módulo 2: Componentes Mecânicos, Elétricos e Hidráulicos da Empilhadeira (Combustão e Elétrica)\n• Módulo 3: Princípio de Estabilidade, Triângulo de Estabilidade e Centro de Gravidade da Carga\n• Módulo 4: Checklist Diário, Inspeção Pré-Operacional de Pneus, Garfos, Freios e Fluidos\n• Módulo 5: Regras de Circulação em Armazéns, Sinalização e Direção Defensiva em Logística\n• Módulo 6: Prática Operacional Dirigida: Empilhamento, Manobras, Rampas, Carga e Descarga de Paletes",
      verso_livro: "05",
      verso_folha: "33",
      verso_registro: "NR11-{{CPF}}",
      verso_amparo_legal: "Certificado emitido em conformidade com a NR-11 do MTE, Artigo 182 da CLT, Norma ABNT NBR 15370 e Lei nº 9.394/1996.",
      verso_assinatura_nome: "Coordenação de Instrução Operacional",
      verso_assinatura_cargo: "Instrutor Certificado em Equipamentos de Carga"
    },
    style: {
      tema: "ouro_azul",
      orientacao: "paisagem"
    }
  },

  primeiros_socorros: {
    nome: "Primeiros Socorros & Suporte Básico • Carga 8h",
    front: {
      instituicao: "INSTITUTO BRASILEIRO DE RESGATE & URGÊNCIAS MÉDICAS",
      titulo: "CERTIFICADO DE CAPACITAÇÃO E TREINAMENTO",
      subtitulo: "PRIMEIROS SOCORROS & SUPORTE BÁSICO DE VIDA (BLS)",
      texto_corpo: "Certificamos que {{NOME}}, inscrito(a) sob o CPF nº {{CPF}}, concluiu com excelente desempenho o Treinamento Prático de Primeiros Socorros e Suporte Básico de Vida (BLS), realizado em {{DATA}}, com carga horária de {{CARGA_HORARIA}}, estando capacitado(a) a prestar o primeiro atendimento seguro em situações de urgência e emergência.",
      assinatura_1_nome: "Enfª. Beatriz Silveira",
      assinatura_1_cargo: "Instrutora de Suporte Avançado de Vida - COREN 234.891",
      assinatura_2_nome: "Dr. Alexandre de Oliveira Pinto",
      assinatura_2_cargo: "Diretor Clínico e Coordenador Médico - CRM 112.450/SP",
      codigo_verificacao: true,
      logo_prestadora: null,
      logo_contratante: null
    },
    verso: {
      habilitar_verso: true,
      verso_titulo: "PROGRAMA DE CAPACITAÇÃO EM PRIMEIROS SOCORROS",
      verso_conteudo: "• Módulo 1: Avaliação Inicial da Vítima, Análise da Cena e Acionamento dos Serviços de Emergência (SAMU/Bombeiros)\n• Módulo 2: Suporte Básico de Vida (BLS): Identificação de PCR e Técnicas de RCP em Adultos e Crianças\n• Módulo 3: Utilização do Desfibrilador Externo Automático (DEA): Protocolos e Segurança do Operador\n• Módulo 4: Desobstrução de Vias Aéreas por Corpo Estranho (OVACE) e Manobra de Heimlich\n• Módulo 5: Controle e Contenção de Hemorragias Externas, Uso de Curativos Compressivos e Torniquetes\n• Módulo 6: Imobilização Provisória de Fraturas, Luxações e Transporte Seguro de Acidentados\n• Módulo 7: Atendimento Imediato em Queimaduras, Choques Elétricos, Crises Convulsivas e Desmaios",
      verso_livro: "02",
      verso_folha: "19",
      verso_registro: "SOC-{{CPF}}",
      verso_amparo_legal: "Certificado emitido com fundamento na Lei Federal nº 13.722/2018 (Lei Lucas), Diretrizes Internacionais da American Heart Association (AHA), NR-07 do MTE e Lei nº 9.394/1996.",
      verso_assinatura_nome: "Coordenação de Enfermagem e Resgate",
      verso_assinatura_cargo: "Instrutor(a) Credenciado(a) em BLS/ACLS"
    },
    style: {
      tema: "rubi",
      orientacao: "retrato"
    }
  },

  ia_tecnologia: {
    nome: "Inteligência Artificial & Tecnologia • Carga 40h",
    front: {
      instituicao: "INSTITUTO DE TECNOLOGIA AVANÇADA & DESENVOLVIMENTO",
      titulo: "CERTIFICADO DE CONCLUSÃO E APROVEITAMENTO",
      subtitulo: "INTELIGÊNCIA ARTIFICIAL APLICADA, LLMS & ENGENHARIA DE SOFTWARE",
      texto_corpo: "Certificamos que {{NOME}}, inscrito(a) sob o CPF nº {{CPF}}, concluiu com distinção o Curso Avançado de Inteligência Artificial Aplicada, Modelos de Linguagem (LLMs) e Engenharia de Software Moderna, realizado em {{DATA}}, cumprindo a carga horária de {{CARGA_HORARIA}} com excelência acadêmica e prática.",
      assinatura_1_nome: "Prof. Dr. Marcos Vinicius Alencar",
      assinatura_1_cargo: "Coordenador Acadêmico de Inteligência Artificial",
      assinatura_2_nome: "Dra. Helena Beatriz Castilho",
      assinatura_2_cargo: "Diretora de Inovação e Tecnologias Emergentes",
      codigo_verificacao: true,
      logo_prestadora: null,
      logo_contratante: null
    },
    verso: {
      habilitar_verso: true,
      verso_titulo: "CONTEÚDO PROGRAMÁTICO & MATRIZ CURRICULAR",
      verso_conteudo: "• Módulo 1: Fundamentos de IA Generativa, Arquitetura Transformer e Prompt Engineering Avançado\n• Módulo 2: Desenvolvimento de Aplicações com LLMs, APIs REST, Embeddings e Bancos Vetoriais\n• Módulo 3: Construção de Agentes Autônomos, Integração de Ferramentas e Orquestração de Fluxos\n• Módulo 4: Governança de IA, Segurança de Dados, LGPD e Mitigação de Alucinações em Modelos\n• Módulo 5: Projeto Prático de Implementação e Deploy de Solução Inteligente em Nuvem",
      verso_livro: "01",
      verso_folha: "45",
      verso_registro: "IA-{{CPF}}",
      verso_amparo_legal: "Certificado de capacitação e curso livre emitido em conformidade com a Lei de Diretrizes e Bases da Educação Nacional nº 9.394/1996 e Decreto Presidencial nº 5.154/2004.",
      verso_assinatura_nome: "Coordenação de Ciência da Computação",
      verso_assinatura_cargo: "Responsável Técnico(a) - CRA 8942-SP"
    },
    style: {
      tema: "ouro_azul",
      orientacao: "paisagem"
    }
  },

  gestao_agil: {
    nome: "Gestão Ágil, Scrum & Liderança • Carga 30h",
    front: {
      instituicao: "ACADEMIA DE NEGÓCIOS & LIDERANÇA EMPRESARIAL",
      titulo: "CERTIFICADO EXECUTIVO DE QUALIFICAÇÃO",
      subtitulo: "GESTÃO ÁGIL DE PROJETOS, FRAMEWORK SCRUM & LIDERANÇA",
      texto_corpo: "Certificamos que {{NOME}}, inscrito(a) sob o CPF nº {{CPF}}, concluiu com pleno aproveitamento o Programa Executivo de Gestão Ágil de Projetos, Framework Scrum e Liderança Estratégica de Equipes, realizado em {{DATA}}, cumprindo a carga horária de {{CARGA_HORARIA}}.",
      assinatura_1_nome: "Msc. Leonardo Silveira Santos",
      assinatura_1_cargo: "Agile Coach & Coordenador de Métodos Ágeis",
      assinatura_2_nome: "Dra. Renata Calheiros Fontes",
      assinatura_2_cargo: "Diretora de Desenvolvimento Executivo e Liderança",
      codigo_verificacao: true,
      logo_prestadora: null,
      logo_contratante: null
    },
    verso: {
      habilitar_verso: true,
      verso_titulo: "PROGRAMA EXECUTIVO & EIXOS TEMÁTICOS",
      verso_conteudo: "• Módulo 1: Mentalidade Ágil (Agile Mindset), Manifesto Ágil e Comparativo com Modelos Tradicionais\n• Módulo 2: Framework Scrum em Detalhes: Papéis (PO, SM, Dev), Cerimônias e Artefatos\n• Módulo 3: Gestão Visual com Kanban, Mapeamento do Fluxo de Valor e Redução de Gargalos\n• Módulo 4: Planejamento Estratégico, Alinhamento Organizacional e Definição de OKRs de Alto Impacto\n• Módulo 5: Liderança Servidora, Inteligência Emocional, Resolução de Conflitos e Cultura de Feedback",
      verso_livro: "08",
      verso_folha: "12",
      verso_registro: "AGIL-{{CPF}}",
      verso_amparo_legal: "Certificado de capacitação profissional e aperfeiçoamento contínuo em conformidade com a Lei nº 9.394/1996 e Decreto nº 5.154/2004.",
      verso_assinatura_nome: "Comitê de Governança e Métodos Ágeis",
      verso_assinatura_cargo: "Responsável Acadêmico(a)"
    },
    style: {
      tema: "classico",
      orientacao: "paisagem"
    }
  },

  corporativo_padrao: {
    nome: "Certificado Corporativo Padrão • Carga 40h",
    front: {
      instituicao: "INSTITUTO DE EDUCAÇÃO & DESENVOLVIMENTO PROFISSIONAL",
      titulo: "CERTIFICADO",
      subtitulo: "DE CONCLUSÃO E PARTICIPAÇÃO",
      texto_corpo: "Certificamos para os devidos fins que {{NOME}}, inscrito(a) sob o CPF nº {{CPF}}, concluiu com êxito o curso de capacitação em {{CURSO}}, realizado em {{DATA}}, com aproveitamento excelente e carga horária total de {{CARGA_HORARIA}}.",
      assinatura_1_nome: "Prof. Coordenador(a)",
      assinatura_1_cargo: "Coordenação Pedagógica e Acadêmica",
      assinatura_2_nome: "Diretoria Acadêmica",
      assinatura_2_cargo: "Direção Geral de Ensino",
      codigo_verificacao: true,
      logo_prestadora: null,
      logo_contratante: null
    },
    verso: {
      habilitar_verso: true,
      verso_titulo: "CONTEÚDO PROGRAMÁTICO & REGISTRO DE VALIDADE",
      verso_conteudo: "• Módulo 1: Fundamentação Teórica, Princípios Gerais e Diretrizes Institucionais\n• Módulo 2: Metodologias Aplicadas, Estudos de Caso e Práticas Operacionais\n• Módulo 3: Governança, Procedimentos Padronizados e Conformidade Técnica\n• Módulo 4: Projeto Prático de Conclusão e Avaliação Final de Competências",
      verso_livro: "01",
      verso_folha: "45",
      verso_registro: "REG-{{CPF}}",
      verso_amparo_legal: "Certificado de curso livre emitido com fundamento na Lei nº 9.394/1996 (Diretrizes e Bases da Educação Nacional) e no Decreto Presidencial nº 5.154/2004, com validade em todo o território nacional.",
      verso_assinatura_nome: "Coordenação Técnica Pedagógica",
      verso_assinatura_cargo: "Responsável Técnico(a) - Reg. Profissional 8942-SP"
    },
    style: {
      tema: "ouro_azul",
      orientacao: "retrato"
    }
  }
};

function getCustomTemplates() {
  try {
    const raw = localStorage.getItem("certificaflow_custom_templates");
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveCustomTemplates(tpls) {
  try {
    localStorage.setItem("certificaflow_custom_templates", JSON.stringify(tpls));
  } catch (e) {
    console.error("Erro ao salvar modelos personalizados:", e);
  }
}

function renderQuickTemplatesDropdown() {
  const optgroup = document.getElementById("optgroupMeusModelos");
  if (!optgroup) return;

  const customTpls = getCustomTemplates();
  const keys = Object.keys(customTpls);

  optgroup.innerHTML = "";
  if (keys.length === 0) {
    const emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.disabled = true;
    emptyOpt.textContent = "(Nenhum modelo personalizado salvo)";
    optgroup.appendChild(emptyOpt);
    return;
  }

  keys.forEach(key => {
    const opt = document.createElement("option");
    opt.value = `custom_${key}`;
    opt.textContent = `★ ${key}`;
    optgroup.appendChild(opt);
  });
}

function initQuickTemplates() {
  renderQuickTemplatesDropdown();

  const btnCarregar = document.getElementById("btnCarregarModeloPrePronto");
  const selModelos = document.getElementById("selectModelosPreProntos");
  const btnSalvar = document.getElementById("btnSalvarComoPrePronto");

  if (btnCarregar && selModelos) {
    btnCarregar.addEventListener("click", () => {
      const val = selModelos.value;
      if (!val) {
        showToast("Selecione um modelo da lista.", "warning");
        return;
      }

      let tpl = null;
      let nomeModelo = "";

      if (val.startsWith("custom_")) {
        const customKey = val.replace("custom_", "");
        const customTpls = getCustomTemplates();
        tpl = customTpls[customKey];
        nomeModelo = customKey;
      } else if (OFFICIAL_PRESETS[val]) {
        tpl = OFFICIAL_PRESETS[val];
        nomeModelo = tpl.nome || val;
      }

      if (tpl) {
        applyConfig(tpl, true);
        scheduleAutoSave();
        showToast(`Modelo "${nomeModelo}" aplicado na frente e no verso!`, "success");
      }
    });
  }

  if (btnSalvar) {
    btnSalvar.addEventListener("click", () => {
      const nome = prompt("Digite um nome para salvar o certificado atual como modelo pré-pronto (ex: NR-20 Inflamáveis, Brigada de Incêndio):", "");
      if (!nome || !nome.trim()) return;

      const trimmed = nome.trim();
      const customTpls = getCustomTemplates();
      customTpls[trimmed] = collectCurrentConfig();
      saveCustomTemplates(customTpls);
      renderQuickTemplatesDropdown();

      if (selModelos) {
        selModelos.value = `custom_${trimmed}`;
      }
      showToast(`Modelo pré-pronto "${trimmed}" salvo com sucesso!`, "success");
    });
  }
}

