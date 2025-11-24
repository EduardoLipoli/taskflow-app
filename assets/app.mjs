import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInAnonymously,
  signInWithCustomToken,
  setPersistence,
  browserSessionPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  setDoc,
  getDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  writeBatch,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Diagnostic wrapper: detect addEventListener/removeEventListener calls where the
// listener argument is undefined or not callable. This helps find places that
// accidentally pass options as the second argument or otherwise register an
// invalid listener (which leads to errors like "reading 'handleEvent'").
(function () {
  try {
    const origAdd = EventTarget.prototype.addEventListener;
    const origRemove = EventTarget.prototype.removeEventListener;

    EventTarget.prototype.addEventListener = function (
      type,
      listener,
      options
    ) {
      try {
        if (typeof listener === "undefined" || listener === null) {
          console.warn(
            "DIAG: addEventListener called with undefined/null listener",
            { target: this, type, options }
          );
          try {
            console.trace();
          } catch (_) {}
          window.__diag_bad_listeners = window.__diag_bad_listeners || [];
          window.__diag_bad_listeners.push({
            when: Date.now(),
            action: "add",
            type,
            options,
            stack: new Error().stack,
          });
        } else if (
          typeof listener !== "function" &&
          !(
            typeof listener === "object" &&
            typeof listener.handleEvent === "function"
          )
        ) {
          // listener is neither a function nor an object with handleEvent
          console.warn(
            "DIAG: addEventListener listener is not function and lacks handleEvent",
            { target: this, type, listener, options }
          );
          try {
            console.trace();
          } catch (_) {}
          window.__diag_bad_listeners = window.__diag_bad_listeners || [];
          window.__diag_bad_listeners.push({
            when: Date.now(),
            action: "add_invalid",
            type,
            listener,
            options,
            stack: new Error().stack,
          });
        }
      } catch (err) {
        // swallow
      }
      return origAdd.call(this, type, listener, options);
    };

    EventTarget.prototype.removeEventListener = function (
      type,
      listener,
      options
    ) {
      try {
        if (typeof listener === "undefined" || listener === null) {
          console.warn(
            "DIAG: removeEventListener called with undefined/null listener",
            { target: this, type, options }
          );
          try {
            console.trace();
          } catch (_) {}
          window.__diag_bad_listeners = window.__diag_bad_listeners || [];
          window.__diag_bad_listeners.push({
            when: Date.now(),
            action: "remove",
            type,
            options,
            stack: new Error().stack,
          });
        }
      } catch (err) {}
      return origRemove.call(this, type, listener, options);
    };
  } catch (err) {
    // If environment doesn't allow monkey-patching, ignore
    console.warn("DIAG: failed to install event listener diagnostics", err);
  }
})();

const firebaseConfig = {
  apiKey: "AIzaSyBBs28oaIKr-R1ojWPItgv0aJOnnRT1bGM",
  authDomain: "faculdade-ead-ads.firebaseapp.com",
  projectId: "faculdade-ead-ads",
  storageBucket: "faculdade-ead-ads.firebasestorage.app",
  messagingSenderId: "874731969810",
  appId: "1:874731969810:web:094effbc83313df7f4a7cb",
};

let app, auth, db, userId, calendar;
let unsubscribeTasks, unsubscribeAgency, unsubscribeSubjects;
let unsubscribeFocusHistory;
let allTasks = [];
let allProjects = [];
let allSubjects = [];
let allAgencyProspects = [];
let unsubscribeAgencyProspects;
let currentAgencyTab = "projects";
const prospectsPerPage = 8; // Novo
let currentProspectPage = 1; // Novo
let currentProspectFilter = "todos"; // Novo
let currentProspectSearch = ""; // Novo
let currentProspectSort = "createdAt"; // Novo

let allNotifications = [];
let unsubscribeNotifications;

let currentPage = 1;
const itemsPerPage = 8;
let currentSort = "createdAt";

let unsubscribeProjectTasks = {};
let currentProjectId = null;
let currentSubjectId = null;
let unsubscribeSubjectItems = {};

let allProjectTasks = {};
let allSubjectTasks = {};
let currentDefaultTitle = document.title;

let modalResolve = null;
let automationRunning = false;
let alarmAudioContext;
let sentAlarmsForToday = [];

let allAgencyClients = [];
let allAgencyTransactions = [];
let unsubscribeAgencyClients, unsubscribeAgencyTransactions;
let currentFinanceDate = new Date();
let agencyChartInstance;
let currentChartType = "Receitas vs Despesas";
let currentFinanceFilter = "month"; // 'month', '3-months', 'year'

// 💡 SUBTITUÍDO: Novas músicas (exemplo) e variáveis do player
const musicTracks = [
  {
    id: "ambient1",
    title: "Ambient 1",
    artist: "Focus Mix",
    src: "assets/musics/ambient1.mp3",
  },
  {
    id: "ambient2",
    title: "Ambient 2",
    artist: "Focus Mix",
    src: "assets/musics/ambient2.mp3",
  },
  {
    id: "ambient3",
    title: "Ambient 3",
    artist: "Focus Mix",
    src: "assets/musics/ambient3.mp3",
  },
  {
    id: "forest1",
    title: "Forest",
    artist: "Nature",
    src: "assets/musics/forest1.mp3",
  },
  {
    id: "lofi2",
    title: "Lofi 2",
    artist: "Chill Beats",
    src: "assets/musics/lofi2.mp3",
  },
  {
    id: "lofi4",
    title: "Lofi 4",
    artist: "Chill Beats",
    src: "assets/musics/lofi4.mp3",
  },
  {
    id: "trap4",
    title: "Trap 4",
    artist: "Focus Mix",
    src: "assets/musics/trap4.mp3",
  },
];

let currentTrackIndex = 0;
let audioContext; // Contexto de áudio global
let currentAudioSource; // Fonte de áudio atualmente tocando
let currentAudioBuffer; // Buffer da música carregada
let isPlaying = false;
let startTime = 0; // Quando a música começou a tocar
let currentPlaybackTime = 0; // Posição atual na faixa (para pause/play)
let animationFrameId; // Para a atualização da barra de progresso

const COLORS = {
  bgPrimary: "bg-zinc-900",
  bgSecondary: "bg-zinc-800",
  bgCard: "bg-zinc-700",
  textPrimary: "text-zinc-100",
  textSecondary: "text-zinc-400",
  accent: "text-blue-500",
};

const scheduleTimeSlots = ["19:00 - 20:10", "20:20 - 21:10", "21:20 - 22:00"];
const scheduleDays = ["seg", "ter", "qua", "qui", "sex"];
const scheduleDayLabels = {
  seg: "Segunda",
  ter: "Terça",
  qua: "Quarta",
  qui: "Quinta",
  sex: "Sexta",
};
const dayOfWeekMap = {
  0: "dom",
  1: "seg",
  2: "ter",
  3: "qua",
  4: "qui",
  5: "sex",
  6: "sab",
};

const subjectColorPalette = [
  { bg: "bg-purple-600", hover: "hover:bg-purple-500" },
  { bg: "bg-blue-600", hover: "hover:bg-blue-500" },
  { bg: "bg-green-600", hover: "hover:bg-green-500" },
  { bg: "bg-red-600", hover: "hover:bg-red-500" },
  { bg: "bg-yellow-600", hover: "hover:bg-yellow-500" },
  { bg: "bg-indigo-600", hover: "hover:bg-indigo-500" },
  { bg: "bg-pink-600", hover: "hover:bg-pink-500" },
];

document.addEventListener("DOMContentLoaded", initApp);

async function initApp() {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    setupUIEventListeners();

    onAuthStateChanged(auth, async (user) => {
      const loadingScreen = document.getElementById("loading-screen");
      const loginScreen = document.getElementById("login-screen");
      const appWrapper = document.getElementById("app-wrapper");

      if (user) {
        userId = user.uid;

        document.getElementById("user-email-display").textContent =
          user.email || "Usuário Anônimo";
        document.getElementById("user-email-display").title =
          user.email || "Usuário Anônimo";
        document.getElementById(
          "user-id-display"
        ).textContent = `ID: ${userId.substring(0, 10)}...`;

        loginScreen.classList.add("hidden");
        loadingScreen.classList.remove("hidden");

        await updateUserStreak();

        // Função requestNotificationPermission removida daqui
        // para ser acessível pelo setupUIEventListeners e
        // para evitar a solicitação automática no iOS.

        await loadInitialData();
        if (window.classAlarmInterval) clearInterval(window.classAlarmInterval);
        window.classAlarmInterval = setInterval(checkClassAlarms, 60000);
        loadingScreen.classList.add("hidden");
        appWrapper.classList.remove("hidden");
        appWrapper.classList.add("flex");

        // TRECHO NOVO (Coloque isso no lugar):
        const lastPage = localStorage.getItem("lastPage") || "dashboard";
        const lastProjectId = localStorage.getItem("lastProjectId");
        const lastSubjectId = localStorage.getItem("lastSubjectId");

        if (lastPage === "project-detail" && lastProjectId) {
          // Verifica se o projeto ainda existe antes de tentar abrir
          const projectExists = allProjects.find((p) => p.id === lastProjectId);
          if (projectExists) {
            showProjectDetailPage(lastProjectId);
          } else {
            showPage("agency"); // Se foi excluído, volta para a lista
          }
        } else if (lastPage === "subject-detail" && lastSubjectId) {
          // Verifica se a disciplina ainda existe
          const subjectExists = allSubjects.find((s) => s.id === lastSubjectId);
          if (subjectExists) {
            showSubjectDetailPage(lastSubjectId);
          } else {
            showPage("college"); // Se foi excluída, volta para a lista
          }
        } else {
          // Abre a página normal (tasks, calendar, dashboard, etc)
          showPage(lastPage);
        }

        if (typeof lucide !== "undefined") {
          lucide.createIcons();
        }
      } else {
        if (window.classAlarmInterval) clearInterval(window.classAlarmInterval);
        userId = null;
        if (unsubscribeTasks) unsubscribeTasks();
        if (unsubscribeAgency) unsubscribeAgency();
        if (unsubscribeSubjects) unsubscribeSubjects();
        if (unsubscribeProjectTasks)
          Object.values(unsubscribeProjectTasks).forEach((unsub) => unsub());
        if (unsubscribeFocusHistory) unsubscribeFocusHistory();
        clearSubjectListeners();

        loadingScreen.classList.add("hidden");
        appWrapper.classList.add("hidden");
        appWrapper.classList.remove("flex");
        loginScreen.classList.remove("hidden");
      }
    });
  } catch (error) {
    console.error("Erro na inicialização:", error);
    const loadingScreen = document.getElementById("loading-screen");
    if (loadingScreen) {
      loadingScreen.innerHTML = `<div class="p-4 text-center">
                        <p class="text-2xl font-bold text-red-500 mb-4">Erro na Inicialização</p>
                        <p class="text-zinc-300 mb-2">Ocorreu um erro ao carregar o aplicativo.</p>
                        <p class="text-sm text-zinc-500 font-mono bg-zinc-800 p-2 rounded">${error.message}</p>
                        <p class="text-zinc-400 mt-4">Por favor, verifique o console (F12) para mais detalhes e atualize a página.</p>
                     </div>`;
    }
    console.error("Erro detalhado:", error.stack);
  }
}

// NOVO: Função movida para o escopo global
async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      document
        .getElementById("notification-permission-banner")
        ?.classList.add("hidden");
      showModal(
        "Sucesso",
        "Notificações ativadas! Você receberá alertas de tarefas e Pomodoro."
      );
    } else {
      showModal(
        "Atenção",
        "Permissão de notificação negada. Você não receberá alertas importantes."
      );
    }
  } catch (err) {
    console.error("Erro ao solicitar permissão de notificação:", err);
    showModal("Erro", "Não foi possível solicitar a permissão de notificação.");
  }
}

function setupUIEventListeners() {
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      showPage(e.currentTarget.dataset.page);
      closeMobileMenu();
    });
  });

  document
    .getElementById("btn-logout")
    .addEventListener("click", () => signOut(auth));
  document
    .getElementById("btn-google-login")
    .addEventListener("click", signInWithGoogle);
  document
    .getElementById("form-email-login")
    .addEventListener("submit", handleEmailLogin);
  document
    .getElementById("form-email-signup")
    .addEventListener("submit", handleEmailSignup);
  document
    .getElementById("btn-show-signup")
    .addEventListener("click", () => toggleAuthForms(false));
  document
    .getElementById("btn-show-login")
    .addEventListener("click", () => toggleAuthForms(true));

  document
    .getElementById("btn-open-mobile-menu")
    .addEventListener("click", openMobileMenu);
  document
    .getElementById("btn-close-mobile-menu")
    .addEventListener("click", closeMobileMenu);
  document
    .getElementById("mobile-menu-overlay")
    .addEventListener("click", closeMobileMenu);

  document.getElementById('btn-show-import-topics-modal').addEventListener('click', showImportTopicsForm);

  const btnRequestNotif = document.getElementById(
    "btn-request-notification-permission"
  );
  if (btnRequestNotif) {
    btnRequestNotif.addEventListener("click", requestNotificationPermission);
  }

  const notifPanel = document.getElementById("notification-panel");
  const notifButton = document.getElementById("btn-toggle-notifications");

  notifButton.addEventListener("click", (e) => {
    e.stopPropagation();
    notifPanel.classList.toggle("hidden");
  });

  document
    .getElementById("btn-mark-all-read")
    .addEventListener("click", (e) => {
      e.stopPropagation();
      handleMarkAllRead();
    });

  document.addEventListener("click", (e) => {
    if (
      !notifPanel.classList.contains("hidden") &&
      !notifPanel.contains(e.target) &&
      !notifButton.contains(e.target)
    ) {
      notifPanel.classList.add("hidden");
    }
  });

  document
    .getElementById("modal-btn-cancel")
    .addEventListener("click", () => closeModal(false));
  document
    .getElementById("modal-btn-confirm")
    .addEventListener("click", () => closeModal(true));
  document
    .getElementById("btn-close-slide-over")
    .addEventListener("click", closeSlideOver);
  document
    .getElementById("slide-over-overlay")
    .addEventListener("click", closeSlideOver);

  document
    .getElementById("btn-show-add-task-modal")
    .addEventListener("click", showAddTaskForm);
  document
    .getElementById("btn-show-add-project-modal")
    .addEventListener("click", showAddProjectForm);

  const prospectView = document.getElementById("agency-prospects-view");
  if (prospectView) {
    // Botão principal "Novo Prospect"
    prospectView
      .querySelector("#btn-show-add-prospect-modal")
      .addEventListener("click", () => showAddProspectForm());

    // Filtros Rápidos
    prospectView
      .querySelector("#prospects-quick-filters")
      .addEventListener("click", (e) => {
        const button = e.target.closest("button");
        if (button && button.dataset.filter) {
          setProspectFilter(button, button.dataset.filter);
        }
      });

    // Busca
    prospectView
      .querySelector("#prospect-search-input")
      .addEventListener("keyup", (e) => {
        currentProspectSearch = e.target.value.toLowerCase();
        renderProspectsPage(); // Renderiza com o novo filtro de busca
      });

    // Ordenação
    prospectView
      .querySelector("#prospect-sort-select")
      .addEventListener("change", (e) => {
        currentProspectSort = e.target.value;
        renderProspectsPage(); // Renderiza com a nova ordenação
      });

    // Paginação
    prospectView
      .querySelector("#prospect-pagination-prev")
      .addEventListener("click", () => changeProspectPage(-1));
    prospectView
      .querySelector("#prospect-pagination-next")
      .addEventListener("click", () => changeProspectPage(1));
  }

  document
    .getElementById("agency-sort-select")
    .addEventListener("change", (e) => {
      currentSort = e.target.value;
      currentPage = 1;
      renderAgencyTable(allProjects);
    });

  document.getElementById("btn-agency-prev").addEventListener("click", () => {
    changeAgencyPage(-1);
  });

  document.getElementById("btn-agency-next").addEventListener("click", () => {
    changeAgencyPage(1);
  });

  document
    .getElementById("btn-tab-agency-projects")
    .addEventListener("click", () => showAgencyTab("projects"));
  document
    .getElementById("btn-tab-agency-prospects")
    .addEventListener("click", () => showAgencyTab("prospects"));
  document
    .getElementById("btn-show-add-prospect-modal")
    .addEventListener("click", showAddProspectForm);

  document
    .getElementById("btn-back-to-agency")
    .addEventListener("click", () => showPage("agency"));
  document
    .getElementById("btn-show-add-project-task-modal")
    .addEventListener("click", showAddProjectTaskForm);

  document
    .getElementById("btn-edit-project-detail")
    .addEventListener("click", () => {
      if (currentProjectId) {
        showProjectDetails(currentProjectId); // Reutiliza a função de edição
      }
    });

  const btnFinancePrevMonth = document.getElementById("btn-finance-prev-month");
  if (btnFinancePrevMonth) {
    // Adiciona verificação para caso a página não esteja carregada
    btnFinancePrevMonth.addEventListener("click", () => changeFinanceMonth(-1));
    document
      .getElementById("btn-finance-next-month")
      .addEventListener("click", () => changeFinanceMonth(1));
    document
      .getElementById("btn-show-add-transaction-modal")
      .addEventListener("click", () => {
        showAddTransactionForm(); // Chama a função sem argumentos
      });
    document
      .getElementById("btn-show-manage-clients-modal")
      .addEventListener("click", () => {
        showManageClientsForm();
      });
    const chartSelect = document
      .querySelector("#agencyFinanceChart")
      ?.closest(".bg-zinc-800")
      .querySelector("select");
    if (chartSelect) {
      chartSelect.addEventListener("change", (e) => {
        currentChartType = e.target.value;
        // Apenas renderiza o gráfico novamente, não a página inteira
        renderFinanceCharts(allAgencyTransactions);
      });
    }
  }

  const periodSelect = document.getElementById("finance-period-select");
  if (periodSelect) {
    periodSelect.addEventListener("change", (e) => {
      currentFinanceFilter = e.target.value;

      // Esconde o seletor de mês se o filtro não for "month"
      document
        .getElementById("finance-month-navigator")
        .classList.toggle("hidden", currentFinanceFilter !== "month");

      // Re-renderiza a página com o novo período
      renderFinancePage();
    });
  }

  document
    .getElementById("form-add-subject")
    .addEventListener("submit", handleAddSubject);
  document
    .getElementById("btn-back-to-college")
    .addEventListener("click", () => showPage("college"));

  document
    .getElementById("form-add-subject-topic")
    .addEventListener("submit", handleAddSubjectTopic);
  document
    .getElementById("form-add-subject-live-class")
    .addEventListener("submit", handleAddSubjectLiveClass);
  document
    .getElementById("btn-show-add-subject-task-modal")
    .addEventListener("click", showAddSubjectTaskForm);
  document
    .getElementById("form-save-subject-schedule")
    .addEventListener("submit", handleSaveSubjectSchedule);

  document
    .getElementById("pomodoro-start")
    .addEventListener("click", () => pomodoro.start());
  document
    .getElementById("pomodoro-reset")
    .addEventListener("click", () => pomodoro.reset());
  document
    .getElementById("pomodoro-mode-focus")
    .addEventListener("click", () => pomodoro.setMode("focus"));
  document
    .getElementById("pomodoro-mode-short")
    .addEventListener("click", () => pomodoro.setMode("short"));
  document
    .getElementById("pomodoro-mode-long")
    .addEventListener("click", () => pomodoro.setMode("long"));

  document
    .getElementById("btn-toggle-focus-mode")
    .addEventListener("click", toggleFocusMode);
  document
    .getElementById("btn-exit-focus-mode")
    .addEventListener("click", toggleFocusMode);
  document
    .getElementById("pomodoro-start-focus")
    .addEventListener("click", () => pomodoro.start());
  document
    .getElementById("pomodoro-reset-focus")
    .addEventListener("click", () => pomodoro.reset());
  document
    .getElementById("player-toggle-play")
    .addEventListener("click", togglePlayPause);
  document
    .getElementById("player-next-track")
    .addEventListener("click", nextTrack);
  document
    .getElementById("player-prev-track")
    .addEventListener("click", previousTrack);

  loadTrack(currentTrackIndex);

  document.getElementById("bg-selector").addEventListener("click", (e) => {
    const button = e.target.closest(".bg-selector-btn");
    if (button && button.dataset.bg) {
      setFocusBackground(button.dataset.bg);
    }
  });
}

function toggleAuthForms(showLogin) {
  document.getElementById("login-form").classList.toggle("hidden", !showLogin);
  document.getElementById("signup-form").classList.toggle("hidden", showLogin);
}

async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const rememberMe = document.getElementById("login-remember-me").checked;
  const persistence = rememberMe
    ? browserLocalPersistence
    : browserSessionPersistence;
  try {
    await setPersistence(auth, persistence);
    await signInWithPopup(auth, provider);
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Erro no login com Google:", error);
    showModal("Erro de Login", error.message);
  }
}

async function handleEmailLogin(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const pass = document.getElementById("login-password").value;
  const rememberMe = document.getElementById("login-remember-me").checked;
  const persistence = rememberMe
    ? browserLocalPersistence
    : browserSessionPersistence;
  try {
    await setPersistence(auth, persistence);
    await signInWithEmailAndPassword(auth, email, pass);
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (error) {
    console.error("Erro no login com email:", error);
    showModal("Erro de Login", "Email ou senha inválidos.");
  }
}

async function handleEmailSignup(e) {
  e.preventDefault();
  const email = document.getElementById("signup-email").value;
  const pass = document.getElementById("signup-password").value;
  try {
    await createUserWithEmailAndPassword(auth, email, pass);
  } catch (error) {
    console.error("Erro no cadastro com email:", error);
    showModal("Erro de Cadastro", error.message);
  }
}

function changeAgencyPage(direction) {
  const totalProjects = allProjects.length;
  const totalPages = Math.ceil(totalProjects / itemsPerPage) || 1;

  currentPage += direction;

  if (currentPage < 1) {
    currentPage = 1;
  }
  if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  renderAgencyTable(allProjects);
}

function getBasePath() {
  return `users/${userId}`;
}

async function addNotification(text, type = "info") {
  if (!userId) return;
  try {
    await addDoc(getNotificationsCollection(), {
      text: text,
      type: type,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Erro ao adicionar notificação:", error);
  }
}

const getNotificationsCollection = () =>
  collection(db, `${getBasePath()}/notifications`);
const getNotificationDoc = (id) =>
  doc(db, `${getBasePath()}/notifications/${id}`);

const getTasksCollection = () => collection(db, `${getBasePath()}/tasks`);
const getTaskDoc = (id) => doc(db, `${getBasePath()}/tasks/${id}`);

const getAgencyCollection = () =>
  collection(db, `${getBasePath()}/agencyProjects`);
const getAgencyDoc = (id) => doc(db, `${getBasePath()}/agencyProjects/${id}`);
const getAgencyProspectsCollection = () =>
  collection(db, `${getBasePath()}/agencyProspects`);
const getAgencyProspectDoc = (id) =>
  doc(db, `${getBasePath()}/agencyProspects/${id}`);

const getAgencyClientsCollection = () =>
  collection(db, `${getBasePath()}/agencyClients`);
const getAgencyClientDoc = (id) =>
  doc(db, `${getBasePath()}/agencyClients/${id}`);
const getAgencyTransactionsCollection = () =>
  collection(db, `${getBasePath()}/agencyTransactions`);
const getAgencyTransactionDoc = (id) =>
  doc(db, `${getBasePath()}/agencyTransactions/${id}`);

const getProjectTasksCollection = (projectId) =>
  collection(db, `${getAgencyDoc(projectId).path}/tasks`);
const getProjectTaskDoc = (projectId, taskId) =>
  doc(db, `${getAgencyDoc(projectId).path}/tasks/${taskId}`);

const getSubjectsCollection = () => collection(db, `${getBasePath()}/subjects`);
const getSubjectDoc = (id) => doc(db, `${getBasePath()}/subjects/${id}`);

const getSubjectTopicsCollection = (subjectId) =>
  collection(db, `${getSubjectDoc(subjectId).path}/topics`);
const getSubjectTopicDoc = (subjectId, topicId) =>
  doc(db, `${getSubjectDoc(subjectId).path}/topics/${topicId}`);
const getSubjectLiveClassesCollection = (subjectId) =>
  collection(db, `${getSubjectDoc(subjectId).path}/liveClasses`);
const getSubjectLiveClassDoc = (subjectId, classId) =>
  doc(db, `${getSubjectDoc(subjectId).path}/liveClasses/${classId}`);
const getSubjectTasksCollection = (subjectId) =>
  collection(db, `${getSubjectDoc(subjectId).path}/tasks`);
const getSubjectTaskDoc = (subjectId, taskId) =>
  doc(db, `${getSubjectDoc(subjectId).path}/tasks/${taskId}`);

const getFocusHistoryCollection = () =>
  collection(db, `${getBasePath()}/focusHistory`);

async function loadInitialData() {
  if (!userId) return;

  if (unsubscribeTasks) unsubscribeTasks();
  if (unsubscribeAgency) unsubscribeAgency();
  if (unsubscribeSubjects) unsubscribeSubjects();
  if (unsubscribeProjectTasks)
    Object.values(unsubscribeProjectTasks).forEach((unsub) => unsub());
  if (unsubscribeFocusHistory) unsubscribeFocusHistory();
  if (unsubscribeNotifications) unsubscribeNotifications();
  clearSubjectListeners();
  if (unsubscribeAgencyClients) unsubscribeAgencyClients();
  if (unsubscribeAgencyTransactions) unsubscribeAgencyTransactions();
  if (unsubscribeAgencyProspects) unsubscribeAgencyProspects();

  const prospectsQuery = query(
    getAgencyProspectsCollection(),
    orderBy("createdAt", "desc")
  ); // Ordena por padrão
  unsubscribeAgencyProspects = onSnapshot(
    prospectsQuery,
    (snapshot) => {
      allAgencyProspects = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      renderProspectsPage(); // Chama a nova função de renderização principal
    },
    (error) => console.error("Erro ao carregar prospects:", error)
  );

  const tasksQuery = query(getTasksCollection(), orderBy("createdAt", "asc"));
  unsubscribeTasks = onSnapshot(
    tasksQuery,
    (snapshot) => {
      allTasks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      renderKanbanTasks(allTasks);
      updateDashboard();
      updateCalendar();
      updatePomodoroTaskSelect();
      renderUpcomingEvents();
      runAutomationLogic(allTasks);
    },
    (error) => console.error("Erro ao carregar tarefas:", error)
  );

  const agencyQuery = query(getAgencyCollection());
  unsubscribeAgency = onSnapshot(
    agencyQuery,
    (snapshot) => {
      allProjects = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      renderAgencyTable(allProjects);

      allProjectTasks = {};
      allProjects.forEach((project) => {
        const projTasksQuery = query(getProjectTasksCollection(project.id));

        unsubscribeProjectTasks[project.id] = onSnapshot(
          projTasksQuery,
          (tasksSnapshot) => {
            allProjectTasks[project.id] = tasksSnapshot.docs.map((d) => ({
              id: d.id,
              ...d.data(),
              projectId: project.id,
              projectTitle: project.title,
            }));

            updateCalendar();
            updatePomodoroTaskSelect();
            renderAgencyTable(allProjects);
            renderUpcomingEvents();
            updateDashboard();
          },
          (error) => {
            console.error(
              `Erro ao carregar tarefas do projeto ${project.id}:`,
              error
            );
          }
        );
      });
    },
    (error) => console.error("Erro ao carregar projetos da agência:", error)
  );

  const subjectsQuery = query(getSubjectsCollection());
  unsubscribeSubjects = onSnapshot(
    subjectsQuery,
    (snapshot) => {
      allSubjects = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      renderCollegeSubjects(allSubjects);
      renderCollegeSchedule(allSubjects);
      renderDashboardSchedule(allSubjects);
      updateCalendar();
      updateCollegeStats(allSubjects, allSubjectTasks);

      allSubjectTasks = {};
      allSubjects.forEach((subject) => {
        const subjTasksQuery = query(getSubjectTasksCollection(subject.id));
        unsubscribeSubjectItems[`tasks_${subject.id}`] = onSnapshot(
          subjTasksQuery,
          (tasksSnapshot) => {
            allSubjectTasks[subject.id] = tasksSnapshot.docs.map((d) => ({
              id: d.id,
              ...d.data(),
              subjectId: subject.id,
              subjectName: subject.name,
            }));

            updateCalendar();
            updatePomodoroTaskSelect();
            updateCollegeStats(allSubjects, allSubjectTasks);
            renderUpcomingEvents();
            updateDashboard();
          },
          (error) => {
            console.error(
              `Erro ao carregar tarefas da disciplina ${subject.id}:`,
              error
            );
          }
        );
      });
    },
    (error) => console.error("Erro ao carregar disciplinas:", error)
  );

  const focusQuery = query(
    getFocusHistoryCollection(),
    orderBy("createdAt", "desc")
  );
  unsubscribeFocusHistory = onSnapshot(
    focusQuery,
    (snapshot) => {
      const history = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      renderFocusHistory(history);
    },
    (error) => {
      console.error("Erro ao carregar histórico de foco:", error);
    }
  );

  const clientsQuery = query(
    getAgencyClientsCollection(),
    orderBy("name", "asc")
  );
  unsubscribeAgencyClients = onSnapshot(
    clientsQuery,
    (snapshot) => {
      allAgencyClients = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      // Se o slide-over de clientes estiver aberto, atualiza a lista
      if (document.getElementById("client-list-in-modal")) {
        renderClientListInModal();
      }
    },
    (error) => console.error("Erro ao carregar clientes:", error)
  );

  const transactionsQuery = query(
    getAgencyTransactionsCollection(),
    orderBy("date", "desc")
  );
  unsubscribeAgencyTransactions = onSnapshot(
    transactionsQuery,
    (snapshot) => {
      allAgencyTransactions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      // Renderiza a página financeira com os novos dados
      renderFinancePage();
    },
    (error) => console.error("Erro ao carregar transações:", error)
  );

  const notifQuery = query(
    getNotificationsCollection(),
    orderBy("createdAt", "desc")
  );
  unsubscribeNotifications = onSnapshot(
    notifQuery,
    (snapshot) => {
      allNotifications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      renderNotifications(allNotifications);
    },
    (error) => {
      console.error("Erro ao carregar notificações:", error);
      document.getElementById(
        "notification-list"
      ).innerHTML = `<p class="p-4 text-center text-sm text-red-400">Erro ao carregar</p>`;
    }
  );
}

/**
 * 💡 FUNÇÃO NOVA
 * Define o filtro rápido e atualiza a UI dos botões.
 */
function setProspectFilter(clickedButton, filter) {
  currentProspectFilter = filter;
  currentProspectPage = 1; // Reseta a página ao mudar o filtro

  // Atualiza a UI dos botões
  const filterGroup = document.getElementById("prospects-quick-filters");
  if (filterGroup) {
    filterGroup.querySelectorAll("button").forEach((btn) => {
      btn.classList.remove("bg-purple-500", "text-white");
      btn.classList.add("text-zinc-400", "hover:text-white");
    });
    clickedButton.classList.add("bg-purple-500", "text-white");
    clickedButton.classList.remove("text-zinc-400", "hover:text-white");
  }

  renderProspectsPage(); // Re-renderiza a página com o filtro
}

/**
 * 💡 FUNÇÃO NOVA
 * Altera a página atual da paginação de prospects.
 */
function changeProspectPage(direction) {
  currentProspectPage += direction;
  // A função renderProspectsPage() vai validar os limites da página
  renderProspectsPage();
}

/**
 * 💡 FUNÇÃO NOVA
 * Calcula e exibe o "tempo atrás" (ex: "há 2 dias").
 */
function getRelativeTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString + "T12:00:00");
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  const days = Math.floor(diffInSeconds / 86400);
  if (days > 1) return `há ${days} dias`;
  if (days === 1) return `há 1 dia`;

  const hours = Math.floor(diffInSeconds / 3600);
  if (hours > 1) return `há ${hours} horas`;
  if (hours === 1) return `há 1 hora`;

  const minutes = Math.floor(diffInSeconds / 60);
  if (minutes > 1) return `há ${minutes} min`;

  return "agora mesmo";
}

function showAgencyTab(tabName) {
  currentAgencyTab = tabName;

  // Controla os botões das abas
  document
    .getElementById("btn-tab-agency-projects")
    .classList.toggle("bg-blue-500", tabName === "projects");
  document
    .getElementById("btn-tab-agency-projects")
    .classList.toggle("text-white", tabName === "projects");
  document
    .getElementById("btn-tab-agency-prospects")
    .classList.toggle("bg-purple-500", tabName === "prospects");
  document
    .getElementById("btn-tab-agency-prospects")
    .classList.toggle("text-white", tabName === "prospects");

  // Controla a visibilidade do conteúdo
  document
    .getElementById("agency-projects-view")
    .classList.toggle("hidden", tabName !== "projects");
  document
    .getElementById("agency-prospects-view")
    .classList.toggle("hidden", tabName !== "prospects");

  // Renderiza a tabela correta (os projetos já são renderizados pelo onSnapshot)
  if (tabName === "prospects") {
    renderProspectsTable(allAgencyProspects);
  }
}

function getBaseChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    // O "events" e o "onClick" foram removidos daqui
    scales: {
      x: {
        stacked: false,
        grid: { color: "rgba(255, 255, 255, 0.1)" },
        ticks: { color: "#a1a1aa" },
      },
      y: {
        stacked: false,
        grid: { color: "rgba(255, 255, 255, 0.1)" },
        ticks: { color: "#a1a1aa" },
      },
    },
    plugins: {
      tooltip: {
        backgroundColor: "#18181b",
        titleColor: "#ffffff",
        bodyColor: "#d4d4d8",
        borderColor: "#3f3f46",
        borderWidth: 1,
        callbacks: {
          label: function (context) {
            const label = context.dataset.label || "";
            const value = context.parsed.y || 0;
            return ` ${label}: ${value.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}`;
          },
        },
      },
      legend: {
        labels: {
          color: "#a1a1aa",
        },
      },
    },
  };
}

function renderFinanceCharts(allTransactions) {
  const ctx = document.getElementById("agencyFinanceChart")?.getContext("2d");
  if (!ctx) return;

  // 1. Processar os dados
  const currentYear = currentFinanceDate.getFullYear();
  const selectedMonth = currentFinanceDate.getMonth(); // 0-11

  const monthlyIncome = new Array(12).fill(0);
  const monthlyExpenses = new Array(12).fill(0);

  for (const tx of allTransactions) {
    const txDate = new Date(tx.date + "T12:00:00");
    if (txDate.getFullYear() === currentYear) {
      const month = txDate.getMonth();
      const value = parseFloat(tx.value) || 0;
      if (tx.type === "income") monthlyIncome[month] += value;
      else if (tx.type === "expense") monthlyExpenses[month] += value;
    }
  }
  const monthlyBalance = monthlyIncome.map(
    (income, i) => income - monthlyExpenses[i]
  );

  // 2. Destruir gráfico antigo
  if (agencyChartInstance) {
    agencyChartInstance.destroy();
  }

  // 3. Preparar datasets e opções com base no seletor
  let chartDatasets = [];
  let chartOptions = getBaseChartOptions(); // Pega as opções padrão

  // Cores dinâmicas para o mês selecionado
  const incomeColors = monthlyIncome.map((_, i) =>
    i === selectedMonth ? "rgba(34, 197, 94, 1.0)" : "rgba(34, 197, 94, 0.6)"
  );
  const expenseColors = monthlyExpenses.map((_, i) =>
    i === selectedMonth ? "rgba(239, 68, 68, 1.0)" : "rgba(239, 68, 68, 0.6)"
  );

  switch (currentChartType) {
    case "Balanço Mensal":
      chartOptions.scales.x.stacked = false;
      chartOptions.scales.y.stacked = false;
      chartDatasets = [
        {
          label: "Balanço Mensal",
          data: monthlyBalance,
          backgroundColor: monthlyBalance.map((val, i) =>
            val >= 0
              ? i === selectedMonth
                ? "rgba(34, 197, 94, 1.0)"
                : "rgba(34, 197, 94, 0.6)"
              : i === selectedMonth
              ? "rgba(239, 68, 68, 1.0)"
              : "rgba(239, 68, 68, 0.6)"
          ),
          borderWidth: 0,
        },
      ];
      break;

    case "Fluxo de Caixa":
      chartOptions.scales.x.stacked = false;
      chartOptions.scales.y.stacked = false;
      chartDatasets = [
        {
          type: "line",
          label: "Receitas",
          data: monthlyIncome,
          borderColor: "#22c55e",
          backgroundColor: "#22c55e",
          tension: 0.1,
        },
        {
          type: "line",
          label: "Despesas",
          data: monthlyExpenses,
          borderColor: "#ef4444",
          backgroundColor: "#ef4444",
          tension: 0.1,
        },
      ];
      break;

    case "Receitas vs Despesas":
    default:
      chartOptions.scales.x.stacked = true; // Empilha
      chartOptions.scales.y.stacked = true; // Empilha
      chartOptions.scales.yLine = {
        position: "right",
        grid: { drawOnChartArea: false },
        ticks: { color: "#a1a1aa" },
      };
      chartDatasets = [
        {
          label: "Receitas",
          data: monthlyIncome,
          backgroundColor: incomeColors,
          order: 2,
          stack: "stack0",
        },
        {
          label: "Despesas",
          data: monthlyExpenses,
          backgroundColor: expenseColors,
          order: 2,
          stack: "stack0",
        },
        {
          type: "line",
          label: "Balanço (Evolução)",
          data: monthlyBalance,
          borderColor: "#3b82f6",
          backgroundColor: "#3b82f6",
          tension: 0.1,
          order: 1,
          yAxisID: "yLine",
        },
      ];
      break;
  }

  // 4. Criar novo gráfico (***ESTA É A PARTE CORRIGIDA***)
  agencyChartInstance = new Chart(ctx, {
    type: "bar", // Tipo base
    data: {
      labels: [
        "Jan",
        "Fev",
        "Mar",
        "Abr",
        "Mai",
        "Jun",
        "Jul",
        "Ago",
        "Set",
        "Out",
        "Nov",
        "Dez",
      ],
      datasets: chartDatasets, // <-- Usa a variável correta
    },
    options: chartOptions, // <-- Usa a variável correta
  });

  // 5. Adicionar o listener de clique seguro (que já estava no seu código)
  try {
    const canvasEl = ctx && ctx.canvas ? ctx.canvas : null;
    if (canvasEl) {
      if (canvasEl.__finance_click_handler)
        canvasEl.removeEventListener("click", canvasEl.__finance_click_handler);
      canvasEl.__finance_click_handler = (ev) => {
        try {
          const points = agencyChartInstance.getElementsAtEventForMode(
            ev,
            "index",
            { intersect: false },
            true
          );
          if (points && points.length > 0) {
            currentFinanceDate.setMonth(points[0].index);
            renderFinancePage();
          }
        } catch (err) {
          console.error("Finance chart click handler error:", err);
        }
      };
      canvasEl.addEventListener("click", canvasEl.__finance_click_handler);
    }
  } catch (err) {
    console.warn("Could not attach finance chart canvas click handler", err);
  }
}

function renderNotifications(notifications) {
  const listEl = document.getElementById("notification-list");
  const dotEl = document.getElementById("notification-dot");
  if (!listEl || !dotEl) return;

  listEl.innerHTML = "";
  let hasUnread = false;

  if (notifications.length === 0) {
    listEl.innerHTML = `<p class="p-4 text-center text-sm text-zinc-400">Nenhuma notificação</p>`;
    dotEl.classList.add("hidden");
    return;
  }

  const icons = {
    overdue: "alert-triangle",
    dueToday: "calendar-check",
    info: "info",
  };
  const colors = {
    overdue: "text-red-400",
    dueToday: "text-blue-400",
    info: "text-zinc-400",
  };

  notifications.forEach((notif) => {
    if (!notif.read) {
      hasUnread = true;
    }

    const icon = icons[notif.type] || "info";
    const color = colors[notif.type] || "text-zinc-400";

    const notifEl = document.createElement("div");
    notifEl.className = `p-3 flex items-start gap-3 rounded-md transition-colors ${
      !notif.read ? "bg-zinc-800" : "bg-transparent hover:bg-zinc-600/50"
    }`;

    notifEl.innerHTML = `
                    <div>
                        <i data-lucide="${icon}" class="w-4 h-4 mt-0.5 ${color}"></i>
                    </div>
                    <div>
                        <p class="text-sm text-zinc-200 leading-snug">${
                          notif.text
                        }</p>
                        <p class="text-xs text-zinc-400 mt-1">
                            ${
                              notif.createdAt
                                ? notif.createdAt
                                    .toDate()
                                    .toLocaleDateString("pt-BR")
                                : ""
                            }
                        </p>
                    </div>
                `;
    listEl.appendChild(notifEl);
  });

  dotEl.classList.toggle("hidden", !hasUnread);

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

async function handleMarkAllRead() {
  if (!userId) return;

  const unread = allNotifications.filter((n) => !n.read);

  const batch = writeBatch(db);

  unread.forEach((notif) => {
    const docRef = getNotificationDoc(notif.id);
    batch.update(docRef, { read: true });
  });

  try {
    await batch.commit();
  } catch (error) {
    console.error("Erro ao marcar notificações como lidas:", error);
  }
}

function showPage(pageId) {
  document.querySelectorAll('main > div[id^="page-"]').forEach((page) => {
    page.classList.add("hidden");
  });

  const activePage = document.getElementById(`page-${pageId}`);
  if (activePage) {
    activePage.classList.remove("hidden");
  } else {
    document.getElementById("page-dashboard").classList.remove("hidden");
  }

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("bg-zinc-700", link.dataset.page === pageId);
    link.classList.toggle("text-white", link.dataset.page === pageId);
  });

  let newTitle = "TaskFlow";
  switch (pageId) {
    case "dashboard":
      newTitle = "Dashboard - TaskFlow";
      break;
    case "tasks":
      newTitle = "Minhas Tarefas - TaskFlow";
      break;
    case "agency":
      newTitle = "Agência (CRM) - TaskFlow";
      break;
    case "agency-finance":
      newTitle = "Agência (Financeiro) - TaskFlow";
      break; // 💡 NOVO
    case "college":
      newTitle = "Faculdade - TaskFlow";
      break;
    case "calendar":
      newTitle = "Calendário - TaskFlow";
      break;
    case "project-detail":
      newTitle = "Detalhe do Projeto - TaskFlow";
      break;
    case "subject-detail":
      newTitle = "Detalhe da Disciplina - TaskFlow";
      break;
  }

  currentDefaultTitle = newTitle;

  if (!pomodoro.isRunning) {
    document.title = currentDefaultTitle;
  }

  if (pageId === "dashboard") {
    pomodoro.init();
    const banner = document.getElementById("notification-permission-banner");
    if (banner && Notification.permission === "default") {
      banner.classList.remove("hidden");
    } else if (banner) {
      banner.classList.add("hidden");
    }
  }
  if (pageId === "calendar") {
    if (!calendar) {
      initCalendar();
    }
    calendar.render();
    updateCalendar();
    renderUpcomingEvents();
  }
  if (pageId !== "project-detail") {
    if (pageId !== "agency" && unsubscribeProjectTasks) {
      Object.values(unsubscribeProjectTasks).forEach((unsub) => unsub());
      unsubscribeProjectTasks = {};
    }
    currentProjectId = null;
  }
  if (pageId === "agency") {
    // Garante que a aba correta (projetos ou prospects) seja exibida
    showAgencyTab(currentAgencyTab);
  }
  if (pageId === "agency-finance") {
    renderFinancePage(); // Renderiza os dados financeiros ao abrir a página
  }
  if (pageId !== "subject-detail") {
    clearSubjectListeners();
    currentSubjectId = null;
  }
  localStorage.setItem("lastPage", pageId);
}

/**
 * 💡 FUNÇÃO NOVA
 * Função principal que orquestra a renderização da página de prospects
 * (métricas, filtros, ordenação e tabela).
 */
function renderProspectsPage() {
  if (!allAgencyProspects) return;

  // 1. FILTRAR
  let processedProspects = [...allAgencyProspects];

  // 1a. Filtro Rápido
  if (currentProspectFilter === "para_contatar") {
    processedProspects = processedProspects.filter(
      (p) => p.status === "para_contatar"
    );
  } else if (currentProspectFilter === "com_reuniao") {
    processedProspects = processedProspects.filter(
      (p) => p.status === "com_reuniao"
    );
  }

  // 1b. Filtro de Busca
  if (currentProspectSearch) {
    processedProspects = processedProspects.filter(
      (p) =>
        p.nomeFantasia.toLowerCase().includes(currentProspectSearch) ||
        (p.pessoaConexao &&
          p.pessoaConexao.toLowerCase().includes(currentProspectSearch)) ||
        (p.email && p.email.toLowerCase().includes(currentProspectSearch))
    );
  }

  // 2. ORDENAR
  processedProspects.sort((a, b) => {
    switch (currentProspectSort) {
      case "nomeFantasia":
        return a.nomeFantasia.localeCompare(b.nomeFantasia);
      case "status":
        return (a.status || "").localeCompare(b.status || "");
      case "createdAt":
      default:
        return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
    }
  });

  // 3. ATUALIZAR MÉTRICAS (com os dados globais)
  updateProspectMetrics(allAgencyProspects);

  // 4. RENDERIZAR TABELA (com dados processados e paginação)
  renderProspectsTable(processedProspects);
}

/**
 * 💡 FUNÇÃO NOVA
 * Atualiza os 4 cards de métricas.
 */
function updateProspectMetrics(prospects) {
  const total = prospects.length;
  const paraContatar = prospects.filter(
    (p) => p.status === "para_contatar"
  ).length;
  const comReuniao = prospects.filter((p) => p.status === "com_reuniao").length;

  const converted = prospects.filter((p) => p.status === "convertido").length;
  const lost = prospects.filter((p) => p.status === "perdido").length;
  const totalConcluded = converted + lost;
  const taxaConversao =
    totalConcluded > 0 ? (converted / totalConcluded) * 100 : 0;

  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const newThisMonth = prospects.filter((p) => {
    const d = p.createdAt?.toDate();
    return d && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;

  // Atualiza HTML
  const view = document.getElementById("agency-prospects-view");
  if (!view) return;

  document.getElementById("metric-prospects-total").textContent = total;
  document.getElementById(
    "metric-prospects-total-sub"
  ).textContent = `+${newThisMonth} este mês`;
  document.getElementById("metric-prospects-contatar").textContent =
    paraContatar;
  document.getElementById("metric-prospects-reuniao").textContent = comReuniao;
  document.getElementById(
    "metric-prospects-conversao"
  ).textContent = `${taxaConversao.toFixed(0)}%`;
}

function renderProspectsTable(prospects) {
  const tableBody = document.getElementById("prospects-table-body");
  const template = document.getElementById("prospect-row-template");
  if (!tableBody || !template) return;

  tableBody.innerHTML = ""; // Limpa

  // 1. Lógica de Paginação
  const totalItems = prospects.length;
  const totalPages = Math.ceil(totalItems / prospectsPerPage) || 1;
  if (currentProspectPage > totalPages) currentProspectPage = totalPages;
  if (currentProspectPage < 1) currentProspectPage = 1;

  const startIndex = (currentProspectPage - 1) * prospectsPerPage;
  const endIndex = startIndex + prospectsPerPage;
  const paginatedProspects = prospects.slice(startIndex, endIndex);

  // 2. Estado Vazio
  if (paginatedProspects.length === 0) {
    tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="p-8 text-center">
                    <div class="flex flex-col items-center justify-center gap-3 text-zinc-500">
                        <i data-lucide="search-slash" class="w-12 h-12 opacity-50"></i>
                        <p>Nenhum prospect encontrado</p>
                        <p class="text-sm">Tente ajustar seus filtros ou busca.</p>
                        ${
                          currentProspectFilter === "todos" &&
                          currentProspectSearch === ""
                            ? `
                        <button id="btn-show-add-prospect-modal-empty"
                            class="mt-2 py-2 px-4 bg-purple-500 hover:bg-purple-600 rounded-lg text-sm text-white font-medium transition-colors">
                            Adicionar Prospect
                        </button>`
                            : ""
                        }
                    </div>
                </td>
            </tr>`;
    // Adiciona listener para o botão de estado vazio
    const emptyBtn = document.getElementById(
      "btn-show-add-prospect-modal-empty"
    );
    if (emptyBtn) {
      emptyBtn.addEventListener("click", () => showAddProspectForm());
    }
    if (typeof lucide !== "undefined") lucide.createIcons();
  }

  // 3. Renderizar Linhas
  const statusStyles = {
    para_contatar: {
      text: "Para Contatar",
      icon: "phone-outgoing",
      color: "bg-blue-500/20 text-blue-400",
    },
    contatado: {
      text: "Contatado",
      icon: "messages-square",
      color: "bg-yellow-500/20 text-yellow-400",
    },
    com_reuniao: {
      text: "Com Reunião",
      icon: "calendar",
      color: "bg-green-500/20 text-green-400",
    },
    convertido: {
      text: "Convertido",
      icon: "check-circle",
      color: "bg-purple-500/20 text-purple-400",
    },
    perdido: {
      text: "Perdido",
      icon: "x-circle",
      color: "bg-red-500/20 text-red-400",
    },
  };

  paginatedProspects.forEach((prospect) => {
    const row = template.content.cloneNode(true).firstElementChild;

    const style =
      statusStyles[prospect.status] || statusStyles["para_contatar"];
    const ultimoContato = prospect.ultimoContato
      ? new Date(prospect.ultimoContato + "T12:00:00").toLocaleDateString(
          "pt-BR"
        )
      : "---";
    const ultimoContatoRel = getRelativeTime(prospect.ultimoContato);

    row.querySelector(".prospect-name").textContent = prospect.nomeFantasia;
    row.querySelector(".prospect-site span").textContent =
      prospect.site || "---";
    row.querySelector(".prospect-segmento span").textContent =
      prospect.segmento || "---";
    row.querySelector(".prospect-contato-nome").textContent =
      prospect.pessoaConexao || "---";
    row.querySelector(".prospect-contato-cargo").textContent =
      prospect.cargo || "---";
    row.querySelector(".prospect-celular").textContent =
      prospect.celular || "---";
    row.querySelector(".prospect-celular-tipo span").textContent =
      prospect.tipoCelular || "Celular";
    row.querySelector(".prospect-email").textContent = prospect.email || "---";
    row.querySelector(".prospect-proxima-acao").textContent =
      prospect.proximaAcao || "---";
    row.querySelector(".prospect-ultimo-contato").textContent = ultimoContato;
    row.querySelector(".prospect-ultimo-contato-rel").textContent =
      ultimoContatoRel;

    const statusEl = row.querySelector(".prospect-status");
    statusEl.className = `prospect-status inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${style.color}`;
    statusEl.querySelector("i").setAttribute("data-lucide", style.icon);
    statusEl.querySelector("span").textContent = style.text;

    // Listeners
    row
      .querySelector(".btn-edit-prospect")
      .addEventListener("click", () => showAddProspectForm(prospect.id));
    row
      .querySelector(".btn-delete-prospect")
      .addEventListener("click", async () => {
        if (
          await showConfirmModal(
            "Excluir Prospect?",
            `Tem certeza que deseja excluir "${prospect.nomeFantasia}"?`,
            "Excluir",
            "Cancelar",
            "error"
          )
        ) {
          try {
            await deleteDoc(getAgencyProspectDoc(prospect.id));
            showModal("Sucesso", "Prospect excluído.", "success");
          } catch (error) {
            console.error("Erro ao deletar prospect:", error);
          }
        }
      });

    tableBody.appendChild(row);
  });

  // 4. Atualizar Paginação
  updateProspectPagination(totalItems, paginatedProspects.length, startIndex);

  if (typeof lucide !== "undefined") lucide.createIcons();
}

/**
 * 💡 FUNÇÃO NOVA
 * Atualiza o texto e os botões da paginação.
 */
function updateProspectPagination(totalItems, itemsOnPage, startIndex) {
  const infoEl = document.getElementById("prospect-pagination-info");
  const prevBtn = document.getElementById("prospect-pagination-prev");
  const nextBtn = document.getElementById("prospect-pagination-next");
  const pageNumEl = document.getElementById("prospect-page-num");

  if (!infoEl) return;

  if (totalItems === 0) {
    infoEl.textContent = "Nenhum prospect";
  } else {
    infoEl.innerHTML = `Mostrando <span class="text-white font-semibold">${
      startIndex + 1
    } - ${
      startIndex + itemsOnPage
    }</span> de <span class="text-white font-semibold">${totalItems}</span> prospects`;
  }

  const totalPages = Math.ceil(totalItems / prospectsPerPage) || 1;
  prevBtn.disabled = currentProspectPage === 1;
  nextBtn.disabled = currentProspectPage === totalPages;
  pageNumEl.textContent = currentProspectPage;
}

/**
 * 💡 FUNÇÃO NOVA
 * Mostra o formulário para adicionar ou editar um prospect.
 */
function showAddProspectForm(prospectId = null) {
  const prospect = prospectId
    ? allAgencyProspects.find((p) => p.id === prospectId)
    : null;
  const isEditing = !!prospect;

  const formHtml = `
        <form id="form-save-prospect" class="flex flex-col h-full">
            <div class="flex-1 space-y-6 overflow-y-auto p-1">
                
                <div class="space-y-4">
                    <h4 class="text-md font-semibold text-purple-400">Dados Cadastrais</h4>
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-2">Nome Fantasia*</label>
                        <input type="text" name="nomeFantasia" required class="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 rounded-xl" value="${
                          isEditing ? prospect.nomeFantasia : ""
                        }">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-2">Segmento</label>
                        <input type="text" name="segmento" class="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 rounded-xl" placeholder="Ex: Alimentação" value="${
                          isEditing ? prospect.segmento || "" : ""
                        }">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-2">Site</label>
                        <input type="text" name="site" class="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 rounded-xl" placeholder="https://empresa.com" value="${
                          isEditing ? prospect.site || "" : ""
                        }">
                    </div>
                </div>

                <div class="space-y-4 border-t border-zinc-700 pt-4">
                    <h4 class="text-md font-semibold text-purple-400">Contato</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-zinc-300 mb-2">Pessoa de Conexão</label>
                            <input type="text" name="pessoaConexao" class="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 rounded-xl" value="${
                              isEditing ? prospect.pessoaConexao || "" : ""
                            }">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-zinc-300 mb-2">Cargo</label>
                            <input type="text" name="cargo" class="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 rounded-xl" placeholder="Ex: Diretor de Marketing" value="${
                              isEditing ? prospect.cargo || "" : ""
                            }">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-zinc-300 mb-2">Celular</label>
                            <input type="tel" name="celular" class="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 rounded-xl" placeholder="(11) 99999-9999" value="${
                              isEditing ? prospect.celular || "" : ""
                            }">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-zinc-300 mb-2">Tipo do Celular</label>
                            <select name="tipoCelular" class="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 rounded-xl appearance-none">
                                <option value="WhatsApp">WhatsApp</option>
                                <option value="Celular">Celular</option>
                                <option value="Telefone">Telefone Fixo</option>
                            </select>
                        </div>
                        <div class="col-span-2">
                            <label class="block text-sm font-medium text-zinc-300 mb-2">E-mail</label>
                            <input type="email" name="email" class="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 rounded-xl" value="${
                              isEditing ? prospect.email || "" : ""
                            }">
                        </div>
                    </div>
                </div>

                <div class="space-y-4 border-t border-zinc-700 pt-4">
                    <h4 class="text-md font-semibold text-purple-400">Prospecção</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-zinc-300 mb-2">Status*</label>
                            <select name="status" required class="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 rounded-xl appearance-none">
                                <option value="para_contatar">🔵 Para Contatar</option>
                                <option value="contatado">🟡 Contatado (Follow-up)</option>
                                <option value="com_reuniao">🟢 Com Reunião</option>
                                <option value="convertido">🟣 Convertido (Cliente)</option>
                                <option value="perdido">🔴 Perdido</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-zinc-300 mb-2">Último Contato</label>
                            <input type="date" name="ultimoContato" class="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 rounded-xl text-zinc-300" value="${
                              isEditing ? prospect.ultimoContato || "" : ""
                            }">
                        </div>
                        <div class="col-span-2">
                            <label class="block text-sm font-medium text-zinc-300 mb-2">Próxima Ação</I></label>
                            <input type="text" name="proximaAcao" class="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 rounded-xl" placeholder="Ex: Enviar proposta, Ligar na Segunda..." value="${
                              isEditing ? prospect.proximaAcao || "" : ""
                            }">
                        </div>
                    </div>
                </div>

            </div>
            <div class="mt-auto pt-6 border-t border-zinc-700">
                <button type="submit" class="w-full py-3 px-4 bg-purple-500 hover:bg-purple-600 rounded-xl font-semibold text-white">
                    ${isEditing ? "Salvar Alterações" : "Adicionar Prospect"}
                </button>
            </div>
        </form>
    `;

  openSlideOver(
    formHtml,
    isEditing ? `Editando: ${prospect.nomeFantasia}` : "Novo Prospect"
  );

  // Ativa as máscaras
  const panel = document.getElementById("slide-over-panel");
  const celMask = panel.querySelector('input[name="celular"]');
  if (celMask) {
    IMask(celMask, {
      mask: [{ mask: "(00) 0000-0000" }, { mask: "(00) 00000-0000" }],
    });
  }

  // Preenche os selects se estiver editando
  if (isEditing) {
    panel.querySelector('select[name="tipoCelular"]').value =
      prospect.tipoCelular || "WhatsApp";
    panel.querySelector('select[name="status"]').value =
      prospect.status || "para_contatar";
  }

  // Listener de submit
  document
    .getElementById("form-save-prospect")
    .addEventListener("submit", (e) => {
      handleSaveProspect(e, prospectId);
    });
}

/**
 * 💡 FUNÇÃO NOVA
 * Handler para salvar (adicionar ou editar) um prospect.
 */
async function handleSaveProspect(e, prospectId) {
  e.preventDefault();
  const form = e.target;
  const isEditing = !!prospectId;

  const data = {
    nomeFantasia: form.nomeFantasia.value,
    segmento: form.segmento.value || null,
    site: form.site.value || null,
    pessoaConexao: form.pessoaConexao.value || null,
    cargo: form.cargo.value || null,
    celular: form.celular.value || null,
    tipoCelular: form.tipoCelular.value,
    email: form.email.value || null,
    status: form.status.value,
    ultimoContato: form.ultimoContato.value || null,
    proximaAcao: form.proximaAcao.value || null,
    updatedAt: serverTimestamp(),
  };

  try {
    if (isEditing) {
      await updateDoc(getAgencyProspectDoc(prospectId), data);
      showModal("Sucesso", "Prospect atualizado com sucesso.", "success");
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(getAgencyProspectsCollection(), data);
      showModal("Sucesso", "Novo prospect adicionado!", "success");
    }
    closeSlideOver();
  } catch (error) {
    console.error("Erro ao salvar prospect:", error);
    showModal("Erro", "Não foi possível salvar o prospect.", "error");
  }
}

function showModal(title, message, type = "info") {
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-message").textContent = message;

  document.getElementById("modal-btn-confirm").classList.add("hidden");
  const cancelBtn = document.getElementById("modal-btn-cancel");
  cancelBtn.textContent = "Fechar";

  cancelBtn.className =
    "py-2 px-4 bg-zinc-700 hover:bg-zinc-600 rounded-md font-semibold";

  document.getElementById("modal-container").classList.remove("hidden");
  document.getElementById("modal-container").classList.add("flex");
  modalResolve = null;
}

function showConfirmModal(
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  type = "info"
) {
  // 'info', 'error'
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-message").textContent = message;

  const confirmBtn = document.getElementById("modal-btn-confirm");
  const cancelBtn = document.getElementById("modal-btn-cancel");

  confirmBtn.textContent = confirmText;
  cancelBtn.textContent = cancelText;

  confirmBtn.className = "py-2 px-4 rounded-md font-semibold transition-colors";
  cancelBtn.className =
    "py-2 px-4 bg-zinc-700 hover:bg-zinc-600 rounded-md font-semibold transition-colors";

  if (type === "error") {
    confirmBtn.classList.add("bg-red-600", "hover:bg-red-700", "text-white");
  } else {
    confirmBtn.classList.add("bg-blue-500", "hover:bg-blue-600", "text-white");
  }

  confirmBtn.classList.remove("hidden");
  cancelBtn.classList.remove("hidden");

  document.getElementById("modal-container").classList.remove("hidden");
  document.getElementById("modal-container").classList.add("flex");

  return new Promise((resolve) => {
    modalResolve = resolve;
  });
}

/**
 * Exibe um modal com botões de escolha personalizados.
 * @param {string} title - O título do modal.
 * @param {string} message - A mensagem do modal.
 * @param {Array<object>} buttons - Array de objetos: [{ text, value, class }]
 * @returns {Promise<string>} - Resolve com o 'value' do botão clicado (ex: 'one', 'all', 'cancel').
 */
function showCustomConfirmModal(title, message, buttons) {
  const modalContainer = document.getElementById("modal-container");
  const modalTitle = document.getElementById("modal-title");
  const modalMessage = document.getElementById("modal-message");
  const modalActions = document.getElementById("modal-actions");

  // Esconde os botões padrão do HTML (caso existam) e limpa o container
  modalActions.innerHTML = "";
  document.getElementById("modal-btn-confirm")?.classList.add("hidden");
  document.getElementById("modal-btn-cancel")?.classList.add("hidden");

  modalTitle.textContent = title;
  modalMessage.textContent = message;

  return new Promise((resolve) => {
    buttons.forEach((buttonInfo) => {
      const button = document.createElement("button");
      button.textContent = buttonInfo.text;
      button.className = buttonInfo.class; // Aplica classes de estilo

      button.addEventListener("click", () => {
        // Esconde o modal e resolve a promessa com o valor
        modalContainer.classList.add("hidden");
        modalContainer.classList.remove("flex");
        resolve(buttonInfo.value);
      });

      modalActions.appendChild(button);
    });

    // Exibe o modal
    modalContainer.classList.remove("hidden");
    modalContainer.classList.add("flex");
  });
}

function closeModal(confirmed) {
  document.getElementById("modal-container").classList.add("hidden");
  document.getElementById("modal-container").classList.remove("flex");
  if (modalResolve) {
    modalResolve(confirmed);
    modalResolve = null;
  }
}

function openSlideOver(contentHtml, title) {
  document.getElementById("slide-over-title").textContent = title;
  document.getElementById("slide-over-content").innerHTML = contentHtml;
  document.getElementById("slide-over-container").classList.remove("hidden");
  void document.getElementById("slide-over-panel").offsetWidth;
  document.getElementById("slide-over-overlay").classList.remove("opacity-0");
  document.getElementById("slide-over-overlay").classList.add("opacity-100");
  document
    .getElementById("slide-over-panel")
    .classList.remove("translate-x-full");
  document.getElementById("slide-over-panel").classList.add("translate-x-0");
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

function closeSlideOver() {
  document.getElementById("slide-over-overlay").classList.remove("opacity-100");
  document.getElementById("slide-over-overlay").classList.add("opacity-0");
  document.getElementById("slide-over-panel").classList.remove("translate-x-0");
  document.getElementById("slide-over-panel").classList.add("translate-x-full");
  setTimeout(() => {
    document.getElementById("slide-over-container").classList.add("hidden");
    document.getElementById("slide-over-content").innerHTML = "";
  }, 300);
}

function updateDashboard() {
  const statsTotal = document.getElementById("stats-total");
  const statsPending = document.getElementById("stats-pending");
  const statsDoing = document.getElementById("stats-doing");
  const statsDone = document.getElementById("stats-done");
  const recentTasksList = document.getElementById("recent-tasks-list");
  const categoryTasksList = document.getElementById("category-tasks-list");

  if (!statsTotal || !recentTasksList) return;

  const tasksMain = allTasks;
  const tasksAgency = Object.values(allProjectTasks).flat();
  const tasksCollege = Object.values(allSubjectTasks).flat();
  const allCombinedTasks = [...tasksMain, ...tasksAgency, ...tasksCollege];

  renderTaskStatusSummary(allCombinedTasks);

  let pendingCount = 0;
  let doingCount = 0;
  let doneCount = 0;
  let overdueCount = 0;

  const categoryCount = {
    pessoal: 0,
    trabalho: 0,
    estudos: 0,
    freelancer: 0,
    agencia: 0,
    faculdade: 0,
  };
  const categoryIcons = {
    pessoal: "user",
    trabalho: "briefcase",
    estudos: "graduation-cap",
    freelancer: "pen-tool",
    agencia: "folder-open",
    faculdade: "book-open",
  };
  const categoryColors = {
    pessoal: "text-green-500",
    trabalho: "text-blue-500",
    estudos: "text-yellow-500",
    freelancer: "text-purple-500",
    agencia: "text-pink-500",
    faculdade: "text-cyan-500",
  };

  allCombinedTasks.forEach((task) => {
    const status = task.status || "todo";
    if (status === "todo") pendingCount++;
    else if (status === "doing") doingCount++;
    else if (status === "done") doneCount++;
    else if (status === "overdue") overdueCount++;

    if (task.projectId) {
      categoryCount.agencia++;
    } else if (task.subjectId) {
      categoryCount.faculdade++;
    } else if (task.category && categoryCount.hasOwnProperty(task.category)) {
      categoryCount[task.category]++;
    }
  });

  statsTotal.textContent = allCombinedTasks.length;
  statsPending.textContent = pendingCount + overdueCount;
  statsDoing.textContent = doingCount;
  statsDone.textContent = doneCount;

  recentTasksList.innerHTML = "";
  const sortedTasks = [...allCombinedTasks].sort(
    (a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)
  );

  if (sortedTasks.length === 0) {
    recentTasksList.innerHTML = `
                    <div class="text-center py-8 text-zinc-500">
                        <i data-lucide="inbox" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
                        <p>Nenhuma tarefa recente</p>
                    </div>`;
  } else {
    sortedTasks.slice(0, 5).forEach((task) => {
      let subtext = "Pessoal";

      if (task.projectId) {
        subtext = `Agência: ${task.projectTitle || "Projeto"}`;
      } else if (task.subjectId) {
        subtext = `Faculdade: ${task.subjectName || "Disciplina"}`;
      } else if (task.category) {
        subtext = `Pessoal: ${task.category}`;
      }

      const taskEl = document.createElement("div");
      taskEl.className = `p-3 ${COLORS.bgCard} rounded-md flex justify-between items-center`;
      taskEl.innerHTML = `
                        <div>
                            <p class="font-medium">${task.title}</p>
                            <p class="text-sm ${
                              COLORS.textSecondary
                            } capitalize">${subtext}</p>
                        </div>
                        <span class="text-xs ${COLORS.textSecondary}">${
        task.status || "todo"
      }</span>
                    `;
      recentTasksList.appendChild(taskEl);
    });
  }

  categoryTasksList.innerHTML = "";
  let categoriesFound = 0;

  const categoryOrder = [
    "agencia",
    "faculdade",
    "trabalho",
    "estudos",
    "pessoal",
    "freelancer",
  ];

  categoryOrder.forEach((category) => {
    if (categoryCount[category] > 0) {
      categoriesFound++;
      const categoryEl = document.createElement("div");
      categoryEl.className = "flex justify-between items-center";
      categoryEl.innerHTML = `
                        <span class="flex items-center gap-2 text-zinc-300 capitalize">
                            <i data-lucide="${categoryIcons[category]}" class="w-5 h-5 ${categoryColors[category]}"></i> ${category}
                        </span>
                        <span class="text-lg font-bold text-zinc-400">${categoryCount[category]}</span>
                    `;
      categoryTasksList.appendChild(categoryEl);
    }
  });

  if (categoriesFound === 0) {
    categoryTasksList.innerHTML = `
                    <div class="text-center py-6 text-zinc-500">
                        <i data-lucide="folder-open" class="w-10 h-10 mx-auto mb-2 opacity-50"></i>
                        <p class="text-sm">Nenhuma tarefa para exibir</p>
                    </div>`;
  }

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

function getFormattedDateString(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function updateUserStreak() {
  if (!userId) return 0;

  const todayStr = getFormattedDateString(new Date());
  const userDocRef = doc(db, "users", userId);
  let currentStreak = 0;
  let oldStreak = 0;

  try {
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      currentStreak = 1;
      await setDoc(
        userDocRef,
        {
          lastLoginDate: todayStr,
          currentStreak: currentStreak,
        },
        { merge: true }
      );
    } else {
      const data = userDoc.data();
      const lastLogin = data.lastLoginDate;
      oldStreak = data.currentStreak || 0;

      if (lastLogin === todayStr) {
        currentStreak = data.currentStreak || 0;
      } else {
        const yesterday = new Date(Date.now() - 86400000);
        const yesterdayStr = getFormattedDateString(yesterday);

        if (lastLogin === yesterdayStr) {
          currentStreak = (data.currentStreak || 0) + 1;
          await updateDoc(userDocRef, {
            lastLoginDate: todayStr,
            currentStreak: currentStreak,
          });
        } else {
          currentStreak = 1;
          await updateDoc(userDocRef, {
            lastLoginDate: todayStr,
            currentStreak: 1,
          });
        }
      }
    }
  } catch (error) {
    console.error("Erro ao atualizar o streak:", error);
  }

  const streakCounterEl = document.getElementById("streak-counter");
  if (streakCounterEl) {
    if (oldStreak !== currentStreak) {
      animateNumber();
    }

    streakCounterEl.textContent = currentStreak;

    updateFlameLevel(currentStreak);
  }

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

function renderDashboardSchedule(subjects) {
  const scheduleBody = document.getElementById("dashboard-schedule-body");
  if (!scheduleBody) return;

  scheduleBody.innerHTML = "";

  const grid = {};
  scheduleTimeSlots.forEach((time) => {
    grid[time] = {};
    scheduleDays.forEach((day) => {
      grid[time][day] = [];
    });
  });

  subjects.forEach((subject) => {
    if (subject.schedule) {
      scheduleDays.forEach((day) => {
        if (subject.schedule[day] && Array.isArray(subject.schedule[day])) {
          subject.schedule[day].forEach((timeSlot) => {
            if (grid[timeSlot] && grid[timeSlot][day]) {
              grid[timeSlot][day].push({ name: subject.name, id: subject.id });
            }
          });
        }
      });
    }
  });

  scheduleTimeSlots.forEach((time) => {
    const tr = document.createElement("tr");
    tr.className = "divide-x divide-zinc-700/50";
    let rowHtml = `<td class="p-3 text-sm font-medium ${COLORS.textSecondary}">${time}</td>`;

    scheduleDays.forEach((day) => {
      const subjectsInSlot = grid[time][day];

      const cellContent = subjectsInSlot
        .map((sub) => {
          const subjectIndex = allSubjects.findIndex((s) => s.id === sub.id);
          const color =
            subjectColorPalette[subjectIndex % subjectColorPalette.length] ||
            subjectColorPalette[0];

          return `<div data-subject-id="${sub.id}"
                                     class="${color.bg} ${color.hover} text-white text-xs font-medium p-2 rounded-md mb-1 cursor-pointer">
                                     ${sub.name}
                                </div>`;
        })
        .join("");

      rowHtml += `<td class="p-2 text-sm align-top h-24">${cellContent}</td>`;
    });

    tr.innerHTML = rowHtml;
    scheduleBody.appendChild(tr);
  });

  scheduleBody.querySelectorAll("[data-subject-id]").forEach((el) => {
    el.addEventListener("click", () => {
      showSubjectDetailPage(el.dataset.subjectId);
    });
  });

  renderScheduleGrid(
    "dashboard-schedule-head",
    "dashboard-schedule-body",
    subjects
  );
}

async function runAutomationLogic(currentTasks) {
  if (automationRunning) return;
  automationRunning = true;

  const todayStr = new Date().toISOString().split("T")[0];
  const today = new Date(todayStr + "T12:00:00");

  const tasksToMove = [];
  const tasksToNotifyOverdue = [];

  currentTasks.forEach((task) => {
    if (
      task.dueDate &&
      task.dueDate < todayStr &&
      task.status !== "done" &&
      task.status !== "overdue"
    ) {
      tasksToMove.push(task.id);

      if (!task.overdueNotified) {
        tasksToNotifyOverdue.push(task);
      }
    }
  });

  for (const task of tasksToNotifyOverdue) {
    await addNotification(
      `Sua tarefa "${task.title}" está atrasada!`,
      "overdue"
    );

    await updateDoc(getTaskDoc(task.id), { overdueNotified: true });
  }

  for (const taskId of tasksToMove) {
    try {
      await updateDoc(getTaskDoc(taskId), { status: "overdue" });
    } catch (error) {
      console.error(`Erro ao mover tarefa ${taskId} para atrasada:`, error);
    }
  }

  if (Notification.permission === "granted") {
    const tasksToNotify = [];
    currentTasks.forEach((task) => {
      if (
        task.dueDate === todayStr &&
        task.status !== "done" &&
        !task.notified
      ) {
        tasksToNotify.push(task);
      }
    });

    for (const task of tasksToNotify) {
      new Notification("Tarefa Vencendo Hoje!", {
        body: `Sua tarefa "${task.title}" vence hoje. Não se esqueça!`,
      });

      await addNotification(
        `Sua tarefa "${task.title}" vence hoje.`,
        "dueToday"
      );

      try {
        await updateDoc(getTaskDoc(task.id), { notified: true });
      } catch (error) {
        console.error(
          `Erro ao marcar tarefa ${task.id} como notificada:`,
          error
        );
      }
    }
  }

  const tasksToCreate = [];
  const tasksToUpdate = [];

  currentTasks.forEach((task) => {
    if (task.recurrence && task.recurrence !== "none" && task.dueDate) {
      const dueDate = new Date(task.dueDate + "T12:00:00");

      if (dueDate < today) {
        let nextDueDate = new Date(dueDate.getTime());

        if (task.recurrence === "daily") {
          nextDueDate.setDate(nextDueDate.getDate() + 1);
        } else if (task.recurrence === "weekly") {
          nextDueDate.setDate(nextDueDate.getDate() + 7);
        }

        if (nextDueDate < today) {
          nextDueDate = new Date(today.getTime());
        }

        const nextDueDateStr = nextDueDate.toISOString().split("T")[0];

        const newTask = { ...task };
        delete newTask.id;
        newTask.dueDate = nextDueDateStr;
        newTask.status = "todo";
        newTask.createdAt = serverTimestamp();
        newTask.notified = false;
        newTask.overdueNotified = false;
        tasksToCreate.push(newTask);

        const oldTaskUpdate = {
          id: task.id,
          recurrence: "none",
        };
        if (
          task.status === "todo" ||
          task.status === "doing" ||
          task.status === "overdue"
        ) {
          oldTaskUpdate.status = "done";
        }
        tasksToUpdate.push(oldTaskUpdate);
      }
    }
  });

  for (const newTask of tasksToCreate) {
    try {
      await addDoc(getTasksCollection(), newTask);
    } catch (error) {
      console.error("Erro ao criar tarefa recorrente:", error);
    }
  }

  for (const taskUpdate of tasksToUpdate) {
    try {
      const docRef = getTaskDoc(taskUpdate.id);
      const updateData = { ...taskUpdate };
      delete updateData.id;
      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error("Erro ao atualizar tarefa recorrente antiga:", error);
    }
  }

  automationRunning = false;
}

function checkClassAlarms() {
  // Se os dados das disciplinas ainda não carregaram, não faz nada
  if (!allSubjects || allSubjects.length === 0) return;

  const now = new Date();
  const currentDay = dayOfWeekMap[now.getDay()]; // 'seg', 'ter', etc. (mapa já existe no seu código)
  const currentTime =
    now.getHours().toString().padStart(2, "0") +
    ":" +
    now.getMinutes().toString().padStart(2, "0"); // Formato "HH:MM"

  // Limpa o rastreador de alarmes à meia-noite
  if (currentTime === "00:00") {
    sentAlarmsForToday = [];
  }

  // Itera sobre todas as disciplinas
  allSubjects.forEach((subject) => {
    // Verifica se a disciplina tem aulas hoje
    if (subject.schedule && subject.schedule[currentDay]) {
      // Itera sobre os horários de hoje (ex: "19:00 - 20:10")
      subject.schedule[currentDay].forEach((timeSlot) => {
        const startTime = timeSlot.split(" - ")[0]; // Pega apenas a hora de início "19:00"

        // Cria uma ID única para este alarme (ex: "disciplinaID-seg-19:00")
        const alarmId = `${subject.id}-${currentDay}-${startTime}`;

        // Se a hora atual for a hora de início E o alarme ainda não foi enviado hoje
        if (
          currentTime === startTime &&
          !sentAlarmsForToday.includes(alarmId)
        ) {
          console.log(
            `ALARME: Disparando para ${subject.name} às ${startTime}`
          );

          // 1. Envia notificação Desktop (se o usuário permitiu)
          if (Notification.permission === "granted") {
            new Notification("Sua aula está começando!", {
              body: `Aula de "${subject.name}" (${startTime}).`,
              icon: "assets/checklist.ico", // Ícone da sua aplicação
            });
          }

          // 2. Adiciona notificação interna (no "sininho")
          addNotification(
            `Sua aula de "${subject.name}" está começando agora (${startTime}).`,
            "dueToday"
          );

          // 3. Toca o som
          playClassAlarmSound();

          // 4. Marca como enviado para não disparar novamente hoje
          sentAlarmsForToday.push(alarmId);
        }
      });
    }
  });
}

function renderKanbanTasks(tasks) {
  const columns = {
    overdue: document.getElementById("kanban-overdue"),
    todo: document.getElementById("kanban-todo"),
    doing: document.getElementById("kanban-doing"),
    done: document.getElementById("kanban-done"),
  };

  Object.values(columns).forEach((col) => {
    if (col) col.innerHTML = "";
  });

  const taskMap = { overdue: [], todo: [], doing: [], done: [] };
  tasks.forEach((task) => {
    if (taskMap[task.status]) {
      taskMap[task.status].push(task);
    }
  });

  Object.keys(columns).forEach((statusKey) => {
    const col = columns[statusKey];
    if (!col) return;

    if (taskMap[statusKey].length === 0) {
      let icon = "plus-circle";
      let text = "Nenhuma tarefa pendente";
      if (statusKey === "overdue") {
        icon = "check-circle";
        text = "Nenhuma tarefa atrasada";
      }
      if (statusKey === "doing") {
        icon = "play";
        text = "Nenhuma tarefa em progresso";
      }
      if (statusKey === "done") {
        icon = "award";
        text = "Nenhuma tarefa concluída";
      }

      col.innerHTML = `
                        <div class="text-center py-8 text-zinc-500">
                            <i data-lucide="${icon}" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
                            <p class="text-sm">${text}</p>
                        </div>`;
    } else {
      taskMap[statusKey].forEach((task) => {
        const taskCard = createTaskCard(task);
        col.appendChild(taskCard);
      });
    }

    new Sortable(col, {
      group: "sharedTasks",
      animation: 250,
      ghostClass: "kanban-ghost-effect",
      draggable: ".task-card",
      onEnd: (evt) => {
        const taskId = evt.item.dataset.id;
        const newStatus = evt.to.id.replace("kanban-", "");
        updateTaskStatus(taskId, newStatus);
      },
    });
  });

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

function createTaskCard(task) {
  const card = document.createElement("div");
  card.dataset.id = task.id;

  const statusColors = {
    overdue: "border-l-4 border-red-500",
    todo: "border-l-4 border-blue-500",
    doing: "border-l-4 border-yellow-500",
    done: "border-l-4 border-green-500",
  };

  card.className = `${
    COLORS.bgCard
  } p-4 rounded-lg shadow mb-3 cursor-move hover:bg-zinc-600 transition-colors ${
    statusColors[task.status] || ""
  } task-card`;

  let subtaskInfo = "";
  if (task.subtasks && task.subtasks.length > 0) {
    const completed = task.subtasks.filter((s) => s.completed).length;
    subtaskInfo = `
                    <div class="flex items-center gap-1 text-xs ${COLORS.textSecondary} mt-2">
                        <i data-lucide="check-square-2" class="w-3 h-3"></i>
                        ${completed} de ${task.subtasks.length}
                    </div>
                `;
  }

  let recurrenceInfo = "";
  if (task.recurrence && task.recurrence !== "none") {
    recurrenceInfo = `<i data-lucide="repeat" class="w-3 h-3 text-zinc-400" title="Tarefa Recorrente (${task.recurrence})"></i>`;
  }

  card.innerHTML = `
                <div class="flex justify-between items-start mb-1">
                    <span class="text-sm font-medium ${
                      COLORS.textPrimary
                    } pr-2">${task.title}</span>
                    <div class="flex items-center gap-2">
                        ${recurrenceInfo}
                        <button data-delete-id="${
                          task.id
                        }" class="text-zinc-500 hover:text-red-500 flex-shrink-0">&times;</button>
                    </div>
                </div>
                ${
                  task.description
                    ? `<p class="text-sm text-zinc-400 mt-1 truncate">${task.description}</p>`
                    : ""
                }
                ${subtaskInfo}
                ${
                  task.category
                    ? `<span class="mt-2 inline-block bg-zinc-700 text-zinc-300 text-xs font-medium px-2 py-0.5 rounded-full capitalize">${task.category}</span>`
                    : ""
                }
            `;

  card.addEventListener("click", (e) => {
    if (e.target.closest("[data-delete-id]")) return;
    showTaskDetails(task.id);
  });

  card
    .querySelector(`[data-delete-id="${task.id}"]`)
    .addEventListener("click", async (e) => {
      e.stopPropagation();
      if (
        await showConfirmModal(
          "Excluir Tarefa?",
          "Tem certeza que deseja excluir esta tarefa?"
        )
      ) {
        try {
          await deleteDoc(getTaskDoc(task.id));
        } catch (error) {
          console.error("Erro ao deletar tarefa:", error);
          showModal("Erro", "Não foi possível excluir a tarefa.");
        }
      }
    });

  return card;
}

async function updateTaskStatus(taskId, newStatus) {
  try {
    await updateDoc(getTaskDoc(taskId), {
      status: newStatus,
    });
  } catch (error) {
    console.error("Erro ao atualizar status:", error);
    showModal("Erro", "Não foi possível atualizar a tarefa.");
  }
}

function showAddTaskForm() {
  const formHtml = `
                <form id="form-add-task-modal" class="space-y-4">
                    <div>
                        <label for="taskTitleModal" class="block text-sm font-medium text-zinc-300 mb-1">Nova Tarefa</label>
                        <input type="text" id="taskTitleModal" name="taskTitle" required class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md" placeholder="O que precisa ser feito?">
                    </div>
                    <div>
                        <label for="taskDescModal" class="block text-sm font-medium text-zinc-300 mb-1">Descrição</label>
                        <textarea id="taskDescModal" name="taskDescription" rows="4" class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md" placeholder="Adicione mais detalhes..."></textarea>
                    </div>
                    <div>
                        <label for="taskCategoryModal" class="block text-sm font-medium text-zinc-300 mb-1">Categoria</label>
                        <select id="taskCategoryModal" name="taskCategory" class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md">
                            <option value="pessoal">Pessoal</option>
                            <option value="trabalho">Trabalho</option>
                            <option value="estudos">Estudos</option>
                            <option value="freelancer">Freelancer</option>
                        </select>
                    </div>
                    <div>
                        <label for="taskDueDateModal" class="block text-sm font-medium text-zinc-300 mb-1">Data de Entrega</label>
                        <input type="date" id="taskDueDateModal" name="taskDueDate" class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md text-zinc-300">
                    </div>
                    <div>
                        <label for="taskRecurrenceModal" class="block text-sm font-medium text-zinc-300 mb-1">Recorrência</label>
                        <select id="taskRecurrenceModal" name="taskRecurrence" class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md">
                            <option value="none">Nenhuma</option>
                            <option value="daily">Diária</option>
                            <option value="weekly">Semanal</option>
                        </select>
                    </div>
                    <button type="submit" class="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 rounded-md font-semibold">Salvar Tarefa</button>
                </form>
            `;
  openSlideOver(formHtml, "Adicionar Nova Tarefa");

  document
    .getElementById("form-add-task-modal")
    .addEventListener("submit", handleAddTask);
}

async function handleAddTask(e) {
  e.preventDefault();
  const form = e.target;
  const title = form.taskTitle.value;
  const description = form.taskDescription.value;
  const category = form.taskCategory.value;
  const dueDate = form.taskDueDate.value;
  const recurrence = form.taskRecurrence.value;

  if (!title || !userId) return;

  const todayStr = new Date().toISOString().split("T")[0];
  let initialStatus = "todo";
  if (dueDate && dueDate < todayStr) {
    initialStatus = "overdue";
  }

  try {
    await addDoc(getTasksCollection(), {
      title,
      description: description || "",
      category: category || "pessoal",
      dueDate: dueDate || null,
      recurrence: recurrence || "none",
      status: initialStatus,
      subtasks: [],
      notified: false,
      createdAt: serverTimestamp(),
    });
    form.reset();
    closeSlideOver();
  } catch (error) {
    console.error("Erro ao adicionar tarefa:", error);
    showModal("Erro", "Não foi possível adicionar a tarefa.");
  }
}

function showTaskDetails(taskId) {
  const task = allTasks.find((t) => t.id === taskId);
  if (!task) {
    showModal("Erro", "Tarefa não encontrada.");
    return;
  }

  const subtasksHtml = (task.subtasks || [])
    .map(
      (sub, index) => `
                <li data-index="${index}" class="flex items-center justify-between p-2 bg-zinc-700 rounded-md">
                    <div class="flex items-center gap-2">
                        <input type="checkbox" data-index="${index}" class="form-checkbox bg-zinc-800 border-zinc-600 rounded text-blue-500 focus:ring-blue-500" ${
        sub.completed ? "checked" : ""
      }>
                        <span class="${
                          sub.completed ? "line-through text-zinc-500" : ""
                        }">${sub.text}</span>
                    </div>
                    <button data-index="${index}" class="btn-delete-subtask text-zinc-500 hover:text-red-500">
                        <i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i>
                    </button>
                </li>
            `
    )
    .join("");

  const detailsHtml = `
                <form id="form-save-task-details" class="space-y-4">
                    <div>
                        <label for="taskTitleDetail" class="block text-sm font-medium text-zinc-300 mb-1">Tarefa</label>
                        <input type="text" id="taskTitleDetail" name="title" required value="${
                          task.title
                        }" class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md">
                    </div>
                    <div>
                        <label for="taskDescDetail" class="block text-sm font-medium text-zinc-300 mb-1">Descrição</label>
                        <textarea id="taskDescDetail" name="description" rows="10" 
                        class="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm whitespace-pre-wrap leading-relaxed" 
                        placeholder="Use quebras de linha para listar informações.&#10;&#10;Ex: Título: Nome do Título&#10;Descrição: Detalhe do item">${
                          task.description || ""
                        }</textarea>
                    </div>
                    <div>
                        <label for="taskCategoryDetail" class="block text-sm font-medium text-zinc-300 mb-1">Categoria</label>
                        <select id="taskCategoryDetail" name="category" class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md">
                            <option value="pessoal">Pessoal</option>
                            <option value="trabalho">Trabalho</option>
                            <option value="estudos">Estudos</option>
                            <option value="freelancer">Freelancer</option>
                        </select>
                    </div>
                    <div>
                        <label for="taskDueDateDetail" class="block text-sm font-medium text-zinc-300 mb-1">Data de Entrega</label>
                        <input type="date" id="taskDueDateDetail" name="dueDate" value="${
                          task.dueDate || ""
                        }" class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md text-zinc-300">
                    </div>
                    <div>
                        <label for="taskRecurrenceDetail" class="block text-sm font-medium text-zinc-300 mb-1">Recorrência</label>
                        <select id="taskRecurrenceDetail" name="recurrence" class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md">
                            <option value="none">Nenhuma</option>
                            <option value="daily">Diária</option>
                            <option value="weekly">Semanal</option>
                        </select>
                    </div>
                    <button type="submit" class="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 rounded-md font-semibold">Salvar Alterações</button>
                </form>

                <hr class="border-zinc-700 my-6">

                <h4 class="text-lg font-semibold mb-3">Subtarefas</h4>
                <ul id="subtask-list" class="space-y-2 mb-4">
                    ${
                      subtasksHtml.length > 0
                        ? subtasksHtml
                        : `<p class="text-zinc-500 text-sm">Nenhuma subtarefa adicionada.</p>`
                    }
                </ul>

                <form id="form-add-subtask" class="flex gap-2">
                    <input type="text" name="subtaskText" required class="flex-1 px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md" placeholder="Nova subtarefa...">
                    <button type="submit" class="py-2 px-4 bg-green-500 hover:bg-green-600 rounded-md">
                        <i data-lucide="plus" class="w-5 h-5"></i>
                    </button>
                </form>
            `;

  openSlideOver(detailsHtml, "Detalhes da Tarefa");

  document.getElementById("taskCategoryDetail").value =
    task.category || "pessoal";
  document.getElementById("taskRecurrenceDetail").value =
    task.recurrence || "none";

  const panel = document.getElementById("slide-over-panel");

  panel
    .querySelector("#form-save-task-details")
    .addEventListener("submit", (e) => handleSaveTaskDetails(e, taskId));
  panel
    .querySelector("#form-add-subtask")
    .addEventListener("submit", (e) => handleAddSubtask(e, taskId));

  panel
    .querySelectorAll('#subtask-list input[type="checkbox"]')
    .forEach((cb) => {
      cb.addEventListener("change", (e) => handleToggleSubtask(e, taskId));
    });

  panel.querySelectorAll("#subtask-list .btn-delete-subtask").forEach((btn) => {
    btn.addEventListener("click", (e) => handleDeleteSubtask(e, taskId));
  });
}

async function handleSaveTaskDetails(e, taskId) {
  e.preventDefault();
  const form = e.target;
  const newTitle = form.title.value;
  const newDescription = form.description.value;
  const newCategory = form.category.value;
  const newDueDate = form.dueDate.value;
  const newRecurrence = form.recurrence.value;

  const oldTask = allTasks.find((t) => t.id === taskId);

  const updateData = {
    title: newTitle,
    description: newDescription,
    category: newCategory,
    dueDate: newDueDate || null,
    recurrence: newRecurrence || "none",
  };

  if (oldTask && oldTask.dueDate !== updateData.dueDate) {
    updateData.notified = false;
    updateData.overdueNotified = false;
  }

  try {
    await updateDoc(getTaskDoc(taskId), updateData);
    showModal("Sucesso", "Tarefa atualizada.");
    closeSlideOver();
  } catch (error) {
    console.error("Erro ao salvar detalhes:", error);
    showModal("Erro", "Não foi possível salvar as alterações.");
  }
}

async function handleAddSubtask(e, taskId) {
  e.preventDefault();
  const form = e.target;
  const text = form.subtaskText.value;
  if (!text) return;

  const newSubtask = { text, completed: false };

  try {
    await updateDoc(getTaskDoc(taskId), {
      subtasks: arrayUnion(newSubtask),
    });
    form.reset();
    showTaskDetails(taskId);
  } catch (error) {
    console.error("Erro ao adicionar subtarefa:", error);
    showModal("Erro", "Não foi possível adicionar a subtarefa.");
  }
}

async function handleToggleSubtask(e, taskId) {
  const checkbox = e.target;
  const index = parseInt(checkbox.dataset.index, 10);
  const task = allTasks.find((t) => t.id === taskId);
  if (!task || !task.subtasks || !task.subtasks[index]) return;

  const newSubtasks = task.subtasks.map((sub, i) => {
    if (i === index) {
      return { ...sub, completed: checkbox.checked };
    }
    return sub;
  });

  try {
    await updateDoc(getTaskDoc(taskId), {
      subtasks: newSubtasks,
    });
    showTaskDetails(taskId);
  } catch (error) {
    console.error("Erro ao atualizar subtarefa:", error);
    showModal("Erro", "Não foi possível atualizar a subtarefa.");
  }
}

async function handleDeleteSubtask(e, taskId) {
  const button = e.currentTarget;
  const index = parseInt(button.dataset.index, 10);
  const task = allTasks.find((t) => t.id === taskId);
  if (!task || !task.subtasks || !task.subtasks[index]) return;

  const subtaskToDelete = task.subtasks[index];

  try {
    await updateDoc(getTaskDoc(taskId), {
      subtasks: arrayRemove(subtaskToDelete),
    });
    showTaskDetails(taskId);
  } catch (error) {
    console.error("Erro ao deletar subtarefa:", error);
    showModal("Erro", "Não foi possível deletar a subtarefa.");
  }
}

function showAddProjectForm() {
  // Cria as opções do <select> a partir da lista de clientes
  let clientOptions = allAgencyClients
    .map((client) => `<option value="${client.id}">${client.name}</option>`)
    .join("");

  // 💡 CORREÇÃO: Removi o <h3 class="text-xl..."> daqui,
  // pois a função openSlideOver() já adiciona o título.
  const formHtml = `
        <div class="flex flex-col h-full">
            <div class="flex-1 space-y-6 overflow-y-auto p-1">
                <form id="form-add-project-modal" class="space-y-6">
                    <div>
                        <label for="projectTitleModal" class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                            <i data-lucide="folder" class="w-4 h-4 text-blue-400"></i>
                            Nome do Projeto
                        </label>
                        <input type="text" id="projectTitleModal" name="projectTitle" required 
                                class="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                placeholder="Ex: Website Institucional - Empresa X">
                    </div>
                    
                    <div>
                        <label for="projectClientModal" class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                            <i data-lucide="users" class="w-4 h-4 text-purple-400"></i>
                            Cliente
                        </label>
                        <div class="relative">
                            <i data-lucide="user" class="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400"></i>
                            <select id="projectClientModal" name="projectClientId" required 
                                    class="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none">
                                <option value="">Selecione um cliente</option>
                                ${clientOptions}
                            </select>
                            <i data-lucide="chevron-down" class="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 pointer-events-none"></i>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <label for="projectDueDateModal" class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                                <i data-lucide="calendar" class="w-4 h-4 text-green-400"></i>
                                Prazo de Entrega
                            </label>
                            <div class="relative">
                                <i data-lucide="calendar" class="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400"></i>
                                <input type="date" id="projectDueDateModal" name="projectDueDate" 
                                        class="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
                            </div>
                        </div>
                        
                        <div>
                            <label for="projectBudgetModal" class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                                <i data-lucide="dollar-sign" class="w-4 h-4 text-yellow-400"></i>
                                Orçamento (opcional)
                            </label>
                            <div class="relative">
                                <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400">R$</span>
                                <input type="text" id="projectBudgetModal" name="projectBudget" 
                                        class="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        placeholder="0,00">
                            </div>
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                            <i data-lucide="tag" class="w-4 h-4 text-orange-400"></i>
                            Categoria do Projeto
                        </label>
                        <div class="grid grid-cols-2 gap-3">
                            <label class="flex-1">
                                <input type="radio" name="projectCategory" value="website" class="hidden peer" checked>
                                <div class="w-full p-4 text-center bg-zinc-800 border border-zinc-600 rounded-xl cursor-pointer peer-checked:bg-blue-500/20 peer-checked:border-blue-500 peer-checked:text-blue-400 transition-all duration-300 hover:border-zinc-500">
                                    <div class="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center mx-auto mb-2 peer-checked:bg-blue-500">
                                        <i data-lucide="globe" class="w-4 h-4 text-blue-400 peer-checked:text-white"></i>
                                    </div>
                                    <span class="text-sm font-medium block">Website</span>
                                </div>
                            </label>
                            <label class="flex-1">
                                <input type="radio" name="projectCategory" value="branding" class="hidden peer">
                                <div class="w-full p-4 text-center bg-zinc-800 border border-zinc-600 rounded-xl cursor-pointer peer-checked:bg-purple-500/20 peer-checked:border-purple-500 peer-checked:text-purple-400 transition-all duration-300 hover:border-zinc-500">
                                    <div class="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center mx-auto mb-2 peer-checked:bg-purple-500">
                                        <i data-lucide="palette" class="w-4 h-4 text-purple-400 peer-checked:text-white"></i>
                                    </div>
                                    <span class="text-sm font-medium block">Branding</span>
                                </div>
                            </label>
                            <label class="flex-1">
                                <input type="radio" name="projectCategory" value="social" class="hidden peer">
                                <div class="w-full p-4 text-center bg-zinc-800 border border-zinc-600 rounded-xl cursor-pointer peer-checked:bg-pink-500/20 peer-checked:border-pink-500 peer-checked:text-pink-400 transition-all duration-300 hover:border-zinc-500">
                                    <div class="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center mx-auto mb-2 peer-checked:bg-pink-500">
                                        <i data-lucide="share-2" class="w-4 h-4 text-pink-400 peer-checked:text-white"></i>
                                    </div>
                                    <span class="text-sm font-medium block">Social Media</span>
                                </div>
                            </label>
                            <label class="flex-1">
                                <input type="radio" name="projectCategory" value="other" class="hidden peer">
                                <div class="w-full p-4 text-center bg-zinc-800 border border-zinc-600 rounded-xl cursor-pointer peer-checked:bg-gray-500/20 peer-checked:border-gray-500 peer-checked:text-gray-400 transition-all duration-300 hover:border-zinc-500">
                                    <div class="w-8 h-8 rounded-lg bg-gray-500/20 flex items-center justify-center mx-auto mb-2 peer-checked:bg-gray-500">
                                        <i data-lucide="folder" class="w-4 h-4 text-gray-400 peer-checked:text-white"></i>
                                    </div>
                                    <span class="text-sm font-medium block">Outro</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label for="projectDescriptionModal" class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                            <i data-lucide="file-text" class="w-4 h-4 text-green-400"></i>
                            Descrição (opcional)
                        </label>
                        <textarea id="projectDescriptionModal" name="projectDescription" rows="3"
                                class="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                                placeholder="Descreva brevemente o objetivo do projeto..."></textarea>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                            <i data-lucide="flag" class="w-4 h-4 text-red-400"></i>
                            Prioridade
                        </label>
                        <div class="flex gap-3">
                            <label class="flex-1">
                                <input type="radio" name="projectPriority" value="low" class="hidden peer">
                                <div class="w-full p-3 text-center bg-zinc-800 border border-zinc-600 rounded-xl cursor-pointer peer-checked:bg-green-500/20 peer-checked:border-green-500 peer-checked:text-green-400 transition-all duration-300 hover:border-zinc-500">
                                    <span class="text-sm font-medium">Baixa</span>
                                </div>
                            </label>
                            <label class="flex-1">
                                <input type="radio" name="projectPriority" value="medium" class="hidden peer" checked>
                                <div class="w-full p-3 text-center bg-zinc-800 border border-zinc-600 rounded-xl cursor-pointer peer-checked:bg-yellow-500/20 peer-checked:border-yellow-500 peer-checked:text-yellow-400 transition-all duration-300 hover:border-zinc-500">
                                    <span class="text-sm font-medium">Média</span>
                                </div>
                            </label>
                            <label class="flex-1">
                                <input type="radio" name="projectPriority" value="high" class="hidden peer">
                                <div class="w-full p-3 text-center bg-zinc-800 border border-zinc-600 rounded-xl cursor-pointer peer-checked:bg-red-500/20 peer-checked:border-red-500 peer-checked:text-red-400 transition-all duration-300 hover:border-zinc-500">
                                    <span class="text-sm font-medium">Alta</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </form>
            </div>

            <div class="mt-auto pt-6 border-t border-zinc-700">
                <div class="flex gap-3">
                    <button type="button" id="btn-cancel-add-project"
                            class="flex-1 py-3 px-4 bg-zinc-700 hover:bg-zinc-600 rounded-xl font-semibold transition-colors duration-300 flex items-center justify-center gap-2">
                        <i data-lucide="x" class="w-5 h-5"></i>
                        Cancelar
                    </button>
                    <button type="submit" form="form-add-project-modal"
                            class="flex-1 py-3 px-4 bg-blue-500 hover:bg-blue-600 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 group">
                        <i data-lucide="plus" class="w-5 h-5 group-hover:scale-110 transition-transform"></i>
                        Criar Projeto
                    </button>
                </div>
            </div>
        </div>
    `;

  openSlideOver(formHtml, "Novo Projeto"); // Título é definido aqui

  // 💡 CORREÇÃO: Passa a instância da máscara para o handler
  const form = document.getElementById("form-add-project-modal");
  const budgetInput = document.getElementById("projectBudgetModal");
  let budgetMask;

  if (budgetInput && typeof IMask !== "undefined") {
    budgetMask = IMask(budgetInput, {
      mask: "R$ num",
      blocks: {
        num: {
          mask: Number,
          scale: 2,
          radix: ",",
          thousandsSeparator: ".",
          padFractionalZeros: true,
          normalizeZeros: true,
          min: 0,
        },
      },
    });
  }

  if (form) {
    // Passa 'budgetMask' para a função de salvar
    form.addEventListener("submit", (e) =>
      handleAddProjectModal(e, budgetMask)
    );
  }

  // 💡 CORREÇÃO: Adiciona listener para o botão "Cancelar"
  const cancelBtn = document.getElementById("btn-cancel-add-project");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", closeSlideOver);
  }
}

async function handleAddProjectModal(e, budgetMask) {
  // Recebe 'budgetMask'
  e.preventDefault();
  const form = e.target;

  // 💡 CORREÇÃO: Pega o nome do cliente do <select>
  const clientSelect = form.projectClientId;
  const clientId = clientSelect.value;
  const clientName = clientSelect.options[clientSelect.selectedIndex].text;

  // 💡 CORREÇÃO: Lê o valor "limpo" da máscara
  let budgetValue = 0;
  if (budgetMask && budgetMask.unmaskedValue) {
    budgetValue = parseFloat(budgetMask.unmaskedValue) || 0;
  }

  const projectData = {
    title: form.projectTitle.value,
    clientId: clientId,
    clientName: clientName, // Salva o nome para a tabela
    dueDate: form.projectDueDate.value || null,
    budget: budgetValue,
    category: form.projectCategory.value || "website",
    priority: form.projectPriority.value || "medium",
    description: form.projectDescription.value || "",
    status: "active", // 'active' está correto de acordo com seu código
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Validação
  if (!projectData.title || !projectData.clientId) {
    showModal("Erro", "Nome do Projeto e Cliente são obrigatórios.", "error");
    return;
  }

  try {
    // 💡 CORREÇÃO: Erro de nome de função
    await addDoc(getAgencyCollection(), projectData);
    form.reset();
    closeSlideOver();
    showModal("Sucesso", "Projeto criado com sucesso!", "success");
  } catch (error) {
    console.error("Erro ao criar projeto:", error);
    showModal("Erro", "Não foi possível criar o projeto.", "error");
  }
}
function renderAgencyTable(projects) {
  const tableBody = document.getElementById("agency-table-body");
  if (!tableBody) return;

  // --- (Lógica de Ordenação e Paginação - permanece igual) ---
  let sortedProjects = [...projects];
  sortedProjects.sort((a, b) => {
    switch (currentSort) {
      case "title":
        return a.title.localeCompare(b.title);
      case "status":
        return (a.status || "").localeCompare(b.status || "");
      case "dueDate":
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      case "createdAt":
      default:
        return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
    }
  });

  const totalProjects = sortedProjects.length;
  const totalPages = Math.ceil(totalProjects / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProjects = sortedProjects.slice(startIndex, endIndex);
  // --- (Fim da Lógica de Ordenação/Paginação) ---

  tableBody.innerHTML = "";

  // --- (Mapas de Status - permanecem iguais) ---
  const statusLabels = {
    potential: "Potencial",
    active: "Ativo",
    approved: "Aprovado",
  };
  const statusColors = {
    potential: "text-purple-400",
    active: "text-blue-400",
    approved: "text-green-400",
  };

  // 💡 MAPAS PARA OS NOVOS CAMPOS
  const priorityLabels = { low: "Baixa", medium: "Média", high: "Alta" };
  const priorityColors = {
    low: "text-green-400",
    medium: "text-yellow-400",
    high: "text-red-400",
  };
  const formatBRL = (value) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (paginatedProjects.length === 0 && totalProjects === 0) {
    tableBody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-zinc-500">
            Nenhum projeto cadastrado ainda.
         </td></tr>`; // 💡 Colspan atualizado para 8
  } else {
    paginatedProjects.forEach((project) => {
      const tr = document.createElement("tr");
      tr.className = `border-b border-zinc-700 hover:bg-zinc-700 cursor-pointer`;

      // ... (lógica de progresso permanece igual)
      const tasks = allProjectTasks[project.id] || [];
      const totalTasks = tasks.length;
      let progress = 0;
      if (totalTasks > 0) {
        const doneTasks = tasks.filter((t) => t.status === "done").length;
        progress = Math.round((doneTasks / totalTasks) * 100);
      }

      // 💡 NOVOS CAMPOS
      const priority = project.priority || "medium";
      const budget = project.budget || 0;

      // 💡 LINHA DA TABELA ATUALIZADA
      tr.innerHTML = `
                <td class="p-4 font-medium">${project.title}</td>
                <td class="p-4 text-zinc-400">${
                  project.clientName || "N/A"
                }</td>
                
                <td class="p-4 font-medium ${
                  budget > 0 ? "text-green-400" : "text-zinc-500"
                }">
                    ${budget > 0 ? formatBRL(budget) : "---"}
                </td>
                
                <td class="p-4 text-zinc-400">
                    ${
                      project.dueDate
                        ? new Date(
                            project.dueDate + "T12:00:00"
                          ).toLocaleDateString("pt-BR")
                        : "N/A"
                    }
                </td>
                <td class="p-4 font-medium ${
                  statusColors[project.status] || ""
                }">
                    ${statusLabels[project.status] || project.status}
                </td>

                <td class="p-4 font-medium ${priorityColors[priority]}">
                    ${priorityLabels[priority]}
                </td>
                
                <td class="p-4 text-zinc-400 align-middle">
                    <div class="flex items-center gap-2">
                        <div class="w-full bg-zinc-600 rounded-full h-2.5">
                            <div class="bg-blue-500 h-2.5 rounded-full" style="width: ${progress}%"></div>
                        </div>
                        <span class="text-xs font-medium text-zinc-300">${progress}%</span>
                    </div>
                </td>
                <td class="p-4 text-right whitespace-nowrap">
                    <button data-edit-id="${
                      project.id
                    }" class="text-zinc-400 hover:text-blue-500 p-1">
                        <i data-lucide="pencil" class="w-4 h-4 pointer-events-none"></i>
                    </button>
                    <button data-delete-id="${
                      project.id
                    }" class="text-zinc-400 hover:text-red-500 p-1">
                        <i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i>
                    </button>
                </td>
            `;

      // --- (Listeners - permanecem iguais) ---
      tr.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        showProjectDetailPage(project.id);
      });
      tr.querySelector(`[data-edit-id="${project.id}"]`).addEventListener(
        "click",
        (e) => {
          e.stopPropagation();
          showProjectDetails(project.id);
        }
      );
      tr.querySelector(`[data-delete-id="${project.id}"]`).addEventListener(
        "click",
        async (e) => {
          e.stopPropagation();
          if (
            await showConfirmModal(
              "Excluir Projeto?",
              "Tem certeza que deseja excluir este projeto e todas as suas tarefas?"
            )
          ) {
            try {
              await deleteDoc(getAgencyDoc(project.id));
            } catch (error) {
              console.error("Erro ao deletar projeto:", error);
              showModal("Erro", "Não foi possível excluir o projeto.");
            }
          }
        }
      );

      tableBody.appendChild(tr);
    });
  }

  // --- (Paginação - permanece igual) ---
  const paginationInfo = document.getElementById("agency-pagination-info");
  const prevBtn = document.getElementById("btn-agency-prev");
  const nextBtn = document.getElementById("btn-agency-next");
  const pageNum = document.getElementById("agency-page-num");

  if (totalProjects > 0) {
    const shownStart = startIndex + 1;
    const shownEnd = startIndex + paginatedProjects.length;
    paginationInfo.innerHTML = `Mostrando <span class="text-white font-semibold">${shownStart}-${shownEnd}</span> de <span class="text-white font-semibold">${totalProjects}</span> projetos`;
  } else {
    paginationInfo.innerHTML = "Nenhum projeto";
  }

  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages || totalPages === 0;
  pageNum.textContent = currentPage;

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

async function updateProjectStatus(projectId, newStatus) {
  try {
    await updateDoc(getAgencyDoc(projectId), {
      status: newStatus,
    });
  } catch (error) {
    console.error("Erro ao atualizar projeto:", error);
    showModal("Erro", "Não foi possível atualizar o projeto.");
  }
}

function showProjectDetails(projectId) {
  const project = allProjects.find((p) => p.id === projectId);
  if (!project) {
    showModal("Erro", "Projeto não encontrado.", "error");
    return;
  }

  // Cria as opções do <select> de clientes e marca o correto
  let clientOptions = allAgencyClients
    .map(
      (client) =>
        `<option value="${client.id}" ${
          client.id === project.clientId ? "selected" : ""
        }>
            ${client.name}
        </option>`
    )
    .join("");

  // Converte o orçamento (ex: 25000) para o formato da máscara (2500000)
  const budgetValueForMask = (project.budget || 0) * 100;

  const detailsHtml = `
        <div class="flex flex-col h-full">
            <div class="flex-1 space-y-6 overflow-y-auto p-1">
                <form id="form-edit-project-modal" class="space-y-6">
                    <div>
                        <label for="projectTitleModal" class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                            <i data-lucide="folder" class="w-4 h-4 text-blue-400"></i>
                            Nome do Projeto
                        </label>
                        <input type="text" id="projectTitleModal" name="projectTitle" required 
                                value="${project.title}"
                                class="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
                    </div>
                    
                    <div>
                        <label for="projectClientModal" class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                            <i data-lucide="users" class="w-4 h-4 text-purple-400"></i>
                            Cliente
                        </label>
                        <div class="relative">
                            <i data-lucide="user" class="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400"></i>
                            <select id="projectClientModal" name="projectClientId" required 
                                    class="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none">
                                <option value="">Selecione um cliente</option>
                                ${clientOptions}
                            </select>
                            <i data-lucide="chevron-down" class="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 pointer-events-none"></i>
                        </div>
                    </div>
                    
                    <div>
                        <label for="projectStatusDetail" class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                            <i data-lucide="activity" class="w-4 h-4 text-cyan-400"></i>
                            Status do Projeto
                        </label>
                        <select id="projectStatusDetail" name="status" required class="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none">
                            <option value="potential">Potencial</option>
                            <option value="active">Ativo</option>
                            <option value="approved">Aprovado</option>
                        </select>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <label for="projectDueDateModal" class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                                <i data-lucide="calendar" class="w-4 h-4 text-green-400"></i>
                                Prazo de Entrega
                            </label>
                            <div class="relative">
                                <i data-lucide="calendar" class="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400"></i>
                                <input type="date" id="projectDueDateModal" name="projectDueDate" 
                                        value="${project.dueDate || ""}"
                                        class="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
                            </div>
                        </div>
                        
                        <div>
                            <label for="projectBudgetModal" class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                                <i data-lucide="dollar-sign" class="w-4 h-4 text-yellow-400"></i>
                                Orçamento
                            </label>
                            <div class="relative">
                                <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400">R$</span>
                                <input type="text" id="projectBudgetModal" name="projectBudget" 
                                        value="${budgetValueForMask}"
                                        class="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        placeholder="0,00">
                            </div>
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                            <i data-lucide="tag" class="w-4 h-4 text-orange-400"></i>
                            Categoria do Projeto
                        </label>
                        <div class="grid grid-cols-2 gap-3">
                            <label class="flex-1">
                                <input type="radio" name="projectCategory" value="website" class="hidden peer" ${
                                  project.category === "website"
                                    ? "checked"
                                    : ""
                                }>
                                <div class="w-full p-4 text-center bg-zinc-800 border border-zinc-600 rounded-xl cursor-pointer peer-checked:bg-blue-500/20 peer-checked:border-blue-500 peer-checked:text-blue-400 ...">
                                    <div class="w-8 h-8 rounded-lg bg-blue-500/20 ... peer-checked:bg-blue-500"><i data-lucide="globe" class="w-4 h-4 text-blue-400 peer-checked:text-white"></i></div>
                                    <span class="text-sm font-medium block">Website</span>
                                </div>
                            </label>
                            <label class="flex-1">
                                <input type="radio" name="projectCategory" value="branding" class="hidden peer" ${
                                  project.category === "branding"
                                    ? "checked"
                                    : ""
                                }>
                                <div class="w-full p-4 text-center bg-zinc-800 border border-zinc-600 rounded-xl cursor-pointer peer-checked:bg-purple-500/20 peer-checked:border-purple-500 peer-checked:text-purple-400 ...">
                                    <div class="w-8 h-8 rounded-lg bg-purple-500/20 ... peer-checked:bg-purple-500"><i data-lucide="palette" class="w-4 h-4 text-purple-400 peer-checked:text-white"></i></div>
                                    <span class="text-sm font-medium block">Branding</span>
                                </div>
                            </label>
                            <label class="flex-1">
                                <input type="radio" name="projectCategory" value="social" class="hidden peer" ${
                                  project.category === "social" ? "checked" : ""
                                }>
                                <div class="w-full p-4 text-center bg-zinc-800 border border-zinc-600 rounded-xl cursor-pointer peer-checked:bg-pink-500/20 peer-checked:border-pink-500 peer-checked:text-pink-400 ...">
                                    <div class="w-8 h-8 rounded-lg bg-pink-500/20 ... peer-checked:bg-pink-500"><i data-lucide="share-2" class="w-4 h-4 text-pink-400 peer-checked:text-white"></i></div>
                                    <span class="text-sm font-medium block">Social Media</span>
                                </div>
                            </label>
                            <label class="flex-1">
                                <input type="radio" name="projectCategory" value="other" class="hidden peer" ${
                                  project.category === "other" ? "checked" : ""
                                }>
                                <div class="w-full p-4 text-center bg-zinc-800 border border-zinc-600 rounded-xl cursor-pointer peer-checked:bg-gray-500/20 peer-checked:border-gray-500 peer-checked:text-gray-400 ...">
                                    <div class="w-8 h-8 rounded-lg bg-gray-500/20 ... peer-checked:bg-gray-500"><i data-lucide="folder" class="w-4 h-4 text-gray-400 peer-checked:text-white"></i></div>
                                    <span class="text-sm font-medium block">Outro</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label for="projectDescriptionModal" class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                            <i data-lucide="file-text" class="w-4 h-4 text-green-400"></i>
                            Descrição
                        </label>
                        <textarea id="projectDescriptionModal" name="projectDescription" rows="3"
                                class="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white ... resize-none"
                                placeholder="Descreva brevemente o objetivo do projeto...">${
                                  project.description || ""
                                }</textarea>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                            <i data-lucide="flag" class="w-4 h-4 text-red-400"></i>
                            Prioridade
                        </label>
                        <div class="flex gap-3">
                            <label class="flex-1">
                                <input type="radio" name="projectPriority" value="low" class="hidden peer" ${
                                  project.priority === "low" ? "checked" : ""
                                }>
                                <div class="w-full p-3 text-center bg-zinc-800 border border-zinc-600 rounded-xl cursor-pointer peer-checked:bg-green-500/20 peer-checked:border-green-500 peer-checked:text-green-400 ...">
                                    <span class="text-sm font-medium">Baixa</span>
                                </div>
                            </label>
                            <label class="flex-1">
                                <input type="radio" name="projectPriority" value="medium" class="hidden peer" ${
                                  project.priority === "medium" ? "checked" : ""
                                }>
                                <div class="w-full p-3 text-center bg-zinc-800 border border-zinc-600 rounded-xl cursor-pointer peer-checked:bg-yellow-500/20 peer-checked:border-yellow-500 peer-checked:text-yellow-400 ...">
                                    <span class="text-sm font-medium">Média</span>
                                </div>
                            </label>
                            <label class="flex-1">
                                <input type="radio" name="projectPriority" value="high" class="hidden peer" ${
                                  project.priority === "high" ? "checked" : ""
                                }>
                                <div class="w-full p-3 text-center bg-zinc-800 border border-zinc-600 rounded-xl cursor-pointer peer-checked:bg-red-500/20 peer-checked:border-red-500 peer-checked:text-red-400 ...">
                                    <span class="text-sm font-medium">Alta</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </form>
            </div>

            <div class="mt-auto pt-6 border-t border-zinc-700">
                <div class="flex gap-3">
                    <button type="button" id="btn-cancel-edit-project"
                            class="flex-1 py-3 px-4 bg-zinc-700 hover:bg-zinc-600 rounded-xl font-semibold transition-colors duration-300 flex items-center justify-center gap-2">
                        <i data-lucide="x" class="w-5 h-5"></i>
                        Cancelar
                    </button>
                    <button type="submit" form="form-edit-project-modal"
                            class="flex-1 py-3 px-4 bg-blue-500 hover:bg-blue-600 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 group">
                        <i data-lucide="check" class="w-5 h-5 group-hover:scale-110 transition-transform"></i>
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    `;

  openSlideOver(detailsHtml, `Editando: ${project.title}`);

  // Pré-seleciona o status
  document.getElementById("projectStatusDetail").value = project.status;

  // Inicializa a máscara de orçamento
  const panel = document.getElementById("slide-over-panel");
  const budgetInput = document.getElementById("projectBudgetModal");
  let budgetMask;

  if (budgetInput && typeof IMask !== "undefined") {
    budgetMask = IMask(budgetInput, {
      mask: "R$ num",
      blocks: {
        num: {
          mask: Number,
          scale: 2,
          radix: ",",
          thousandsSeparator: ".",
          padFractionalZeros: true,
          normalizeZeros: true,
          min: 0,
        },
      },
    });
  }

  // Adiciona listener de submit
  panel
    .querySelector("#form-edit-project-modal")
    .addEventListener("submit", (e) =>
      handleSaveProjectDetails(e, projectId, budgetMask)
    );

  // Adiciona listener ao botão "Cancelar"
  panel
    .querySelector("#btn-cancel-edit-project")
    .addEventListener("click", closeSlideOver);
}

async function handleSaveProjectDetails(e, projectId, budgetMask) {
  e.preventDefault();
  const form = e.target;

  // Pega o nome e ID do cliente
  const clientSelect = form.projectClientId;
  const newClientId = clientSelect.value;
  const newClientName = clientSelect.options[clientSelect.selectedIndex].text;

  // Pega o valor "limpo" do orçamento
  let newBudgetValue = 0;
  if (budgetMask && budgetMask.unmaskedValue) {
    newBudgetValue = parseFloat(budgetMask.unmaskedValue) || 0;
  }

  const updateData = {
    title: form.title.value,
    clientId: newClientId,
    clientName: newClientName,
    status: form.status.value,
    dueDate: form.dueDate.value || null,
    budget: newBudgetValue,
    category: form.projectCategory.value,
    priority: form.projectPriority.value,
    description: form.projectDescription.value || "",
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(getAgencyDoc(projectId), updateData);
    showModal("Sucesso", "Projeto atualizado.", "success");
    closeSlideOver();
  } catch (error) {
    console.error("Erro ao salvar detalhes do projeto:", error);
    showModal("Erro", "Não foi possível salvar as alterações.", "error");
  }
}

function showProjectDetailPage(projectId) {
  currentProjectId = projectId;
  localStorage.setItem("lastProjectId", projectId);
  const project = allProjects.find((p) => p.id === projectId);
  if (!project) {
    showModal("Erro", "Projeto não encontrado.");
    return;
  }

  // --- Preenche o Cabeçalho ---
  document.getElementById("project-detail-title").textContent = project.title;
  document.getElementById("project-detail-client").textContent =
    project.clientName || "Cliente não definido";

  // Badge de Status
  const statusBadge = document.getElementById("project-detail-status-badge");
  const statusLabels = {
    potential: "Potencial",
    active: "Ativo",
    approved: "Aprovado",
  };
  const statusIcons = {
    potential: "alert-circle",
    active: "clock",
    approved: "check-circle",
  };
  const statusColors = {
    potential: "bg-yellow-500/20 text-yellow-400",
    active: "bg-blue-500/20 text-blue-400",
    approved: "bg-green-500/20 text-green-400",
  };

  const status = project.status || "potential";
  statusBadge.className = `inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${statusColors[status]}`;
  statusBadge.innerHTML = `<i data-lucide="${statusIcons[status]}" class="w-3 h-3"></i><span>${statusLabels[status]}</span>`;

  // --- Preenche a barra lateral "Informações" ---

  // 1. Prazo
  document.getElementById("project-info-due-date").textContent = project.dueDate
    ? new Date(project.dueDate + "T12:00:00").toLocaleDateString("pt-BR")
    : "Sem prazo";

  // 2. Orçamento
  const budgetEl = document.getElementById("project-info-budget");
  if (project.budget && project.budget > 0) {
    budgetEl.textContent = project.budget.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
    budgetEl.classList.add("text-green-400");
    budgetEl.classList.remove("text-zinc-400");
  } else {
    budgetEl.textContent = "Não definido";
    budgetEl.classList.remove("text-green-400");
    budgetEl.classList.add("text-zinc-400");
  }

  // 3. Responsável (Placeholder)
  document.getElementById("project-info-owner").textContent = "---";
  document.getElementById("project-info-team-count").textContent = "0";
  document.getElementById(
    "project-info-team-list"
  ).innerHTML = `<p class="text-zinc-500 text-xs">Ainda não implementado.</p>`;

  // --- Mostra a página e carrega as tarefas ---
  showPage("project-detail");
  loadProjectTasks(projectId);

  if (typeof lucide !== "undefined") lucide.createIcons();
}

function loadProjectTasks(projectId) {
  if (unsubscribeProjectTasks[projectId]) unsubscribeProjectTasks[projectId]();

  const tasksQuery = query(
    getProjectTasksCollection(projectId),
    orderBy("createdAt", "asc")
  );
  unsubscribeProjectTasks[projectId] = onSnapshot(
    tasksQuery,
    (snapshot) => {
      const projectTasks = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      allProjectTasks[projectId] = projectTasks;

      renderProjectTaskKanban(projectTasks); // Renderiza o Kanban
      updateProjectMetrics(projectTasks); // 💡 RENDERIZA OS CARDS DE MÉTRICA

      // Atualiza outras partes da UI
      updateCalendar();
      updatePomodoroTaskSelect();
      renderAgencyTable(allProjects); // Atualiza o progresso na tabela de projetos
    },
    (error) =>
      console.error(`Erro ao carregar tarefas do projeto ${projectId}:`, error)
  );
}

function updateProjectMetrics(tasks) {
  const total = tasks.length;
  const todo = tasks.filter((t) => (t.status || "todo") === "todo").length;
  const doing = tasks.filter((t) => t.status === "doing").length;
  const done = tasks.filter((t) => t.status === "done").length;

  // Calcula o progresso (total pode ser 0)
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  // Atualiza os Cards de Métrica
  document.getElementById("project-metric-total").textContent = total;
  document.getElementById("project-metric-doing").textContent = doing;
  document.getElementById("project-metric-done").textContent = done;
  document.getElementById(
    "project-metric-progress-text"
  ).textContent = `${progress}%`;

  // Atualiza a Barra de Progresso
  const progressBar = document.getElementById("project-metric-progress-bar");
  if (progressBar) {
    progressBar.style.width = `${progress}%`;
  }

  // Atualiza os contadores do Kanban
  document.getElementById("project-kanban-todo-count").textContent = todo;
  document.getElementById("project-kanban-doing-count").textContent = doing;
  document.getElementById("project-kanban-done-count").textContent = done;
}

function renderProjectTaskKanban(tasks) {
  const columns = {
    todo: document.getElementById("project-kanban-todo"),
    doing: document.getElementById("project-kanban-doing"),
    done: document.getElementById("project-kanban-done"),
  };

  Object.values(columns).forEach((col) => {
    if (col) col.innerHTML = "";
  });

  const taskMap = { todo: [], doing: [], done: [] };
  tasks.forEach((task) => {
    if (taskMap[task.status]) {
      taskMap[task.status].push(task);
    } else {
      taskMap["todo"].push(task);
    }
  });

  Object.keys(columns).forEach((statusKey) => {
    const col = columns[statusKey];
    if (!col) return;

    if (taskMap[statusKey].length === 0) {
      col.innerHTML = `<p class="text-sm text-zinc-500 p-4 text-center">Nenhuma tarefa aqui</p>`;
    } else {
      taskMap[statusKey].forEach((task) => {
        const taskCard = createProjectTaskCard(task);
        col.appendChild(taskCard);
      });
    }

    new Sortable(col, {
      group: `projectTasks-${currentProjectId}`,
      animation: 150,
      ghostClass: "opacity-50",
      draggable: ".task-card",
      onEnd: (evt) => {
        const taskId = evt.item.dataset.id;
        const newStatus = evt.to.id.replace("project-kanban-", "");
        updateProjectTaskStatus(taskId, newStatus);
      },
    });
  });
}

function createProjectTaskCard(task) {
  const template = document.getElementById("project-task-card-template");
  if (!template) return document.createElement("div"); // Fallback

  const card = template.content.cloneNode(true).firstElementChild;
  card.dataset.id = task.id; // Define o ID no elemento raiz do card

  // Preenche os campos
  card.querySelector(".task-title").textContent = task.title;

  const taskDesc = card.querySelector(".task-desc");
  if (task.description) {
    taskDesc.textContent = task.description;
  } else {
    taskDesc.remove(); // Remove o parágrafo de descrição se estiver vazio
  }

  // Data de Vencimento
  const taskDueDate = card.querySelector(".task-due-date");
  if (task.dueDate) {
    const date = new Date(task.dueDate + "T12:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    taskDueDate.querySelector("span").textContent = date.toLocaleDateString(
      "pt-BR",
      { day: "2-digit", month: "2-digit" }
    );

    // Adiciona cor se estiver atrasado/hoje
    if (date < today && task.status !== "done") {
      taskDueDate.classList.add("text-red-400", "font-semibold");
    } else if (date.getTime() === today.getTime() && task.status !== "done") {
      taskDueDate.classList.add("text-yellow-400", "font-semibold");
    }
  } else {
    taskDueDate.remove(); // Remove o campo de data se estiver vazio
  }

  // (Placeholders para tags, equipe e prioridade, pois não temos esses dados)
  card.querySelector(".task-tags").innerHTML = ""; // Limpa tags
  card.querySelector(".task-team").innerHTML = `
        <div class="w-6 h-6 rounded-full bg-zinc-500 flex items-center justify-center" title="Não atribuído">
            <i data-lucide="user" class="w-3 h-3 text-white"></i>
        </div>`;
  card.querySelector(".task-priority").textContent = "Média"; // Padrão

  // Adiciona Listeners
  card.querySelector(".btn-edit-task").addEventListener("click", (e) => {
    e.stopPropagation(); // Impede o Sortable de pegar o clique
    showProjectTaskDetails(task); // Reutiliza a função de detalhes
  });

  card
    .querySelector(".btn-delete-task")
    .addEventListener("click", async (e) => {
      e.stopPropagation();
      if (
        await showConfirmModal(
          "Excluir Tarefa?",
          "Tem certeza que deseja excluir esta tarefa do projeto?"
        )
      ) {
        try {
          await deleteDoc(getProjectTaskDoc(currentProjectId, task.id));
        } catch (error) {
          console.error("Erro ao deletar tarefa do projeto:", error);
        }
      }
    });

  if (typeof lucide !== "undefined") lucide.createIcons();
  return card;
}

async function updateProjectTaskStatus(taskId, newStatus) {
  if (!currentProjectId) return;
  try {
    await updateDoc(getProjectTaskDoc(currentProjectId, taskId), {
      status: newStatus,
    });
  } catch (error) {
    console.error("Erro ao atualizar status da tarefa do projeto:", error);
    showModal("Erro", "Não foi possível atualizar a tarefa.");
  }
}

function showAddProjectTaskForm() {
  const formHtml = `
        <div class="flex flex-col h-full">
            <div class="flex-1 space-y-6 overflow-y-auto p-1">
                <!-- Header -->
                <div class="text-center mb-2">
                    <h3 class="text-xl font-bold text-white">Nova Tarefa</h3>
                    <p class="text-zinc-400 text-sm mt-1">Adicione uma nova tarefa ao projeto</p>
                </div>

                <form id="form-add-project-task-modal" class="space-y-6">
                    <!-- Título da Tarefa -->
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                            <i data-lucide="file-text" class="w-4 h-4 text-blue-400"></i>
                            Título da Tarefa
                        </label>
                        <input type="text" name="taskTitle" required 
                               class="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                               placeholder="Ex: Criar layout da página inicial">
                    </div>
                    
                    <!-- Descrição -->
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                            <i data-lucide="align-left" class="w-4 h-4 text-green-400"></i>
                            Descrição
                        </label>
                        <textarea name="taskDescription" rows="4" 
                                  class="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                                  placeholder="Descreva os detalhes da tarefa, requisitos específicos, referências..."></textarea>
                    </div>

                    <!-- Data e Prioridade -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                                <i data-lucide="calendar" class="w-4 h-4 text-purple-400"></i>
                                Data de Entrega
                            </label>
                            <div class="relative">
                                <i data-lucide="calendar" class="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400"></i>
                                <input type="date" name="taskDueDate" 
                                       class="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
                            </div>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                                <i data-lucide="flag" class="w-4 h-4 text-red-400"></i>
                                Prioridade
                            </label>
                            <select name="taskPriority" 
                                    class="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none">
                                <option value="medium">🟡 Média</option>
                                <option value="high">🔴 Alta</option>
                                <option value="low">🟢 Baixa</option>
                            </select>
                        </div>
                    </div>

                    <!-- Recorrência e Categoria -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                                <i data-lucide="repeat" class="w-4 h-4 text-orange-400"></i>
                                Recorrência
                            </label>
                            <select name="taskRecurrence" 
                                    class="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none">
                                <option value="none">🔄 Nenhuma</option>
                                <option value="daily">📅 Diária</option>
                                <option value="weekly">🗓️ Semanal</option>
                                <option value="monthly">📆 Mensal</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                                <i data-lucide="tag" class="w-4 h-4 text-blue-400"></i>
                                Categoria
                            </label>
                            <select name="taskCategory" 
                                    class="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none">
                                <option value="design">🎨 Design</option>
                                <option value="development">💻 Desenvolvimento</option>
                                <option value="content">📝 Conteúdo</option>
                                <option value="review">🔍 Revisão</option>
                                <option value="meeting">🤝 Reunião</option>
                                <option value="other">📦 Outro</option>
                            </select>
                        </div>
                    </div>

                    <!-- Responsável -->
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                            <i data-lucide="user" class="w-4 h-4 text-green-400"></i>
                            Responsável
                        </label>
                        <select name="taskAssignee" 
                                class="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none">
                            <option value="">Selecione um responsável</option>
                            <option value="user1">👤 João Silva (Designer)</option>
                            <option value="user2">👤 Maria Santos (Dev)</option>
                            <option value="user3">👤 Pedro Costa (PM)</option>
                        </select>
                    </div>

                    <!-- Estimativa de Tempo -->
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                            <i data-lucide="clock" class="w-4 h-4 text-yellow-400"></i>
                            Estimativa de Tempo
                        </label>
                        <div class="grid grid-cols-3 gap-3">
                            <label class="flex-1">
                                <input type="radio" name="taskEstimate" value="1" class="hidden peer">
                                <div class="w-full p-3 text-center bg-zinc-800 border border-zinc-600 rounded-xl cursor-pointer peer-checked:bg-blue-500/20 peer-checked:border-blue-500 peer-checked:text-blue-400 transition-all duration-300 hover:border-zinc-500">
                                    <span class="text-sm font-medium">1h</span>
                                </div>
                            </label>
                            <label class="flex-1">
                                <input type="radio" name="taskEstimate" value="4" class="hidden peer" checked>
                                <div class="w-full p-3 text-center bg-zinc-800 border border-zinc-600 rounded-xl cursor-pointer peer-checked:bg-blue-500/20 peer-checked:border-blue-500 peer-checked:text-blue-400 transition-all duration-300 hover:border-zinc-500">
                                    <span class="text-sm font-medium">4h</span>
                                </div>
                            </label>
                            <label class="flex-1">
                                <input type="radio" name="taskEstimate" value="8" class="hidden peer">
                                <div class="w-full p-3 text-center bg-zinc-800 border border-zinc-600 rounded-xl cursor-pointer peer-checked:bg-blue-500/20 peer-checked:border-blue-500 peer-checked:text-blue-400 transition-all duration-300 hover:border-zinc-500">
                                    <span class="text-sm font-medium">8h</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </form>
            </div>

            <!-- Footer com Botões de Ação -->
            <div class="mt-auto pt-6 border-t border-zinc-700">
                <div class="flex gap-3">
                    <button type="button" onclick="closeSlideOver()" 
                            class="flex-1 py-3 px-4 bg-zinc-700 hover:bg-zinc-600 rounded-xl font-semibold transition-colors duration-300 flex items-center justify-center gap-2">
                        <i data-lucide="x" class="w-5 h-5"></i>
                        Cancelar
                    </button>
                    <button type="submit" form="form-add-project-task-modal"
                            class="flex-1 py-3 px-4 bg-blue-500 hover:bg-blue-600 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 group">
                        <i data-lucide="plus" class="w-5 h-5 group-hover:scale-110 transition-transform"></i>
                        Criar Tarefa
                    </button>
                </div>
            </div>
        </div>
    `;

  openSlideOver(formHtml, "Nova Tarefa");

  const form = document.getElementById("form-add-project-task-modal");
  if (form) {
    form.addEventListener("submit", handleAddProjectTask);
  }
}

async function handleAddProjectTask(e) {
  e.preventDefault();
  if (!currentProjectId) return;

  const form = e.target;
  const formData = new FormData(form);

  const taskData = {
    title: formData.get("taskTitle"),
    description: formData.get("taskDescription") || "",
    dueDate: formData.get("taskDueDate") || null,
    recurrence: formData.get("taskRecurrence") || "none",
    priority: formData.get("taskPriority") || "medium",
    category: formData.get("taskCategory") || "other",
    assignee: formData.get("taskAssignee") || null,
    estimate: parseInt(formData.get("taskEstimate")) || 4,
    status: "todo",
    notified: false,
    createdAt: serverTimestamp(),
  };

  try {
    await addDoc(getProjectTasksCollection(currentProjectId), taskData);
    form.reset();
    closeSlideOver();
    showModal("Sucesso", "Tarefa adicionada com sucesso!", "success");
  } catch (error) {
    console.error("Erro ao adicionar tarefa ao projeto:", error);
    showModal("Erro", "Não foi possível adicionar a tarefa.", "error");
  }
}

function showProjectTaskDetails(task) {
  const detailsHtml = `
        <div class="flex flex-col h-full">
            <div class="flex-1 space-y-6 overflow-y-auto p-1">
                <!-- Header -->
                <div class="text-center mb-2">
                    <h3 class="text-xl font-bold text-white">Editar Tarefa</h3>
                    <p class="text-zinc-400 text-sm mt-1">Atualize os detalhes da tarefa</p>
                </div>

                <form id="form-save-project-task-details" class="space-y-6">
                    <!-- Título -->
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                            <i data-lucide="file-text" class="w-4 h-4 text-blue-400"></i>
                            Título da Tarefa
                        </label>
                        <input type="text" name="title" required value="${
                          task.title
                        }" 
                               class="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
                    </div>
                    
                    <!-- Descrição -->
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                            <i data-lucide="align-left" class="w-4 h-4 text-green-400"></i>
                            Descrição
                        </label>
                        <textarea name="description" rows="8" 
                                  class="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none font-mono text-sm leading-relaxed whitespace-pre-wrap"
                                  placeholder="Descreva os detalhes da tarefa...">${
                                    task.description || ""
                                  }</textarea>
                    </div>

                    <!-- Informações da Tarefa -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                                <i data-lucide="calendar" class="w-4 h-4 text-purple-400"></i>
                                Data de Entrega
                            </label>
                            <div class="relative">
                                <i data-lucide="calendar" class="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400"></i>
                                <input type="date" name="dueDate" value="${
                                  task.dueDate || ""
                                }" 
                                       class="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
                            </div>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                                <i data-lucide="repeat" class="w-4 h-4 text-orange-400"></i>
                                Recorrência
                            </label>
                            <select name="recurrence" 
                                    class="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none">
                                <option value="none">🔄 Nenhuma</option>
                                <option value="daily">📅 Diária</option>
                                <option value="weekly">🗓️ Semanal</option>
                                <option value="monthly">📆 Mensal</option>
                            </select>
                        </div>
                    </div>

                    <!-- Status e Prioridade -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                                <i data-lucide="circle" class="w-4 h-4 text-blue-400"></i>
                                Status
                            </label>
                            <select name="status" 
                                    class="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none">
                                <option value="todo">⏳ A Fazer</option>
                                <option value="doing">🔄 Em Progresso</option>
                                <option value="done">✅ Concluído</option>
                                <option value="blocked">🚫 Bloqueado</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                                <i data-lucide="flag" class="w-4 h-4 text-red-400"></i>
                                Prioridade
                            </label>
                            <select name="priority" 
                                    class="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none">
                                <option value="low">🟢 Baixa</option>
                                <option value="medium">🟡 Média</option>
                                <option value="high">🔴 Alta</option>
                                <option value="urgent">🚨 Urgente</option>
                            </select>
                        </div>
                    </div>

                    <!-- Progresso -->
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                            <i data-lucide="trending-up" class="w-4 h-4 text-green-400"></i>
                            Progresso
                        </label>
                        <div class="flex items-center gap-4">
                            <div class="flex-1 bg-zinc-600 rounded-full h-3">
                                <div class="bg-green-500 h-3 rounded-full" style="width: ${
                                  task.progress || 0
                                }%"></div>
                            </div>
                            <span class="text-white text-sm font-medium w-12 text-right">${
                              task.progress || 0
                            }%</span>
                        </div>
                        <input type="range" name="progress" min="0" max="100" value="${
                          task.progress || 0
                        }" 
                               class="w-full mt-2 accent-green-500">
                    </div>
                </form>
            </div>

            <!-- Footer com Botões de Ação -->
            <div class="mt-auto pt-6 border-t border-zinc-700">
                <div class="flex gap-3">
                    <button type="button" onclick="closeSlideOver()" 
                            class="flex-1 py-3 px-4 bg-zinc-700 hover:bg-zinc-600 rounded-xl font-semibold transition-colors duration-300 flex items-center justify-center gap-2">
                        <i data-lucide="x" class="w-5 h-5"></i>
                        Cancelar
                    </button>
                    <button type="submit" form="form-save-project-task-details"
                            class="flex-1 py-3 px-4 bg-blue-500 hover:bg-blue-600 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 group">
                        <i data-lucide="save" class="w-5 h-5 group-hover:scale-110 transition-transform"></i>
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    `;

  openSlideOver(detailsHtml, "Editar Tarefa");

  // Preenche os valores do formulário
  const form = document.getElementById("form-save-project-task-details");
  if (form) {
    form.querySelector('[name="recurrence"]').value = task.recurrence || "none";
    form.querySelector('[name="status"]').value = task.status || "todo";
    form.querySelector('[name="priority"]').value = task.priority || "medium";
    form.querySelector('[name="progress"]').value = task.progress || 0;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      handleSaveProjectTaskDetails(e, task.id);
    });
  }
}

async function handleSaveProjectTaskDetails(e, taskId) {
  if (!currentProjectId) return;

  const form = e.target;
  const formData = new FormData(form);

  const oldTask = allProjectTasks[currentProjectId]?.find(
    (t) => t.id === taskId
  );

  const updateData = {
    title: formData.get("title"),
    description: formData.get("description"),
    dueDate: formData.get("dueDate") || null,
    recurrence: formData.get("recurrence") || "none",
    status: formData.get("status") || "todo",
    priority: formData.get("priority") || "medium",
    progress: parseInt(formData.get("progress")) || 0,
    updatedAt: serverTimestamp(),
  };

  // Reset notificações se a data mudou
  if (oldTask && oldTask.dueDate !== updateData.dueDate) {
    updateData.notified = false;
    updateData.overdueNotified = false;
  }

  try {
    await updateDoc(getProjectTaskDoc(currentProjectId, taskId), updateData);
    showModal("Sucesso", "Tarefa atualizada com sucesso!", "success");
    closeSlideOver();
  } catch (error) {
    console.error("Erro ao salvar tarefa do projeto:", error);
    showModal("Erro", "Não foi possível salvar as alterações.", "error");
  }
}

function updateCollegeStats(subjects, subjectTasks) {
  const totalSubjectsEl = document.getElementById("total-subjects");
  const todayClassesEl = document.getElementById("today-classes");
  const pendingWorksEl = document.getElementById("pending-works");
  const attendanceRateEl = document.getElementById("attendance-rate");

  if (!totalSubjectsEl) return;

  totalSubjectsEl.textContent = subjects.length;

  const today = new Date();
  const todayDay = dayOfWeekMap[today.getDay()];
  let classesToday = 0;
  subjects.forEach((subject) => {
    if (
      subject.schedule &&
      subject.schedule[todayDay] &&
      subject.schedule[todayDay].length > 0
    ) {
      classesToday++;
    }
  });
  todayClassesEl.textContent = classesToday;

  let pending = 0;
  Object.values(subjectTasks)
    .flat()
    .forEach((task) => {
      if (task.status !== "done") {
        pending++;
      }
    });
  pendingWorksEl.textContent = pending;

  attendanceRateEl.textContent = "N/A";
}

async function handleAddSubject(e) {
  e.preventDefault();
  const form = e.target;
  const subjectName = form.subjectName.value;
  if (!subjectName) return;

  try {
    const newSchedule = {};
    scheduleDays.forEach((day) => {
      newSchedule[day] = [];
    });

    await addDoc(getSubjectsCollection(), {
      name: subjectName,
      schedule: newSchedule,
      createdAt: serverTimestamp(),
    });
    form.reset();
  } catch (error) {
    console.error("Erro ao adicionar disciplina:", error);
    showModal("Erro", "Não foi possível adicionar a disciplina.");
  }
}

function renderCollegeSubjects(subjects) {
  const list = document.getElementById("college-subjects-list");
  list.innerHTML = "";

  if (subjects.length === 0) {
    list.innerHTML = `
                    <div class="col-span-full text-center py-8 text-zinc-500">
                        <i data-lucide="book-open" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
                        <p>Nenhuma disciplina cadastrada.</p>
                        <p class="text-sm mt-1">Adicione uma acima para começar</p>
                    </div>`;
    if (typeof lucide !== "undefined") lucide.createIcons();
    return;
  }

  const template = document.getElementById("subject-card-template");

  subjects.forEach((subject) => {
    const card = template.content.cloneNode(true).firstElementChild;

    card.querySelector("h4").textContent = subject.name;

    card.querySelector(
      "p.text-zinc-400"
    ).textContent = `ID: ${subject.id.substring(0, 6)}...`;
    const details = card.querySelector(".space-y-3");
    details.innerHTML = `
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-zinc-400">Aulas:</span>
                        <span class="text-white font-medium">${
                          subject.schedule
                            ? Object.values(subject.schedule).flat().length
                            : 0
                        }</span>
                    </div>
                `;
    const scheduleSummary = card.querySelector(".mt-4 .text-white");
    scheduleSummary.textContent =
      Object.entries(subject.schedule || {})
        .filter(([day, times]) => times.length > 0)
        .map(([day]) => scheduleDayLabels[day] || day)
        .join(", ") || "Sem horários";

    card.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      showSubjectDetailPage(subject.id);
    });

    const deleteBtn = card.querySelector('button[title="Excluir"]');
    deleteBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (
        await showConfirmModal(
          "Excluir Disciplina?",
          `Excluir "${subject.name}" e todas as suas tarefas?`
        )
      ) {
        try {
          await deleteDoc(getSubjectDoc(subject.id));
        } catch (error) {
          console.error("Erro ao deletar disciplina:", error);
          showModal("Erro", "Não foi possível excluir a disciplina.");
        }
      }
    });

    const editBtn = card.querySelector('button[title="Editar"]');
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();

      showEditSubjectForm(subject.id);
    });

    list.appendChild(card);
  });

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

function showEditSubjectForm(subjectId) {
  const subject = allSubjects.find((s) => s.id === subjectId);
  if (!subject) {
    showModal("Erro", "Disciplina não encontrada.");
    return;
  }

  const formHtml = `
                <form id="form-edit-subject" class="space-y-4">
                    <div>
                        <label for="subjectNameEdit" class="block text-sm font-medium text-zinc-300 mb-1">Nome da Disciplina</label>
                        <input type="text" id="subjectNameEdit" name="subjectName" required
                               value="${subject.name}"
                               class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <button type="submit" class="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 rounded-md font-semibold transition-colors">
                        Salvar Alterações
                    </button>
                </form>
            `;

  openSlideOver(formHtml, "Editar Disciplina");

  document
    .getElementById("form-edit-subject")
    .addEventListener("submit", (e) => {
      handleSaveSubjectDetails(e, subjectId);
    });
}

async function handleSaveSubjectDetails(e, subjectId) {
  e.preventDefault();
  if (!subjectId) return;

  const form = e.target;
  const newName = form.subjectName.value;

  if (!newName) {
    showModal("Erro", "O nome da disciplina não pode ficar em branco.");
    return;
  }

  try {
    await updateDoc(getSubjectDoc(subjectId), {
      name: newName,
    });

    closeSlideOver();
    showModal("Sucesso", "Disciplina atualizada.");
  } catch (error) {
    console.error("Erro ao salvar disciplina:", error);
    showModal("Erro", "Não foi possível salvar as alterações.");
  }
}

function renderCollegeSchedule(subjects) {
  const scheduleBody = document.getElementById("college-schedule-body");
  scheduleBody.innerHTML = "";

  const grid = {};
  scheduleTimeSlots.forEach((time) => {
    grid[time] = {};
    scheduleDays.forEach((day) => {
      grid[time][day] = [];
    });
  });

  subjects.forEach((subject) => {
    if (subject.schedule) {
      scheduleDays.forEach((day) => {
        if (subject.schedule[day] && Array.isArray(subject.schedule[day])) {
          subject.schedule[day].forEach((timeSlot) => {
            if (grid[timeSlot] && grid[timeSlot][day]) {
              grid[timeSlot][day].push({ name: subject.name, id: subject.id });
            }
          });
        }
      });
    }
  });

  scheduleTimeSlots.forEach((time) => {
    const tr = document.createElement("tr");
    tr.className = "divide-x divide-zinc-700/50";
    let rowHtml = `<td class="p-3 text-sm font-medium ${COLORS.textSecondary}">${time}</td>`;

    scheduleDays.forEach((day) => {
      const subjectsInSlot = grid[time][day];

      const cellContent = subjectsInSlot
        .map((sub) => {
          const subjectIndex = allSubjects.findIndex((s) => s.id === sub.id);

          const color =
            subjectColorPalette[subjectIndex % subjectColorPalette.length] ||
            subjectColorPalette[0];

          return `<div data-subject-id="${sub.id}"
                                     class="${color.bg} ${color.hover} text-white text-xs font-medium p-2 rounded-md mb-1 cursor-pointer">
                                     ${sub.name}
                                </div>`;
        })
        .join("");

      rowHtml += `<td class="p-2 text-sm align-top h-24">${cellContent}</td>`;
    });

    tr.innerHTML = rowHtml;
    scheduleBody.appendChild(tr);
  });

  scheduleBody.querySelectorAll("[data-subject-id]").forEach((el) => {
    el.addEventListener("click", () => {
      showSubjectDetailPage(el.dataset.subjectId);
    });
  });

  renderScheduleGrid(
    "college-schedule-head",
    "college-schedule-body",
    subjects
  );
}

function showSubjectDetailPage(subjectId) {
  currentSubjectId = subjectId;
  localStorage.setItem("lastSubjectId", subjectId);
  const subject = allSubjects.find((s) => s.id === subjectId);
  if (!subject) {
    showModal("Erro", "Disciplina não encontrada.");
    return;
  }

  document.getElementById("subject-detail-title").textContent = subject.name;

  const scheduleForm = document.getElementById("form-save-subject-schedule");
  scheduleForm
    .querySelectorAll('input[type="checkbox"]')
    .forEach((cb) => (cb.checked = false));

  if (subject.schedule) {
    const firstDayWithSchedule = scheduleDays.find(
      (day) => subject.schedule[day] && subject.schedule[day].length > 0
    );
    if (firstDayWithSchedule) {
      subject.schedule[firstDayWithSchedule].forEach((timeSlot) => {
        const timeCheckbox = scheduleForm.querySelector(
          `input[name="time"][value="${timeSlot}"]`
        );
        if (timeCheckbox) timeCheckbox.checked = true;
      });
    }

    scheduleDays.forEach((day) => {
      if (subject.schedule[day] && subject.schedule[day].length > 0) {
        const dayCheckbox = scheduleForm.querySelector(
          `input[name="day"][value="${day}"]`
        );
        if (dayCheckbox) dayCheckbox.checked = true;
      }
    });
  }

  showPage("subject-detail");
  loadSubjectData(subjectId);
}

function loadSubjectData(subjectId) {
  clearSubjectListeners();

  const topicsQuery = query(
    getSubjectTopicsCollection(subjectId),
    orderBy("createdAt")
  );
  unsubscribeSubjectItems.topics = onSnapshot(topicsQuery, (snapshot) => {
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderSubjectTopicsList(
      items,
      "subject-topics-list",
      "Nenhum tópico cadastrado",
      handleToggleSubjectTopic,
      handleDeleteSubjectTopic
    );
  });

  const classesQuery = query(
    getSubjectLiveClassesCollection(subjectId),
    orderBy("createdAt")
  );
  unsubscribeSubjectItems.liveClasses = onSnapshot(classesQuery, (snapshot) => {
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderSubjectList(
      items,
      "subject-live-classes-list",
      "Nenhuma aula cadastrada",
      handleToggleSubjectLiveClass,
      handleDeleteSubjectLiveClass
    );
  });

  const tasksQuery = query(
    getSubjectTasksCollection(subjectId),
    orderBy("createdAt", "asc")
  );
  unsubscribeSubjectItems.tasks = onSnapshot(tasksQuery, (snapshot) => {
    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      subjectId: subjectId,
      subjectName: allSubjects.find((s) => s.id === subjectId)?.name,
    }));
    allSubjectTasks[subjectId] = items;
    renderSubjectTaskKanban(items);
    updateCalendar();
    updatePomodoroTaskSelect();
    updateCollegeStats(allSubjects, allSubjectTasks);
  });
}

function clearSubjectListeners() {
  Object.values(unsubscribeSubjectItems).forEach((unsub) => unsub());
  unsubscribeSubjectItems = {};
}

function renderSubjectList(items, listId, emptyText, toggleFn, deleteFn) {
  const listElement = document.getElementById(listId);
  listElement.innerHTML = "";

  if (items.length === 0) {
    listElement.innerHTML = `<li class="text-zinc-500 text-sm p-4 text-center">${emptyText}</li>`;
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = `flex items-center justify-between p-2 ${COLORS.bgCard} rounded-md`;
    li.innerHTML = `
                    <div class="flex items-center gap-2">
                        <input type="checkbox" data-id="${
                          item.id
                        }" class="form-checkbox bg-zinc-800 border-zinc-600 rounded text-blue-500 focus:ring-blue-500" ${
      item.completed ? "checked" : ""
    }>
                        <span class="${
                          item.completed ? "line-through text-zinc-500" : ""
                        }">${item.text}</span>
                    </div>
                    <button data-id="${
                      item.id
                    }" class="btn-delete-item text-zinc-500 hover:text-red-500">
                        <i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i>
                    </button>
                `;

    li.querySelector('input[type="checkbox"]').addEventListener("change", (e) =>
      toggleFn(e, item.id)
    );
    li.querySelector(".btn-delete-item").addEventListener("click", (e) =>
      deleteFn(e, item.id)
    );

    listElement.appendChild(li);
  });

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

function renderSubjectTopicsList(items) {
    const listElement = document.getElementById('subject-topics-list');
    listElement.innerHTML = '';

    if (items.length === 0) {
        listElement.innerHTML = `<li class="text-zinc-500 text-sm p-4 text-center">Nenhum tópico cadastrado</li>`;
        return;
    }

    items.forEach(item => {
        const hasSubtasks = item.subtasks && item.subtasks.length > 0;
        
        // Conta quantos estão feitos para mostrar um resumo quando fechado (Ex: 2/5)
        const totalSub = item.subtasks ? item.subtasks.length : 0;
        const doneSub = item.subtasks ? item.subtasks.filter(s => s.completed).length : 0;
        const progressBadge = hasSubtasks 
            ? `<span class="text-xs text-zinc-500 ml-auto mr-2 font-mono">[${doneSub}/${totalSub}]</span>` 
            : '';

        const parentCheckboxClass = hasSubtasks ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer';
        
        // IDs únicos para controle de abrir/fechar
        const contentId = `topic-content-${item.id}`;
        const chevronId = `topic-chevron-${item.id}`;

        const li = document.createElement('li');
        // Mudamos o estilo para parecer um "cartão" fechado
        li.className = `flex flex-col ${COLORS.bgCard} rounded-md border border-zinc-700/50 overflow-hidden transition-all duration-200`;
        
        // --- HTML DAS SUBTAREFAS (Escondido por padrão) ---
        let subtasksHtml = '';
        if (hasSubtasks) {
            subtasksHtml = `<ul class="space-y-1 border-l-2 border-zinc-700 ml-2 pl-3 my-2">`;
            item.subtasks.forEach((sub, idx) => {
                subtasksHtml += `
                    <li class="flex items-center justify-between group py-1">
                        <div class="flex items-center gap-3">
                            <input type="checkbox" data-parent-id="${item.id}" data-sub-idx="${idx}" 
                                class="subtask-checkbox form-checkbox bg-zinc-800 border-zinc-500 rounded text-blue-500 focus:ring-blue-500 w-4 h-4 cursor-pointer" 
                                ${sub.completed ? 'checked' : ''}>
                            <span class="text-sm ${sub.completed ? 'line-through text-zinc-500' : 'text-zinc-300'}">${sub.text}</span>
                        </div>
                        <button data-parent-id="${item.id}" data-sub-idx="${idx}" class="btn-delete-subtask opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-500 transition-opacity p-1">
                            <i data-lucide="x" class="w-3 h-3"></i>
                        </button>
                    </li>
                `;
            });
            subtasksHtml += `</ul>`;
        }

        // --- FORMULÁRIO DE ADICIONAR (Escondido por padrão) ---
        const addSubtaskUI = `
            <div class="mt-3 pt-2 border-t border-zinc-700/50">
                <form data-parent-id="${item.id}" class="form-add-subtask flex gap-2">
                    <input type="text" placeholder="Nova etapa..." class="flex-1 bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500">
                    <button type="submit" class="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs font-medium">
                        <i data-lucide="plus" class="w-4 h-4"></i>
                    </button>
                </form>
            </div>
        `;

        // --- CABEÇALHO (Sempre visível) ---
        // Adicionamos um botão de Chevron (Seta) na esquerda
        li.innerHTML = `
            <div class="flex items-center justify-between w-full p-3 hover:bg-zinc-700/30 transition-colors">
                <div class="flex items-center gap-3 flex-1 overflow-hidden">
                    
                    <button class="btn-toggle-topic p-1 text-zinc-400 hover:text-white transition-transform duration-200" 
                            data-target="${contentId}" data-chevron="${chevronId}">
                        <i id="${chevronId}" data-lucide="chevron-right" class="w-4 h-4 transition-transform duration-200"></i>
                    </button>

                    <input type="checkbox" data-id="${item.id}" 
                        class="topic-checkbox form-checkbox bg-zinc-800 border-zinc-500 rounded text-green-500 focus:ring-green-500 w-5 h-5 shrink-0 ${parentCheckboxClass}" 
                        ${item.completed ? 'checked' : ''} 
                        ${hasSubtasks ? 'disabled' : ''}>
                    
                    <span class="font-medium truncate ${item.completed ? 'line-through text-zinc-500' : 'text-zinc-200'} select-none" 
                          title="${item.text}">${item.text}</span>
                </div>

                <div class="flex items-center">
                    ${progressBadge}
                    <button data-id="${item.id}" class="btn-delete-item text-zinc-500 hover:text-red-500 p-1 ml-2">
                        <i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i>
                    </button>
                </div>
            </div>

            <div id="${contentId}" class="hidden px-4 pb-4 bg-zinc-800/30">
                ${subtasksHtml}
                ${addSubtaskUI}
            </div>
        `;

        // --- LISTENERS ---

        // 1. Lógica de Abrir/Fechar (Accordion)
        const toggleBtn = li.querySelector('.btn-toggle-topic');
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Impede cliques indesejados
            const content = document.getElementById(contentId);
            const chevron = document.getElementById(chevronId);
            
            // Alterna visibilidade
            content.classList.toggle('hidden');
            
            // Gira a setinha
            if (content.classList.contains('hidden')) {
                chevron.style.transform = 'rotate(0deg)';
            } else {
                chevron.style.transform = 'rotate(90deg)';
            }
        });

        // Permite clicar no texto para abrir também (melhora usabilidade)
        li.querySelector('span.font-medium').addEventListener('click', () => toggleBtn.click());

        // 2. Checkbox Pai
        if (!hasSubtasks) {
            li.querySelector('.topic-checkbox').addEventListener('change', (e) => handleToggleSubjectTopic(e, item.id));
        }

        // 3. Deletar Pai
        li.querySelector('.btn-delete-item').addEventListener('click', (e) => handleDeleteSubjectTopic(e, item.id));

        // 4. Adicionar Subtarefa
        li.querySelector('.form-add-subtask').addEventListener('submit', (e) => handleAddSubTopic(e, item.id));

        // 5. Checkbox Filhos
        li.querySelectorAll('.subtask-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => handleToggleSubTopic(e, item.id, parseInt(cb.dataset.subIdx)));
        });

        // 6. Deletar Filho
        li.querySelectorAll('.btn-delete-subtask').forEach(btn => {
            btn.addEventListener('click', (e) => handleDeleteSubTopic(e, item.id, parseInt(btn.dataset.subIdx)));
        });

        listElement.appendChild(li);
    });

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function showImportTopicsForm() {
    if (!currentSubjectId) return;

    // Filtra todas as outras disciplinas, excluindo a que estamos editando
    const otherSubjects = allSubjects.filter(s => s.id !== currentSubjectId);
    
    let optionsHtml = otherSubjects.map(sub => 
        `<option value="${sub.id}">${sub.name}</option>`
    ).join('');
    
    if (otherSubjects.length === 0) {
        optionsHtml = '<option value="" disabled>Nenhuma outra disciplina encontrada.</option>';
    }

    const formHtml = `
        <form id="form-import-topics" class="space-y-6">
            <p class="text-zinc-400">Selecione a disciplina de origem para copiar todos os tópicos (e subtarefas) para 
                a disciplina atual: <span class="font-semibold text-white">${allSubjects.find(s => s.id === currentSubjectId)?.name || '...'}</span></p>

            <div>
                <label for="sourceSubjectSelect" class="block text-sm font-medium text-zinc-300 mb-1">
                    Disciplina de Origem
                </label>
                <select id="sourceSubjectSelect" name="sourceSubjectId" required
                        class="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500">
                    <option value="">Selecione uma disciplina...</option>
                    ${optionsHtml}
                </select>
            </div>
            
            <button type="submit" id="btn-execute-import"
                    class="w-full py-3 px-4 bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-white transition-colors flex items-center justify-center gap-2">
                <i data-lucide="copy-check" class="w-5 h-5"></i>
                Importar Tópicos
            </button>
        </form>
    `;

    openSlideOver(formHtml, "Importar Tópicos de Outra Disciplina");

    // Atribui o Listener
    document.getElementById('form-import-topics').addEventListener('submit', (e) => {
        const sourceId = document.getElementById('sourceSubjectSelect').value;
        handleImportTopics(e, sourceId, currentSubjectId);
    });
}


async function handleImportTopics(e, sourceSubjectId, targetSubjectId) {
    e.preventDefault();
    
    if (!sourceSubjectId || !targetSubjectId) {
        showModal("Erro", "IDs de origem ou destino ausentes.", "error");
        return;
    }

    if (!await showConfirmModal(
        "Confirmação de Importação", 
        "Isso copiará TODOS os tópicos e subtarefas da disciplina selecionada para a atual. Deseja continuar?",
        "Importar", "Cancelar"
    )) {
        return;
    }

    try {
        // 1. Inicia o Batch
        const batch = writeBatch(db);

        // 2. Define o caminho de origem
        const sourceTopicsCollection = getSubjectTopicsCollection(sourceSubjectId);
        const sourceQuery = query(sourceTopicsCollection);
        
        // 3. Busca todos os tópicos de origem
        const querySnapshot = await getDocs(sourceQuery);
        
        if (querySnapshot.empty) {
            showModal("Atenção", "A disciplina de origem não tem tópicos para importar.");
            return;
        }

        // 4. Define o caminho de destino
        const targetTopicsCollection = getSubjectTopicsCollection(targetSubjectId);
        
        // 5. Itera sobre os documentos encontrados e prepara a cópia
        querySnapshot.forEach(sourceDoc => {
            const sourceData = sourceDoc.data();
            
            // Cria uma nova referência de documento (novo ID) no destino
            const newDocRef = doc(targetTopicsCollection);
            
            // Prepara os novos dados para gravação
            const newData = {
                text: sourceData.text,
                subtasks: sourceData.subtasks || [], // Copia as subtarefas
                completed: false, // IMPORTANTE: Reseta o status de conclusão
                createdAt: serverTimestamp() 
            };
            
            // Adiciona a operação de SET (criar) ao lote
            batch.set(newDocRef, newData);
        });

        // 6. Executa o Batch
        await batch.commit();

        closeSlideOver();
        showModal("Sucesso", `Importação concluída! ${querySnapshot.size} tópicos foram copiados.`);
        
        // Dispara o reload dos dados do Firebase (onSnapshot)
        loadSubjectData(targetSubjectId); 

    } catch (error) {
        console.error("Erro ao clonar tópicos:", error);
        showModal("Erro", "Não foi possível realizar a importação dos tópicos.", "error");
    }
}

async function handleAddSubTopic(e, topicId) {
  e.preventDefault();
  const input = e.target.querySelector("input");
  const text = input.value;
  if (!text || !currentSubjectId) return;

  try {
    const topicRef = getSubjectTopicDoc(currentSubjectId, topicId);
    // Precisamos adicionar ao array de subtasks e garantir que o pai seja false (pois acabamos de adicionar algo não feito)
    await updateDoc(topicRef, {
      subtasks: arrayUnion({ text: text, completed: false }),
      completed: false, // Se adicionei uma nova tarefa, o tópico geral não está mais 100% completo
    });
  } catch (error) {
    console.error("Erro ao adicionar subtarefa:", error);
  }
}

async function handleToggleSubTopic(e, topicId, subIdx) {
  if (!currentSubjectId) return;

  try {
    const topicRef = getSubjectTopicDoc(currentSubjectId, topicId);

    // 1. Ler o documento atual para pegar o array
    const docSnap = await getDoc(topicRef);
    if (!docSnap.exists()) return;

    const data = docSnap.data();
    let subtasks = data.subtasks || [];

    // 2. Atualizar o status da subtarefa específica
    if (subtasks[subIdx]) {
      subtasks[subIdx].completed = e.target.checked;
    }

    // 3. Verificar se TODOS estão completos
    const allCompleted =
      subtasks.length > 0 && subtasks.every((sub) => sub.completed);

    // 4. Salvar tudo de volta (array atualizado e status do pai)
    await updateDoc(topicRef, {
      subtasks: subtasks,
      completed: allCompleted,
    });
  } catch (error) {
    console.error("Erro ao atualizar subtarefa:", error);
  }
}

async function handleDeleteSubTopic(e, topicId, subIdx) {
  if (!currentSubjectId) return;

  try {
    const topicRef = getSubjectTopicDoc(currentSubjectId, topicId);
    const docSnap = await getDoc(topicRef);
    if (!docSnap.exists()) return;

    const data = docSnap.data();
    let subtasks = data.subtasks || [];

    // Remove o item pelo índice
    subtasks.splice(subIdx, 1);

    // Recalcula se todos estão completos (se array vazio, decidimos se fica false ou true. Geralmente false se não tem nada a fazer)
    const allCompleted =
      subtasks.length > 0 && subtasks.every((sub) => sub.completed);

    await updateDoc(topicRef, {
      subtasks: subtasks,
      completed: subtasks.length > 0 ? allCompleted : false, // Se não sobrar nada, desmarca o pai
    });
  } catch (error) {
    console.error("Erro ao deletar subtarefa:", error);
  }
}

async function handleAddSubjectTopic(e) {
  e.preventDefault();
  const form = e.target;
  const text = form.topicText.value;
  if (!text || !currentSubjectId) return;

  try {
    await addDoc(getSubjectTopicsCollection(currentSubjectId), {
      text: text,
      completed: false,
      createdAt: serverTimestamp(),
    });
    form.reset();
  } catch (error) {
    console.error("Erro ao adicionar tópico:", error);
  }
}

async function handleToggleSubjectTopic(e, topicId) {
  if (!currentSubjectId) return;
  try {
    await updateDoc(getSubjectTopicDoc(currentSubjectId, topicId), {
      completed: e.target.checked,
    });
  } catch (error) {
    console.error("Erro ao atualizar tópico:", error);
  }
}

async function handleDeleteSubjectTopic(e, topicId) {
  if (!currentSubjectId) return;
  try {
    await deleteDoc(getSubjectTopicDoc(currentSubjectId, topicId));
  } catch (error) {
    console.error("Erro ao deletar tópico:", error);
  }
}

async function handleAddSubjectLiveClass(e) {
  e.preventDefault();
  const form = e.target;
  const text = form.classText.value;
  if (!text || !currentSubjectId) return;

  try {
    await addDoc(getSubjectLiveClassesCollection(currentSubjectId), {
      text: text,
      completed: false,
      createdAt: serverTimestamp(),
    });
    form.reset();
  } catch (error) {
    console.error("Erro ao adicionar aula:", error);
  }
}

async function handleToggleSubjectLiveClass(e, classId) {
  if (!currentSubjectId) return;
  try {
    await updateDoc(getSubjectLiveClassDoc(currentSubjectId, classId), {
      completed: e.target.checked,
    });
  } catch (error) {
    console.error("Erro ao atualizar aula:", error);
  }
}

async function handleDeleteSubjectLiveClass(e, classId) {
  if (!currentSubjectId) return;
  try {
    await deleteDoc(getSubjectLiveClassDoc(currentSubjectId, classId));
  } catch (error) {
    console.error("Erro ao deletar aula:", error);
  }
}

async function handleSaveSubjectSchedule(e) {
  e.preventDefault();
  if (!currentSubjectId) return;

  const form = e.target;
  const formData = new FormData(form);

  const selectedDays = formData.getAll("day");
  const selectedTimes = formData.getAll("time");

  const newSchedule = {};
  scheduleDays.forEach((day) => {
    if (selectedDays.includes(day)) {
      newSchedule[day] = selectedTimes;
    } else {
      newSchedule[day] = [];
    }
  });

  try {
    await updateDoc(getSubjectDoc(currentSubjectId), {
      schedule: newSchedule,
    });
    showModal("Sucesso", "Horários atualizados.");
  } catch (error) {
    console.error("Erro ao salvar horários:", error);
    showModal("Erro", "Não foi possível salvar os horários.");
  }
}

function renderSubjectTaskKanban(tasks) {
  const columns = {
    todo: document.getElementById("subject-kanban-todo"),
    doing: document.getElementById("subject-kanban-doing"),
    done: document.getElementById("subject-kanban-done"),
  };

  Object.values(columns).forEach((col) => {
    if (col) col.innerHTML = "";
  });

  const taskMap = { todo: [], doing: [], done: [] };
  tasks.forEach((task) => {
    if (taskMap[task.status]) {
      taskMap[task.status].push(task);
    } else {
      taskMap["todo"].push(task);
    }
  });

  Object.keys(columns).forEach((statusKey) => {
    const col = columns[statusKey];
    if (!col) return;

    if (taskMap[statusKey].length === 0) {
      // 💡 HTML DE ESTADO VAZIO ATUALIZADO
      let icon = "plus-circle";
      let text = "Nenhuma tarefa";
      if (statusKey === "doing") icon = "play";
      if (statusKey === "done") icon = "check";

      col.innerHTML = `
                        <div class="text-center py-8 text-zinc-500">
                            <i data-lucide="${icon}" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
                            <p class="text-sm">${text}</p>
                        </div>`;
    } else {
      taskMap[statusKey].forEach((task) => {
        const card = createSubjectTaskCard(task);
        col.appendChild(card);
      });
    }

    new Sortable(col, {
      group: `subjectTasks-${currentSubjectId}`,
      animation: 150,
      ghostClass: "opacity-50",
      draggable: ".task-card",
      onEnd: (evt) => {
        const taskId = evt.item.dataset.id;
        const newStatus = evt.to.id.replace("subject-kanban-", "");
        updateSubjectTaskStatus(taskId, newStatus);
      },
    });
  });

  if (typeof lucide !== "undefined") lucide.createIcons();
}

function createSubjectTaskCard(task) {
    const card = document.createElement('div');
    card.dataset.id = task.id;

    // Define cores baseadas no status
    const borderClass = task.status === 'done' ? 'border-l-4 border-green-500' : 
                       (task.status === 'doing' ? 'border-l-4 border-yellow-500' : 'border-l-4 border-zinc-600');

    card.className = `${COLORS.bgSecondary} p-3 rounded shadow cursor-move text-sm task-card ${borderClass} flex flex-col gap-2`;

    // Formata Data e Hora
    let dateDisplay = '';
    if (task.dueDate) {
        const dateObj = new Date(task.dueDate + 'T12:00:00');
        const dateStr = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        const timeStr = task.dueTime ? ` às ${task.dueTime}` : ''; // Adiciona a hora se existir
        
        // Lógica visual de atraso
        const isLate = new Date(task.dueDate) < new Date().setHours(0,0,0,0) && task.status !== 'done';
        const dateColor = isLate ? 'text-red-400' : 'text-zinc-400';
        
        dateDisplay = `<div class="flex items-center gap-1 ${dateColor} text-xs">
            <i data-lucide="calendar" class="w-3 h-3"></i>
            <span>${dateStr}${timeStr}</span>
        </div>`;
    }

    card.innerHTML = `
        <div class="flex justify-between items-start">
            <span class="font-medium text-white leading-tight">${task.title}</span>
            <button data-delete-id="${task.id}" class="text-zinc-500 hover:text-red-500 flex-shrink-0 ml-2">
                &times;
            </button>
        </div>
        ${task.description ? `<p class="text-xs text-zinc-500 line-clamp-2">${task.description}</p>` : ''}
        ${dateDisplay}
    `;

    // Listeners (iguais ao anterior)
    card.addEventListener('click', (e) => {
        if (e.target.closest('[data-delete-id]')) return;
        showSubjectTaskDetails(task);
    });

    card.querySelector(`[data-delete-id="${task.id}"]`).addEventListener('click', async (e) => {
        e.stopPropagation();
        if (await showConfirmModal('Excluir Tarefa?', 'Excluir esta tarefa da disciplina?')) {
            try {
                await deleteDoc(getSubjectTaskDoc(currentSubjectId, task.id));
            } catch (error) { console.error("Erro ao deletar tarefa:", error); }
        }
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
    return card;
}

async function updateSubjectTaskStatus(taskId, newStatus) {
  if (!currentSubjectId) return;
  try {
    await updateDoc(getSubjectTaskDoc(currentSubjectId, taskId), {
      status: newStatus,
    });
  } catch (error) {
    console.error("Erro ao atualizar status da tarefa:", error);
  }
}

function showAddSubjectTaskForm() {
    const formHtml = `
        <form id="form-add-subject-task-modal" class="space-y-4">
            <input type="text" name="title" required class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md" placeholder="Título (ex: Listas Encadeadas)">
            
            <textarea name="description" rows="4" class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md font-mono text-sm" placeholder="Descrição (ex: Entender struct nó...)"></textarea>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-zinc-300 mb-1">Data</label>
                    <input type="date" name="dueDate" required class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md text-zinc-300">
                </div>
                <div>
                    <label class="block text-sm font-medium text-zinc-300 mb-1">Horário (Opcional)</label>
                    <input type="time" name="dueTime" class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md text-zinc-300">
                </div>
            </div>

            <div>
                <label class="block text-sm font-medium text-zinc-300 mb-1">Recorrência</label>
                <select name="recurrence" class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md">
                    <option value="none">Nenhuma</option>
                    <option value="daily">Diária</option>
                    <option value="weekly">Semanal</option>
                </select>
            </div>
            <button type="submit" class="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 rounded-md font-semibold">Salvar Tarefa</button>
        </form>
    `;
    openSlideOver(formHtml, "Nova Tarefa da Disciplina");
    document.getElementById('form-add-subject-task-modal').addEventListener('submit', handleAddSubjectTask);
}

async function handleAddSubjectTask(e) {
    e.preventDefault();
    if (!currentSubjectId) return;

    const form = e.target;
    const title = form.title.value;
    const description = form.description.value;
    const dueDate = form.dueDate.value;
    const dueTime = form.dueTime.value; // <--- NOVO
    const recurrence = form.recurrence.value;

    try {
        await addDoc(getSubjectTasksCollection(currentSubjectId), {
            title,
            description: description || "",
            dueDate: dueDate || null,
            dueTime: dueTime || null, // <--- SALVANDO NO BANCO
            recurrence: recurrence || "none",
            status: 'todo',
            notified: false,
            createdAt: serverTimestamp()
        });
        form.reset();
        closeSlideOver();
    } catch (error) { console.error("Erro ao adicionar tarefa da disciplina:", error); }
}

function showSubjectTaskDetails(task) {
  const formHtml = `
                <form id="form-edit-subject-task-modal" class="space-y-4">
                    <input type="text" name="title" required value="${
                      task.title
                    }" class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md" placeholder="Título da tarefa...">
                    <textarea name="description" rows="10" 
                    class="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm whitespace-pre-wrap leading-relaxed" 
                    placeholder="Use quebras de linha para listar informações (como no seu print).">${
                      task.description || ""
                    }</textarea>
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-1">Data de Entrega</label>
                        <input type="date" name="dueDate" value="${
                          task.dueDate || ""
                        }" class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md text-zinc-300">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-1">Recorrência</label>
                        <select name="recurrence" class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md">
                            <option value="none">Nenhuma</option>
                            <option value="daily">Diária</option>
                            <option value="weekly">Semanal</option>
                        </select>
                    </div>
                    <button type="submit" class="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 rounded-md font-semibold">Salvar Alterações</button>
                </form>
            `;
  openSlideOver(formHtml, "Editar Tarefa");

  document.querySelector(
    '#form-edit-subject-task-modal [name="recurrence"]'
  ).value = task.recurrence || "none";

  document
    .getElementById("form-edit-subject-task-modal")
    .addEventListener("submit", (e) => {
      e.preventDefault();
      handleSaveSubjectTaskDetails(e, task.id);
    });
}

async function handleSaveSubjectTaskDetails(e, taskId) {
  if (!currentSubjectId) return;
  const form = e.target;

  const updateData = {
    title: form.title.value,
    description: form.description.value,
    dueDate: form.dueDate.value || null,
    recurrence: form.recurrence.value || "none",
  };

  const oldTask = allSubjectTasks[currentSubjectId]?.find(
    (t) => t.id === taskId
  );

  if (oldTask && oldTask.dueDate !== updateData.dueDate) {
    updateData.notified = false;
    updateData.overdueNotified = false;
  }

  try {
    await updateDoc(getSubjectTaskDoc(currentSubjectId, taskId), updateData);
    closeSlideOver();
  } catch (error) {
    console.error("Erro ao salvar tarefa da disciplina:", error);
  }
}

function initCalendar() {
  const calendarEl = document.getElementById("calendar-container");
  if (!calendarEl || calendar) return;

  calendarEl.innerHTML = "";

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "pt-br",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,listWeek",
    },
    buttonText: {
      today: "Hoje",
      month: "Mês",
      week: "Semana",
      list: "Lista",
    },
    events: [],

    eventClick: function (info) {
      const props = info.event.extendedProps;
      const taskType = props.taskType;
      const taskId = props.taskId;

      if (taskType === "main") {
        showTaskDetails(taskId);
      } else if (taskType === "project") {
        const projectId = props.projectId;

        const task = allProjectTasks[projectId]?.find((t) => t.id === taskId);

        if (task) {
          currentProjectId = projectId;

          showProjectTaskDetails(task);
        } else {
          showModal(
            "Erro",
            "Não foi possível encontrar os dados desta tarefa de projeto."
          );
        }
      } else if (taskType === "subject") {
        const subjectId = props.subjectId;

        const task = allSubjectTasks[subjectId]?.find((t) => t.id === taskId);

        if (task) {
          currentSubjectId = subjectId;

          showSubjectTaskDetails(task);
        } else {
          showModal(
            "Erro",
            "Não foi possível encontrar os dados desta tarefa de disciplina."
          );
        }
      }
    },

    dateClick: function (info) {
      renderAgenda(info.date);
      document
        .querySelectorAll(".fc-day-selected")
        .forEach((d) => d.classList.remove("fc-day-selected"));
      info.dayEl.classList.add("fc-day-selected");
    },
  });

  renderAgenda(new Date());

  setTimeout(() => {
    const todayEl = document.querySelector(".fc-day-today");
    if (todayEl && !document.querySelector(".fc-day-selected")) {
      todayEl.classList.add("fc-day-selected");
    }
  }, 50);
}

function getAllCalendarEvents() {
    let events = [];
    const todayStr = new Date().toISOString().split('T')[0];

    // Helper para formatar data ISO (YYYY-MM-DD) + Hora (HH:MM) para o FullCalendar
    const formatEventStart = (date, time) => {
        return time ? `${date}T${time}:00` : date;
    };

    // 1. Tarefas Gerais
    allTasks.filter(t => t.dueDate).forEach(t => {
        let color = '#3b82f6'; // Azul
        if (t.status === 'done') color = '#22c55e';
        else if (t.status === 'overdue' || (t.dueDate < todayStr && t.status !== 'done')) color = '#ef4444';
        else if (t.status === 'doing') color = '#eab308';

        events.push({
            id: t.id,
            title: t.title,
            start: formatEventStart(t.dueDate, t.dueTime), // Usa a hora se tiver
            allDay: !t.dueTime, // Se não tiver hora, é dia todo
            color: color,
            textColor: '#ffffff',
            extendedProps: { taskType: 'main', taskId: t.id, source: 'Pessoal' }
        });
    });

    // 2. Tarefas da Agência
    Object.values(allProjectTasks).flat().filter(t => t.dueDate).forEach(t => {
        events.push({
            id: `${t.projectId}-${t.id}`,
            title: `[Proj] ${t.title}`,
            start: formatEventStart(t.dueDate, t.dueTime),
            allDay: !t.dueTime,
            color: '#8b5cf6', // Roxo
            textColor: '#ffffff',
            extendedProps: { taskType: 'project', taskId: t.id, projectId: t.projectId, source: 'Agência' }
        });
    });

    // 3. Tarefas da Faculdade (AQUI ENTRA SEU PEDIDO)
    Object.values(allSubjectTasks).flat().filter(t => t.dueDate).forEach(t => {
        events.push({
            id: `${t.subjectId}-${t.id}`,
            title: `[Estudo] ${t.title}`, // Prefixo para identificar fácil
            start: formatEventStart(t.dueDate, t.dueTime),
            allDay: !t.dueTime,
            color: '#ec4899', // Rosa
            textColor: '#ffffff',
            extendedProps: { 
                taskType: 'subject', 
                taskId: t.id, 
                subjectId: t.subjectId, 
                source: 'Faculdade',
                description: t.description // Passa a descrição para usar no tooltip se quiser
            }
        });
    });

    // 4. Aulas Recorrentes (Mantém igual)
    allSubjects.forEach(subject => {
        if (!subject.schedule) return;
        scheduleDays.forEach(day => {
            if (subject.schedule[day] && subject.schedule[day].length > 0) {
                subject.schedule[day].forEach(timeSlot => {
                    const [startTime, endTime] = timeSlot.split(' - ');
                    events.push({
                        id: `${subject.id}-${day}-${timeSlot}`,
                        title: `Aula: ${subject.name}`,
                        daysOfWeek: [scheduleDays.indexOf(day) + 1],
                        startTime: startTime,
                        endTime: endTime,
                        color: '#a855f7', // Roxo escuro
                        textColor: '#ffffff',
                        extendedProps: { taskType: 'class', source: 'Horário Fixo' }
                    });
                });
            }
        });
    });

    return events;
}

function updateCalendar() {
  if (!calendar) return;

  const allEvents = getAllCalendarEvents();
  calendar.removeAllEvents();
  calendar.addEventSource(allEvents);
}

function renderAgenda(date) {
  const titleEl = document.getElementById("calendar-agenda-title");
  const listEl = document.getElementById("calendar-agenda-list");
  const selectedDateEl = document.getElementById("selected-date");

  const locale = "pt-BR";
  const dayName = date.toLocaleDateString(locale, { weekday: "long" });
  const dateName = date.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
  });

  titleEl.innerHTML = `<i data-lucide="calendar-days" class="w-5 h-5"></i> Agenda de ${dayName}`;
  selectedDateEl.textContent = dateName;

  if (typeof lucide !== "undefined") lucide.createIcons();

  listEl.innerHTML = "";

  const allEvents = getAllCalendarEvents();
  const dateString = date.toISOString().split("T")[0];

  const eventsForDay = allEvents.filter((event) => {
    if (event.start === dateString) {
      return true;
    }

    if (event.daysOfWeek && event.daysOfWeek.includes(date.getDay())) {
      return true;
    }
    return false;
  });

  if (eventsForDay.length === 0) {
    listEl.innerHTML = `
                    <div class="text-center py-8 text-zinc-500">
                        <i data-lucide="calendar" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
                        <p class="text-sm">Nenhum evento para este dia</p>
                    </div>`;
    if (typeof lucide !== "undefined") lucide.createIcons();
    return;
  }

  eventsForDay.sort((a, b) =>
    (a.startTime || "23:59").localeCompare(b.startTime || "23:59")
  );

  eventsForDay.forEach((event) => {
    const item = document.createElement("div");
    item.className = "p-3 bg-zinc-700 rounded-md";

    const time = event.startTime
      ? `${event.startTime} - ${event.endTime}`
      : "Dia todo";

    item.innerHTML = `
                    <span class="text-xs font-medium ${
                      COLORS.textSecondary
                    }">${time}</span>
                    <p class="font-semibold">${event.title}</p>
                    <span class="text-xs font-medium" style="color: ${
                      event.color || "#3b82f6"
                    }">${event.extendedProps.source}</span>
                `;
    listEl.appendChild(item);
  });
}

function renderUpcomingEvents() {
  const listEl = document
    .getElementById("calendar-agenda-list")
    ?.parentElement.querySelector(".border-t .space-y-3");
  if (!listEl) return;

  const allEvents = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  allTasks
    .filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate + "T12:00:00") >= today &&
        t.status !== "done"
    )
    .forEach((t) => {
      allEvents.push({
        date: new Date(t.dueDate + "T12:00:00"),
        title: t.title,
        source: "Minhas Tarefas",
        colorClass: "bg-blue-500",
      });
    });

  Object.values(allProjectTasks)
    .flat()
    .filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate + "T12:00:00") >= today &&
        t.status !== "done"
    )
    .forEach((t) => {
      allEvents.push({
        date: new Date(t.dueDate + "T12:00:00"),
        title: `[${t.projectTitle}] ${t.title}`,
        source: "Agência",
        colorClass: "bg-purple-500",
      });
    });

  Object.values(allSubjectTasks)
    .flat()
    .filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate + "T12:00:00") >= today &&
        t.status !== "done"
    )
    .forEach((t) => {
      allEvents.push({
        date: new Date(t.dueDate + "T12:00:00"),
        title: `[${t.subjectName}] ${t.title}`,
        source: "Faculdade",
        colorClass: "bg-green-500",
      });
    });

  allEvents.sort((a, b) => a.date - b.date);

  const upcoming = allEvents.slice(0, 3);

  listEl.innerHTML = "";
  if (upcoming.length === 0) {
    listEl.innerHTML =
      '<p class="text-sm text-zinc-500 p-3">Nenhum evento futuro encontrado.</p>';
    return;
  }

  const locale = "pt-BR";
  upcoming.forEach((event) => {
    const eventDateStr = event.date.toISOString().split("T")[0];
    const todayStr = new Date().toISOString().split("T")[0];
    const tomorrowStr = new Date(today.getTime() + 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    let dateLabel = "";
    if (eventDateStr === todayStr) {
      dateLabel = "Hoje";
    } else if (eventDateStr === tomorrowStr) {
      dateLabel = "Amanhã";
    } else {
      dateLabel = event.date.toLocaleDateString(locale, {
        day: "numeric",
        month: "short",
      });
    }

    const itemEl = document.createElement("div");
    itemEl.className =
      "flex items-center gap-3 p-3 bg-zinc-700/50 rounded-lg border border-zinc-600";
    itemEl.innerHTML = `
                    <div class="w-2 h-2 ${event.colorClass} rounded-full"></div>
                    <div class="flex-1">
                        <p class="text-white text-sm font-medium">${event.title}</p>
                        <p class="text-zinc-400 text-xs">${event.source} • ${dateLabel}</p>
                    </div>
                `;
    listEl.appendChild(itemEl);
  });
}

let pomodoroAudioContext; // Contexto de áudio reutilizável

// Função para tocar o som de 'tick'
function playPomodoroTick() {
  if (!pomodoroAudioContext) return;

  try {
    const oscillator = pomodoroAudioContext.createOscillator();
    const gainNode = pomodoroAudioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(pomodoroAudioContext.destination);

    oscillator.type = "sine"; // Um "beep" curto
    oscillator.frequency.setValueAtTime(880, pomodoroAudioContext.currentTime); // Frequência (A5)
    gainNode.gain.setValueAtTime(0.3, pomodoroAudioContext.currentTime); // Volume sutil

    oscillator.start(pomodoroAudioContext.currentTime);
    // Para o som bem rápido
    gainNode.gain.exponentialRampToValueAtTime(
      0.00001,
      pomodoroAudioContext.currentTime + 0.05
    );
    oscillator.stop(pomodoroAudioContext.currentTime + 0.05);
  } catch (e) {
    console.error("Erro ao tocar o som de tick:", e);
  }
}

const pomodoro = {
  modes: {
    focus: 25,
    short: 5,
    long: 15,
  },
  currentMode: "focus",
  timerId: null,
  timeRemaining: 25 * 60,
  isRunning: false,
  ui: {},

  init() {
    this.ui = {
      time: document.getElementById("pomodoro-time"),
      startBtn: document.getElementById("pomodoro-start"),
      resetBtn: document.getElementById("pomodoro-reset"),
      modeBtnFocus: document.getElementById("pomodoro-mode-focus"),
      modeBtnShort: document.getElementById("pomodoro-mode-short"),
      modeBtnLong: document.getElementById("pomodoro-mode-long"),
    };
    this.updateDisplay();
  },

  setMode(mode) {
    this.currentMode = mode;
    this.reset();
  },

  updateDisplay() {
    const minutes = Math.floor(this.timeRemaining / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (this.timeRemaining % 60).toString().padStart(2, "0");
    const timeStr = `${minutes}:${seconds}`;

    // 1. Atualiza o texto do tempo (como antes)
    if (this.ui.time) this.ui.time.textContent = timeStr;
    document.getElementById("pomodoro-time-focus").textContent = timeStr;

    // 2. Atualiza o título da página (como antes)
    if (this.isRunning) {
      document.title = `${timeStr} - ${this.currentMode}`;
    } else {
      document.title = currentDefaultTitle;
    }

    // 3. 💡 NOVO: Lógica de atualização do círculo SVG
    const progressBar = document.getElementById("pomodoro-progress-bar");
    if (progressBar) {
      const totalDuration = this.modes[this.currentMode] * 60;
      const radius = progressBar.r.baseVal.value;
      const circumference = 2 * Math.PI * radius; // Circunferência

      // Progresso de "enchimento" (0 no início, 1 no fim)
      const progress = (totalDuration - this.timeRemaining) / totalDuration;

      // Calcula o "vazio" (offset)
      const offset = circumference - progress * circumference;

      // Define o tamanho total do traço
      progressBar.style.strokeDasharray = `${circumference} ${circumference}`;
      // Define o quanto do traço está "vazio"
      progressBar.style.strokeDashoffset = offset;
    }
    // 4. Fim da lógica SVG

    // 5. Atualiza os botões (como antes)
    if (this.ui.modeBtnFocus) {
      this.ui.modeBtnFocus.classList.toggle(
        "bg-blue-500",
        this.currentMode === "focus"
      );
      this.ui.modeBtnFocus.classList.toggle(
        "text-white",
        this.currentMode === "focus"
      );
      this.ui.modeBtnFocus.classList.toggle(
        "hover:bg-zinc-600",
        this.currentMode !== "focus"
      );
      this.ui.modeBtnFocus.classList.toggle(
        "bg-zinc-700",
        this.currentMode !== "focus"
      );

      this.ui.modeBtnShort.classList.toggle(
        "bg-blue-500",
        this.currentMode === "short"
      );
      this.ui.modeBtnShort.classList.toggle(
        "text-white",
        this.currentMode === "short"
      );
      this.ui.modeBtnShort.classList.toggle(
        "hover:bg-zinc-600",
        this.currentMode !== "short"
      );
      this.ui.modeBtnShort.classList.toggle(
        "bg-zinc-700",
        this.currentMode !== "short"
      );

      this.ui.modeBtnLong.classList.toggle(
        "bg-blue-500",
        this.currentMode === "long"
      );
      this.ui.modeBtnLong.classList.toggle(
        "text-white",
        this.currentMode === "long"
      );
      this.ui.modeBtnLong.classList.toggle(
        "hover:bg-zinc-600",
        this.currentMode !== "long"
      );
      this.ui.modeBtnLong.classList.toggle(
        "bg-zinc-700",
        this.currentMode !== "long"
      );
    }
  },

  start() {
    if (this.isRunning) {
      this.pause();
    } else {
      // 💡 INICIALIZA O CONTEXTO DE ÁUDIO (SE FOR A PRIMEIRA VEZ)
      if (!pomodoroAudioContext) {
        try {
          pomodoroAudioContext = new (window.AudioContext ||
            window.webkitAudioContext)();
        } catch (e) {
          console.warn("Web Audio API não suportada.", e);
        }
      }

      this.isRunning = true;
      if (this.ui.startBtn) {
        this.ui.startBtn.innerHTML =
          '<i data-lucide="pause" class="w-5 h-5"></i> Pausar';
      }
      document.getElementById("pomodoro-start-focus").textContent = "Pausar";

      this.timerId = setInterval(() => {
        this.timeRemaining--;
        this.updateDisplay();

        // 💡 LÓGICA DO SOM DE CONTAGEM REGRESSIVA
        if (this.timeRemaining <= 5 && this.timeRemaining > 0) {
          if (pomodoroAudioContext) {
            playPomodoroTick();
          }
        }
        // FIM DA LÓGICA DO SOM

        if (this.timeRemaining <= 0) {
          this.completeCycle();
        }
      }, 1000);

      if (typeof lucide !== "undefined") lucide.createIcons();
    }
  },

  pause() {
    this.isRunning = false;
    if (this.ui.startBtn) {
      this.ui.startBtn.innerHTML =
        '<i data-lucide="play" class="w-5 h-5"></i> Iniciar';
    }
    document.getElementById("pomodoro-start-focus").textContent = "Iniciar";

    clearInterval(this.timerId);
    if (typeof lucide !== "undefined") lucide.createIcons();
  },

  reset() {
    this.pause();
    this.timeRemaining = this.modes[this.currentMode] * 60;
    this.updateDisplay();
  },

  async completeCycle() {
    this.pause();

    // 💡 USA O CONTEXTO DE ÁUDIO JÁ EXISTENTE
    if (pomodoroAudioContext) {
      try {
        // Toca o som de "concluído" (diferente do "tick")
        const oscillator = pomodoroAudioContext.createOscillator();
        const gainNode = pomodoroAudioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(pomodoroAudioContext.destination);
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(
          440,
          pomodoroAudioContext.currentTime
        ); // Som mais grave (A4)
        gainNode.gain.setValueAtTime(0.5, pomodoroAudioContext.currentTime);
        oscillator.start();
        oscillator.stop(pomodoroAudioContext.currentTime + 0.5); // Toca por 0.5s
      } catch (e) {
        console.warn("Não foi possível tocar o som de notificação.", e);
      }
    }
    // (O código antigo de criação de áudio foi removido daqui)

    const duration = this.modes[this.currentMode];
    const taskSelect = document.getElementById("pomodoro-task-select");
    // ... (o resto da função completeCycle permanece igual) ...
    const selectedTaskValue = taskSelect.value;
    const selectedTaskText = taskSelect.options[taskSelect.selectedIndex].text;

    let notificationTitle = "";
    let notificationBody = "";

    if (this.currentMode === "focus") {
      notificationTitle = "Sessão de Foco Concluída!";
      notificationBody = "Bom trabalho! Hora de uma pausa.";

      if (userId) {
        try {
          await addDoc(getFocusHistoryCollection(), {
            duration: duration,
            taskRef: selectedTaskValue || null,
            taskTitle: selectedTaskValue ? selectedTaskText : "Foco geral",
            createdAt: serverTimestamp(),
          });
        } catch (error) {
          console.error("Erro ao salvar histórico de foco:", error);
        }
      }
    } else {
      notificationTitle = "Pausa Concluída!";
      notificationBody = selectedTaskValue
        ? `Hora de focar em: ${selectedTaskText}`
        : "Hora de voltar ao foco!";
    }

    if (Notification.permission === "granted") {
      new Notification(notificationTitle, {
        body: notificationBody,
      });
    }

    if (this.currentMode === "focus") {
      this.setMode("short");
    } else {
      this.setMode("focus");
    }

    this.start();
  },
};

function toggleFocusMode() {
  const appWrapper = document.getElementById("app-wrapper");
  const focusContainer = document.getElementById("total-focus-container");
  const isEnteringFocusMode = focusContainer.classList.contains("hidden");

  if (isEnteringFocusMode) {
    // Entrando no modo foco
    appWrapper.classList.add("hidden");
    appWrapper.classList.remove("flex");
    focusContainer.classList.remove("hidden");
    focusContainer.classList.add("flex");

    // Mostra o player de música flutuante
    const musicPlayer = document.getElementById("custom-music-player");
    if (musicPlayer) {
      musicPlayer.classList.add("active");
    }

    // 💡 NOVO: Carrega o último plano de fundo usado
    setFocusBackground(currentFocusBackground);

    pomodoro.updateDisplay();

    const taskSelect = document.getElementById("pomodoro-task-select");
    const selectedTaskText = taskSelect.options[taskSelect.selectedIndex].text;
    const taskTitleEl = document.getElementById("focus-mode-task-title");

    if (taskSelect.value) {
      taskTitleEl.textContent = selectedTaskText;
    } else {
      taskTitleEl.textContent = "Nenhuma tarefa selecionada";
    }

    if (typeof lucide !== "undefined") lucide.createIcons();
  } else {
    // Saindo do modo foco
    appWrapper.classList.remove("hidden");
    appWrapper.classList.add("flex");
    focusContainer.classList.add("hidden");
    focusContainer.classList.remove("flex");

    // Esconde o player de música e para o áudio
    const musicPlayer = document.getElementById("custom-music-player");
    if (musicPlayer) {
      musicPlayer.classList.remove("active");
    }
    pauseTrack(); // Garante que a música para

    // 💡 NOVO: Pausa os vídeos de fundo
    pauseFocusVideos();
  }
}

function updatePomodoroTaskSelect() {
  const select = document.getElementById("pomodoro-task-select");
  if (!select) return;

  const currentValue = select.value;
  select.innerHTML = '<option value="">Nenhuma tarefa selecionada</option>';

  const tasksGroup = document.createElement("optgroup");
  tasksGroup.label = "Minhas Tarefas";
  allTasks
    .filter((t) => t.status !== "done")
    .forEach((t) => {
      tasksGroup.appendChild(new Option(t.title, `tasks/${t.id}`));
    });
  select.appendChild(tasksGroup);

  const agencyGroup = document.createElement("optgroup");
  agencyGroup.label = "Agência";
  Object.values(allProjectTasks)
    .flat()
    .filter((t) => t.status !== "done")
    .forEach((t) => {
      agencyGroup.appendChild(
        new Option(
          `[${t.projectTitle}] ${t.title}`,
          `agencyProjects/${t.projectId}/tasks/${t.id}`
        )
      );
    });
  select.appendChild(agencyGroup);

  const collegeGroup = document.createElement("optgroup");
  collegeGroup.label = "Faculdade (Tarefas)";
  Object.values(allSubjectTasks)
    .flat()
    .filter((t) => t.status !== "done")
    .forEach((t) => {
      collegeGroup.appendChild(
        new Option(
          `[${t.subjectName}] ${t.title}`,
          `subjects/${t.subjectId}/tasks/${t.id}`
        )
      );
    });
  select.appendChild(collegeGroup);

  const subjectsGroup = document.createElement("optgroup");
  subjectsGroup.label = "Disciplinas (Estudo)";
  allSubjects.forEach((subject) => {
    subjectsGroup.appendChild(
      new Option(subject.name, `subjects/${subject.id}`)
    );
  });
  select.appendChild(subjectsGroup);

  select.value = currentValue;
}

function renderFocusHistory(history) {
  const list = document.getElementById("focus-history-list");
  if (!list) return;
  list.innerHTML = ""; // Limpa a lista

  if (history.length === 0) {
    list.innerHTML = `
                    <div class="text-center py-6 text-zinc-500">
                        <i data-lucide="clock" class="w-10 h-10 mx-auto mb-2 opacity-50"></i>
                        <p class="text-sm">Nenhum ciclo de foco registrado</p>
                    </div>`;
    if (typeof lucide !== "undefined") lucide.createIcons();
    return;
  }

  const locale = "pt-BR";
  history.forEach((item) => {
    // Cria o elemento principal do item
    const el = document.createElement("div");
    // Adiciona 'group' e 'relative' para o efeito de hover no botão
    el.className = `p-2 ${COLORS.bgCard} rounded-md group relative flex justify-between items-center`;

    const date = item.createdAt?.toDate
      ? item.createdAt
          .toDate()
          .toLocaleString(locale, {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })
      : "...";

    // Define o HTML interno com o botão de exclusão
    el.innerHTML = `
                    <div>
                        <span class="font-medium text-sm">${item.taskTitle}</span>
                        <p class="text-xs ${COLORS.textSecondary}">${date}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-sm text-blue-400 shrink-0">${item.duration} min</span>
                        
                        <button data-delete-id="${item.id}" class="p-1 text-zinc-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <i data-lucide="trash-2" class="w-3 h-3 pointer-events-none"></i>
                        </button>
                    </div>
                `;

    // Adiciona o event listener ao botão que acabamos de criar
    el.querySelector(`[data-delete-id="${item.id}"]`).addEventListener(
      "click",
      (e) => {
        e.stopPropagation(); // Impede que o clique se propague
        handleDeleteFocusHistory(item.id);
      }
    );

    // Adiciona o item completo à lista no DOM
    list.appendChild(el);
  });

  // Renderiza os ícones do Lucide
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

async function handleDeleteFocusHistory(itemId) {
  if (!userId) return;

  // Pergunta ao usuário se ele tem certeza
  const confirmed = await showConfirmModal(
    "Excluir Registro?",
    "Tem certeza que deseja excluir este registro de foco?"
  );

  if (confirmed) {
    try {
      // Cria a referência direta para o documento do histórico de foco
      const docRef = doc(db, `${getBasePath()}/focusHistory/${itemId}`);

      // Exclui o documento
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Erro ao excluir histórico de foco:", error);
      showModal("Erro", "Não foi possível excluir o registro.");
    }
  }
}

document.getElementById("current-date").textContent =
  new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

function animateNumber() {
  const streakElement = document.getElementById("streak-counter");
  if (streakElement) {
    streakElement.classList.add("number-pop");
    setTimeout(() => {
      streakElement.classList.remove("number-pop");
    }, 500);
  }
}

function updateFlameLevel(currentStreak) {
  const flameElement = document.getElementById("streak-flame");
  if (!flameElement) return;

  flameElement.classList.remove(
    "streak-level-1",
    "streak-level-2",
    "streak-level-3"
  );

  if (currentStreak >= 30) {
    flameElement.classList.add("streak-level-3");
  } else if (currentStreak >= 7) {
    flameElement.classList.add("streak-level-2");
  } else if (currentStreak >= 1) {
    flameElement.classList.add("streak-level-1");
  }
}

function openMobileMenu() {
  const nav = document.getElementById("sidebar-nav");
  const overlay = document.getElementById("mobile-menu-overlay");
  if (!nav || !overlay) return;

  nav.classList.remove("-translate-x-full");
  nav.classList.add("translate-x-0");
  overlay.classList.remove("hidden");
}

function closeMobileMenu() {
  const nav = document.getElementById("sidebar-nav");
  const overlay = document.getElementById("mobile-menu-overlay");
  if (!nav || !overlay) return;

  nav.classList.remove("translate-x-0");
  nav.classList.add("-translate-x-full");
  overlay.classList.add("hidden");
}

function renderTaskStatusSummary(allCombinedTasks) {
  const summaryEl = document.getElementById("task-status-summary");
  if (!summaryEl) return;

  summaryEl.innerHTML = ""; // Limpa o conteúdo de carregamento

  const categories = {
    // MODIFICAÇÃO 1: Trocamos as classes de 'color' por códigos hexadecimais em 'colorHex'
    main: {
      name: "Minhas Tarefas",
      icon: "check-square",
      colorHex: "#3b82f6", // blue-500
      pending: 0,
      completed: 0,
      doing: 0,
    },
    agency: {
      name: "Projetos (Agência)",
      icon: "folder-open",
      colorHex: "#8b5cf6", // purple-500
      pending: 0,
      completed: 0,
      doing: 0,
    },
    college: {
      name: "Faculdade (Disciplinas)",
      icon: "graduation-cap",
      colorHex: "#22c55e", // green-500
      pending: 0,
      completed: 0,
      doing: 0,
    },
  };

  allCombinedTasks.forEach((task) => {
    let categoryKey = "main";
    if (task.projectId) categoryKey = "agency";
    else if (task.subjectId) categoryKey = "college";

    const status = task.status || "todo";
    if (status === "done") {
      categories[categoryKey].completed++;
    } else if (status === "doing") {
      categories[categoryKey].doing++;
    } else if (status === "todo" || status === "overdue") {
      categories[categoryKey].pending++;
    }
  });

  Object.keys(categories).forEach((key) => {
    const data = categories[key];
    const total = data.pending + data.completed + data.doing;
    const percentage =
      total > 0 ? Math.round((data.completed / total) * 100) : 0;
    const pendingAndDoing = data.pending + data.doing;

    // MODIFICAÇÃO 2: Usamos a variável 'colorHex' para criar estilos inline

    // Cor do ícone com 20% de opacidade (ex: #3b82f633)
    const iconBgColor = `${data.colorHex}33`;

    const cardHtml = `
                    <div class="bg-zinc-700/50 p-5 rounded-xl border border-zinc-600 transition-all duration-300">
                        <div class="flex items-center gap-3 mb-4">
                            <div class="p-3 rounded-lg flex items-center justify-center" style="background-color: ${iconBgColor}">
                                <i data-lucide="${
                                  data.icon
                                }" class="w-6 h-6" style="color: ${
      data.colorHex
    }"></i>
                            </div>
                            <h4 class="text-lg font-semibold text-white">${
                              data.name
                            }</h4>
                        </div>
                        
                        <div class="space-y-3">
                            <button data-task-list-btn data-category="${key}" data-status="completed" ${
      data.completed === 0 ? "disabled" : ""
    } 
                                    class="w-full flex justify-between items-center text-sm p-3 rounded-lg hover:bg-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                <span class="text-zinc-400 font-medium">Concluídas:</span>
                                <span class="text-green-400 font-bold text-xl">${
                                  data.completed
                                }</span>
                            </button>
                            <button data-task-list-btn data-category="${key}" data-status="pending" ${
      pendingAndDoing === 0 ? "disabled" : ""
    } 
                                    class="w-full flex justify-between items-center text-sm p-3 rounded-lg hover:bg-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                <span class="text-zinc-400 font-medium">Pendentes/Em Progresso:</span>
                                <span class="text-red-400 font-bold text-xl">${pendingAndDoing}</span>
                            </button>
                        </div>

                        <div class="mt-4 pt-4 border-t border-zinc-600">
                            <p class="text-sm font-medium text-zinc-300 mb-2">Progresso Geral (${total} total)</p>
                            <div class="w-full bg-zinc-600 rounded-full h-3">
                                <div class="h-3 rounded-full" style="background-color: ${
                                  data.colorHex
                                }; width: ${percentage}%"></div>
                            </div>
                            <p class="text-xs text-zinc-400 mt-1 font-bold">${percentage}% Concluído</p>
                        </div>
                    </div>
                `;
    summaryEl.insertAdjacentHTML("beforeend", cardHtml);
  });

  summaryEl.querySelectorAll("[data-task-list-btn]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const category = btn.dataset.category;
      const status = btn.dataset.status;
      showTaskListModal(category, status, allCombinedTasks);
    });
  });

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

function showTaskListModal(category, status, allCombinedTasks) {
  let title = "";

  const categoryMap = {
    main: "Minhas Tarefas",
    agency: "Projetos (Agência)",
    college: "Faculdade (Disciplinas)",
  };
  const statusMap = {
    pending: "Pendentes/Em Progresso",
    completed: "Concluídas",
  };

  title = `Tarefas ${statusMap[status]} - ${categoryMap[category]}`;

  // 1. Filtra as tarefas pela categoria principal
  const categoryTasks = allCombinedTasks.filter((task) => {
    let categoryMatch = false;
    if (category === "main" && !task.projectId && !task.subjectId)
      categoryMatch = true;
    if (category === "agency" && task.projectId) categoryMatch = true;
    if (category === "college" && task.subjectId) categoryMatch = true;
    return categoryMatch;
  });

  // 2. Cria o HTML para a lista de tarefas
  let contentHtml = "";

  // Função auxiliar para criar o HTML de um item de tarefa
  function _createTaskModalItemHTML(task) {
    let subtext = "Pessoal";
    let taskType = "main";
    let extraData = "";

    if (task.projectId) {
      subtext = `Agência: ${task.projectTitle || "Projeto"}`;
      taskType = "project";
      extraData = `data-project-id="${task.projectId}"`;
    } else if (task.subjectId) {
      subtext = `Faculdade: ${task.subjectName || "Disciplina"}`;
      taskType = "subject";
      extraData = `data-subject-id="${task.subjectId}"`;
    } else if (task.category) {
      subtext = `Pessoal: ${task.category}`;
    }

    // BÔNUS: Adiciona a data de vencimento ao card
    let dueDateHtml = "";
    if (task.dueDate) {
      const today = new Date().toISOString().split("T")[0];
      const dueDate = task.dueDate;
      let dateColor = "text-zinc-400";

      if (dueDate < today && task.status !== "done") {
        dateColor = "text-red-400 font-semibold"; // Atrasada
      } else if (dueDate === today && task.status !== "done") {
        dateColor = "text-yellow-400 font-semibold"; // Vence hoje
      }

      const formattedDate = new Date(dueDate + "T12:00:00").toLocaleDateString(
        "pt-BR",
        { day: "numeric", month: "short" }
      );
      dueDateHtml = `<span class="text-xs ${dateColor} flex items-center gap-1 shrink-0 ml-2"><i data-lucide="calendar" class="w-3 h-3"></i> ${formattedDate}</span>`;
    }

    return `
                    <button class="w-full text-left p-4 bg-zinc-700 rounded-lg hover:bg-zinc-600 transition-colors"
                            data-task-modal-item data-task-type="${taskType}" data-task-id="${task.id}" ${extraData}>
                        <div class="flex justify-between items-start">
                            <p class="font-medium text-white mb-1 pr-2">${task.title}</p>
                            ${dueDateHtml}
                        </div>
                        <p class="text-sm text-zinc-400 capitalize">${subtext}</p>
                    </button>
                `;
  }

  if (status === "completed") {
    // Se o usuário clicou em "Concluídas", mostra apenas a lista de concluídas
    const completedTasks = categoryTasks
      .filter((t) => t.status === "done")
      .sort(sortTasksByDueDateAndCreation); // <-- ORDENAÇÃO APLICADA

    contentHtml +=
      '<h3 class="text-xl font-semibold text-white mb-3 flex items-center gap-2"><i data-lucide="check-circle-2" class="w-5 h-5 text-green-400"></i> Concluído</h3><div class="space-y-3">';

    if (completedTasks.length === 0) {
      contentHtml += `<p class="text-zinc-400 text-center p-4">Nenhuma tarefa concluída.</p>`;
    } else {
      completedTasks.forEach((task) => {
        contentHtml += _createTaskModalItemHTML(task);
      });
    }
    contentHtml += "</div>";
  } else if (status === "pending") {
    // Se o usuário clicou em "Pendentes/Em Progresso", divide em "A Fazer" e "Em Progresso"

    const todoTasks = categoryTasks
      .filter((t) => (t.status || "todo") === "todo" || t.status === "overdue")
      .sort(sortTasksByDueDateAndCreation); // <-- ORDENAÇÃO APLICADA

    const doingTasks = categoryTasks
      .filter((t) => t.status === "doing")
      .sort(sortTasksByDueDateAndCreation); // <-- ORDENAÇÃO APLICADA

    if (todoTasks.length === 0 && doingTasks.length === 0) {
      contentHtml += `<p class="text-zinc-400 text-center p-4">Nenhuma tarefa pendente ou em progresso.</p>`;
    } else {
      // Seção "A Fazer"
      contentHtml +=
        '<h3 class="text-xl font-semibold text-white mb-3 flex items-center gap-2"><i data-lucide="list" class="w-5 h-5 text-blue-400"></i> A Fazer</h3><div class="space-y-3 mb-6">';
      if (todoTasks.length === 0) {
        contentHtml += `<p class="text-zinc-400 text-center text-sm p-3">Nenhuma tarefa a fazer.</p>`;
      } else {
        todoTasks.forEach((task) => {
          contentHtml += _createTaskModalItemHTML(task);
        });
      }
      contentHtml += "</div>";

      // Seção "Em Progresso"
      contentHtml +=
        '<h3 class="text-xl font-semibold text-white mb-3 flex items-center gap-2"><i data-lucide="play-circle" class="w-5 h-5 text-yellow-400"></i> Em Progresso</h3><div class="space-y-3">';
      if (doingTasks.length === 0) {
        contentHtml += `<p class="text-zinc-400 text-center text-sm p-3">Nenhuma tarefa em progresso.</p>`;
      } else {
        doingTasks.forEach((task) => {
          contentHtml += _createTaskModalItemHTML(task);
        });
      }
      contentHtml += "</div>";
    }
  }

  // 3. Abre o painel slide-over
  openSlideOver(contentHtml, title);

  // 4. Adiciona event listeners aos itens da lista que acabamos de criar
  document
    .getElementById("slide-over-content")
    .querySelectorAll("[data-task-modal-item]")
    .forEach((item) => {
      item.addEventListener("click", () => {
        const type = item.dataset.taskType;
        const id = item.dataset.taskId;

        closeSlideOver();

        setTimeout(() => {
          if (type === "main") {
            const task = allTasks.find((t) => t.id === id);
            if (task) showTaskDetails(task.id);
          } else if (type === "project") {
            const projectId = item.dataset.projectId;
            const task = allProjectTasks[projectId]?.find((t) => t.id === id);
            if (task) {
              currentProjectId = projectId;
              showProjectTaskDetails(task);
            }
          } else if (type === "subject") {
            const subjectId = item.dataset.subjectId;
            const task = allSubjectTasks[subjectId]?.find((t) => t.id === id);
            if (task) {
              currentSubjectId = subjectId;
              showSubjectTaskDetails(task);
            }
          }
        }, 300);
      });
    });

  // 5. Renderiza os ícones (Lucide)
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

function sortTasksByDueDateAndCreation(a, b) {
  const dueDateA = a.dueDate;
  const dueDateB = b.dueDate;

  // Regra 1: Tarefas com data de vencimento vêm antes das sem.
  if (dueDateA && !dueDateB) {
    return -1; // A (com data) vem antes.
  }
  if (!dueDateA && dueDateB) {
    return 1; // B (com data) vem antes.
  }

  // Regra 2: Comparar datas de vencimento (se ambas tiverem)
  if (dueDateA && dueDateB) {
    // Adiciona 'T12:00:00' para garantir que a data seja lida corretamente
    // sem problemas de fuso horário na comparação.
    const dateA = new Date(dueDateA + "T12:00:00");
    const dateB = new Date(dueDateB + "T12:00:00");

    if (dateA.getTime() !== dateB.getTime()) {
      return dateA.getTime() - dateB.getTime(); // Ascendente (data mais próxima vence primeiro)
    }
  }

  // Regra 3: Se as datas de vencimento forem iguais (ou ambas nulas),
  // ordenar por data de criação (mais antiga primeiro)
  const createdAtA = a.createdAt?.toMillis() || 0;
  const createdAtB = b.createdAt?.toMillis() || 0;

  return createdAtA - createdAtB; // Ascendente (primeiro criado vem primeiro)
}

function getWeekDates() {
  const weekDates = {};
  const today = new Date();
  // O dia da semana (0=Dom, 1=Seg, ..., 6=Sab)
  const currentDayOfWeek = today.getDay();

  // Se for 0 (Domingo), trata como 7 para o cálculo do offset
  const day = currentDayOfWeek === 0 ? 7 : currentDayOfWeek;
  // Offset para segunda-feira. Ex: Quarta (3) -> 3-1=2. today.date - 2 = Segunda.
  const offsetToMonday = day - 1;

  const monday = new Date(today);
  monday.setDate(today.getDate() - offsetToMonday);

  const days = ["seg", "ter", "qua", "qui", "sex"];
  const dayLabels = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];

  for (let i = 0; i < 5; i++) {
    const currentDate = new Date(monday);
    currentDate.setDate(monday.getDate() + i);

    // Formata a data como "05/11"
    const dateStr = currentDate.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
    const key = days[i];
    const label = dayLabels[i];

    weekDates[key] = { label: label, date: dateStr };
  }
  return weekDates;
}

/**
 * Função genérica para renderizar um grid de cronograma (cabeçalho e corpo).
 */
function renderScheduleGrid(headId, bodyId, subjects) {
  const scheduleHead = document.getElementById(headId);
  const scheduleBody = document.getElementById(bodyId);

  if (!scheduleHead || !scheduleBody) return;

  const weekDates = getWeekDates();

  // 1. Renderiza o Cabeçalho (thead) com as datas
  scheduleHead.innerHTML = ""; // Limpa o cabeçalho antigo
  const headTr = document.createElement("tr");

  let headHtml = `
                <th class="w-1/6 p-4 text-left text-sm font-semibold text-zinc-300 whitespace-nowrap">
                    <div class="flex items-center gap-2">
                        <i data-lucide="clock" class="w-4 h-4"></i>
                        Horário
                    </div>
                </th>
            `;

  scheduleDays.forEach((day) => {
    // scheduleDays = ['seg', 'ter', ...]
    const dayInfo = weekDates[day];
    headHtml += `
                    <th class="w-1/6 p-4 text-left text-sm font-semibold text-zinc-300 whitespace-nowrap">
                        <div class="flex items-center gap-2">
                            <i data-lucide="calendar" class="w-4 h-4"></i>
                            ${dayInfo.label}
                        </div>
                        <div class="text-xs text-zinc-400 mt-1 ml-6">${dayInfo.date}</div>
                    </th>
                `;
  });

  headTr.innerHTML = headHtml;
  scheduleHead.appendChild(headTr);

  // 2. Renderiza o Corpo (tbody) - Lógica que já existia
  scheduleBody.innerHTML = "";
  const grid = {};
  scheduleTimeSlots.forEach((time) => {
    grid[time] = {};
    scheduleDays.forEach((day) => {
      grid[time][day] = [];
    });
  });

  subjects.forEach((subject) => {
    if (subject.schedule) {
      scheduleDays.forEach((day) => {
        if (subject.schedule[day] && Array.isArray(subject.schedule[day])) {
          subject.schedule[day].forEach((timeSlot) => {
            if (grid[timeSlot] && grid[timeSlot][day]) {
              grid[timeSlot][day].push({ name: subject.name, id: subject.id });
            }
          });
        }
      });
    }
  });

  scheduleTimeSlots.forEach((time) => {
    const tr = document.createElement("tr");
    tr.className = "divide-x divide-zinc-700/50";
    let rowHtml = `<td class="p-3 text-sm font-medium ${COLORS.textSecondary}">${time}</td>`;

    scheduleDays.forEach((day) => {
      const subjectsInSlot = grid[time][day];
      const cellContent = subjectsInSlot
        .map((sub) => {
          const subjectIndex = allSubjects.findIndex((s) => s.id === sub.id);
          const color =
            subjectColorPalette[subjectIndex % subjectColorPalette.length] ||
            subjectColorPalette[0];
          return `<div data-subject-id="${sub.id}"
                                    class="${color.bg} ${color.hover} text-white text-xs font-medium p-2 rounded-md mb-1 cursor-pointer">
                                    ${sub.name}
                                </div>`;
        })
        .join("");
      rowHtml += `<td class="p-2 text-sm align-top h-24">${cellContent}</td>`;
    });
    tr.innerHTML = rowHtml;
    scheduleBody.appendChild(tr);
  });

  // 3. Adiciona listeners de clique
  scheduleBody.querySelectorAll("[data-subject-id]").forEach((el) => {
    el.addEventListener("click", () => {
      showSubjectDetailPage(el.dataset.subjectId);
    });
  });

  // 4. Renderiza os ícones (Lucide)
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
}

/**
 * Atualiza a UI do player (título, artista, botões).
 */
function updatePlayerUI() {
  const track = musicTracks[currentTrackIndex];
  document.getElementById("player-track-title").textContent = track.title;
  document.getElementById("player-track-artist").textContent = track.artist;

  const togglePlayBtn = document.getElementById("player-toggle-play");
  if (togglePlayBtn) {
    togglePlayBtn.innerHTML = `<i data-lucide="${
      isPlaying ? "pause" : "play"
    }" class="w-4 h-4"></i>`;
    togglePlayBtn.classList.toggle("playing", isPlaying);
  }
  if (typeof lucide !== "undefined") lucide.createIcons();
}

/**
 * Carrega uma música via Fetch API e decodifica o áudio.
 */
async function loadTrack(index) {
  initAudioContext(); // Garante que o contexto esteja inicializado
  currentTrackIndex = index;
  const track = musicTracks[currentTrackIndex];

  if (!track || !track.src) {
    console.error("Faixa de música não encontrada ou URL inválido.");
    return;
  }

  updatePlayerUI(); // Atualiza a UI com a nova faixa antes mesmo de carregar

  try {
    const response = await fetch(track.src);
    const arrayBuffer = await response.arrayBuffer();
    currentAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    document.getElementById("player-duration").textContent = formatTime(
      currentAudioBuffer.duration
    );

    // Se já estiver no modo de play, inicia automaticamente após o carregamento
    if (isPlaying) {
      playTrack();
    }
  } catch (error) {
    console.error("Erro ao carregar ou decodificar a faixa de áudio:", error);
    showToast("Erro ao carregar música.", "error");
  }
}

/**
 * Toca a faixa carregada a partir da posição atual.
 */
function playTrack() {
  if (!audioContext || !currentAudioBuffer) {
    console.warn("Nenhum contexto de áudio ou buffer disponível.");
    isPlaying = false; // Garante que o estado está correto
    updatePlayerUI();
    return;
  }

  // Se já houver uma fonte tocando, para-a
  if (currentAudioSource) {
    currentAudioSource.stop();
    currentAudioSource.disconnect();
  }

  currentAudioSource = audioContext.createBufferSource();
  currentAudioSource.buffer = currentAudioBuffer;
  currentAudioSource.connect(audioContext.destination);
  currentAudioSource.loop = true; // 💡 Loop infinito para música de foco

  // Inicia do ponto onde parou ou do início se for a primeira vez
  currentAudioSource.start(
    0,
    currentPlaybackTime % currentAudioBuffer.duration
  );
  startTime = audioContext.currentTime - currentPlaybackTime; // Ajusta o startTime

  isPlaying = true;
  updatePlayerUI();
  updateProgressBar(); // Inicia a atualização da barra

  currentAudioSource.onended = () => {
    if (currentAudioSource.loop) {
      // Se estiver em loop, não faz nada no onended (ele continua)
    } else {
      // Se não estiver em loop e a música terminar, avança para a próxima
      nextTrack();
    }
  };
}

/**
 * Pausa a faixa e registra o tempo atual.
 */
function pauseTrack() {
  if (currentAudioSource) {
    currentAudioSource.stop();
    currentAudioSource.disconnect();
    cancelAnimationFrame(animationFrameId); // Para a atualização da barra
    currentPlaybackTime = audioContext.currentTime - startTime; // Salva a posição
  }
  isPlaying = false;
  updatePlayerUI();
}

/**
 * Alterna entre play/pause.
 */
function togglePlayPause() {
  initAudioContext(); // Garante que o contexto esteja ativo na interação
  if (isPlaying) {
    pauseTrack();
  } else {
    // Se não houver buffer, carrega a primeira faixa e depois toca
    if (!currentAudioBuffer) {
      loadTrack(currentTrackIndex).then(() => {
        if (currentAudioBuffer) playTrack();
      });
    } else {
      playTrack();
    }
  }
}

function nextTrack() {
  // Incrementa o índice
  currentTrackIndex++;
  // Se passar do fim da lista, volta para o início
  if (currentTrackIndex >= musicTracks.length) {
    currentTrackIndex = 0;
  }

  // Carrega e toca a próxima música
  loadTrack(currentTrackIndex).then(() => {
    if (isPlaying) {
      playTrack();
    }
  });
}

function previousTrack() {
  // Decrementa o índice
  currentTrackIndex--;
  // Se passar do início, vai para o fim da lista
  if (currentTrackIndex < 0) {
    currentTrackIndex = musicTracks.length - 1;
  }

  // Carrega e toca a música anterior
  loadTrack(currentTrackIndex).then(() => {
    if (isPlaying) {
      playTrack();
    }
  });
}

/**
 * Formata o tempo em MM:SS.
 */
function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec < 10 ? "0" : ""}${sec}`;
}

/**
 * Atualiza a barra de progresso visualmente.
 */
function updateProgressBar() {
  if (!isPlaying || !currentAudioBuffer || !audioContext) {
    cancelAnimationFrame(animationFrameId);
    return;
  }

  const elapsedTime = audioContext.currentTime - startTime;
  const duration = currentAudioBuffer.duration;
  let progress = elapsedTime / duration;

  if (progress >= 1) {
    // Lida com o loop
    progress = progress % 1; // Reseta para calcular o progresso no novo loop
    startTime = audioContext.currentTime - progress * duration; // Reajusta startTime
  }

  const progressBar = document.getElementById("player-progress-bar");
  if (progressBar) {
    progressBar.style.width = `${(progress * 100).toFixed(2)}%`;
    document.getElementById("player-current-time").textContent =
      formatTime(elapsedTime);
  }

  animationFrameId = requestAnimationFrame(updateProgressBar);
}

// Armazena a preferência de fundo
let currentFocusBackground = "none";

function setFocusBackground(bgId) {
  currentFocusBackground = bgId; // Salva a preferência

  // Esconde todos os fundos
  document.querySelectorAll(".focus-bg").forEach((el) => {
    el.classList.remove("active");
    if (el.tagName === "VIDEO") {
      el.pause(); // Pausa todos os vídeos
    }
  });

  // Atualiza os botões seletores
  document.querySelectorAll(".bg-selector-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.bg === bgId);
  });

  if (bgId === "none") {
    return; // Se for 'none', apenas para por aqui
  }

  // Mostra o fundo selecionado
  const bgElement = document.querySelector(`.focus-bg[data-bg-id="${bgId}"]`);
  if (bgElement) {
    bgElement.classList.add("active");
    if (bgElement.tagName === "VIDEO") {
      bgElement
        .play()
        .catch((e) => console.warn("Autoplay do vídeo bloqueado"));
    }
  }
}

function pauseFocusVideos() {
  document.querySelectorAll(".focus-bg").forEach((el) => {
    if (el.tagName === "VIDEO") {
      el.pause();
    }
  });
}

function playClassAlarmSound() {
  // Inicializa o contexto de áudio se ainda não existir
  if (!alarmAudioContext) {
    try {
      alarmAudioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
    } catch (e) {
      console.warn("Web Audio API não suportada.", e);
      return; // Não pode tocar som
    }
  }

  try {
    const oscillator = alarmAudioContext.createOscillator();
    const gainNode = alarmAudioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(alarmAudioContext.destination);

    oscillator.type = "triangle"; // Um som de alarme mais suave
    oscillator.frequency.setValueAtTime(880, alarmAudioContext.currentTime); // Frequência (A5)
    gainNode.gain.setValueAtTime(0.4, alarmAudioContext.currentTime); // Volume
    oscillator.start(alarmAudioContext.currentTime);

    // Toca por 1 segundo
    gainNode.gain.exponentialRampToValueAtTime(
      0.00001,
      alarmAudioContext.currentTime + 1.0
    );
    oscillator.stop(alarmAudioContext.currentTime + 1.0);
  } catch (e) {
    console.warn("Não foi possível tocar o som de alarme.", e);
  }
}

function changeFinanceMonth(direction) {
  if (currentFinanceFilter !== "month") return; // Trava de segurança

  currentFinanceDate.setMonth(currentFinanceDate.getMonth() + direction);
  renderFinancePage();
}
/**
 * Função principal para renderizar toda a página financeira.
 */
function renderFinancePage() {
  if (
    !document.getElementById("page-agency-finance").classList.contains("hidden")
  ) {
    updateFinanceMonthDisplay(); // Ainda controla o display do mês

    // 1. CALCULAR O INTERVALO DE DATAS (startDate, endDate)
    const now = new Date();
    let startDate, endDate;

    // A base para o filtro 'month' é o 'currentFinanceDate' (para navegação)
    // A base para os outros filtros é 'agora'
    const baseDate =
      currentFinanceFilter === "month" ? currentFinanceDate : new Date();

    switch (currentFinanceFilter) {
      case "3-months":
        // Começa no primeiro dia de 2 meses atrás
        startDate = new Date(
          baseDate.getFullYear(),
          baseDate.getMonth() - 2,
          1
        );
        // Termina no último dia deste mês
        endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
        break;

      case "year":
        // 1º de Janeiro deste ano
        startDate = new Date(baseDate.getFullYear(), 0, 1);
        // 31 de Dezembro deste ano
        endDate = new Date(baseDate.getFullYear(), 11, 31);
        break;

      case "month":
      default:
        // 1º dia do mês selecionado
        startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
        // Último dia do mês selecionado
        endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
    }

    // 2. FILTRAR TRANSAÇÕES pelo intervalo
    const filteredTransactions = allAgencyTransactions.filter((tx) => {
      if (!tx.date) return false;
      // Adiciona T12:00:00 para evitar problemas de fuso horário
      const txDate = new Date(tx.date + "T12:00:00");
      return txDate >= startDate && txDate <= endDate;
    });

    // 3. Obter dados do "Mês Anterior" (APENAS se o filtro for 'month')
    let prevMonthTransactions = [];
    if (currentFinanceFilter === "month") {
      const prevMonthDate = new Date(currentFinanceDate.getTime());
      prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
      const prevMonthYear = prevMonthDate.getFullYear();
      const prevMonth = prevMonthDate.getMonth();

      prevMonthTransactions = allAgencyTransactions.filter((tx) => {
        const txDate = tx.date ? new Date(tx.date + "T12:00:00") : null;
        if (!txDate) return false;
        return (
          txDate.getFullYear() === prevMonthYear &&
          txDate.getMonth() === prevMonth
        );
      });
    }

    // 4. Obter "A Receber" (sempre global, independente do filtro de data)
    const pendingReceivables = allAgencyTransactions
      .filter((tx) => tx.type === "income" && tx.paymentStatus !== "paid_100")
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // 5. RENDERIZAR COMPONENTES

    // Os cards agora mostram o total do período filtrado
    updateFinanceDashboardCards(
      filteredTransactions,
      prevMonthTransactions,
      pendingReceivables
    );

    // As tabelas de Receitas/Despesas agora mostram o período todo
    const incomeTxs = filteredTransactions.filter((tx) => tx.type === "income");
    const expenseTxs = filteredTransactions.filter(
      (tx) => tx.type === "expense"
    );

    renderAccountsReceivableTable(pendingReceivables); // Esta não muda
    renderFinanceIncomeTable(incomeTxs); // Agora mostra o período filtrado
    renderFinanceExpensesTable(expenseTxs); // Agora mostra o período filtrado

    // O gráfico AINDA mostra o ano inteiro (baseado no currentFinanceDate ou 'now')
    renderFinanceCharts(allAgencyTransactions);
  }
}

/**
 * Atualiza o texto do seletor de mês/ano.
 */
function updateFinanceMonthDisplay() {
  const display = document.getElementById("finance-month-year-display");
  if (display) {
    display.textContent = currentFinanceDate.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
  }
}

/**
 * Atualiza os 4 cards de resumo.
 */
function updateFinanceDashboardCards(
  periodTransactions,
  prevMonthTransactions,
  pendingReceivables
) {
  let totalReceitas = 0;
  let totalDespesas = 0;
  let totalAReceber = 0;

  // 1. Calcula totais do PERÍODO SELECIONADO
  periodTransactions.forEach((tx) => {
    if (tx.type === "income") totalReceitas += parseFloat(tx.value) || 0;
    else if (tx.type === "expense") totalDespesas += parseFloat(tx.value) || 0;
  });

  // 2. Calcula total A RECEBER
  pendingReceivables.forEach((tx) => {
    const value = parseFloat(tx.value) || 0;
    if (tx.paymentStatus === "pending_100") totalAReceber += value;
    else if (
      tx.paymentStatus === "pending_50" ||
      tx.paymentStatus === "paid_50"
    )
      totalAReceber += value / 2;
  });

  const balanco = totalReceitas - totalDespesas;
  const formatBRL = (value) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // 3. Calcula Porcentagens (APENAS se o filtro for 'month')
  let receitasPctText = "Total no período"; // Texto padrão
  let despesasPctText = "Total no período"; // Texto padrão

  if (currentFinanceFilter === "month") {
    let prevTotalReceitas = 0;
    let prevTotalDespesas = 0;
    prevMonthTransactions.forEach((tx) => {
      if (tx.type === "income") prevTotalReceitas += parseFloat(tx.value) || 0;
      else if (tx.type === "expense")
        prevTotalDespesas += parseFloat(tx.value) || 0;
    });

    const formatPct = (val, type) => {
      if (!isFinite(val) || isNaN(val)) return "...";
      const isGood = type === "receita" ? val >= 0 : val <= 0;
      const colorClass = isGood ? "text-green-500" : "text-red-500";
      const prefix = val >= 0 ? "+" : "";
      return `<span class="${colorClass}">${prefix}${val.toFixed(
        0
      )}% vs mês anterior</span>`;
    };

    let receitasPct =
      prevTotalReceitas === 0
        ? totalReceitas > 0
          ? 100
          : 0
        : ((totalReceitas - prevTotalReceitas) / prevTotalReceitas) * 100;
    let despesasPct =
      prevTotalDespesas === 0
        ? totalDespesas > 0
          ? 100
          : 0
        : ((totalDespesas - prevTotalDespesas) / prevTotalDespesas) * 100;
    if (prevTotalReceitas === 0 && totalReceitas === 0) receitasPct = 0;
    if (prevTotalDespesas === 0 && totalDespesas === 0) despesasPct = 0;

    receitasPctText = formatPct(receitasPct, "receita");
    despesasPctText = formatPct(despesasPct, "despesa");
  }

  // 4. Atualiza o HTML

  // Card Receitas
  document.getElementById("finance-card-receitas").textContent =
    formatBRL(totalReceitas);
  document
    .getElementById("finance-card-receitas")
    .closest(".bg-gradient-to-br")
    .querySelector(".border-t p").innerHTML = receitasPctText;

  // Card Despesas
  document.getElementById("finance-card-despesas").textContent =
    formatBRL(totalDespesas);
  document
    .getElementById("finance-card-despesas")
    .closest(".bg-gradient-to-br")
    .querySelector(".border-t p").innerHTML = despesasPctText;

  // Card Balanço
  const balancoEl = document.getElementById("finance-card-balanco");
  balancoEl.textContent = formatBRL(balanco);
  balancoEl.classList.toggle("text-green-400", balanco > 0);
  balancoEl.classList.toggle("text-red-400", balanco < 0);
  balancoEl.classList.toggle("text-white", balanco === 0);
  // 💡 Texto do balanço muda com o filtro
  const balancoSubtext =
    currentFinanceFilter === "month" ? "Balanço mensal" : "Balanço no período";
  balancoEl
    .closest(".bg-gradient-to-br")
    .querySelector(".border-t p").textContent = balancoSubtext;

  // Card A Receber (não muda)
  document.getElementById("finance-card-areceber").textContent =
    formatBRL(totalAReceber);
  const pendenciasCount = pendingReceivables.length;
  document
    .getElementById("finance-card-areceber")
    .closest(".bg-gradient-to-br")
    .querySelector(".border-t p").textContent = `${pendenciasCount} ${
    pendenciasCount === 1 ? "pendência" : "pendências"
  } em aberto`;
}
/**
 * Renderiza a tabela de transações do mês.
 */
function renderFinanceIncomeTable(incomeTransactions) {
  const tableBody = document.getElementById("finance-income-body");
  if (!tableBody) return;

  // Pega o container da tabela para achar o header e footer
  const tableContainer = tableBody.closest(".bg-zinc-700\\/30");
  let totalIncome = 0;

  tableBody.innerHTML = ""; // Limpa a tabela

  if (incomeTransactions.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-zinc-500 text-sm">Nenhuma receita este mês.</td></tr>`;
  } else {
    const paymentStatusLabels = {
      pending_100: "Pendente (100%)",
      pending_50: "Pendente (50%)",
      paid_50: "Pago (50%)",
      paid_100: "Pago (100%)",
    };
    const statusColors = {
      pending_100: "text-red-400",
      pending_50: "text-red-400",
      paid_50: "text-yellow-400",
      paid_100: "text-green-400",
    };

    incomeTransactions.forEach((tx) => {
      totalIncome += parseFloat(tx.value) || 0; // Calcula total

      const tr = document.createElement("tr");
      tr.className = "hover:bg-zinc-600";
      const client = tx.clientId
        ? allAgencyClients.find((c) => c.id === tx.clientId)
        : null;
      const txDate = new Date(tx.date + "T12:00:00").toLocaleDateString(
        "pt-BR",
        { day: "2-digit", month: "2-digit" }
      );
      const paymentStatus = tx.paymentStatus || "pending_100";

      tr.innerHTML = `
                <td class="p-3">
                    <p class="font-medium text-white">${tx.title}</p>
                    <p class="text-xs text-zinc-400">${
                      client ? client.name : "Cliente Avulso"
                    }</p>
                </td>
                <td class="p-3 text-zinc-400">${txDate}</td>
                <td class="p-3 font-medium text-green-400">R$ ${parseFloat(
                  tx.value
                ).toFixed(2)}</td>
                <td class="p-3 text-xs font-medium ${
                  statusColors[paymentStatus] || "text-zinc-400"
                }">
                    ${paymentStatusLabels[paymentStatus]}
                    ${
                      tx.invoiceIssued
                        ? '<span class="block text-blue-400 mt-1">(NFe Emitida)</span>'
                        : ""
                    }
                </td>
                <td class="p-3 text-right whitespace-nowrap">
                    <button data-edit-tx-id="${
                      tx.id
                    }" class="text-zinc-400 hover:text-blue-500 p-1"><i data-lucide="pencil" class="w-4 h-4 pointer-events-none"></i></button>
                    <button data-delete-tx-id="${
                      tx.id
                    }" class="text-zinc-400 hover:text-red-500 p-1"><i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i></button>
                </td>
            `;
      tr.querySelector(`[data-edit-tx-id="${tx.id}"]`).addEventListener(
        "click",
        () => showAddTransactionForm(tx.id)
      );
      tr.querySelector(`[data-delete-tx-id="${tx.id}"]`).addEventListener(
        "click",
        () => handleDeleteTransaction(tx.id, null, tx.title, tx.date)
      );
      tableBody.appendChild(tr);
    });
    if (typeof lucide !== "undefined") lucide.createIcons();
  }

  // 💡 ATUALIZA HEADER E FOOTER
  const formatBRL = (val) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  // Atualiza o contador no header
  tableContainer.querySelector(
    '.bg-gradient-to-r span[class*="bg-green-500/20"]'
  ).textContent = incomeTransactions.length;
  // Atualiza o total no footer
  tableContainer.querySelector(
    '.bg-zinc-700\\/50 span[class*="text-green-400"]'
  ).textContent = formatBRL(totalIncome);
}

/**
 * 💡 NOVA FUNÇÃO (Substitui parte da antiga renderFinanceTransactionsTable)
 * Renderiza a tabela de Despesas do Mês.
 */
function renderFinanceExpensesTable(expenseTransactions) {
  const tableBody = document.getElementById("finance-expenses-body");
  if (!tableBody) return;

  // Pega o container da tabela para achar o header e footer
  const tableContainer = tableBody.closest(".bg-zinc-700\\/30");
  let totalExpense = 0;

  tableBody.innerHTML = ""; // Limpa a tabela

  if (expenseTransactions.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-zinc-500 text-sm">Nenhuma despesa este mês.</td></tr>`;
  } else {
    const expenseTypeLabels = { fixed: "Fixa", variable: "Variável" };
    const typeColors = { fixed: "text-purple-400", variable: "text-zinc-400" };

    expenseTransactions.forEach((tx) => {
      totalExpense += parseFloat(tx.value) || 0; // Calcula total

      const tr = document.createElement("tr");
      tr.className = "hover:bg-zinc-600";
      const txDate = new Date(tx.date + "T12:00:00").toLocaleDateString(
        "pt-BR",
        { day: "2-digit", month: "2-digit" }
      );
      const recurrenceId = tx.recurrenceId || null;

      tr.innerHTML = `
                <td class="p-3">
                    <p class="font-medium text-white">${tx.title}</p>
                    <p class="text-xs text-zinc-400 capitalize">${
                      tx.category || "Sem categoria"
                    }</p>
                </td>
                <td class="p-3 text-zinc-400">${txDate}</td>
                <td class="p-3 font-medium text-red-400">R$ ${parseFloat(
                  tx.value
                ).toFixed(2)}</td>
                <td class="p-3 text-xs font-medium ${
                  typeColors[tx.expenseType] || "text-zinc-400"
                }">
                    ${expenseTypeLabels[tx.expenseType] || "N/A"}
                </td>
                <td class="p-3 text-right whitespace-nowrap">
                    <button data-edit-tx-id="${
                      tx.id
                    }" class="text-zinc-400 hover:text-blue-500 p-1"><i data-lucide="pencil" class="w-4 h-4 pointer-events-none"></i></button>
                    <button data-delete-tx-id="${
                      tx.id
                    }" class="text-zinc-400 hover:text-red-500 p-1"><i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i></button>
                </td>
            `;
      tr.querySelector(`[data-edit-tx-id="${tx.id}"]`).addEventListener(
        "click",
        () => showAddTransactionForm(tx.id)
      );
      tr.querySelector(`[data-delete-tx-id="${tx.id}"]`).addEventListener(
        "click",
        () => handleDeleteTransaction(tx.id, recurrenceId, tx.title, tx.date)
      );
      tableBody.appendChild(tr);
    });
    if (typeof lucide !== "undefined") lucide.createIcons();
  }

  // 💡 ATUALIZA HEADER E FOOTER
  const formatBRL = (val) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  // Atualiza o contador no header
  tableContainer.querySelector(
    '.bg-gradient-to-r span[class*="bg-red-500/20"]'
  ).textContent = expenseTransactions.length;
  // Atualiza o total no footer
  tableContainer.querySelector(
    '.bg-zinc-700\\/50 span[class*="text-red-400"]'
  ).textContent = formatBRL(totalExpense);
}

function showManageClientsForm() {
  const formHtml = `
        <div class="flex flex-col h-full">
            <div class="flex-1 space-y-6 overflow-y-auto p-1">
                <div class="bg-zinc-800 rounded-2xl p-6 border border-zinc-700">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <i data-lucide="user-plus" class="w-4 h-4 text-blue-400"></i>
                        </div>
                        <h4 class="text-lg font-semibold text-white">Adicionar Novo Cliente</h4>
                    </div>
                    
                    <form id="form-add-client-modal" class="space-y-5">
                        <div>
                            <label class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                                <i data-lucide="building" class="w-4 h-4 text-purple-400"></i>
                                Nome/Razão Social
                            </label>
                            <input type="text" name="clientName" required 
                                    class="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 rounded-xl text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="Ex: Empresa X Design Ltda">
                        </div>
                        
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            <div>
                                <label class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                                    <i data-lucide="credit-card" class="w-4 h-4 text-green-400"></i>
                                    CNPJ (para NFe)
                                </label>
                                <input type="text" name="clientCnpj" 
                                        class="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 rounded-xl text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        placeholder="00.000.000/0001-00">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                                    <i data-lucide="mail" class="w-4 h-4 text-yellow-400"></i>
                                    Email do Contato
                                </label>
                                <input type="email" name="clientEmail" 
                                        class="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 rounded-xl text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        placeholder="contato@empresa.com">
                            </div>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                                <i data-lucide="phone" class="w-4 h-4 text-blue-400"></i>
                                Telefone
                            </label>
                            <input type="tel" name="clientPhone" 
                                    class="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 rounded-xl text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="(11) 99999-9999">
                        </div>
                        
                        <button type="submit" 
                                class="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 group">
                            <i data-lucide="user-plus" class="w-5 h-5 group-hover:scale-110 transition-transform"></i>
                            Cadastrar Cliente
                        </button>
                    </form>
                </div>

                <div class="relative my-2">
                    <div class="absolute inset-0 flex items-center">
                        <div class="w-full border-t border-zinc-700"></div>
                    </div>
                    <div class="relative flex justify-center">
                        <span class="bg-zinc-800 px-3 text-sm text-zinc-400 flex items-center gap-2">
                            <i data-lucide="users" class="w-4 h-4"></i>
                            Clientes Cadastrados
                        </span>
                    </div>
                </div>

                <div class="bg-zinc-800 rounded-2xl border border-zinc-700 overflow-hidden">
                    <div class="bg-gradient-to-r from-zinc-700 to-zinc-800 p-4 border-b border-zinc-600">
                        <div class="flex items-center justify-between">
                            <h4 class="text-lg font-semibold text-white flex items-center gap-2">
                                <i data-lucide="users" class="w-5 h-5 text-purple-400"></i>
                                Todos os Clientes
                            </h4>
                            <span class="bg-zinc-700 text-zinc-300 text-xs font-medium px-2 py-1 rounded-full" id="clients-count">0</span>
                        </div>
                    </div>
                    
                    <div id="client-list-in-modal" class="max-h-80 overflow-auto">
                        </div>
                    
                    <div class="bg-zinc-700/30 p-4 border-t border-zinc-600">
                        <div class="flex justify-between items-center text-sm">
                            <span class="text-zinc-400">Total de clientes cadastrados</span>
                            <button class="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 text-xs">
                                <i data-lucide="download" class="w-3 h-3"></i>
                                Exportar Lista
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

  openSlideOver(formHtml, "Gerenciar Clientes");

  // 💡 INICIALIZA AS MÁSCARAS
  const panel = document.getElementById("slide-over-panel");
  const cnpjMaskEl = panel.querySelector('input[name="clientCnpj"]');
  const phoneMaskEl = panel.querySelector('input[name="clientPhone"]');

  if (cnpjMaskEl) {
    IMask(cnpjMaskEl, { mask: "00.000.000/0001-00" });
  }
  if (phoneMaskEl) {
    IMask(phoneMaskEl, {
      mask: [{ mask: "(00) 0000-0000" }, { mask: "(00) 00000-0000" }],
    });
  }

  const form = document.getElementById("form-add-client-modal");
  if (form) {
    form.addEventListener("submit", handleAddClient);
  }

  renderClientListInModal();
}

/**
 * 💡 FUNÇÃO ATUALIZADA (com correção de ícone)
 * Renderiza a lista de clientes dentro do modal.
 */
function renderClientListInModal() {
  const listEl = document.getElementById("client-list-in-modal");
  const countEl = document.getElementById("clients-count");

  if (!listEl) return;

  if (countEl) {
    countEl.textContent = allAgencyClients.length;
  }

  listEl.innerHTML = "";

  if (allAgencyClients.length === 0) {
    listEl.innerHTML = `
            <div class="text-center py-12">
                <div class="flex flex-col items-center justify-center gap-4 text-zinc-500">
                    <i data-lucide="users" class="w-16 h-16 opacity-50"></i>
                    <p>Nenhum cliente cadastrado</p>
                    <p class="text-sm">Adicione seu primeiro cliente para começar</p>
                </div>
            </div>
        `;
    if (typeof lucide !== "undefined") lucide.createIcons();
    return;
  }

  allAgencyClients.forEach((client, index) => {
    const itemEl = document.createElement("div");
    itemEl.className = `p-4 border-b border-zinc-700/50 hover:bg-zinc-700/30 transition-colors duration-200 ${
      index === allAgencyClients.length - 1 ? "border-b-0" : ""
    }`;

    itemEl.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-4 flex-1 min-w-0">
                    <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <i data-lucide="building" class="w-6 h-6 text-white"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                            <p class="font-semibold text-white truncate">${
                              client.name
                            }</p>
                            ${
                              client.cnpj
                                ? `
                                <span class="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                    <i data-lucide="credit-card" class="w-3 h-3"></i>
                                    CNPJ
                                </span>
                            `
                                : ""
                            }
                        </div>
                        <div class="flex flex-wrap gap-4 text-xs text-zinc-400">
                            ${
                              client.cnpj
                                ? `
                                <span class="flex items-center gap-1">
                                    <i data-lucide="hash" class="w-3 h-3"></i>
                                    ${client.cnpj}
                                </span>
                            `
                                : ""
                            }
                            ${
                              client.email
                                ? `
                                <span class="flex items-center gap-1 truncate">
                                    <i data-lucide="mail" class="w-3 h-3"></i>
                                    ${client.email}
                                </span>
                            `
                                : ""
                            }
                            ${
                              client.phone
                                ? `
                                <span class="flex items-center gap-1">
                                    <i data-lucide="phone" class="w-3 h-3"></i>
                                    ${client.phone}
                                </span>
                            `
                                : ""
                            }
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-2 ml-4">
                    <button data-edit-client-id="${client.id}" 
                            class="p-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 transition-colors group"
                            title="Editar Cliente">
                        <i data-lucide="edit-2" class="w-4 h-4 text-zinc-400 group-hover:text-blue-400 transition-colors"></i>
                    </button>
                    <button data-delete-client-id="${client.id}" 
                            class="p-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 transition-colors group"
                            title="Excluir Cliente">
                        <i data-lucide="trash-2" class="w-4 h-4 text-zinc-400 group-hover:text-red-400 transition-colors"></i>
                    </button>
                </div>
            </div>
        `;

    itemEl
      .querySelector(`[data-delete-client-id="${client.id}"]`)
      .addEventListener("click", async () => {
        if (
          await showConfirmModal(
            "Excluir Cliente?",
            `Tem certeza que deseja excluir "${client.name}"? Esta ação não pode ser desfeita.`,
            "Excluir",
            "Cancelar",
            "error"
          )
        ) {
          try {
            await deleteDoc(getAgencyClientDoc(client.id));
            showModal(
              "Sucesso",
              `Cliente "${client.name}" excluído com sucesso.`,
              "success"
            );
          } catch (error) {
            console.error("Erro ao deletar cliente:", error);
            showModal("Erro", "Não foi possível excluir o cliente.", "error");
          }
        }
      });

    // Event Listener para Editar (agora funcional)
    itemEl
      .querySelector(`[data-edit-client-id="${client.id}"]`)
      .addEventListener("click", () => {
        showEditClientForm(client.id);
      });

    listEl.appendChild(itemEl);
  });

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

/**
 * 💡 FUNÇÃO ATUALIZADA (para ler valores com máscara)
 * Handler para adicionar novo cliente.
 */
async function handleAddClient(e) {
  e.preventDefault();
  const form = e.target;

  // Pega os valores diretos dos inputs (incluindo as máscaras)
  const clientData = {
    name: form.clientName.value,
    cnpj: form.clientCnpj.value || null,
    email: form.clientEmail.value || null,
    phone: form.clientPhone.value || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await addDoc(getAgencyClientsCollection(), clientData);
    form.reset();
    showModal(
      "Sucesso",
      `Cliente "${clientData.name}" cadastrado com sucesso!`,
      "success"
    );
  } catch (error) {
    console.error("Erro ao cadastrar cliente:", error);
    showModal("Erro", "Não foi possível cadastrar o cliente.", "error");
  }
}

/**
 * 💡 NOVA FUNÇÃO (Para implementar o botão "Editar")
 * Abre um formulário para editar um cliente existente.
 */
function showEditClientForm(clientId) {
  const client = allAgencyClients.find((c) => c.id === clientId);
  if (!client) {
    showModal("Erro", "Cliente não encontrado.", "error");
    return;
  }

  const formHtml = `
        <div class="flex flex-col h-full">
            <div class="flex-1 space-y-6 overflow-y-auto p-1">
                <form id="form-edit-client-modal" class="space-y-5 bg-zinc-800 rounded-2xl p-6 border border-zinc-700">
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                            <i data-lucide="building" class="w-4 h-4 text-purple-400"></i>
                            Nome/Razão Social
                        </label>
                        <input type="text" name="clientName" required 
                                class="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 rounded-xl text-white"
                                value="${client.name}">
                    </div>
                    
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <div>
                            <label class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                                <i data-lucide="credit-card" class="w-4 h-4 text-green-400"></i>
                                CNPJ
                            </label>
                            <input type="text" name="clientCnpj" 
                                    class="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 rounded-xl text-white"
                                    placeholder="00.000.000/0001-00" value="${
                                      client.cnpj || ""
                                    }">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                                <i data-lucide="mail" class="w-4 h-4 text-yellow-400"></i>
                                Email do Contato
                            </label>
                            <input type="email" name="clientEmail" 
                                    class="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 rounded-xl text-white"
                                    placeholder="contato@empresa.com" value="${
                                      client.email || ""
                                    }">
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                            <i data-lucide="phone" class="w-4 h-4 text-blue-400"></i>
                            Telefone
                        </label>
                        <input type="tel" name="clientPhone" 
                                class="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 rounded-xl text-white"
                                placeholder="(11) 99999-9999" value="${
                                  client.phone || ""
                                }">
                    </div>
                </form>
            </div>
            
            <div class="mt-auto pt-6 border-t border-zinc-700">
                <div class="flex gap-3">
                    <button type="button" id="btn-back-to-client-list" 
                            class="flex-1 py-3 px-4 bg-zinc-700 hover:bg-zinc-600 rounded-xl font-semibold transition-colors">
                        Voltar
                    </button>
                    <button type="submit" form="form-edit-client-modal" 
                            class="flex-1 py-3 px-4 bg-blue-500 hover:bg-blue-600 rounded-xl font-semibold text-white">
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    `;

  openSlideOver(formHtml, `Editando: ${client.name}`);

  // Inicializa as máscaras para os campos de edição
  const panel = document.getElementById("slide-over-panel");
  const cnpjMask = panel.querySelector('input[name="clientCnpj"]');
  if (cnpjMask) {
    IMask(cnpjMask, { mask: "00.000.000/0001-00" });
  }

  const phoneMask = panel.querySelector('input[name="clientPhone"]');
  if (phoneMask) {
    IMask(phoneMask, {
      mask: [{ mask: "(00) 0000-0000" }, { mask: "(00) 00000-0000" }],
    });
  }

  // 💡 CORREÇÃO DO ONCLICK: Adiciona listener de evento
  const form = document.getElementById("form-edit-client-modal");
  if (form) {
    form.addEventListener("submit", (e) => handleEditClient(e, clientId));
  }
  const backBtn = document.getElementById("btn-back-to-client-list");
  if (backBtn) {
    backBtn.addEventListener("click", showManageClientsForm); // Chama a função com segurança
  }
}

/**
 * 💡 NOVA FUNÇÃO (Para implementar o botão "Editar")
 * Handler para salvar as alterações de um cliente.
 */
async function handleEditClient(e, clientId) {
  e.preventDefault();
  const form = e.target;

  const clientData = {
    name: form.clientName.value,
    cnpj: form.clientCnpj.value || null,
    email: form.clientEmail.value || null,
    phone: form.clientPhone.value || null,
    updatedAt: serverTimestamp(), // Atualiza o timestamp
  };

  try {
    await updateDoc(getAgencyClientDoc(clientId), clientData);
    showModal("Sucesso", `Cliente "${clientData.name}" atualizado!`, "success");
    showManageClientsForm(); // Volta para a lista de clientes
  } catch (error) {
    console.error("Erro ao atualizar cliente:", error);
    showModal("Erro", "Não foi possível atualizar o cliente.", "error");
  }
}
/**
 * Abre o slide-over para Adicionar/Editar Transação.
 */
function showAddTransactionForm(txId = null) {
  const transaction = txId
    ? allAgencyTransactions.find((t) => t.id === txId)
    : null;
  const isEditing = !!transaction;

  // 1. SEU NOVO HTML (com uma pequena limpeza no título)
  // Eu removi o <h3> do topo, pois a função openSlideOver já define o título.
  const formHtml = `
        <form id="form-add-transaction" class="flex flex-col h-full">
            <div class="flex-1 space-y-6 overflow-y-auto p-1">
                
                <div class="bg-zinc-800 rounded-2xl p-1 border border-zinc-700">
                    <div class="grid grid-cols-2 gap-2">
                        <button type="button" id="btn-tx-type-income" data-type="income" 
                            class="btn-tx-type flex items-center justify-center gap-2 py-4 px-4 rounded-xl font-semibold transition-all duration-300 group">
                            <div class="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center group-[.active]:bg-green-500 transition-colors">
                                <i data-lucide="trending-up" class="w-4 h-4 text-green-400 group-[.active]:text-white transition-colors"></i>
                            </div>
                            <span class="text-sm">Receita</span>
                        </button>
                        <button type="button" id="btn-tx-type-expense" data-type="expense" 
                            class="btn-tx-type flex items-center justify-center gap-2 py-4 px-4 rounded-xl font-semibold transition-all duration-300 group">
                            <div class="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center group-[.active]:bg-red-500 transition-colors">
                                <i data-lucide="trending-down" class="w-4 h-4 text-red-400 group-[.active]:text-white transition-colors"></i>
                            </div>
                            <span class="text-sm">Despesa</span>
                        </button>
                    </div>
                </div>
                
                <input type="hidden" id="txType" name="txType" value="${
                  isEditing ? transaction.type : "income"
                }">
                <input type="hidden" name="txId" value="${txId || ""}">

                <div class="space-y-4">
                    <div>
                        <label for="txTitle" class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                            <i data-lucide="file-text" class="w-4 h-4 text-blue-400"></i>
                            Título da Transação
                        </label>
                        <input type="text" id="txTitle" name="txTitle" required 
                                class="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                placeholder="Ex: Website Corporativo - Cliente X" 
                                value="${isEditing ? transaction.title : ""}">
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label for="txValueMasked" class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                                <i data-lucide="dollar-sign" class="w-4 h-4 text-green-400"></i>
                                Valor
                            </label>
                            <div class="relative">
                                <input type="text" id="txValueMasked" name="txValueMasked" required 
                                        class="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        placeholder="0,00" 
                                        value="${
                                          isEditing
                                            ? transaction.value * 100
                                            : ""
                                        }">
                            </div>
                        </div>
                        <div>
                            <label for="txDate" class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                                <i data-lucide="calendar" class="w-4 h-4 text-purple-400"></i>
                                Data
                            </label>
                            <div class="relative">
                                <i data-lucide="calendar" class="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400"></i>
                                <input type="date" id="txDate" name="txDate" required 
                                        class="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        value="${
                                          isEditing
                                            ? transaction.date
                                            : new Date()
                                                .toISOString()
                                                .split("T")[0]
                                        }">
                            </div>
                        </div>
                    </div>
                </div>

                <div id="tx-income-fields" class="space-y-4 border-t border-zinc-700 pt-4">
                    <div class="flex items-center gap-2 mb-2">
                        <div class="w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center">
                            <i data-lucide="users" class="w-3 h-3 text-green-400"></i>
                        </div>
                        <h4 class="text-md font-semibold text-green-400">Detalhes da Receita</h4>
                    </div>
                    
                    <div>
                        <label for="client-search-input" class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                            <i data-lucide="search" class="w-4 h-4 text-blue-400"></i>
                            Cliente
                        </label>
                        <div class="relative">
                            <input type="text" id="client-search-input" 
                                    class="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="Digite para buscar um cliente...">
                            <input type="hidden" id="txClientId" name="txClientId" value="${
                              isEditing ? transaction.clientId || "" : ""
                            }">
                            <div id="client-search-dropdown" class="hidden absolute z-10 w-full bg-zinc-700 border border-zinc-600 rounded-xl mt-2 max-h-48 overflow-y-auto shadow-2xl">
                                </div>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label for="txPaymentStatus" class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                                <i data-lucide="credit-card" class="w-4 h-4 text-yellow-400"></i>
                                Status do Pagamento
                            </label>
                            <select id="txPaymentStatus" name="txPaymentStatus" 
                                    class="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none">
                                <option value="pending_100">🟡 Pendente (100%)</option>
                                <option value="pending_50">🟠 Pendente (50%)</option>
                                <option value="paid_50">🔵 Pago (50%)</option>
                                <option value="paid_100">🟢 Pago (100%)</option>
                            </select>
                        </div>
                        
                        <div class="flex items-end">
                            <label for="txInvoiceIssued" class="flex items-center justify-between w-full p-4 bg-zinc-800 rounded-xl border border-zinc-600 cursor-pointer hover:border-zinc-500 transition-colors">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                        <i data-lucide="file-text" class="w-4 h-4 text-blue-400"></i>
                                    </div>
                                    <div>
                                        <span class="text-white text-sm font-medium block">Nota Fiscal</span>
                                        <span class="text-zinc-400 text-xs">Emitida?</span>
                                    </div>
                                </div>
                                <div class="relative">
                                    <input type="checkbox" id="txInvoiceIssued" name="txInvoiceIssued" class="sr-only peer">
                                    <div class="w-12 h-6 bg-zinc-600 rounded-full peer peer-checked:bg-blue-500 transition-colors duration-300"></div>
                                    <div class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-transform duration-300 shadow-lg"></div>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
                
                <div id="tx-expense-fields" class="hidden space-y-4 border-t border-zinc-700 pt-4">
                    <div class="flex items-center gap-2 mb-2">
                        <div class="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center">
                            <i data-lucide="shopping-cart" class="w-3 h-3 text-red-400"></i>
                        </div>
                        <h4 class="text-md font-semibold text-red-400">Detalhes da Despesa</h4>
                    </div>
                    
                    <div>
                        <label for="txCategory" class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                            <i data-lucide="tag" class="w-4 h-4 text-purple-400"></i>
                            Categoria
                        </label>
                        <select id="txCategory" name="txCategory" 
                                class="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none">
                            <option value="">Selecione uma categoria</option>
                            <option value="software">💻 Software & Ferramentas</option>
                            <option value="marketing">📢 Marketing & Publicidade</option>
                            <option value="hosting">🌐 Hospedagem & Domínio</option>
                            <option value="office">🏢 Escritório & Infraestrutura</option>
                            <option value="services">🔧 Serviços Profissionais</option>
                            <option value="taxes">🏛️ Impostos & Tributos</option>
                            <option value="other">📦 Outros</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                            <i data-lucide="repeat" class="w-4 h-4 text-orange-400"></i>
                            Tipo de Despesa
                        </label>
                        <div class="grid grid-cols-2 gap-3">
                            <label class="flex-1">
                                <input type="radio" name="txExpenseType" value="variable" class="hidden peer" checked>
                                <div class="w-full p-4 text-center bg-zinc-800 border border-zinc-600 rounded-xl cursor-pointer peer-checked:bg-orange-500/20 peer-checked:border-orange-500 peer-checked:text-orange-400 transition-all duration-300 hover:border-zinc-500">
                                    <div class="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center mx-auto mb-2 peer-checked:bg-orange-500">
                                        <i data-lucide="activity" class="w-4 h-4 text-orange-400 peer-checked:text-white"></i>
                                    </div>
                                    <span class="text-sm font-medium block">Variável</span>
                                    <span class="text-xs text-zinc-400 peer-checked:text-orange-300">Ocorrência única</span>
                                </div>
                            </label>
                            <label class="flex-1">
                                <input type="radio" name="txExpenseType" value="fixed" class="hidden peer">
                                <div class="w-full p-4 text-center bg-zinc-800 border border-zinc-600 rounded-xl cursor-pointer peer-checked:bg-blue-500/20 peer-checked:border-blue-500 peer-checked:text-blue-400 transition-all duration-300 hover:border-zinc-500">
                                    <div class="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center mx-auto mb-2 peer-checked:bg-blue-500">
                                        <i data-lucide="calendar" class="w-4 h-4 text-blue-400 peer-checked:text-white"></i>
                                    </div>
                                    <span class="text-sm font-medium block">Fixa</span>
                                    <span class="text-xs text-zinc-400 peer-checked:text-blue-300">Recorrente mensal</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

            </div>

            <div class="mt-auto pt-6 border-t border-zinc-700">
                <div class="flex gap-3">
                    <button type="button" onclick="closeSlideOver()" 
                            class="flex-1 py-3 px-4 bg-zinc-700 hover:bg-zinc-600 rounded-xl font-semibold transition-colors duration-300 flex items-center justify-center gap-2">
                        <i data-lucide="x" class="w-5 h-5"></i>
                        Cancelar
                    </button>
                    <button type="submit" 
                            class="flex-1 py-3 px-4 bg-blue-500 hover:bg-blue-600 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 group">
                        <i data-lucide="check" class="w-5 h-5 group-hover:scale-110 transition-transform"></i>
                        ${isEditing ? "Salvar" : "Criar"}
                    </button>
                </div>
            </div>
        </form>
    `;

  // Abre o Slide-Over
  // 💡 MELHORIA: Título removido do HTML e passado para a função
  openSlideOver(formHtml, isEditing ? "Editar Transação" : "Nova Transação");

  // Inicializa os componentes
  const panel = document.getElementById("slide-over-panel");
  const form = panel.querySelector("#form-add-transaction");
  const incomeFields = panel.querySelector("#tx-income-fields");
  const expenseFields = panel.querySelector("#tx-expense-fields");
  const txTypeInput = panel.querySelector("#txType");

  // Máscara de Valor (Seu código está perfeito)
  const valueMask = IMask(panel.querySelector("#txValueMasked"), {
    mask: "R$ num",
    blocks: {
      num: {
        mask: Number,
        scale: 2,
        radix: ",",
        thousandsSeparator: ".",
        padFractionalZeros: true,
        normalizeZeros: true,
        min: 0,
      },
    },
  });

  // 💡 MELHORIA: Controle de Tipo de Transação mais limpo
  const setTxType = (type) => {
    txTypeInput.value = type;
    const isIncome = type === "income"; // Atualiza botões
    panel
      .querySelector("#btn-tx-type-income")
      .classList.toggle("active", isIncome);
    panel
      .querySelector("#btn-tx-type-income")
      .classList.toggle("bg-green-500/10", isIncome); // <-- Problema
    panel
      .querySelector("#btn-tx-type-income")
      .classList.toggle("border-green-500", isIncome); // <-- Problema
    panel
      .querySelector("#btn-tx-type-income")
      .classList.toggle("text-green-400", isIncome); // <-- Problema
    panel
      .querySelector("#btn-tx-type-expense")
      .classList.toggle("active", !isIncome);
    panel
      .querySelector("#btn-tx-type-expense")
      .classList.toggle("bg-red-500/10", !isIncome); // <-- Problema
    panel
      .querySelector("#btn-tx-type-expense")
      .classList.toggle("border-red-500", !isIncome); // <-- Problema
    panel
      .querySelector("#btn-tx-type-expense")
      .classList.toggle("text-red-400", !isIncome); // <-- Problema // Mostra/oculta seções
    incomeFields.classList.toggle("hidden", !isIncome);
    expenseFields.classList.toggle("hidden", isIncome);
  };

  panel.querySelectorAll(".btn-tx-type").forEach((btn) => {
    btn.addEventListener("click", () => setTxType(btn.dataset.type));
  });

  // Combobox de Clientes (Seu código está perfeito, apenas adicionei os ícones no dropdown)
  const clientInput = panel.querySelector("#client-search-input");
  const clientDropdown = panel.querySelector("#client-search-dropdown");
  const clientIdInput = panel.querySelector("#txClientId");

  clientInput.addEventListener("keyup", () => {
    const searchTerm = clientInput.value.toLowerCase();
    clientDropdown.innerHTML = "";

    const filteredClients = allAgencyClients.filter((c) =>
      c.name.toLowerCase().includes(searchTerm)
    );

    if (filteredClients.length > 0) {
      filteredClients.forEach((client) => {
        clientDropdown.innerHTML += `<div class="p-3 hover:bg-zinc-600 cursor-pointer transition-colors flex items-center gap-3" data-id="${client.id}" data-name="${client.name}">
                        <div class="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <i data-lucide="user" class="w-4 h-4 text-blue-400"></i>
                        </div>
                        <span class="text-white">${client.name}</span>
                    </div>`;
      });
      clientDropdown.classList.remove("hidden");
    } else {
      clientDropdown.innerHTML =
        '<div class="p-3 text-zinc-400 text-center">Nenhum cliente encontrado</div>';
      clientDropdown.classList.remove("hidden");
    }
    lucide.createIcons(); // Renderiza o ícone do usuário no dropdown
  });

  clientDropdown.addEventListener("click", (e) => {
    const item = e.target.closest("[data-id]");
    if (item) {
      clientIdInput.value = item.dataset.id;
      clientInput.value = item.dataset.name;
      clientDropdown.classList.add("hidden");
    }
  });

  // (O listener de 'click' para fechar o dropdown está ótimo)
  document.addEventListener(
    "click",
    (e) => {
      if (
        !clientInput.contains(e.target) &&
        !clientDropdown.contains(e.target)
      ) {
        clientDropdown.classList.add("hidden");
      }
    },
    { once: true }
  );

  // Preenche o formulário se for edição (Seu código está perfeito)
  if (isEditing) {
    setTxType(transaction.type);

    if (transaction.clientId) {
      const client = allAgencyClients.find(
        (c) => c.id === transaction.clientId
      );
      if (client) {
        clientInput.value = client.name;
        clientIdInput.value = client.id;
      }
    }

    panel.querySelector("#txPaymentStatus").value =
      transaction.paymentStatus || "pending_100";
    panel.querySelector("#txInvoiceIssued").checked =
      transaction.invoiceIssued || false;
    // txExpenseType é tratado pelo radio
    panel.querySelector("#txCategory").value = transaction.category || "";

    if (transaction.type === "expense") {
      const expenseTypeRadio = panel.querySelector(
        `input[name="txExpenseType"][value="${
          transaction.expenseType || "variable"
        }"]`
      );
      if (expenseTypeRadio) expenseTypeRadio.checked = true;
    }
  } else {
    setTxType("income");
  }

  // Adiciona o listener de submit
  form.addEventListener("submit", (e) => handleSaveTransaction(e, valueMask));
}

/**
 * 💡 NOVA FUNÇÃO ÚNICA (Substitui handleAddTransaction e handleEditTransaction)
 * Salva a transação lendo os dados dos novos componentes.
 */
async function handleSaveTransaction(e, valueMask) {
  e.preventDefault();
  const form = e.target;

  // 1. Pega os dados dos campos
  const txId = form.txId.value;
  const isEditing = !!txId;
  const type = form.txType.value;

  const unmaskedValue = valueMask.unmaskedValue;
  const value = parseFloat(unmaskedValue) || 0;

  // 3. Monta o objeto de dados
  const data = {
    title: form.txTitle.value,
    value: value,
    date: form.txDate.value,
    type: type,
    updatedAt: serverTimestamp(),
  };

  let recurrenceMonths = 1;

  if (type === "income") {
    data.clientId = form.txClientId.value || null;
    data.paymentStatus = form.txPaymentStatus.value;
    data.invoiceIssued = form.txInvoiceIssued.checked;
    data.category = "Serviço Prestado";
  } else {
    // 💡 CORREÇÃO: Lê o valor do radio button selecionado
    data.expenseType = form.txExpenseType.value;
    data.category = form.txCategory.value || "Despesa";

    if (data.expenseType === "fixed") {
      recurrenceMonths = 60; // 5 anos
    }
  }

  // 4. Lógica de Salvar (Idêntica à anterior)
  try {
    if (isEditing) {
      // Lógica de EDIÇÃO
      const docRef = getAgencyTransactionDoc(txId);
      await updateDoc(docRef, data);
    } else if (
      type === "expense" &&
      data.expenseType === "fixed" &&
      recurrenceMonths > 1
    ) {
      // Lógica de ADIÇÃO (Recorrente)
      const recurrenceId = `recur_${Date.now()}`;
      const batch = writeBatch(db);
      const baseDate = new Date(data.date + "T12:00:00");
      data.createdAt = serverTimestamp();

      for (let i = 0; i < recurrenceMonths; i++) {
        const newDate = new Date(baseDate.getTime());
        newDate.setMonth(baseDate.getMonth() + i);
        const dateString = newDate.toISOString().split("T")[0];
        const docRef = doc(
          collection(db, `${getBasePath()}/agencyTransactions`)
        );

        batch.set(docRef, {
          ...data,
          date: dateString,
          recurrenceId: recurrenceId,
        });
      }
      await batch.commit();
      showModal(
        "Sucesso",
        `Despesa fixa "${data.title}" foi criada para os próximos 5 anos.`
      );
    } else {
      // Lógica de ADIÇÃO (Única)
      data.createdAt = serverTimestamp();
      await addDoc(getAgencyTransactionsCollection(), data);
    }

    form.reset();
    closeSlideOver();
  } catch (error) {
    console.error("Erro ao salvar transação:", error);
    showModal("Erro", "Não foi possível salvar a transação.");
  }
}

/**
 * Salva (Adiciona ou Edita) uma transação no Firebase.
 */
async function handleAddTransaction(e) {
  e.preventDefault();
  const form = e.target;
  const txId = form.txId.value;
  const isEditing = !!txId;

  // Se for edição, chama a função de editar e termina
  if (isEditing) {
    return handleEditTransaction(txId, form);
  }

  // Lógica de ADIÇÃO
  const type = form.txType.value;
  const data = {
    title: form.txTitle.value,
    value: parseFloat(form.txValue.value) || 0,
    date: form.txDate.value,
    type: type,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  };

  // 💡 LÓGICA DE RECORRÊNCIA AUTOMÁTICA
  let recurrenceMonths = 1; // Padrão é 1 (variável)

  if (type === "income") {
    data.clientId = form.txClientId.value || null;
    data.paymentStatus = form.txPaymentStatus.value;
    data.invoiceIssued = form.txInvoiceIssued.checked;
    data.category = "Serviço Prestado";
  } else {
    data.category = form.txCategory.value || "Despesa";
    data.expenseType = form.txExpenseType.value;

    // 💡 AQUI ESTÁ A MÁGICA
    if (data.expenseType === "fixed") {
      recurrenceMonths = 60; // "Infinito" = 60 meses (5 anos)
    }
  }

  // Se for despesa fixa E o usuário pediu para repetir > 1 mês
  if (
    type === "expense" &&
    data.expenseType === "fixed" &&
    recurrenceMonths > 1
  ) {
    const recurrenceId = `recur_${Date.now()}`;
    const batch = writeBatch(db);
    const baseDate = new Date(data.date + "T12:00:00");

    for (let i = 0; i < recurrenceMonths; i++) {
      const newDate = new Date(baseDate.getTime());
      newDate.setMonth(baseDate.getMonth() + i);
      const dateString = newDate.toISOString().split("T")[0];

      const docRef = doc(collection(db, `${getBasePath()}/agencyTransactions`));

      batch.set(docRef, {
        ...data,
        date: dateString,
        recurrenceId: recurrenceId, // ID que liga todas
        recurrenceMonths: recurrenceMonths,
      });
    }

    try {
      await batch.commit();
      form.reset();
      closeSlideOver();
      showModal(
        "Sucesso",
        `Despesa fixa "${data.title}" foi criada para os próximos 5 anos.`
      );
    } catch (error) {
      console.error("Erro ao salvar transações recorrentes:", error);
      showModal("Erro", "Não foi possível salvar as transações recorrentes.");
    }
  } else {
    // Lançamento normal (Receita ou Despesa Variável)
    try {
      await addDoc(getAgencyTransactionsCollection(), data);
      form.reset();
      closeSlideOver();
    } catch (error) {
      console.error("Erro ao salvar transação:", error);
      showModal("Erro", "Não foi possível salvar a transação.");
    }
  }
}

/**
 * 💡 FUNÇÃO DE EDIÇÃO ATUALIZADA (mais simples)
 * Lida apenas com a EDIÇÃO de uma transação.
 */
async function handleEditTransaction(txId, form) {
  const type = form.txType.value;

  const data = {
    title: form.txTitle.value,
    value: parseFloat(form.txValue.value) || 0,
    date: form.txDate.value,
    type: type,
    updatedAt: serverTimestamp(),
  };

  if (type === "income") {
    data.clientId = form.txClientId.value || null;
    data.paymentStatus = form.txPaymentStatus.value;
    data.invoiceIssued = form.txInvoiceIssued.checked;
    data.category = "Serviço Prestado";
  } else {
    data.category = form.txCategory.value || "Despesa";
    data.expenseType = form.txExpenseType.value;
  }

  try {
    const docRef = getAgencyTransactionDoc(txId);
    await updateDoc(docRef, data);
    form.reset();
    closeSlideOver();
  } catch (error) {
    console.error("Erro ao salvar transação:", error);
    showModal("Erro", "Não foi possível salvar as alterações.");
  }
}

async function handleDeleteTransaction(txId, recurrenceId, txTitle, txDate) {
  // 1. SE NÃO FOR RECORRENTE (Lógica simples de sempre)
  if (!recurrenceId) {
    if (
      await showConfirmModal(
        "Excluir Transação?",
        `Tem certeza que deseja excluir "${txTitle}"?`
      )
    ) {
      try {
        await deleteDoc(getAgencyTransactionDoc(txId));
      } catch (error) {
        console.error("Erro ao deletar transação:", error);
        showModal("Erro", "Não foi possível excluir a transação.");
      }
    }
    return; // Termina aqui
  }

  // 2. SE FOR RECORRENTE (Lógica nova com botões customizados)

  // Formata a data para "Nov/2025"
  const date = new Date(txDate + "T12:00:00");
  const monthYear = date.toLocaleDateString("pt-BR", {
    month: "short",
    year: "numeric",
  });

  // Classes de estilo para os botões (Tailwind)
  const btnCompact =
    "w-full md:w-auto py-2 px-4 rounded-md font-medium text-sm transition-colors duration-150";
  const btnSecondary = `${btnCompact} bg-zinc-600 hover:bg-zinc-500 text-white`;
  const btnDanger = `${btnCompact} bg-red-600 hover:bg-red-700 text-white`;
  const btnPrimary = `${btnCompact} bg-blue-600 hover:bg-blue-700 text-white`;

  const result = await showCustomConfirmModal(
    "Excluir Despesa Recorrente",
    `"${txTitle}" é uma despesa fixa. O que você deseja fazer?`,
    [
      // Botão 1: Apagar este mês
      {
        text: `Apagar somente este mês (${monthYear})`,
        value: "one",
        class: btnSecondary,
      },
      // Botão 2: Apagar todos
      {
        text: "Apagar TODAS as instâncias",
        value: "all",
        class: btnDanger,
      },
      // Botão 3: Cancelar
      {
        text: "Cancelar",
        value: "cancel",
        class: btnPrimary,
      },
    ]
  );

  // 3. Processa o resultado da escolha
  switch (result) {
    case "one":
      // Apaga apenas esta instância
      try {
        await deleteDoc(getAgencyTransactionDoc(txId));
        showModal("Sucesso", "Apenas esta instância foi excluída.");
      } catch (error) {
        console.error("Erro ao deletar transação:", error);
        showModal("Erro", "Não foi possível excluir a transação.");
      }
      break;

    case "all":
      // Apaga todas as instâncias pelo recurrenceId
      try {
        // (Esta função deleteAllByRecurrenceId já deve existir da nossa etapa anterior)
        await deleteAllByRecurrenceId(recurrenceId);
        showModal(
          "Sucesso",
          "Todas as instâncias recorrentes foram excluídas."
        );
      } catch (error) {
        console.error("Erro ao deletar todas as transações:", error);
        showModal("Erro", "Não foi possível excluir todas as transações.");
      }
      break;

    case "cancel":
    default:
      // Não faz nada
      break;
  }
}

/**
 * 💡 NOVA: Função helper para buscar e excluir em lote por ID de recorrência.
 */
async function deleteAllByRecurrenceId(recurrenceId) {
  if (!recurrenceId) return;

  const batch = writeBatch(db);

  // 1. Busca todos os documentos com esse ID de recorrência
  const q = query(
    getAgencyTransactionsCollection(),
    where("recurrenceId", "==", recurrenceId)
  );
  const querySnapshot = await getDocs(q); // 💡 OPA! getDocs não está importado

  if (querySnapshot.empty) {
    console.warn(
      "Nenhuma transação encontrada para o recurrenceId:",
      recurrenceId
    );
    return;
  }

  // 2. Adiciona todos ao lote de exclusão
  querySnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });

  // 3. Executa a exclusão
  await batch.commit();
}

function renderAccountsReceivableTable(pendingTransactions) {
  const tableBody = document.getElementById("finance-receivable-body");
  if (!tableBody) return;

  // Pega o container principal da tabela de pendências
  const tableContainer = tableBody.closest(".bg-zinc-800");

  tableBody.innerHTML = ""; // Limpa a tabela
  let totalPendente = 0;

  if (pendingTransactions.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-zinc-400">
            <div class="flex flex-col items-center justify-center">
                <i data-lucide="party-popper" class="w-10 h-10 mx-auto mb-3 text-green-500"></i>
                <p class="font-semibold text-lg text-white">Tudo em dia!</p>
                <p class="text-sm">Nenhuma pendência de pagamento encontrada.</p>
            </div>
        </td></tr>`;
    if (typeof lucide !== "undefined") lucide.createIcons();
  } else {
    // ... (todo o seu 'forEach' para renderizar as linhas da tabela permanece o mesmo) ...
    const paymentStatusLabels = {
      pending_100: "Pendente (100%)",
      pending_50: "Pendente (50%)",
      paid_50: "Pago (50%)",
    };
    const statusColors = {
      pending_100: "text-red-400",
      pending_50: "text-red-400",
      paid_50: "text-yellow-400",
    };

    pendingTransactions.forEach((tx) => {
      // Calcula o total pendente ENQUANTO renderiza
      const value = parseFloat(tx.value) || 0;
      if (tx.paymentStatus === "pending_100") totalPendente += value;
      else if (
        tx.paymentStatus === "pending_50" ||
        tx.paymentStatus === "paid_50"
      )
        totalPendente += value / 2;

      const tr = document.createElement("tr");
      tr.className = "hover:bg-zinc-700";

      const client = tx.clientId
        ? allAgencyClients.find((c) => c.id === tx.clientId)
        : null;
      const txDate = tx.date
        ? new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR")
        : "N/A";
      const paymentStatus = tx.paymentStatus || "pending_100";

      tr.innerHTML = `
                <td class="p-4 font-medium">${
                  client ? client.name : "Cliente Avulso"
                }</td>
                <td class="p-4 text-zinc-400">${tx.title}</td>
                <td class="p-4 text-zinc-400">${txDate}</td>
                <td class="p-4 font-semibold ${
                  statusColors[paymentStatus] || "text-zinc-400"
                }">
                    ${paymentStatusLabels[paymentStatus] || paymentStatus}
                </td>
                <td class="p-4 font-medium text-green-400">R$ ${value.toFixed(
                  2
                )}</td>
                <td class="p-4 text-right whitespace-nowrap">
                    <button data-edit-tx-id="${
                      tx.id
                    }" class="py-2 px-3 bg-blue-500 hover:bg-blue-600 rounded-md font-semibold text-xs transition-colors">
                        Atualizar Status
                    </button>
                </td>
            `;
      tr.querySelector(`[data-edit-tx-id="${tx.id}"]`).addEventListener(
        "click",
        () => showAddTransactionForm(tx.id)
      );
      tableBody.appendChild(tr);
    });
    if (typeof lucide !== "undefined") lucide.createIcons();
  }

  // 💡 ATUALIZA HEADER E FOOTER
  const formatBRL = (val) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Atualiza o contador no header
  tableContainer.querySelector(
    'span[class*="text-yellow-400 text-sm bg-yellow-500/10"]'
  ).textContent = `${pendingTransactions.length} itens`;

  // Atualiza o total no footer
  tableContainer.querySelector(
    '.bg-zinc-700\\/30 span[class*="text-yellow-400 font-semibold"]'
  ).textContent = formatBRL(totalPendente);
}
