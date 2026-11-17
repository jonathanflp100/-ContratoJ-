import type { Locale } from '../types';

export interface TranslationDictionary {
  common: {
    appName: string;
    language: string;
    ptBR: string;
    esPY: string;
    save: string;
    cancel: string;
    back: string;
    next: string;
    continue: string;
    edit: string;
    delete: string;
    duplicate: string;
    searchPlaceholder: string;
    close: string;
    printPdf: string;
    downloadTxt: string;
    copyLink: string;
    copied: string;
    brasil: string;
    paraguay: string;
    creditsUnit: string;
    creditSingular: string;
    loading: string;
    requiredField: string;
    optional: string;
  };
  nav: {
    dashboard: string;
    newContract: string;
    vault: string;
    expirations: string;
    templates: string;
    team: string;
    reports: string;
    credits: string;
    settings: string;
    signOut: string;
  };
  auth: {
    tagline: string;
    subtitle: string;
    feature1: string;
    feature2: string;
    feature3: string;
    signInTab: string;
    signUpTab: string;
    fullName: string;
    fullNamePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    password: string;
    passwordPlaceholder: string;
    signInBtn: string;
    signUpBtn: string;
    freeCreditsNote: string;
    demoBtn: string;
    demoHint: string;
    simulatedNotice: string;
    errorInvalid: string;
    errorPasswordLength: string;
    errorEmailRequired: string;
    errorNameRequired: string;
  };
  onboarding: {
    title: string;
    subtitle: string;
    stepCompany: string;
    companyName: string;
    companyNamePlaceholder: string;
    country: string;
    taxIdBR: string;
    taxIdPY: string;
    taxIdPlaceholderBR: string;
    taxIdPlaceholderPY: string;
    logoLabel: string;
    logoUpload: string;
    logoChange: string;
    logoRemove: string;
    logoHint: string;
    brandColor: string;
    address: string;
    addressPlaceholder: string;
    phone: string;
    phonePlaceholderBR: string;
    phonePlaceholderPY: string;
    previewTitle: string;
    finishBtn: string;
  };
  dashboard: {
    welcome: string;
    subtitle: string;
    creditsBalanceLabel: string;
    creditsAvailable: string;
    creditsRule: string;
    buyMoreCredits: string;
    newContractBtn: string;
    statsTotal: string;
    statsAwaiting: string;
    statsSigned: string;
    awaitingTitle: string;
    awaitingEmpty: string;
    recentTitle: string;
    recentEmptyTitle: string;
    recentEmptyDesc: string;
    filterAll: string;
    filterDraft: string;
    filterAwaiting: string;
    filterSigned: string;
    statusDraft: string;
    statusAwaiting: string;
    statusSigned: string;
    markSigned: string;
    viewContract: string;
    continueDraft: string;
    clientLabel: string;
    templateLabel: string;
    createdAt: string;
    attachmentsCount: string;
  };
  newContract: {
    title: string;
    subtitle: string;
    step1: string;
    step2: string;
    step3: string;
    step4: string;
    step5: string;
    chooseTemplate: string;
    createQuickTemplate: string;
    quickTemplateTitle: string;
    quickTemplateBody: string;
    useQuickTemplate: string;
    variablesDetected: string;
    lgpdTitle: string;
    lgpdCheckbox: string;
    lgpdHint: string;
    lgpdRequiredAlert: string;
    partyUploadDesc: string;
    docTypeLabel: string;
    docTypeIdentity: string;
    docTypeCpf: string;
    docTypeAddress: string;
    docTypeMarriage: string;
    docTypeDeed: string;
    docTypeOther: string;
    uploadFileBtn: string;
    useCameraBtn: string;
    analyzeDocsBtn: string;
    skipDocsBtn: string;
    analyzingDocsTitle: string;
    analyzingDocsDesc: string;
    extractErrorTitle: string;
    verifyTitle: string;
    verifySubtitle: string;
    tableFieldCol: string;
    tableValueCol: string;
    tableSourceCol: string;
    tableConfidenceCol: string;
    confHigh: string;
    confMedium: string;
    confLow: string;
    confMissing: string;
    sourceManual: string;
    summaryLowWarning: string;
    summaryMissingWarning: string;
    proceedToQuestionsBtn: string;
    questionsTitle: string;
    questionsSubtitle: string;
    questionProgress: string;
    questionPrevBtn: string;
    questionNextBtn: string;
    questionFinishBtn: string;
    questionSkipBtn: string;
    noDealQuestionsTitle: string;
    noDealQuestionsDesc: string;
    previewHeader: string;
    saveDraftBtn: string;
    finalizeBtn: string;
    finalizeCostNote: string;
    noCreditsTitle: string;
    noCreditsDesc: string;
    goToCredits: string;
    draftSavedToast: string;
    finalizedTitle: string;
    finalizedDesc: string;
    signatureLinkLabel: string;
    backToDashboard: string;
    fixValidationBeforeNext: string;
    validBadge: string;
    reviewHighlightedTab: string;
    reviewFreeEditTab: string;
    reviewClickFieldHint: string;
    inlineFieldEditTitle: string;
    goToFieldInTable: string;
    aiReviewBtn: string;
    aiReviewRunning: string;
    aiReviewPanelTitle: string;
    aiReviewEmpty: string;
    aiAlertsTitle: string;
    aiClausesTitle: string;
    applyAction: string;
    ignoreAction: string;
    appliedLabel: string;
    generatePdfBtn: string;
    exportDocxBtn: string;
    exportSuccessDraft: string;
    exportCostNote: string;
    sendForSignatureBtn: string;
  };
  templates: {
    title: string;
    subtitle: string;
    uploadMyTemplateBtn: string;
    newTemplateBtn: string;
    analyzingTitle: string;
    analyzingSubtitle: string;
    uploadErrorTitle: string;
    searchPlaceholder: string;
    filterAll: string;
    catLocacao: string;
    catCompraVenda: string;
    catServicos: string;
    catRecibo: string;
    catOutros: string;
    systemBadge: string;
    emptyTitle: string;
    emptyDesc: string;
    reviewTitleNew: string;
    reviewTitleEdit: string;
    reviewSubtitle: string;
    templateName: string;
    category: string;
    country: string;
    partiesLabel: string;
    partiesPlaceholder: string;
    templateLanguage: string;
    highlightedViewTab: string;
    rawEditTab: string;
    selectionHint: string;
    selectionActionTitle: string;
    turnSelectionIntoField: string;
    fieldKeyLabel: string;
    fieldLabelLabel: string;
    fieldTypeLabel: string;
    fieldPartyLabel: string;
    fieldsPanelTitle: string;
    addManualField: string;
    renameFieldBtn: string;
    removeFieldBtn: string;
    typeTexto: string;
    typeCpfCi: string;
    typeData: string;
    typeMoeda: string;
    typeNumero: string;
    typeEndereco: string;
    contentHelp: string;
    useTemplateBtn: string;
    saveTemplateBtn: string;
    deleteConfirm: string;
    copySuffix: string;
  };
  credits: {
    title: string;
    subtitle: string;
    currentBalance: string;
    consumptionRule: string;
    currencyLabel: string;
    packagesTitle: string;
    avulsoName: string;
    avulsoAudience: string;
    avulsoDesc: string;
    profissionalName: string;
    profissionalAudience: string;
    profissionalDesc: string;
    contractsIncluded: string;
    perContract: string;
    monthlyBadge: string;
    oneTimeBadge: string;
    buyBtn: string;
    checkoutTitle: string;
    checkoutSimulatedNote: string;
    paymentMethod: string;
    methodPix: string;
    methodCard: string;
    methodTransferPY: string;
    confirmPurchase: string;
    purchaseSuccess: string;
    historyTitle: string;
    historyEmpty: string;
  };
  settings: {
    title: string;
    subtitle: string;
    companySection: string;
    preferencesSection: string;
    accountSection: string;
    dataSection: string;
    dataDesc: string;
    exportBackup: string;
    resetDemo: string;
    resetConfirm: string;
    savedToast: string;
    loggedInAs: string;
    retentionSection: string;
    retentionDesc: string;
    retentionToggleLabel: string;
    retentionDaysLabel: string;
    retentionPreset30: string;
    retentionPreset90: string;
    retentionPreset180: string;
    runPurgeNowBtn: string;
    purgeResultMsg: string;
  };
  contractDetail: {
    title: string;
    statusLabel: string;
    attachmentsTitle: string;
    noAttachments: string;
    attachmentsPurgedNotice: string;
    signatureSection: string;
    markAsSignedBtn: string;
    deleteBtn: string;
    downloadFinalPdfBtn: string;
    downloadDocxBtn: string;
    sendForSignatureAction: string;
    timelineTitle: string;
    timelineCreated: string;
    timelineApprovalRequested: string;
    timelineApproved: string;
    timelineRejected: string;
    timelineSent: string;
    timelineViewed: string;
    timelineSigned: string;
    timelineCompleted: string;
    timelineDocumentsPurged: string;
    certificateShaTitle: string;
    verifyOnlineBtn: string;
    legalApprovalTitle: string;
    legalPending: string;
    legalApproved: string;
    legalRejected: string;
    requestApprovalBtn: string;
    approveNowBtn: string;
    rejectNowBtn: string;
    rejectReasonPlaceholder: string;
    expirationSectionTitle: string;
    extractExpirationBtn: string;
    renewContractBtn: string;
  };
  vault: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    filterStatusLabel: string;
    filterCategoryLabel: string;
    filterPeriodLabel: string;
    periodAll: string;
    period7d: string;
    period30d: string;
    period90d: string;
    periodCustom: string;
    dateFrom: string;
    dateTo: string;
    emptyTitle: string;
    emptyDesc: string;
    propertyAddressLabel: string;
    brokerLabel: string;
    purgedBadge: string;
    resultsCount: string;
  };
  expirations: {
    title: string;
    subtitle: string;
    alert7d: string;
    alert30d: string;
    alert60d: string;
    alertAllUpcoming: string;
    daysLeftSuffix: string;
    expiredLabel: string;
    endDateLabel: string;
    adjustmentIndexLabel: string;
    adjustmentDateLabel: string;
    analyzeAllAiBtn: string;
    analyzingBtn: string;
    analyzeOneBtn: string;
    renewBtn: string;
    noExpirationsTitle: string;
    noExpirationsDesc: string;
    unmappedTitle: string;
    unmappedDesc: string;
  };
  team: {
    title: string;
    subtitle: string;
    roleAdmin: string;
    roleAdminDesc: string;
    roleCorretor: string;
    roleCorretorDesc: string;
    roleJuridico: string;
    roleJuridicoDesc: string;
    inviteTitle: string;
    inviteNameLabel: string;
    inviteEmailLabel: string;
    inviteRoleLabel: string;
    inviteBtn: string;
    membersListTitle: string;
    activeSessionLabel: string;
    switchPerspectiveHint: string;
    useThisMemberBtn: string;
    activeBadge: string;
    invitedBadge: string;
    legalGateTitle: string;
    legalGateDesc: string;
    approvalQueueTitle: string;
    approvalQueueEmpty: string;
    approveBtn: string;
    rejectBtn: string;
    rejectPromptLabel: string;
    corretorScopedBanner: string;
  };
  reports: {
    title: string;
    subtitle: string;
    kpiTotalContracts: string;
    kpiSignedContracts: string;
    kpiAvgSignTime: string;
    kpiCreditsUsed: string;
    hoursSuffix: string;
    daysSuffix: string;
    noDataDash: string;
    monthlyChartTitle: string;
    byBrokerTitle: string;
    byCategoryTitle: string;
    brokerCol: string;
    totalCol: string;
    signedCol: string;
    conversionCol: string;
    exportCsvBtn: string;
  };
  clauseLibrary: {
    tabTemplates: string;
    tabLibrary: string;
    shareCheckboxLabel: string;
    shareCheckboxDesc: string;
    alreadySharedBadge: string;
    sharedSuccessToast: string;
    anonymizingNotice: string;
    libraryTitle: string;
    librarySubtitle: string;
    libraryEmpty: string;
    reviewSectionTitle: string;
    reviewSectionHint: string;
    insertClauseBtn: string;
  };
  signatureFlow: {
    modalTitle: string;
    modalSubtitle: string;
    signersTitle: string;
    addSignerBtn: string;
    signerRoleLabel: string;
    signerNameLabel: string;
    signerDocLabel: string;
    signerWhatsappLabel: string;
    signingOrderLabel: string;
    orderParallel: string;
    orderParallelDesc: string;
    orderSequential: string;
    orderSequentialDesc: string;
    requireSelfieLabel: string;
    requireSelfieDesc: string;
    confirmSendBtn: string;
    linksReadyTitle: string;
    linksReadyDesc: string;
    sendWhatsappBtn: string;
    openSignPageBtn: string;
    validationError: string;
    statusSigned: string;
    statusPending: string;
    orderStepPrefix: string;
    finishDoneBtn: string;
  };
  publicSign: {
    pageBadge: string;
    notFoundTitle: string;
    notFoundDesc: string;
    goHomeBtn: string;
    blockedTitle: string;
    blockedDesc: string;
    alreadySignedTitle: string;
    alreadySignedDesc: string;
    readContractTitle: string;
    scrollPrompt: string;
    scrollCompleted: string;
    scrollToEndBtn: string;
    signerDataTitle: string;
    nameLabel: string;
    documentLabel: string;
    drawSignatureLabel: string;
    drawSignatureHint: string;
    clearSignatureBtn: string;
    selfieRequiredLabel: string;
    selfieOptionalLabel: string;
    takeSelfieBtn: string;
    retakeSelfieBtn: string;
    cameraPreviewHint: string;
    consentCheckbox: string;
    submitSignBtn: string;
    submittingBtn: string;
    errorScrollRequired: string;
    errorSignatureRequired: string;
    errorSelfieRequired: string;
    errorFieldsRequired: string;
    successTitle: string;
    successAllDoneDesc: string;
    successPartialDesc: string;
    downloadSignedPdfBtn: string;
    verifyDocumentBtn: string;
    auditCapturedLabel: string;
  };
  publicVerify: {
    navTitle: string;
    title: string;
    subtitle: string;
    inputLabel: string;
    inputPlaceholder: string;
    verifyBtn: string;
    scanQrCameraBtn: string;
    stopCameraBtn: string;
    uploadQrImageBtn: string;
    qrError: string;
    authenticBadge: string;
    authenticDesc: string;
    pendingBadge: string;
    pendingDesc: string;
    notFoundTitle: string;
    notFoundDesc: string;
    hashLabel: string;
    signersSectionTitle: string;
    downloadPdfBtn: string;
    backToAppBtn: string;
  };
}

export const translations: Record<Locale, TranslationDictionary> = {
  'pt-BR': {
    common: {
      appName: 'ContratoJá',
      language: 'Idioma',
      ptBR: 'Português (BR)',
      esPY: 'Español (PY)',
      save: 'Salvar alterações',
      cancel: 'Cancelar',
      back: 'Voltar',
      next: 'Avançar',
      continue: 'Continuar',
      edit: 'Editar',
      delete: 'Excluir',
      duplicate: 'Duplicar',
      searchPlaceholder: 'Buscar por cliente, código ou modelo...',
      close: 'Fechar',
      printPdf: 'Imprimir / Salvar PDF',
      downloadTxt: 'Baixar texto (.txt)',
      copyLink: 'Copiar link',
      copied: 'Copiado',
      brasil: 'Brasil',
      paraguay: 'Paraguai',
      creditsUnit: 'créditos',
      creditSingular: 'crédito',
      loading: 'Carregando...',
      requiredField: 'Campo obrigatório',
      optional: 'Opcional',
    },
    nav: {
      dashboard: 'Painel',
      newContract: 'Novo contrato',
      vault: 'Cofre',
      expirations: 'Vencimentos',
      templates: 'Modelos',
      team: 'Equipe',
      reports: 'Relatórios',
      credits: 'Créditos',
      settings: 'Configurações',
      signOut: 'Sair da conta',
    },
    auth: {
      tagline: 'Contratos profissionais em minutos, com a cara da sua empresa.',
      subtitle:
        'Para imobiliárias, escritórios e autônomos do Brasil e Paraguai. Use seus próprios modelos, anexe documentos dos clientes e envie para assinatura.',
      feature1: 'Seus próprios modelos com preenchimento automático de campos',
      feature2: 'Identidade visual da sua empresa: logo, cor da marca e CNPJ ou RUC',
      feature3: 'Comece com 2 créditos grátis — sem cartão para testar',
      signInTab: 'Entrar',
      signUpTab: 'Criar conta',
      fullName: 'Seu nome completo',
      fullNamePlaceholder: 'Ex: Mariana Costa',
      email: 'E-mail profissional',
      emailPlaceholder: 'nome@suaempresa.com.br',
      password: 'Senha',
      passwordPlaceholder: 'Mínimo 6 caracteres',
      signInBtn: 'Entrar no painel',
      signUpBtn: 'Criar conta grátis',
      freeCreditsNote: 'Ao criar sua conta, você recebe 2 créditos gratuitos para gerar contratos.',
      demoBtn: 'Entrar com empresa de demonstração',
      demoHint: 'Acesso imediato com modelos prontos e contratos de exemplo.',
      simulatedNotice: 'Seus contratos ficam salvos com segurança na nuvem. A conta demonstração fica só neste navegador.',
      errorInvalid: 'Verifique seu e-mail e senha para continuar.',
      errorPasswordLength: 'A senha deve ter pelo menos 6 caracteres.',
      errorEmailRequired: 'Informe um e-mail válido.',
      errorNameRequired: 'Informe seu nome completo.',
    },
    onboarding: {
      title: 'Configure sua empresa',
      subtitle: 'Esses dados aparecem automaticamente no cabeçalho e rodapé de cada contrato gerado.',
      stepCompany: 'Identidade e dados cadastrais',
      companyName: 'Nome da empresa ou escritório',
      companyNamePlaceholder: 'Ex: Horizonte Imóveis Ltda',
      country: 'País de atuação',
      taxIdBR: 'CNPJ',
      taxIdPY: 'RUC',
      taxIdPlaceholderBR: '00.000.000/0001-00',
      taxIdPlaceholderPY: '80000000-0',
      logoLabel: 'Logotipo da empresa',
      logoUpload: 'Enviar logotipo',
      logoChange: 'Trocar logotipo',
      logoRemove: 'Remover',
      logoHint: 'PNG, JPG ou SVG (recomendado fundo claro).',
      brandColor: 'Cor da marca nos contratos',
      address: 'Endereço comercial',
      addressPlaceholder: 'Av. Paulista, 1200, Conj. 42 — São Paulo/SP',
      phone: 'Telefone / WhatsApp',
      phonePlaceholderBR: '(11) 99999-0000',
      phonePlaceholderPY: '+595 981 000 000',
      previewTitle: 'Prévia no cabeçalho do contrato',
      finishBtn: 'Concluir cadastro e ir ao painel',
    },
    dashboard: {
      welcome: 'Painel de Contratos',
      subtitle: 'Acompanhe seus créditos, contratos recentes e assinaturas pendentes.',
      creditsBalanceLabel: 'Saldo disponível',
      creditsAvailable: 'créditos disponíveis',
      creditsRule: 'Cada contrato finalizado consome 1 crédito. Rascunhos não consomem créditos.',
      buyMoreCredits: 'Comprar créditos',
      newContractBtn: 'Novo contrato',
      statsTotal: 'Total emitidos',
      statsAwaiting: 'Aguardando assinatura',
      statsSigned: 'Assinados',
      awaitingTitle: 'Aguardando assinatura',
      awaitingEmpty: 'Nenhum contrato aguardando assinatura no momento.',
      recentTitle: 'Contratos recentes',
      recentEmptyTitle: 'Você ainda não criou nenhum contrato',
      recentEmptyDesc: 'Escolha um dos seus modelos, anexe os documentos do cliente e gere seu primeiro contrato em instantes.',
      filterAll: 'Todos',
      filterDraft: 'Rascunho',
      filterAwaiting: 'Aguardando',
      filterSigned: 'Assinado',
      statusDraft: 'Rascunho',
      statusAwaiting: 'Aguardando assinatura',
      statusSigned: 'Assinado',
      markSigned: 'Marcar como assinado',
      viewContract: 'Visualizar contrato',
      continueDraft: 'Continuar rascunho',
      clientLabel: 'Cliente',
      templateLabel: 'Modelo',
      createdAt: 'Criado em',
      attachmentsCount: 'doc(s) anexado(s)',
    },
    newContract: {
      title: 'Novo contrato',
      subtitle: 'Escolha o modelo, envie os documentos das partes e confira tudo antes de gerar.',
      step1: '1. Modelo',
      step2: '2. Documentos',
      step3: '3. Conferência',
      step4: '4. Condições',
      step5: '5. Prévia',
      chooseTemplate: 'Escolha um modelo',
      createQuickTemplate: 'Criar modelo rápido agora',
      quickTemplateTitle: 'Título do novo modelo',
      quickTemplateBody: 'Texto do modelo (use {{campo}} para variáveis)',
      useQuickTemplate: 'Salvar e usar este modelo',
      variablesDetected: 'campos detectados',
      lgpdTitle: 'Autorização de tratamento de dados (LGPD)',
      lgpdCheckbox: 'Confirmo que tenho autorização do cliente para processar estes documentos',
      lgpdHint: 'Exigido pela LGPD (Brasil) e Ley 6534 (Paraguai) antes do envio de documentos pessoais.',
      lgpdRequiredAlert: 'Marque a confirmação de autorização do cliente acima para liberar o envio de fotos e PDFs.',
      partyUploadDesc: 'Envie fotos ou PDFs de RG/CNH, CPF, comprovante de residência, certidão de casamento ou matrícula do imóvel.',
      docTypeLabel: 'Tipo do documento',
      docTypeIdentity: 'RG / CNH / Cédula',
      docTypeCpf: 'CPF / CNPJ / RUC',
      docTypeAddress: 'Comprovante de residência',
      docTypeMarriage: 'Certidão de casamento',
      docTypeDeed: 'Matrícula do imóvel',
      docTypeOther: 'Outro documento',
      uploadFileBtn: 'Enviar foto ou PDF',
      useCameraBtn: 'Usar câmera',
      analyzeDocsBtn: 'Ler documentos e extrair dados',
      skipDocsBtn: 'Preencher sem documentos',
      analyzingDocsTitle: 'Lendo os documentos enviados...',
      analyzingDocsDesc: 'Identificando dados de cada parte, fonte do documento e nível de confiança.',
      extractErrorTitle: 'Erro na leitura dos documentos',
      verifyTitle: 'Conferência dos dados extraídos',
      verifySubtitle: 'Revise os campos por parte. Itens em amarelo têm baixa confiança; itens em vermelho não foram encontrados.',
      tableFieldCol: 'Campo',
      tableValueCol: 'Valor extraído / editável',
      tableSourceCol: 'Fonte',
      tableConfidenceCol: 'Confiança',
      confHigh: 'Alta',
      confMedium: 'Média',
      confLow: 'Baixa · Conferir',
      confMissing: 'Não encontrado',
      sourceManual: 'Preenchimento manual',
      summaryLowWarning: 'campo(s) com confiança baixa para conferir',
      summaryMissingWarning: 'campo(s) de documento não encontrado(s)',
      proceedToQuestionsBtn: 'Continuar para condições do contrato',
      questionsTitle: 'Condições do contrato',
      questionsSubtitle: 'Estes dados não constam nos documentos pessoais. Responda um campo por vez.',
      questionProgress: 'Pergunta',
      questionPrevBtn: 'Anterior',
      questionNextBtn: 'Próxima',
      questionFinishBtn: 'Ver prévia do contrato',
      questionSkipBtn: 'Pular por agora',
      noDealQuestionsTitle: 'Todos os campos já foram preenchidos',
      noDealQuestionsDesc: 'Avance para revisar a prévia oficial do contrato.',
      previewHeader: 'Prévia oficial do contrato',
      saveDraftBtn: 'Salvar rascunho (0 créditos)',
      finalizeBtn: 'Finalizar contrato (-1 crédito)',
      finalizeCostNote: 'Ao finalizar, 1 crédito será descontado e o link de assinatura ficará disponível.',
      noCreditsTitle: 'Saldo de créditos insuficiente',
      noCreditsDesc: 'Você não possui créditos disponíveis para finalizar este contrato. Salve como rascunho ou adquira um pacote.',
      goToCredits: 'Ir para Créditos',
      draftSavedToast: 'Rascunho salvo com sucesso.',
      finalizedTitle: 'Contrato finalizado com sucesso',
      finalizedDesc: '1 crédito foi utilizado. Você já pode imprimir em PDF ou enviar o link para o cliente assinar.',
      signatureLinkLabel: 'Link de assinatura do cliente',
      backToDashboard: 'Voltar ao painel',
      fixValidationBeforeNext: 'Corrija os campos com validação inválida (CPF/CNPJ, data ou moeda) antes de avançar.',
      validBadge: 'Válido',
      reviewHighlightedTab: 'Campos destacados',
      reviewFreeEditTab: 'Editar texto livremente',
      reviewClickFieldHint: 'Clique em qualquer valor destacado no contrato para editar ou voltar ao campo correspondente.',
      inlineFieldEditTitle: 'Editando campo',
      goToFieldInTable: 'Voltar para conferência',
      aiReviewBtn: 'Revisar com IA',
      aiReviewRunning: 'Analisando cláusulas e consistência...',
      aiReviewPanelTitle: 'Revisão jurídica assistida',
      aiReviewEmpty: 'Nenhuma inconsistência encontrada nos dados e cláusulas verificadas.',
      aiAlertsTitle: 'Alertas encontrados',
      aiClausesTitle: 'Sugestões de cláusulas (legislação local)',
      applyAction: 'Aplicar',
      ignoreAction: 'Ignorar',
      appliedLabel: 'Aplicado',
      generatePdfBtn: 'Gerar PDF A4 (-1 crédito)',
      exportDocxBtn: 'Exportar .docx (-1 crédito)',
      exportSuccessDraft: 'Documento gerado, 1 crédito utilizado e contrato salvo como Rascunho.',
      exportCostNote: 'Ao gerar PDF ou .docx, 1 crédito é descontado e o contrato é salvo como Rascunho.',
      sendForSignatureBtn: 'Enviar para assinatura',
    },
    templates: {
      title: 'Meus modelos',
      subtitle: 'Suba seu contrato (.docx ou .pdf), revise os campos identificados e reutilize quando quiser.',
      uploadMyTemplateBtn: 'Subir meu modelo',
      newTemplateBtn: 'Criar em branco',
      analyzingTitle: 'Analisando seu documento...',
      analyzingSubtitle: 'Extraindo texto e identificando campos variáveis (nomes, documentos, valores, datas e prazos).',
      uploadErrorTitle: 'Não foi possível processar o arquivo',
      searchPlaceholder: 'Buscar modelo por nome, parte ou texto...',
      filterAll: 'Todos',
      catLocacao: 'Locação',
      catCompraVenda: 'Compra e venda',
      catServicos: 'Serviços',
      catRecibo: 'Recibo',
      catOutros: 'Outros',
      systemBadge: 'Modelo ContratoJá',
      emptyTitle: 'Nenhum modelo encontrado',
      emptyDesc: 'Suba um arquivo .docx ou .pdf, ou ajuste os filtros de busca.',
      reviewTitleNew: 'Revisar modelo e campos',
      reviewTitleEdit: 'Editar e revisar modelo',
      reviewSubtitle: 'Confira os campos destacados, renomeie, remova ou selecione qualquer trecho do texto para transformá-lo em campo.',
      templateName: 'Nome do modelo',
      category: 'Categoria',
      country: 'País',
      partiesLabel: 'Partes envolvidas (separadas por vírgula)',
      partiesPlaceholder: 'Ex: Locador, Locatário, Fiador',
      templateLanguage: 'Idioma do texto',
      highlightedViewTab: 'Visualização com destaques',
      rawEditTab: 'Editar texto e marcar trechos',
      selectionHint: 'Dica: selecione qualquer palavra ou trecho no texto abaixo para transformá-lo em campo {{variavel}}.',
      selectionActionTitle: 'Trecho selecionado',
      turnSelectionIntoField: 'Transformar em campo',
      fieldKeyLabel: 'Identificador ({{campo}})',
      fieldLabelLabel: 'Rótulo amigável',
      fieldTypeLabel: 'Tipo do dado',
      fieldPartyLabel: 'Parte',
      fieldsPanelTitle: 'Campos identificados',
      addManualField: 'Inserir novo campo',
      renameFieldBtn: 'Renomear',
      removeFieldBtn: 'Remover',
      typeTexto: 'Texto',
      typeCpfCi: 'CPF / CNPJ / C.I.',
      typeData: 'Data',
      typeMoeda: 'Moeda / Valor',
      typeNumero: 'Número',
      typeEndereco: 'Endereço',
      contentHelp: 'Todos os trechos entre {{chaves_duplas}} serão preenchidos automaticamente ao gerar um contrato.',
      useTemplateBtn: 'Gerar contrato',
      saveTemplateBtn: 'Salvar modelo',
      deleteConfirm: 'Tem certeza que deseja excluir este modelo?',
      copySuffix: '(Cópia)',
    },
    credits: {
      title: 'Créditos e Planos',
      subtitle: 'Adquira créditos avulsos ou mensais para finalizar seus contratos sem burocracia.',
      currentBalance: 'Seu saldo atual',
      consumptionRule: 'Cada contrato finalizado consome 1 crédito. Rascunhos são gratuitos.',
      currencyLabel: 'Moeda de cobrança',
      packagesTitle: 'Pacotes disponíveis',
      avulsoName: 'Pacote Avulso',
      avulsoAudience: 'Para demandas pontuais e autônomos',
      avulsoDesc: 'Compre quando precisar, sem mensalidade e sem validade curta.',
      profissionalName: 'Plano Profissional',
      profissionalAudience: 'Para imobiliárias e escritórios ativos',
      profissionalDesc: 'Melhor custo por contrato para equipes que emitem toda semana.',
      contractsIncluded: 'contratos',
      perContract: 'por contrato',
      monthlyBadge: '30 contratos/mês',
      oneTimeBadge: '10 contratos avulsos',
      buyBtn: 'Adquirir pacote',
      checkoutTitle: 'Confirmar compra simulada',
      checkoutSimulatedNote: 'Esta é uma compra simulada para testes. Os créditos serão adicionados na hora ao seu saldo local.',
      paymentMethod: 'Forma de pagamento',
      methodPix: 'PIX (aprovação imediata)',
      methodCard: 'Cartão de crédito',
      methodTransferPY: 'Transferencia Bancaria / QR (PY)',
      confirmPurchase: 'Confirmar e creditar agora',
      purchaseSuccess: 'Créditos adicionados ao seu saldo!',
      historyTitle: 'Extrato de créditos',
      historyEmpty: 'Nenhuma movimentação registrada.',
    },
    settings: {
      title: 'Configurações',
      subtitle: 'Atualize os dados da sua empresa, idioma da plataforma e backup local.',
      companySection: 'Dados da empresa',
      preferencesSection: 'Idioma e preferências',
      accountSection: 'Conta conectada',
      dataSection: 'Armazenamento local (pré-Supabase)',
      dataDesc: 'Seus dados estão salvos no navegador via services/storage.ts. Exporte um backup ou restaure os dados de demonstração.',
      exportBackup: 'Exportar JSON',
      resetDemo: 'Restaurar dados iniciais',
      resetConfirm: 'Isso irá reiniciar os dados locais para o estado inicial de demonstração. Continuar?',
      savedToast: 'Configurações salvas com sucesso.',
      loggedInAs: 'Conectado como',
      retentionSection: 'Retenção automática de documentos (LGPD)',
      retentionDesc: 'Para conformidade com a LGPD, fotos e PDFs enviados pelos clientes (RG, CPF, comprovantes) são apagados automaticamente após o prazo configurado depois da assinatura. O contrato assinado e o SHA-256 permanecem intactos.',
      retentionToggleLabel: 'Apagar documentos pessoais automaticamente após assinatura',
      retentionDaysLabel: 'Prazo de retenção (dias após assinatura)',
      retentionPreset30: '30 dias',
      retentionPreset90: '90 dias (padrão)',
      retentionPreset180: '180 dias',
      runPurgeNowBtn: 'Verificar e limpar expirados agora',
      purgeResultMsg: 'documento(s) vencido(s) removido(s) com segurança.',
    },
    contractDetail: {
      title: 'Detalhes do contrato',
      statusLabel: 'Situação',
      attachmentsTitle: 'Documentos anexados do cliente',
      noAttachments: 'Nenhum documento anexado neste contrato.',
      attachmentsPurgedNotice: 'Documentos pessoais excluídos automaticamente pela política de retenção (LGPD). O PDF assinado e o hash SHA-256 seguem válidos.',
      signatureSection: 'Signatários e links de assinatura',
      markAsSignedBtn: 'Confirmar assinatura recebida',
      deleteBtn: 'Excluir registro',
      downloadFinalPdfBtn: 'Baixar PDF A4',
      downloadDocxBtn: 'Baixar .docx',
      sendForSignatureAction: 'Enviar para assinatura',
      timelineTitle: 'Linha do tempo do contrato',
      timelineCreated: 'Contrato criado',
      timelineApprovalRequested: 'Aprovação jurídica solicitada',
      timelineApproved: 'Aprovado pelo Jurídico',
      timelineRejected: 'Devolvido pelo Jurídico',
      timelineSent: 'Enviado para assinatura',
      timelineViewed: 'Visualizado por',
      timelineSigned: 'Assinado por',
      timelineCompleted: 'Todas as assinaturas concluídas · Comprovante SHA-256 gerado',
      timelineDocumentsPurged: 'Documentos pessoais do cliente removidos (política de retenção)',
      certificateShaTitle: 'Autenticidade & Hash SHA-256',
      verifyOnlineBtn: 'Verificar autenticidade',
      legalApprovalTitle: 'Revisão do Jurídico',
      legalPending: 'Aguardando aprovação do Jurídico',
      legalApproved: 'Aprovado pelo Jurídico',
      legalRejected: 'Ajustes solicitados pelo Jurídico',
      requestApprovalBtn: 'Solicitar aprovação',
      approveNowBtn: 'Aprovar para envio',
      rejectNowBtn: 'Devolver com observação',
      rejectReasonPlaceholder: 'Descreva o ajuste necessário...',
      expirationSectionTitle: 'Vigência e reajuste',
      extractExpirationBtn: 'Analisar vencimento com IA',
      renewContractBtn: 'Renovar contrato',
    },
    vault: {
      title: 'Cofre de Contratos',
      subtitle: 'Consulte contratos assinados e arquivados por cliente, CPF/CNPJ, endereço do imóvel ou período.',
      searchPlaceholder: 'Buscar por nome do cliente, CPF/CNPJ/C.I., endereço do imóvel ou código...',
      filterStatusLabel: 'Status',
      filterCategoryLabel: 'Categoria',
      filterPeriodLabel: 'Período',
      periodAll: 'Todo período',
      period7d: 'Últimos 7 dias',
      period30d: 'Últimos 30 dias',
      period90d: 'Últimos 90 dias',
      periodCustom: 'Personalizado',
      dateFrom: 'De',
      dateTo: 'Até',
      emptyTitle: 'Nenhum contrato encontrado no Cofre',
      emptyDesc: 'Ajuste os filtros de busca, status ou período para localizar outros registros.',
      propertyAddressLabel: 'Imóvel',
      brokerLabel: 'Responsável',
      purgedBadge: 'Docs limpos (LGPD)',
      resultsCount: 'contrato(s)',
    },
    expirations: {
      title: 'Próximos Vencimentos',
      subtitle: 'A IA identifica a data final, índice (IGP-M/IPCA) e data de reajuste para você renovar antes do prazo.',
      alert7d: 'Crítico · até 7 dias',
      alert30d: 'Atenção · até 30 dias',
      alert60d: 'Planejamento · até 60 dias',
      alertAllUpcoming: 'Todos com vigência mapeada',
      daysLeftSuffix: 'dias restantes',
      expiredLabel: 'Vencido',
      endDateLabel: 'Término do contrato',
      adjustmentIndexLabel: 'Índice de reajuste',
      adjustmentDateLabel: 'Data de reajuste',
      analyzeAllAiBtn: 'Analisar pendentes com IA',
      analyzingBtn: 'Analisando com IA...',
      analyzeOneBtn: 'Extrair datas com IA',
      renewBtn: 'Renovar',
      noExpirationsTitle: 'Nenhum vencimento nesta janela',
      noExpirationsDesc: 'Os contratos ativos com vencimento ou reajuste dentro deste filtro aparecerão aqui.',
      unmappedTitle: 'Contratos sem vigência analisada',
      unmappedDesc: 'Execute a extração por IA para identificar automaticamente término, índice e data de reajuste.',
    },
    team: {
      title: 'Equipe e Permissões',
      subtitle: 'Convide corretores e jurídico, controle o acesso por papel e exija aprovação jurídica antes do envio.',
      roleAdmin: 'Admin',
      roleAdminDesc: 'Acesso total a contratos, equipe, créditos e configurações.',
      roleCorretor: 'Corretor',
      roleCorretorDesc: 'Vê e gerencia apenas os próprios contratos emitidos.',
      roleJuridico: 'Jurídico',
      roleJuridicoDesc: 'Revisa e aprova ou devolve contratos antes do envio para assinatura.',
      inviteTitle: 'Convidar membro para a equipe',
      inviteNameLabel: 'Nome completo',
      inviteEmailLabel: 'E-mail profissional',
      inviteRoleLabel: 'Papel na equipe',
      inviteBtn: 'Enviar convite',
      membersListTitle: 'Membros da equipe',
      activeSessionLabel: 'Perfil ativo no painel',
      switchPerspectiveHint: 'Troque de usuário abaixo para testar a visão restrita do Corretor ou a fila do Jurídico:',
      useThisMemberBtn: 'Simular visão',
      activeBadge: 'Ativo agora',
      invitedBadge: 'Convidado',
      legalGateTitle: 'Exigir aprovação do Jurídico antes de enviar para assinatura',
      legalGateDesc: 'Quando ativado, nenhum contrato pode gerar links de assinatura sem o aval de um membro com papel Jurídico ou Admin.',
      approvalQueueTitle: 'Fila de aprovação do Jurídico',
      approvalQueueEmpty: 'Nenhum contrato aguardando revisão jurídica no momento.',
      approveBtn: 'Aprovar',
      rejectBtn: 'Devolver',
      rejectPromptLabel: 'Motivo da devolução:',
      corretorScopedBanner: 'Visão de Corretor ativa: exibindo apenas contratos criados por você.',
    },
    reports: {
      title: 'Relatórios Gerenciais',
      subtitle: 'Acompanhe volume mensal, desempenho por corretor, tempo médio até assinatura e consumo de créditos.',
      kpiTotalContracts: 'Contratos no período',
      kpiSignedContracts: 'Contratos assinados',
      kpiAvgSignTime: 'Tempo médio até assinatura',
      kpiCreditsUsed: 'Créditos utilizados',
      hoursSuffix: 'h',
      daysSuffix: 'd',
      noDataDash: '—',
      monthlyChartTitle: 'Contratos emitidos por mês',
      byBrokerTitle: 'Desempenho por corretor / responsável',
      byCategoryTitle: 'Distribuição por categoria',
      brokerCol: 'Responsável',
      totalCol: 'Emitidos',
      signedCol: 'Assinados',
      conversionCol: 'Taxa assinatura',
      exportCsvBtn: 'Exportar CSV',
    },
    clauseLibrary: {
      tabTemplates: 'Modelos da empresa',
      tabLibrary: 'Biblioteca de cláusulas',
      shareCheckboxLabel: 'Compartilhar anonimamente na biblioteca ContratoJá (+2 créditos)',
      shareCheckboxDesc: 'Antes de publicar, nossa IA remove automaticamente todos os nomes, CPFs, endereços e valores.',
      alreadySharedBadge: 'Compartilhado (+2 créditos creditados)',
      sharedSuccessToast: 'Cláusulas anonimizadas publicadas! Você ganhou +2 créditos.',
      anonymizingNotice: 'Anonimizando dados sensíveis e extraindo cláusulas...',
      libraryTitle: 'Biblioteca Colaborativa de Cláusulas',
      librarySubtitle: 'Cláusulas revisadas e 100% anonimizadas pela comunidade para reforçar seus contratos.',
      libraryEmpty: 'Nenhuma cláusula encontrada nesta categoria.',
      reviewSectionTitle: 'Cláusulas da Biblioteca ContratoJá',
      reviewSectionHint: 'Sugestões prontas e anonimizadas compatíveis com este tipo de contrato.',
      insertClauseBtn: 'Aplicar',
    },
    signatureFlow: {
      modalTitle: 'Enviar contrato para assinatura',
      modalSubtitle: 'Configure os signatários, a ordem de assinatura e a exigência de selfie com documento.',
      signersTitle: 'Signatários',
      addSignerBtn: 'Adicionar signatário',
      signerRoleLabel: 'Papel (ex: Locatário, Fiador)',
      signerNameLabel: 'Nome completo',
      signerDocLabel: 'CPF / CNPJ / C.I.',
      signerWhatsappLabel: 'WhatsApp',
      signingOrderLabel: 'Ordem das assinaturas',
      orderParallel: 'Todos ao mesmo tempo',
      orderParallelDesc: 'Cada signatário pode assinar imediatamente assim que receber o link.',
      orderSequential: 'Em sequência',
      orderSequentialDesc: 'O próximo signatário só assina após o anterior concluir.',
      requireSelfieLabel: 'Exigir selfie com documento',
      requireSelfieDesc: 'O signatário precisará capturar uma foto pela câmera segurando seu documento de identidade.',
      confirmSendBtn: 'Gerar links e enviar para assinatura',
      linksReadyTitle: 'Links únicos gerados por signatário',
      linksReadyDesc: 'Compartilhe o link individual pelo WhatsApp ou copie para enviar ao cliente.',
      sendWhatsappBtn: 'Enviar pelo WhatsApp',
      openSignPageBtn: 'Abrir página',
      validationError: 'Informe nome e documento de todos os signatários antes de continuar.',
      statusSigned: 'Assinado',
      statusPending: 'Pendente',
      orderStepPrefix: 'Ordem',
      finishDoneBtn: 'Concluir e voltar ao painel',
    },
    publicSign: {
      pageBadge: 'Assinatura Eletrônica · Acesso sem login',
      notFoundTitle: 'Link de assinatura inválido ou expirado',
      notFoundDesc: 'Não encontramos este documento ou token neste navegador. Verifique com a empresa emissora.',
      goHomeBtn: 'Ir para ContratoJá',
      blockedTitle: 'Aguardando assinatura anterior',
      blockedDesc: 'Este contrato segue ordem sequencial. É necessário aguardar a assinatura de:',
      alreadySignedTitle: 'Sua assinatura já foi registrada',
      alreadySignedDesc: 'Obrigado! Registramos sua assinatura eletrônica com data, hora e dispositivo.',
      readContractTitle: 'Leia o contrato integralmente',
      scrollPrompt: 'Role o texto abaixo até o fim para habilitar a assinatura.',
      scrollCompleted: 'Leitura integral confirmada. Você já pode assinar abaixo.',
      scrollToEndBtn: 'Ir ao final do texto',
      signerDataTitle: 'Seus dados e assinatura',
      nameLabel: 'Nome completo do signatário',
      documentLabel: 'Documento (CPF / CNPJ / C.I.)',
      drawSignatureLabel: 'Assine com o dedo ou mouse no quadro abaixo',
      drawSignatureHint: 'Desenhe sua rubrica ou assinatura dentro da área pontilhada.',
      clearSignatureBtn: 'Limpar assinatura',
      selfieRequiredLabel: 'Selfie com documento (obrigatória)',
      selfieOptionalLabel: 'Selfie com documento (opcional pela câmera)',
      takeSelfieBtn: 'Tirar selfie com a câmera',
      retakeSelfieBtn: 'Tirar outra foto',
      cameraPreviewHint: 'Segure seu documento próximo ao rosto em local iluminado.',
      consentCheckbox: 'Li e concordo integralmente com todas as cláusulas deste contrato e autorizo o registro eletrônico da minha assinatura.',
      submitSignBtn: 'Confirmar e assinar contrato',
      submittingBtn: 'Registrando assinatura e SHA-256...',
      errorScrollRequired: 'Role o contrato até o final antes de confirmar a assinatura.',
      errorSignatureRequired: 'Desenhe sua assinatura no quadro acima.',
      errorSelfieRequired: 'Este contrato exige uma selfie pela câmera antes de concluir.',
      errorFieldsRequired: 'Preencha seu nome e documento e marque a caixa "Li e concordo".',
      successTitle: 'Assinatura registrada com sucesso',
      successAllDoneDesc: 'Todos os signatários assinaram! O PDF final com o Comprovante SHA-256 e QR Code já está disponível.',
      successPartialDesc: 'Sua assinatura foi gravada na linha do tempo. Aguardando os demais signatários concluírem.',
      downloadSignedPdfBtn: 'Baixar PDF final + Comprovante',
      verifyDocumentBtn: 'Verificar autenticidade (/verificar)',
      auditCapturedLabel: 'Registro técnico capturado automaticamente:',
    },
    publicVerify: {
      navTitle: 'Verificar documento',
      title: 'Verificação de Autenticidade',
      subtitle: 'Cole o código do contrato, o hash SHA-256 ou leia o QR Code impresso no Comprovante de Assinatura Eletrônica.',
      inputLabel: 'Código do contrato ou Hash SHA-256',
      inputPlaceholder: 'Ex: CJ-2026-002 ou hash SHA-256 de 64 caracteres...',
      verifyBtn: 'Verificar documento',
      scanQrCameraBtn: 'Ler QR Code pela câmera',
      stopCameraBtn: 'Fechar câmera',
      uploadQrImageBtn: 'Enviar imagem do QR Code',
      qrError: 'Não foi possível iniciar a câmera ou localizar um QR Code válido na imagem.',
      authenticBadge: 'Documento Autêntico e Íntegro',
      authenticDesc: 'O hash criptográfico SHA-256 confere integralmente com o documento registrado e todas as assinaturas estão válidas.',
      pendingBadge: 'Documento localizado (aguardando assinaturas)',
      pendingDesc: 'Este contrato ainda não concluiu todas as assinaturas eletrônicas.',
      notFoundTitle: 'Documento não encontrado ou inválido',
      notFoundDesc: 'Nenhum registro correspondente ao código ou hash informado foi localizado.',
      hashLabel: 'Hash SHA-256 verificado (Web Crypto)',
      signersSectionTitle: 'Signatários e evidências técnicas',
      downloadPdfBtn: 'Baixar PDF com Comprovante',
      backToAppBtn: 'Voltar ao ContratoJá',
    },
  },
  'es-PY': {
    common: {
      appName: 'ContratoJá',
      language: 'Idioma',
      ptBR: 'Portugués (BR)',
      esPY: 'Español (PY)',
      save: 'Guardar cambios',
      cancel: 'Cancelar',
      back: 'Volver',
      next: 'Siguiente',
      continue: 'Continuar',
      edit: 'Editar',
      delete: 'Eliminar',
      duplicate: 'Duplicar',
      searchPlaceholder: 'Buscar por cliente, código o plantilla...',
      close: 'Cerrar',
      printPdf: 'Imprimir / Guardar PDF',
      downloadTxt: 'Descargar texto (.txt)',
      copyLink: 'Copiar enlace',
      copied: 'Copiado',
      brasil: 'Brasil',
      paraguay: 'Paraguay',
      creditsUnit: 'créditos',
      creditSingular: 'crédito',
      loading: 'Cargando...',
      requiredField: 'Campo obligatorio',
      optional: 'Opcional',
    },
    nav: {
      dashboard: 'Panel',
      newContract: 'Nuevo contrato',
      vault: 'Bóveda',
      expirations: 'Vencimientos',
      templates: 'Plantillas',
      team: 'Equipo',
      reports: 'Reportes',
      credits: 'Créditos',
      settings: 'Ajustes',
      signOut: 'Cerrar sesión',
    },
    auth: {
      tagline: 'Contratos profesionales en minutos, con la identidad de tu empresa.',
      subtitle:
        'Para inmobiliarias, estudios profesionales e independientes de Paraguay y Brasil. Usá tus propias plantillas, adjuntá documentos del cliente y enviá para firma.',
      feature1: 'Tus propias plantillas con completado automático de campos',
      feature2: 'Identidad visual propia: logotipo, color de marca y RUC o CNPJ',
      feature3: 'Empezá con 2 créditos gratis — sin tarjeta para probar',
      signInTab: 'Iniciar sesión',
      signUpTab: 'Crear cuenta',
      fullName: 'Nombre y apellido',
      fullNamePlaceholder: 'Ej: Mateo Benítez',
      email: 'Correo profesional',
      emailPlaceholder: 'nombre@tuempresa.com.py',
      password: 'Contraseña',
      passwordPlaceholder: 'Mínimo 6 caracteres',
      signInBtn: 'Ingresar al panel',
      signUpBtn: 'Crear cuenta gratis',
      freeCreditsNote: 'Al crear tu cuenta recibís 2 créditos gratuitos para generar contratos.',
      demoBtn: 'Ingresar con empresa de demostración',
      demoHint: 'Acceso inmediato con plantillas listas y contratos de ejemplo.',
      simulatedNotice: 'Tus contratos quedan guardados de forma segura en la nube. La cuenta demo queda solo en este navegador.',
      errorInvalid: 'Verificá tu correo y contraseña para continuar.',
      errorPasswordLength: 'La contraseña debe tener al menos 6 caracteres.',
      errorEmailRequired: 'Ingresá un correo válido.',
      errorNameRequired: 'Ingresá tu nombre completo.',
    },
    onboarding: {
      title: 'Configurá tu empresa',
      subtitle: 'Estos datos aparecen automáticamente en el encabezado y pie de cada contrato generado.',
      stepCompany: 'Identidad y datos fiscales',
      companyName: 'Nombre de la empresa o estudio',
      companyNamePlaceholder: 'Ej: Guaraní Propiedades S.A.',
      country: 'País de operación',
      taxIdBR: 'CNPJ',
      taxIdPY: 'RUC',
      taxIdPlaceholderBR: '00.000.000/0001-00',
      taxIdPlaceholderPY: '80012345-6',
      logoLabel: 'Logotipo de la empresa',
      logoUpload: 'Subir logotipo',
      logoChange: 'Cambiar logotipo',
      logoRemove: 'Quitar',
      logoHint: 'PNG, JPG o SVG (recomendado fondo claro).',
      brandColor: 'Color de marca en los contratos',
      address: 'Dirección comercial',
      addressPlaceholder: 'Av. Mariscal López 2450 — Asunción',
      phone: 'Teléfono / WhatsApp',
      phonePlaceholderBR: '(11) 99999-0000',
      phonePlaceholderPY: '+595 981 000 000',
      previewTitle: 'Vista previa en el encabezado del contrato',
      finishBtn: 'Finalizar registro e ir al panel',
    },
    dashboard: {
      welcome: 'Panel de Contratos',
      subtitle: 'Controlá tus créditos, contratos recientes y firmas pendientes.',
      creditsBalanceLabel: 'Saldo disponible',
      creditsAvailable: 'créditos disponibles',
      creditsRule: 'Cada contrato finalizado consume 1 crédito. Los borradores no consumen créditos.',
      buyMoreCredits: 'Comprar créditos',
      newContractBtn: 'Nuevo contrato',
      statsTotal: 'Total emitidos',
      statsAwaiting: 'Esperando firma',
      statsSigned: 'Firmados',
      awaitingTitle: 'Esperando firma',
      awaitingEmpty: 'No hay contratos esperando firma en este momento.',
      recentTitle: 'Contratos recientes',
      recentEmptyTitle: 'Todavía no creaste ningún contrato',
      recentEmptyDesc: 'Elegí una plantilla, adjuntá los documentos del cliente y generá tu primer contrato en minutos.',
      filterAll: 'Todos',
      filterDraft: 'Borrador',
      filterAwaiting: 'Pendiente',
      filterSigned: 'Firmado',
      statusDraft: 'Borrador',
      statusAwaiting: 'Esperando firma',
      statusSigned: 'Firmado',
      markSigned: 'Marcar como firmado',
      viewContract: 'Ver contrato',
      continueDraft: 'Continuar borrador',
      clientLabel: 'Cliente',
      templateLabel: 'Plantilla',
      createdAt: 'Creado el',
      attachmentsCount: 'doc(s) adjunto(s)',
    },
    newContract: {
      title: 'Nuevo contrato',
      subtitle: 'Elegí la plantilla, subí los documentos de las partes y verificá todo antes de emitir.',
      step1: '1. Plantilla',
      step2: '2. Documentos',
      step3: '3. Verificación',
      step4: '4. Condiciones',
      step5: '5. Vista previa',
      chooseTemplate: 'Elegí una plantilla',
      createQuickTemplate: 'Crear plantilla rápida ahora',
      quickTemplateTitle: 'Título de la nueva plantilla',
      quickTemplateBody: 'Texto de la plantilla (usá {{campo}} para variables)',
      useQuickTemplate: 'Guardar y usar esta plantilla',
      variablesDetected: 'campos detectados',
      lgpdTitle: 'Autorización de tratamiento de datos (Ley 6534 / LGPD)',
      lgpdCheckbox: 'Confirmo que tengo autorización del cliente para procesar estos documentos',
      lgpdHint: 'Requerido por la Ley 6534 (Paraguay) y LGPD (Brasil) antes de subir documentos personales.',
      lgpdRequiredAlert: 'Marcá la confirmación de autorización del cliente arriba para habilitar la carga de fotos y PDFs.',
      partyUploadDesc: 'Subí fotos o PDFs de Cédula/RG/CNH, RUC/CPF, comprobante de domicilio, acta de matrimonio o título/matrícula.',
      docTypeLabel: 'Tipo de documento',
      docTypeIdentity: 'Cédula / RG / CNH',
      docTypeCpf: 'RUC / CPF / CNPJ',
      docTypeAddress: 'Comprobante de domicilio',
      docTypeMarriage: 'Acta de matrimonio',
      docTypeDeed: 'Matrícula / Título del inmueble',
      docTypeOther: 'Otro documento',
      uploadFileBtn: 'Subir foto o PDF',
      useCameraBtn: 'Usar cámara',
      analyzeDocsBtn: 'Leer documentos y extraer datos',
      skipDocsBtn: 'Completar sin documentos',
      analyzingDocsTitle: 'Leyendo los documentos adjuntos...',
      analyzingDocsDesc: 'Identificando datos de cada parte, documento origen y nivel de confianza.',
      extractErrorTitle: 'Error al leer los documentos',
      verifyTitle: 'Verificación de datos extraídos',
      verifySubtitle: 'Revisá los campos por parte. En amarillo: baja confianza; en rojo: no encontrado.',
      tableFieldCol: 'Campo',
      tableValueCol: 'Valor extraído / editable',
      tableSourceCol: 'Fuente',
      tableConfidenceCol: 'Confianza',
      confHigh: 'Alta',
      confMedium: 'Media',
      confLow: 'Baja · Verificar',
      confMissing: 'No encontrado',
      sourceManual: 'Carga manual',
      summaryLowWarning: 'campo(s) con baja confianza para revisar',
      summaryMissingWarning: 'campo(s) de documento no encontrado(s)',
      proceedToQuestionsBtn: 'Continuar a condiciones del contrato',
      questionsTitle: 'Condiciones del contrato',
      questionsSubtitle: 'Estos datos no figuran en los documentos personales. Respondé una pregunta por vez.',
      questionProgress: 'Pregunta',
      questionPrevBtn: 'Anterior',
      questionNextBtn: 'Siguiente',
      questionFinishBtn: 'Ver vista previa del contrato',
      questionSkipBtn: 'Omitir por ahora',
      noDealQuestionsTitle: 'Todos los campos ya fueron completados',
      noDealQuestionsDesc: 'Avanzá para revisar la vista previa oficial del contrato.',
      previewHeader: 'Vista previa oficial del contrato',
      saveDraftBtn: 'Guardar borrador (0 créditos)',
      finalizeBtn: 'Finalizar contrato (-1 crédito)',
      finalizeCostNote: 'Al finalizar se descontará 1 crédito y quedará disponible el enlace de firma.',
      noCreditsTitle: 'Saldo de créditos insuficiente',
      noCreditsDesc: 'No tenés créditos disponibles para finalizar este contrato. Guardalo como borrador o adquirí un paquete.',
      goToCredits: 'Ir a Créditos',
      draftSavedToast: 'Borrador guardado correctamente.',
      finalizedTitle: 'Contrato finalizado con éxito',
      finalizedDesc: 'Se utilizó 1 crédito. Ya podés imprimir en PDF o compartir el enlace de firma con el cliente.',
      signatureLinkLabel: 'Enlace de firma del cliente',
      backToDashboard: 'Volver al panel',
      fixValidationBeforeNext: 'Corregí los campos con validación inválida (CPF/CNPJ, fecha o moneda) antes de continuar.',
      validBadge: 'Válido',
      reviewHighlightedTab: 'Campos resaltados',
      reviewFreeEditTab: 'Editar texto libremente',
      reviewClickFieldHint: 'Hacé clic en cualquier valor resaltado del contrato para editarlo o volver al campo correspondiente.',
      inlineFieldEditTitle: 'Editando campo',
      goToFieldInTable: 'Volver a verificación',
      aiReviewBtn: 'Revisar con IA',
      aiReviewRunning: 'Analizando cláusulas y consistencia...',
      aiReviewPanelTitle: 'Revisión jurídica asistida',
      aiReviewEmpty: 'No se encontraron inconsistencias en los datos y cláusulas verificadas.',
      aiAlertsTitle: 'Alertas detectadas',
      aiClausesTitle: 'Sugerencias de cláusulas (ley local)',
      applyAction: 'Aplicar',
      ignoreAction: 'Ignorar',
      appliedLabel: 'Aplicado',
      generatePdfBtn: 'Generar PDF A4 (-1 crédito)',
      exportDocxBtn: 'Exportar .docx (-1 crédito)',
      exportSuccessDraft: 'Documento generado, 1 crédito utilizado y contrato guardado como Borrador.',
      exportCostNote: 'Al generar PDF o .docx se descuenta 1 crédito y el contrato se guarda como Borrador.',
      sendForSignatureBtn: 'Enviar para firma',
    },
    templates: {
      title: 'Mis plantillas',
      subtitle: 'Subí tu contrato (.docx o .pdf), revisá los campos detectados y reutilizalo cuando quieras.',
      uploadMyTemplateBtn: 'Subir mi plantilla',
      newTemplateBtn: 'Crear en blanco',
      analyzingTitle: 'Analizando tu documento...',
      analyzingSubtitle: 'Extrayendo texto e identificando campos variables (nombres, documentos, montos, fechas y plazos).',
      uploadErrorTitle: 'No se pudo procesar el archivo',
      searchPlaceholder: 'Buscar plantilla por nombre, parte o texto...',
      filterAll: 'Todas',
      catLocacao: 'Alquiler',
      catCompraVenda: 'Compraventa',
      catServicos: 'Servicios',
      catRecibo: 'Recibo',
      catOutros: 'Otros',
      systemBadge: 'Modelo ContratoJá',
      emptyTitle: 'No se encontraron plantillas',
      emptyDesc: 'Subí un archivo .docx o .pdf, o ajustá los filtros de búsqueda.',
      reviewTitleNew: 'Revisar plantilla y campos',
      reviewTitleEdit: 'Editar y revisar plantilla',
      reviewSubtitle: 'Verificá los campos resaltados, renombrá, quitá o seleccioná cualquier fragmento del texto para convertirlo en campo.',
      templateName: 'Nombre de la plantilla',
      category: 'Categoría',
      country: 'País',
      partiesLabel: 'Partes intervinientes (separadas por coma)',
      partiesPlaceholder: 'Ej: Locador, Locatario, Garante',
      templateLanguage: 'Idioma del texto',
      highlightedViewTab: 'Vista con campos resaltados',
      rawEditTab: 'Editar texto y marcar fragmentos',
      selectionHint: 'Tip: seleccioná cualquier palabra o fragmento en el texto de abajo para convertirlo en campo {{variable}}.',
      selectionActionTitle: 'Fragmento seleccionado',
      turnSelectionIntoField: 'Convertir en campo',
      fieldKeyLabel: 'Identificador ({{campo}})',
      fieldLabelLabel: 'Etiqueta legible',
      fieldTypeLabel: 'Tipo de dato',
      fieldPartyLabel: 'Parte',
      fieldsPanelTitle: 'Campos detectados',
      addManualField: 'Agregar campo manual',
      renameFieldBtn: 'Renombrar',
      removeFieldBtn: 'Quitar',
      typeTexto: 'Texto',
      typeCpfCi: 'C.I. / RUC / CPF',
      typeData: 'Fecha',
      typeMoeda: 'Moneda / Monto',
      typeNumero: 'Número',
      typeEndereco: 'Dirección',
      contentHelp: 'Todos los textos entre {{dobles_llaves}} se completarán automáticamente al emitir un contrato.',
      useTemplateBtn: 'Generar contrato',
      saveTemplateBtn: 'Guardar plantilla',
      deleteConfirm: '¿Seguro que querés eliminar esta plantilla?',
      copySuffix: '(Copia)',
    },
    credits: {
      title: 'Créditos y Planes',
      subtitle: 'Adquirí créditos sueltos o mensuales para emitir tus contratos sin complicaciones.',
      currentBalance: 'Tu saldo actual',
      consumptionRule: 'Cada contrato finalizado consume 1 crédito. Los borradores son gratuitos.',
      currencyLabel: 'Moneda de cobro',
      packagesTitle: 'Paquetes disponibles',
      avulsoName: 'Paquete Suelto',
      avulsoAudience: 'Para gestiones puntuales e independientes',
      avulsoDesc: 'Comprá cuando necesites, sin abono mensual y sin vencimiento corto.',
      profissionalName: 'Plan Profesional',
      profissionalAudience: 'Para inmobiliarias y estudios activos',
      profissionalDesc: 'Mejor costo por contrato para equipos con emisión semanal.',
      contractsIncluded: 'contratos',
      perContract: 'por contrato',
      monthlyBadge: '30 contratos/mes',
      oneTimeBadge: '10 contratos sueltos',
      buyBtn: 'Adquirir paquete',
      checkoutTitle: 'Confirmar compra simulada',
      checkoutSimulatedNote: 'Esta es una compra simulada de prueba. Los créditos se suman al instante a tu saldo local.',
      paymentMethod: 'Medio de pago',
      methodPix: 'PIX (Brasil)',
      methodCard: 'Tarjeta de crédito',
      methodTransferPY: 'Transferencia Bancaria / QR (PY)',
      confirmPurchase: 'Confirmar y acreditar ahora',
      purchaseSuccess: '¡Créditos sumados a tu saldo!',
      historyTitle: 'Historial de créditos',
      historyEmpty: 'Sin movimientos registrados.',
    },
    settings: {
      title: 'Ajustes',
      subtitle: 'Actualizá los datos de tu empresa, idioma de la plataforma y respaldo local.',
      companySection: 'Datos de la empresa',
      preferencesSection: 'Idioma y preferencias',
      accountSection: 'Cuenta conectada',
      dataSection: 'Almacenamiento local (pre-Supabase)',
      dataDesc: 'Tus datos se guardan en el navegador mediante services/storage.ts. Exportá un respaldo o restaurá los datos de ejemplo.',
      exportBackup: 'Exportar JSON',
      resetDemo: 'Restaurar datos iniciales',
      resetConfirm: 'Esto reiniciará los datos locales al estado inicial de demostración. ¿Continuar?',
      savedToast: 'Ajustes guardados correctamente.',
      loggedInAs: 'Conectado como',
      retentionSection: 'Retención automática de documentos (Ley 6534)',
      retentionDesc: 'Para cumplir con la Ley 6534 y protección de datos, las fotos y PDFs de los clientes (Cédula, RUC, comprobantes) se eliminan automáticamente tras el plazo definido después de la firma. El contrato firmado y el SHA-256 siguen intactos.',
      retentionToggleLabel: 'Eliminar documentos personales automáticamente tras la firma',
      retentionDaysLabel: 'Plazo de retención (días tras la firma)',
      retentionPreset30: '30 días',
      retentionPreset90: '90 días (estándar)',
      retentionPreset180: '180 días',
      runPurgeNowBtn: 'Verificar y limpiar vencidos ahora',
      purgeResultMsg: 'documento(s) vencido(s) eliminado(s) de forma segura.',
    },
    contractDetail: {
      title: 'Detalle del contrato',
      statusLabel: 'Estado',
      attachmentsTitle: 'Documentos adjuntos del cliente',
      noAttachments: 'No hay documentos adjuntos en este contrato.',
      attachmentsPurgedNotice: 'Documentos personales eliminados automáticamente por política de retención. El PDF firmado y el hash SHA-256 siguen vigentes.',
      signatureSection: 'Firmantes y enlaces de firma',
      markAsSignedBtn: 'Confirmar firma recibida',
      deleteBtn: 'Eliminar registro',
      downloadFinalPdfBtn: 'Descargar PDF A4',
      downloadDocxBtn: 'Descargar .docx',
      sendForSignatureAction: 'Enviar para firma',
      timelineTitle: 'Línea de tiempo del contrato',
      timelineCreated: 'Contrato creado',
      timelineApprovalRequested: 'Aprobación legal solicitada',
      timelineApproved: 'Aprobado por Legales',
      timelineRejected: 'Devuelto por Legales',
      timelineSent: 'Enviado para firma',
      timelineViewed: 'Visualizado por',
      timelineSigned: 'Firmado por',
      timelineCompleted: 'Todas las firmas completadas · Comprobante SHA-256 generado',
      timelineDocumentsPurged: 'Documentos personales del cliente eliminados (política de retención)',
      certificateShaTitle: 'Autenticidad & Hash SHA-256',
      verifyOnlineBtn: 'Verificar autenticidad',
      legalApprovalTitle: 'Revisión de Legales',
      legalPending: 'Pendiente de aprobación legal',
      legalApproved: 'Aprobado por Legales',
      legalRejected: 'Ajustes solicitados por Legales',
      requestApprovalBtn: 'Solicitar aprobación',
      approveNowBtn: 'Aprobar para envío',
      rejectNowBtn: 'Devolver con nota',
      rejectReasonPlaceholder: 'Describí el ajuste requerido...',
      expirationSectionTitle: 'Vigencia y reajuste',
      extractExpirationBtn: 'Analizar vencimiento con IA',
      renewContractBtn: 'Renovar contrato',
    },
    vault: {
      title: 'Bóveda de Contratos',
      subtitle: 'Buscá contratos firmados y archivados por nombre, C.I./RUC/CPF, dirección del inmueble o período.',
      searchPlaceholder: 'Buscar por nombre, C.I./RUC/CPF, dirección del inmueble o código...',
      filterStatusLabel: 'Estado',
      filterCategoryLabel: 'Categoría',
      filterPeriodLabel: 'Período',
      periodAll: 'Todo el período',
      period7d: 'Últimos 7 días',
      period30d: 'Últimos 30 días',
      period90d: 'Últimos 90 días',
      periodCustom: 'Personalizado',
      dateFrom: 'Desde',
      dateTo: 'Hasta',
      emptyTitle: 'No se encontraron contratos en la Bóveda',
      emptyDesc: 'Ajustá los filtros de búsqueda, estado o período para ver otros registros.',
      propertyAddressLabel: 'Inmueble',
      brokerLabel: 'Responsable',
      purgedBadge: 'Docs eliminados',
      resultsCount: 'contrato(s)',
    },
    expirations: {
      title: 'Próximos Vencimientos',
      subtitle: 'La IA detecta la fecha de fin, índice (IPC/IGP-M/IPCA) y fecha de reajuste para renovar a tiempo.',
      alert7d: 'Crítico · hasta 7 días',
      alert30d: 'Atención · hasta 30 días',
      alert60d: 'Planificación · hasta 60 días',
      alertAllUpcoming: 'Todos con vigencia detectada',
      daysLeftSuffix: 'días restantes',
      expiredLabel: 'Vencido',
      endDateLabel: 'Fin del contrato',
      adjustmentIndexLabel: 'Índice de reajuste',
      adjustmentDateLabel: 'Fecha de reajuste',
      analyzeAllAiBtn: 'Analizar pendientes con IA',
      analyzingBtn: 'Analizando con IA...',
      analyzeOneBtn: 'Extraer fechas con IA',
      renewBtn: 'Renovar',
      noExpirationsTitle: 'Sin vencimientos en esta ventana',
      noExpirationsDesc: 'Los contratos activos con vencimiento o reajuste dentro de este filtro aparecerán aquí.',
      unmappedTitle: 'Contratos sin vigencia analizada',
      unmappedDesc: 'Ejecutá la extracción con IA para identificar automáticamente término, índice y fecha de reajuste.',
    },
    team: {
      title: 'Equipo y Permisos',
      subtitle: 'Invitá corredores y legales, controlá el acceso por rol y exigí aprobación legal antes del envío.',
      roleAdmin: 'Admin',
      roleAdminDesc: 'Acceso total a contratos, equipo, créditos y ajustes.',
      roleCorretor: 'Corredor',
      roleCorretorDesc: 'Ve y gestiona únicamente sus propios contratos creados.',
      roleJuridico: 'Legales',
      roleJuridicoDesc: 'Revisa y aprueba o devuelve contratos antes de enviarlos para firma.',
      inviteTitle: 'Invitar miembro al equipo',
      inviteNameLabel: 'Nombre completo',
      inviteEmailLabel: 'Correo profesional',
      inviteRoleLabel: 'Rol en el equipo',
      inviteBtn: 'Enviar invitación',
      membersListTitle: 'Miembros del equipo',
      activeSessionLabel: 'Perfil activo en el panel',
      switchPerspectiveHint: 'Cambiá de usuario abajo para probar la vista limitada del Corredor o la bandeja de Legales:',
      useThisMemberBtn: 'Simular vista',
      activeBadge: 'Activo ahora',
      invitedBadge: 'Invitado',
      legalGateTitle: 'Exigir aprobación de Legales antes de enviar para firma',
      legalGateDesc: 'Al activarlo, ningún contrato podrá generar enlaces de firma sin aprobación previa de Legales o Admin.',
      approvalQueueTitle: 'Bandeja de aprobación de Legales',
      approvalQueueEmpty: 'No hay contratos pendientes de revisión legal por el momento.',
      approveBtn: 'Aprobar',
      rejectBtn: 'Devolver',
      rejectPromptLabel: 'Motivo de devolución:',
      corretorScopedBanner: 'Vista de Corredor activa: mostrando únicamente los contratos creados por vos.',
    },
    reports: {
      title: 'Reportes de Gestión',
      subtitle: 'Controlá el volumen mensual, desempeño por corredor, tiempo promedio hasta la firma y créditos usados.',
      kpiTotalContracts: 'Contratos en el período',
      kpiSignedContracts: 'Contratos firmados',
      kpiAvgSignTime: 'Tiempo promedio hasta firma',
      kpiCreditsUsed: 'Créditos utilizados',
      hoursSuffix: 'h',
      daysSuffix: 'd',
      noDataDash: '—',
      monthlyChartTitle: 'Contratos emitidos por mes',
      byBrokerTitle: 'Desempeño por corredor / responsable',
      byCategoryTitle: 'Distribución por categoría',
      brokerCol: 'Responsable',
      totalCol: 'Emitidos',
      signedCol: 'Firmados',
      conversionCol: 'Tasa de firma',
      exportCsvBtn: 'Exportar CSV',
    },
    clauseLibrary: {
      tabTemplates: 'Plantillas de la empresa',
      tabLibrary: 'Biblioteca de cláusulas',
      shareCheckboxLabel: 'Compartir anónimamente en la biblioteca ContratoJá (+2 créditos)',
      shareCheckboxDesc: 'Antes de publicar, nuestra IA elimina automáticamente todos los nombres, documentos, direcciones y montos.',
      alreadySharedBadge: 'Compartida (+2 créditos acreditados)',
      sharedSuccessToast: '¡Cláusulas anonimizadas publicadas! Ganaste +2 créditos.',
      anonymizingNotice: 'Anonimizando datos sensibles y extrayendo cláusulas...',
      libraryTitle: 'Biblioteca Colaborativa de Cláusulas',
      librarySubtitle: 'Cláusulas revisadas y 100% anonimizadas por la comunidad para fortalecer tus contratos.',
      libraryEmpty: 'No hay cláusulas disponibles en esta categoría.',
      reviewSectionTitle: 'Cláusulas de la Biblioteca ContratoJá',
      reviewSectionHint: 'Cláusulas listas y anonimizadas compatibles con este tipo de contrato.',
      insertClauseBtn: 'Aplicar',
    },
    signatureFlow: {
      modalTitle: 'Enviar contrato para firma',
      modalSubtitle: 'Definí los firmantes, el orden de firma y si se exige selfie con documento.',
      signersTitle: 'Firmantes',
      addSignerBtn: 'Agregar firmante',
      signerRoleLabel: 'Rol (ej: Locatario, Garante)',
      signerNameLabel: 'Nombre y apellido',
      signerDocLabel: 'C.I. / RUC / CPF',
      signerWhatsappLabel: 'WhatsApp',
      signingOrderLabel: 'Orden de las firmas',
      orderParallel: 'Todos al mismo tiempo',
      orderParallelDesc: 'Cada firmante puede firmar apenas reciba su enlace.',
      orderSequential: 'En secuencia',
      orderSequentialDesc: 'El siguiente firmante solo puede firmar cuando el anterior haya completado.',
      requireSelfieLabel: 'Exigir selfie con documento',
      requireSelfieDesc: 'El firmante deberá sacar una foto con la cámara sosteniendo su documento.',
      confirmSendBtn: 'Generar enlaces y enviar para firma',
      linksReadyTitle: 'Enlaces únicos generados por firmante',
      linksReadyDesc: 'Compartí el enlace individual por WhatsApp o copialo para enviarlo al cliente.',
      sendWhatsappBtn: 'Enviar por WhatsApp',
      openSignPageBtn: 'Abrir página',
      validationError: 'Completá nombre y documento de todos los firmantes antes de continuar.',
      statusSigned: 'Firmado',
      statusPending: 'Pendiente',
      orderStepPrefix: 'Orden',
      finishDoneBtn: 'Finalizar y volver al panel',
    },
    publicSign: {
      pageBadge: 'Firma Electrónica · Acceso sin registro',
      notFoundTitle: 'Enlace de firma inválido o vencido',
      notFoundDesc: 'No encontramos este documento o token en este navegador. Consultá con la empresa emisora.',
      goHomeBtn: 'Ir a ContratoJá',
      blockedTitle: 'Esperando firma anterior',
      blockedDesc: 'Este contrato sigue un orden secuencial. Debés aguardar la firma de:',
      alreadySignedTitle: 'Tu firma ya fue registrada',
      alreadySignedDesc: '¡Gracias! Registramos tu firma electrónica con fecha, hora y dispositivo.',
      readContractTitle: 'Leé el contrato completo',
      scrollPrompt: 'Desplazate hasta el final del documento para habilitar la firma.',
      scrollCompleted: 'Lectura completa confirmada. Ya podés firmar abajo.',
      scrollToEndBtn: 'Ir al final del texto',
      signerDataTitle: 'Tus datos y firma',
      nameLabel: 'Nombre completo del firmante',
      documentLabel: 'Documento (C.I. / RUC / CPF)',
      drawSignatureLabel: 'Firmá con el dedo o mouse en el recuadro',
      drawSignatureHint: 'Dibujá tu firma dentro del área punteada.',
      clearSignatureBtn: 'Limpiar firma',
      selfieRequiredLabel: 'Selfie con documento (obligatoria)',
      selfieOptionalLabel: 'Selfie con documento (opcional por cámara)',
      takeSelfieBtn: 'Sacar selfie con cámara',
      retakeSelfieBtn: 'Sacar otra foto',
      cameraPreviewHint: 'Sostené tu documento junto al rostro en un lugar iluminado.',
      consentCheckbox: 'Leí y acepto íntegramente todas las cláusulas de este contrato y autorizo el registro electrónico de mi firma.',
      submitSignBtn: 'Confirmar y firmar contrato',
      submittingBtn: 'Registrando firma y SHA-256...',
      errorScrollRequired: 'Desplazá el contrato hasta el final antes de confirmar la firma.',
      errorSignatureRequired: 'Dibujá tu firma en el recuadro de arriba.',
      errorSelfieRequired: 'Este contrato exige una selfie por cámara antes de finalizar.',
      errorFieldsRequired: 'Completá tu nombre y documento y marcá "Leí y acepto".',
      successTitle: 'Firma registrada con éxito',
      successAllDoneDesc: '¡Todos los firmantes completaron el proceso! Ya podés descargar el PDF final con Comprobante SHA-256 y QR.',
      successPartialDesc: 'Tu firma quedó registrada en la línea de tiempo. Aguardando a los demás firmantes.',
      downloadSignedPdfBtn: 'Descargar PDF final + Comprobante',
      verifyDocumentBtn: 'Verificar autenticidad (/verificar)',
      auditCapturedLabel: 'Evidencia técnica capturada automáticamente:',
    },
    publicVerify: {
      navTitle: 'Verificar documento',
      title: 'Verificación de Autenticidad',
      subtitle: 'Pegá el código del contrato, el hash SHA-256 o escaneá el código QR del Comprobante de Firma Electrónica.',
      inputLabel: 'Código del contrato o Hash SHA-256',
      inputPlaceholder: 'Ej: CJ-2026-002 o hash SHA-256 de 64 caracteres...',
      verifyBtn: 'Verificar documento',
      scanQrCameraBtn: 'Escanear QR con cámara',
      stopCameraBtn: 'Cerrar cámara',
      uploadQrImageBtn: 'Subir foto del QR Code',
      qrError: 'No se pudo iniciar la cámara o detectar un código QR válido en la imagen.',
      authenticBadge: 'Documento Auténtico e Íntegro',
      authenticDesc: 'El hash criptográfico SHA-256 coincide exactamente con el documento registrado y las firmas son válidas.',
      pendingBadge: 'Documento localizado (esperando firmas)',
      pendingDesc: 'Este contrato todavía tiene firmas electrónicas pendientes.',
      notFoundTitle: 'Documento no encontrado o inválido',
      notFoundDesc: 'No se encontró ningún registro que coincida con el código o hash ingresado.',
      hashLabel: 'Hash SHA-256 verificado (Web Crypto)',
      signersSectionTitle: 'Firmantes y evidencias técnicas',
      downloadPdfBtn: 'Descargar PDF con Comprobante',
      backToAppBtn: 'Volver a ContratoJá',
    },
  },
};
