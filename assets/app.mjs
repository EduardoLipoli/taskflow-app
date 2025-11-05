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
            browserSessionPersistence
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
            writeBatch
        } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


        const firebaseConfig = {
            apiKey: "AIzaSyBBs28oaIKr-R1ojWPItgv0aJOnnRT1bGM",
            authDomain: "faculdade-ead-ads.firebaseapp.com",
            projectId: "faculdade-ead-ads",
            storageBucket: "faculdade-ead-ads.firebasestorage.app",
            messagingSenderId: "874731969810",
            appId: "1:874731969810:web:094effbc83313df7f4a7cb"
        };



        let app, auth, db, userId, calendar;
        let unsubscribeTasks, unsubscribeAgency, unsubscribeSubjects;
        let unsubscribeFocusHistory;
        let allTasks = [];
        let allProjects = [];
        let allSubjects = [];

        let allNotifications = [];
        let unsubscribeNotifications;


        let currentPage = 1;
        const itemsPerPage = 8;
        let currentSort = 'createdAt';

        let unsubscribeProjectTasks = {};
        let currentProjectId = null;
        let currentSubjectId = null;
        let unsubscribeSubjectItems = {};

        let allProjectTasks = {};
        let allSubjectTasks = {};
        let currentDefaultTitle = document.title;

        let modalResolve = null;
        let automationRunning = false;

        const COLORS = {
            bgPrimary: 'bg-zinc-900',
            bgSecondary: 'bg-zinc-800',
            bgCard: 'bg-zinc-700',
            textPrimary: 'text-zinc-100',
            textSecondary: 'text-zinc-400',
            accent: 'text-blue-500'
        };


        const scheduleTimeSlots = ["19:00 - 20:10", "20:20 - 21:10", "21:20 - 22:00"];
        const scheduleDays = ["seg", "ter", "qua", "qui", "sex"];
        const scheduleDayLabels = {
            seg: "Segunda",
            ter: "Terça",
            qua: "Quarta",
            qui: "Quinta",
            sex: "Sexta"
        };
        const dayOfWeekMap = { 0: 'dom', 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab' };


        const subjectColorPalette = [
            { bg: 'bg-purple-600', hover: 'hover:bg-purple-500' },
            { bg: 'bg-blue-600', hover: 'hover:bg-blue-500' },
            { bg: 'bg-green-600', hover: 'hover:bg-green-500' },
            { bg: 'bg-red-600', hover: 'hover:bg-red-500' },
            { bg: 'bg-yellow-600', hover: 'hover:bg-yellow-500' },
            { bg: 'bg-indigo-600', hover: 'hover:bg-indigo-500' },
            { bg: 'bg-pink-600', hover: 'hover:bg-pink-500' }
        ];



        document.addEventListener('DOMContentLoaded', initApp);

        async function initApp() {
            try {

                app = initializeApp(firebaseConfig);
                auth = getAuth(app);
                db = getFirestore(app);


                setupUIEventListeners();


                await setPersistence(auth, browserSessionPersistence);

                onAuthStateChanged(auth, async (user) => {
                    const loadingScreen = document.getElementById('loading-screen');
                    const loginScreen = document.getElementById('login-screen');
                    const appWrapper = document.getElementById('app-wrapper');

                    if (user) {
                        userId = user.uid;


                        document.getElementById('user-email-display').textContent = user.email || 'Usuário Anônimo';
                        document.getElementById('user-email-display').title = user.email || 'Usuário Anônimo';
                        document.getElementById('user-id-display').textContent = `ID: ${userId.substring(0, 10)}...`;


                        loginScreen.classList.add('hidden');
                        loadingScreen.classList.remove('hidden');



                        await updateUserStreak();


                        // Função requestNotificationPermission removida daqui
                        // para ser acessível pelo setupUIEventListeners e 
                        // para evitar a solicitação automática no iOS.


                        await loadInitialData();

                        loadingScreen.classList.add('hidden');
                        appWrapper.classList.remove('hidden');
                        appWrapper.classList.add('flex');

                        showPage('dashboard');


                        if (typeof lucide !== 'undefined') {
                            lucide.createIcons();
                        }

                    } else {

                        userId = null;
                        if (unsubscribeTasks) unsubscribeTasks();
                        if (unsubscribeAgency) unsubscribeAgency();
                        if (unsubscribeSubjects) unsubscribeSubjects();
                        if (unsubscribeProjectTasks) Object.values(unsubscribeProjectTasks).forEach(unsub => unsub());
                        if (unsubscribeFocusHistory) unsubscribeFocusHistory();
                        clearSubjectListeners();

                        loadingScreen.classList.add('hidden');
                        appWrapper.classList.add('hidden');
                        appWrapper.classList.remove('flex');
                        loginScreen.classList.remove('hidden');
                    }
                });

            } catch (error) {
                console.error("Erro na inicialização:", error);
                const loadingScreen = document.getElementById('loading-screen');
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
                if (permission === 'granted') {
                    document.getElementById('notification-permission-banner')?.classList.add('hidden');
                    showModal("Sucesso", "Notificações ativadas! Você receberá alertas de tarefas e Pomodoro.");
                } else {
                    showModal("Atenção", "Permissão de notificação negada. Você não receberá alertas importantes.");
                }
            } catch (err) {
                console.error("Erro ao solicitar permissão de notificação:", err);
                showModal("Erro", "Não foi possível solicitar a permissão de notificação.");
            }
        }

        function setupUIEventListeners() {

            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    showPage(e.currentTarget.dataset.page);
                    closeMobileMenu();
                });
            });


            document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));
            document.getElementById('btn-google-login').addEventListener('click', signInWithGoogle);
            document.getElementById('form-email-login').addEventListener('submit', handleEmailLogin);
            document.getElementById('form-email-signup').addEventListener('submit', handleEmailSignup);
            document.getElementById('btn-show-signup').addEventListener('click', () => toggleAuthForms(false));
            document.getElementById('btn-show-login').addEventListener('click', () => toggleAuthForms(true));


            document.getElementById('btn-open-mobile-menu').addEventListener('click', openMobileMenu);
            document.getElementById('btn-close-mobile-menu').addEventListener('click', closeMobileMenu);
            document.getElementById('mobile-menu-overlay').addEventListener('click', closeMobileMenu);

            const btnRequestNotif = document.getElementById('btn-request-notification-permission');
            if (btnRequestNotif) {
                btnRequestNotif.addEventListener('click', requestNotificationPermission);
            }

            const notifPanel = document.getElementById('notification-panel');
            const notifButton = document.getElementById('btn-toggle-notifications');

            notifButton.addEventListener('click', (e) => {
                e.stopPropagation();
                notifPanel.classList.toggle('hidden');
            });

            document.getElementById('btn-mark-all-read').addEventListener('click', (e) => {
                e.stopPropagation();
                handleMarkAllRead();
            });


            document.addEventListener('click', (e) => {
                if (!notifPanel.classList.contains('hidden') && !notifPanel.contains(e.target) && !notifButton.contains(e.target)) {
                    notifPanel.classList.add('hidden');
                }
            });



            document.getElementById('modal-btn-cancel').addEventListener('click', () => closeModal(false));
            document.getElementById('modal-btn-confirm').addEventListener('click', () => closeModal(true));
            document.getElementById('btn-close-slide-over').addEventListener('click', closeSlideOver);
            document.getElementById('slide-over-overlay').addEventListener('click', closeSlideOver);


            document.getElementById('btn-show-add-task-modal').addEventListener('click', showAddTaskForm);
            document.getElementById('btn-show-add-project-modal').addEventListener('click', showAddProjectForm);


            document.getElementById('agency-sort-select').addEventListener('change', (e) => {
                currentSort = e.target.value;
                currentPage = 1;
                renderAgencyTable(allProjects);
            });

            document.getElementById('btn-agency-prev').addEventListener('click', () => {
                changeAgencyPage(-1);
            });

            document.getElementById('btn-agency-next').addEventListener('click', () => {
                changeAgencyPage(1);
            });


            document.getElementById('btn-back-to-agency').addEventListener('click', () => showPage('agency'));
            document.getElementById('btn-show-add-project-task-modal').addEventListener('click', showAddProjectTaskForm);


            document.getElementById('form-add-subject').addEventListener('submit', handleAddSubject);
            document.getElementById('btn-back-to-college').addEventListener('click', () => showPage('college'));


            document.getElementById('form-add-subject-topic').addEventListener('submit', handleAddSubjectTopic);
            document.getElementById('form-add-subject-live-class').addEventListener('submit', handleAddSubjectLiveClass);
            document.getElementById('btn-show-add-subject-task-modal').addEventListener('click', showAddSubjectTaskForm);
            document.getElementById('form-save-subject-schedule').addEventListener('submit', handleSaveSubjectSchedule);


            document.getElementById('pomodoro-start').addEventListener('click', () => pomodoro.start());
            document.getElementById('pomodoro-reset').addEventListener('click', () => pomodoro.reset());
            document.getElementById('pomodoro-mode-focus').addEventListener('click', () => pomodoro.setMode('focus'));
            document.getElementById('pomodoro-mode-short').addEventListener('click', () => pomodoro.setMode('short'));
            document.getElementById('pomodoro-mode-long').addEventListener('click', () => pomodoro.setMode('long'));


            document.getElementById('btn-toggle-focus-mode').addEventListener('click', toggleFocusMode);
            document.getElementById('btn-exit-focus-mode').addEventListener('click', toggleFocusMode);
            document.getElementById('pomodoro-start-focus').addEventListener('click', () => pomodoro.start());
            document.getElementById('pomodoro-reset-focus').addEventListener('click', () => pomodoro.reset());
        }

        function toggleAuthForms(showLogin) {
            document.getElementById('login-form').classList.toggle('hidden', !showLogin);
            document.getElementById('signup-form').classList.toggle('hidden', showLogin);
        }



        async function signInWithGoogle() {
            const provider = new GoogleAuthProvider();
            try {
                await signInWithPopup(auth, provider);
            } catch (error) {
                console.error("Erro no login com Google:", error);
                showModal("Erro de Login", error.message);
            }
        }

        async function handleEmailLogin(e) {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-password').value;
            try {
                await signInWithEmailAndPassword(auth, email, pass);
            } catch (error) {
                console.error("Erro no login com email:", error);
                showModal("Erro de Login", "Email ou senha inválidos.");
            }
        }

        async function handleEmailSignup(e) {
            e.preventDefault();
            const email = document.getElementById('signup-email').value;
            const pass = document.getElementById('signup-password').value;
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


        const getNotificationsCollection = () => collection(db, `${getBasePath()}/notifications`);
        const getNotificationDoc = (id) => doc(db, `${getBasePath()}/notifications/${id}`);


        const getTasksCollection = () => collection(db, `${getBasePath()}/tasks`);
        const getTaskDoc = (id) => doc(db, `${getBasePath()}/tasks/${id}`);


        const getAgencyCollection = () => collection(db, `${getBasePath()}/agencyProjects`);
        const getAgencyDoc = (id) => doc(db, `${getBasePath()}/agencyProjects/${id}`);


        const getProjectTasksCollection = (projectId) => collection(db, `${getAgencyDoc(projectId).path}/tasks`);
        const getProjectTaskDoc = (projectId, taskId) => doc(db, `${getAgencyDoc(projectId).path}/tasks/${taskId}`);


        const getSubjectsCollection = () => collection(db, `${getBasePath()}/subjects`);
        const getSubjectDoc = (id) => doc(db, `${getBasePath()}/subjects/${id}`);


        const getSubjectTopicsCollection = (subjectId) => collection(db, `${getSubjectDoc(subjectId).path}/topics`);
        const getSubjectTopicDoc = (subjectId, topicId) => doc(db, `${getSubjectDoc(subjectId).path}/topics/${topicId}`);
        const getSubjectLiveClassesCollection = (subjectId) => collection(db, `${getSubjectDoc(subjectId).path}/liveClasses`);
        const getSubjectLiveClassDoc = (subjectId, classId) => doc(db, `${getSubjectDoc(subjectId).path}/liveClasses/${classId}`);
        const getSubjectTasksCollection = (subjectId) => collection(db, `${getSubjectDoc(subjectId).path}/tasks`);
        const getSubjectTaskDoc = (subjectId, taskId) => doc(db, `${getSubjectDoc(subjectId).path}/tasks/${taskId}`);


        const getFocusHistoryCollection = () => collection(db, `${getBasePath()}/focusHistory`);


        async function loadInitialData() {
            if (!userId) return;


            if (unsubscribeTasks) unsubscribeTasks();
            if (unsubscribeAgency) unsubscribeAgency();
            if (unsubscribeSubjects) unsubscribeSubjects();
            if (unsubscribeProjectTasks) Object.values(unsubscribeProjectTasks).forEach(unsub => unsub());
            if (unsubscribeFocusHistory) unsubscribeFocusHistory();
            if (unsubscribeNotifications) unsubscribeNotifications();
            clearSubjectListeners();


            const tasksQuery = query(getTasksCollection());
            unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
                allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));


                renderKanbanTasks(allTasks);
                updateDashboard();
                updateCalendar();
                updatePomodoroTaskSelect();
                renderUpcomingEvents();
                runAutomationLogic(allTasks);

            }, (error) => console.error("Erro ao carregar tarefas:", error));


            const agencyQuery = query(getAgencyCollection());
            unsubscribeAgency = onSnapshot(agencyQuery, (snapshot) => {
                allProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderAgencyTable(allProjects);


                allProjectTasks = {};
                allProjects.forEach(project => {
                    const projTasksQuery = query(getProjectTasksCollection(project.id));

                    unsubscribeProjectTasks[project.id] = onSnapshot(projTasksQuery, (tasksSnapshot) => {
                        allProjectTasks[project.id] = tasksSnapshot.docs.map(d => ({ id: d.id, ...d.data(), projectId: project.id, projectTitle: project.title }));

                        updateCalendar();
                        updatePomodoroTaskSelect();
                        renderAgencyTable(allProjects);
                        renderUpcomingEvents();
                        updateDashboard();
                    }, (error) => { console.error(`Erro ao carregar tarefas do projeto ${project.id}:`, error) });
                });

            }, (error) => console.error("Erro ao carregar projetos da agência:", error));


            async function addNotification(text, type = 'info') {
                if (!userId) return;
                try {

                    await addDoc(getNotificationsCollection(), {
                        text: text,
                        type: type,
                        read: false,
                        createdAt: serverTimestamp()
                    });
                } catch (error) {
                    console.error("Erro ao adicionar notificação:", error);
                }
            }


            const subjectsQuery = query(getSubjectsCollection());
            unsubscribeSubjects = onSnapshot(subjectsQuery, (snapshot) => {
                allSubjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                renderCollegeSubjects(allSubjects);
                renderCollegeSchedule(allSubjects);
                renderDashboardSchedule(allSubjects);
                updateCalendar();
                updateCollegeStats(allSubjects, allSubjectTasks);


                allSubjectTasks = {};
                allSubjects.forEach(subject => {
                    const subjTasksQuery = query(getSubjectTasksCollection(subject.id));
                    unsubscribeSubjectItems[`tasks_${subject.id}`] = onSnapshot(subjTasksQuery, (tasksSnapshot) => {
                        allSubjectTasks[subject.id] = tasksSnapshot.docs.map(d => ({ id: d.id, ...d.data(), subjectId: subject.id, subjectName: subject.name }));

                        updateCalendar();
                        updatePomodoroTaskSelect();
                        updateCollegeStats(allSubjects, allSubjectTasks);
                        renderUpcomingEvents();
                        updateDashboard();
                    }, (error) => { console.error(`Erro ao carregar tarefas da disciplina ${subject.id}:`, error) });
                });

            }, (error) => console.error("Erro ao carregar disciplinas:", error));


            const focusQuery = query(getFocusHistoryCollection(), orderBy('createdAt', 'desc'));
            unsubscribeFocusHistory = onSnapshot(focusQuery, (snapshot) => {
                const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderFocusHistory(history);
            }, (error) => { console.error("Erro ao carregar histórico de foco:", error) });



            const notifQuery = query(getNotificationsCollection(), orderBy('createdAt', 'desc'));
            unsubscribeNotifications = onSnapshot(notifQuery, (snapshot) => {
                allNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderNotifications(allNotifications);
            }, (error) => {
                console.error("Erro ao carregar notificações:", error);
                document.getElementById('notification-list').innerHTML = `<p class="p-4 text-center text-sm text-red-400">Erro ao carregar</p>`;
            });

        }


        function renderNotifications(notifications) {
            const listEl = document.getElementById('notification-list');
            const dotEl = document.getElementById('notification-dot');
            if (!listEl || !dotEl) return;

            listEl.innerHTML = '';
            let hasUnread = false;

            if (notifications.length === 0) {
                listEl.innerHTML = `<p class="p-4 text-center text-sm text-zinc-400">Nenhuma notificação</p>`;
                dotEl.classList.add('hidden');
                return;
            }

            const icons = {
                overdue: 'alert-triangle',
                dueToday: 'calendar-check',
                info: 'info'
            };
            const colors = {
                overdue: 'text-red-400',
                dueToday: 'text-blue-400',
                info: 'text-zinc-400'
            }

            notifications.forEach(notif => {
                if (!notif.read) {
                    hasUnread = true;
                }

                const icon = icons[notif.type] || 'info';
                const color = colors[notif.type] || 'text-zinc-400';

                const notifEl = document.createElement('div');
                notifEl.className = `p-3 flex items-start gap-3 rounded-md transition-colors ${!notif.read ? 'bg-zinc-800' : 'bg-transparent hover:bg-zinc-600/50'}`;

                notifEl.innerHTML = `
                    <div>
                        <i data-lucide="${icon}" class="w-4 h-4 mt-0.5 ${color}"></i>
                    </div>
                    <div>
                        <p class="text-sm text-zinc-200 leading-snug">${notif.text}</p>
                        <p class="text-xs text-zinc-400 mt-1">
                            ${notif.createdAt ? notif.createdAt.toDate().toLocaleDateString('pt-BR') : ''}
                        </p>
                    </div>
                `;
                listEl.appendChild(notifEl);
            });


            dotEl.classList.toggle('hidden', !hasUnread);

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }


        async function handleMarkAllRead() {
            if (!userId) return;


            const unread = allNotifications.filter(n => !n.read);


            const batch = writeBatch(db);

            unread.forEach(notif => {
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

            document.querySelectorAll('main > div[id^="page-"]').forEach(page => {
                page.classList.add('hidden');
            });


            const activePage = document.getElementById(`page-${pageId}`);
            if (activePage) {
                activePage.classList.remove('hidden');
            } else {
                document.getElementById('page-dashboard').classList.remove('hidden');
            }


            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.toggle('bg-zinc-700', link.dataset.page === pageId);
                link.classList.toggle('text-white', link.dataset.page === pageId);
            });


            let newTitle = 'TaskFlow';
            switch (pageId) {
                case 'dashboard': newTitle = 'Dashboard - TaskFlow'; break;
                case 'tasks': newTitle = 'Minhas Tarefas - TaskFlow'; break;
                case 'agency': newTitle = 'Agência (CRM) - TaskFlow'; break;
                case 'college': newTitle = 'Faculdade - TaskFlow'; break;
                case 'calendar': newTitle = 'Calendário - TaskFlow'; break;
                case 'project-detail': newTitle = 'Detalhe do Projeto - TaskFlow'; break;
                case 'subject-detail': newTitle = 'Detalhe da Disciplina - TaskFlow'; break;
            }


            currentDefaultTitle = newTitle;



            if (!pomodoro.isRunning) {
                document.title = currentDefaultTitle;
            }



            if (pageId === 'dashboard') {
                pomodoro.init();
                const banner = document.getElementById('notification-permission-banner');
                if (banner && Notification.permission === 'default') {
                    banner.classList.remove('hidden');
                } else if (banner) {
                    banner.classList.add('hidden');
                }
            }
            if (pageId === 'calendar') {
                if (!calendar) {
                    initCalendar();
                }
                calendar.render();
                updateCalendar();
                renderUpcomingEvents();
            }
            if (pageId !== 'project-detail') {
                if (pageId !== 'agency' && unsubscribeProjectTasks) {
                    Object.values(unsubscribeProjectTasks).forEach(unsub => unsub());
                    unsubscribeProjectTasks = {};
                }
                currentProjectId = null;
            }
            if (pageId !== 'subject-detail') {
                clearSubjectListeners();
                currentSubjectId = null;
            }
        }



        function showModal(title, message) {
            document.getElementById('modal-title').textContent = title;
            document.getElementById('modal-message').textContent = message;
            document.getElementById('modal-btn-confirm').classList.add('hidden');
            document.getElementById('modal-btn-cancel').textContent = 'Fechar';
            document.getElementById('modal-container').classList.remove('hidden');
            document.getElementById('modal-container').classList.add('flex');
            modalResolve = null;
        }

        function showConfirmModal(title, message) {
            document.getElementById('modal-title').textContent = title;
            document.getElementById('modal-message').textContent = message;
            document.getElementById('modal-btn-confirm').classList.remove('hidden');
            document.getElementById('modal-btn-cancel').textContent = 'Cancelar';
            document.getElementById('modal-container').classList.remove('hidden');
            document.getElementById('modal-container').classList.add('flex');
            return new Promise((resolve) => {
                modalResolve = resolve;
            });
        }

        function closeModal(confirmed) {
            document.getElementById('modal-container').classList.add('hidden');
            document.getElementById('modal-container').classList.remove('flex');
            if (modalResolve) {
                modalResolve(confirmed);
                modalResolve = null;
            }
        }



        function openSlideOver(contentHtml, title) {
            document.getElementById('slide-over-title').textContent = title;
            document.getElementById('slide-over-content').innerHTML = contentHtml;
            document.getElementById('slide-over-container').classList.remove('hidden');
            void document.getElementById('slide-over-panel').offsetWidth;
            document.getElementById('slide-over-overlay').classList.remove('opacity-0');
            document.getElementById('slide-over-overlay').classList.add('opacity-100');
            document.getElementById('slide-over-panel').classList.remove('translate-x-full');
            document.getElementById('slide-over-panel').classList.add('translate-x-0');
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }

        function closeSlideOver() {
            document.getElementById('slide-over-overlay').classList.remove('opacity-100');
            document.getElementById('slide-over-overlay').classList.add('opacity-0');
            document.getElementById('slide-over-panel').classList.remove('translate-x-0');
            document.getElementById('slide-over-panel').classList.add('translate-x-full');
            setTimeout(() => {
                document.getElementById('slide-over-container').classList.add('hidden');
                document.getElementById('slide-over-content').innerHTML = '';
            }, 300);
        }



        function updateDashboard() {
            const statsTotal = document.getElementById('stats-total');
            const statsPending = document.getElementById('stats-pending');
            const statsDoing = document.getElementById('stats-doing');
            const statsDone = document.getElementById('stats-done');
            const recentTasksList = document.getElementById('recent-tasks-list');
            const categoryTasksList = document.getElementById('category-tasks-list');

            if (!statsTotal || !recentTasksList) return;


            const tasksMain = allTasks;
            const tasksAgency = Object.values(allProjectTasks).flat();
            const tasksCollege = Object.values(allSubjectTasks).flat();
            const allCombinedTasks = [...tasksMain, ...tasksAgency, ...tasksCollege];


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
                faculdade: 0
            };
            const categoryIcons = {
                pessoal: 'user',
                trabalho: 'briefcase',
                estudos: 'graduation-cap',
                freelancer: 'pen-tool',
                agencia: 'folder-open',
                faculdade: 'book-open'
            };
            const categoryColors = {
                pessoal: 'text-green-500',
                trabalho: 'text-blue-500',
                estudos: 'text-yellow-500',
                freelancer: 'text-purple-500',
                agencia: 'text-pink-500',
                faculdade: 'text-cyan-500'
            };


            allCombinedTasks.forEach(task => {
                const status = task.status || 'todo';
                if (status === 'todo') pendingCount++;
                else if (status === 'doing') doingCount++;
                else if (status === 'done') doneCount++;
                else if (status === 'overdue') overdueCount++;


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


            recentTasksList.innerHTML = '';
            const sortedTasks = [...allCombinedTasks].sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

            if (sortedTasks.length === 0) {
                recentTasksList.innerHTML = `
                    <div class="text-center py-8 text-zinc-500">
                        <i data-lucide="inbox" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
                        <p>Nenhuma tarefa recente</p>
                    </div>`;
            } else {

                sortedTasks.slice(0, 5).forEach(task => {
                    let subtext = 'Pessoal';

                    if (task.projectId) {
                        subtext = `Agência: ${task.projectTitle || 'Projeto'}`;
                    } else if (task.subjectId) {
                        subtext = `Faculdade: ${task.subjectName || 'Disciplina'}`;
                    } else if (task.category) {
                        subtext = `Pessoal: ${task.category}`;
                    }

                    const taskEl = document.createElement('div');
                    taskEl.className = `p-3 ${COLORS.bgCard} rounded-md flex justify-between items-center`;
                    taskEl.innerHTML = `
                        <div>
                            <p class="font-medium">${task.title}</p>
                            <p class="text-sm ${COLORS.textSecondary} capitalize">${subtext}</p>
                        </div>
                        <span class="text-xs ${COLORS.textSecondary}">${task.status || 'todo'}</span>
                    `;
                    recentTasksList.appendChild(taskEl);
                });
            }


            categoryTasksList.innerHTML = '';
            let categoriesFound = 0;

            const categoryOrder = ['agencia', 'faculdade', 'trabalho', 'estudos', 'pessoal', 'freelancer'];

            categoryOrder.forEach(category => {
                if (categoryCount[category] > 0) {
                    categoriesFound++;
                    const categoryEl = document.createElement('div');
                    categoryEl.className = 'flex justify-between items-center';
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

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }


        function getFormattedDateString(date) {
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            return `${year}-${month}-${day}`;
        }


        async function updateUserStreak() {
            if (!userId) return 0;

            const todayStr = getFormattedDateString(new Date());
            const userDocRef = doc(db, 'users', userId);
            let currentStreak = 0;
            let oldStreak = 0;

            try {
                const userDoc = await getDoc(userDocRef);

                if (!userDoc.exists()) {

                    currentStreak = 1;
                    await setDoc(userDocRef, {
                        lastLoginDate: todayStr,
                        currentStreak: currentStreak
                    }, { merge: true });
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
                                currentStreak: currentStreak
                            });
                        } else {

                            currentStreak = 1;
                            await updateDoc(userDocRef, {
                                lastLoginDate: todayStr,
                                currentStreak: 1
                            });
                        }
                    }
                }
            } catch (error) {
                console.error("Erro ao atualizar o streak:", error);
            }


            const streakCounterEl = document.getElementById('streak-counter');
            if (streakCounterEl) {



                if (oldStreak !== currentStreak) {
                    animateNumber();
                }


                streakCounterEl.textContent = currentStreak;


                updateFlameLevel(currentStreak);


            }


            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }


        function renderDashboardSchedule(subjects) {

            const scheduleBody = document.getElementById('dashboard-schedule-body');
            if (!scheduleBody) return;

            scheduleBody.innerHTML = '';


            const grid = {};
            scheduleTimeSlots.forEach(time => {
                grid[time] = {};
                scheduleDays.forEach(day => {
                    grid[time][day] = [];
                });
            });


            subjects.forEach(subject => {
                if (subject.schedule) {
                    scheduleDays.forEach(day => {
                        if (subject.schedule[day] && Array.isArray(subject.schedule[day])) {
                            subject.schedule[day].forEach(timeSlot => {
                                if (grid[timeSlot] && grid[timeSlot][day]) {
                                    grid[timeSlot][day].push({ name: subject.name, id: subject.id });
                                }
                            });
                        }
                    });
                }
            });


            scheduleTimeSlots.forEach(time => {
                const tr = document.createElement('tr');
                tr.className = "divide-x divide-zinc-700/50";
                let rowHtml = `<td class="p-3 text-sm font-medium ${COLORS.textSecondary}">${time}</td>`;

                scheduleDays.forEach(day => {
                    const subjectsInSlot = grid[time][day];

                    const cellContent = subjectsInSlot.map(sub => {
                        const subjectIndex = allSubjects.findIndex(s => s.id === sub.id);
                        const color = subjectColorPalette[subjectIndex % subjectColorPalette.length] || subjectColorPalette[0];

                        return `<div data-subject-id="${sub.id}"
                                     class="${color.bg} ${color.hover} text-white text-xs font-medium p-2 rounded-md mb-1 cursor-pointer">
                                     ${sub.name}
                                </div>`;
                    }).join('');

                    rowHtml += `<td class="p-2 text-sm align-top h-24">${cellContent}</td>`;
                });

                tr.innerHTML = rowHtml;
                scheduleBody.appendChild(tr);
            });


            scheduleBody.querySelectorAll('[data-subject-id]').forEach(el => {
                el.addEventListener('click', () => {
                    showSubjectDetailPage(el.dataset.subjectId);
                });
            });
        }



        async function runAutomationLogic(currentTasks) {
            if (automationRunning) return;
            automationRunning = true;

            const todayStr = new Date().toISOString().split('T')[0];
            const today = new Date(todayStr + 'T12:00:00');


            const tasksToMove = [];
            const tasksToNotifyOverdue = [];

            currentTasks.forEach(task => {
                if (task.dueDate && task.dueDate < todayStr && task.status !== 'done' && task.status !== 'overdue') {
                    tasksToMove.push(task.id);

                    if (!task.overdueNotified) {
                        tasksToNotifyOverdue.push(task);
                    }
                }
            });


            for (const task of tasksToNotifyOverdue) {

                await addNotification(`Sua tarefa "${task.title}" está atrasada!`, 'overdue');

                await updateDoc(getTaskDoc(task.id), { overdueNotified: true });
            }


            for (const taskId of tasksToMove) {
                try {
                    await updateDoc(getTaskDoc(taskId), { status: 'overdue' });
                } catch (error) {
                    console.error(`Erro ao mover tarefa ${taskId} para atrasada:`, error);
                }
            }


            if (Notification.permission === 'granted') {
                const tasksToNotify = [];
                currentTasks.forEach(task => {
                    if (task.dueDate === todayStr && task.status !== 'done' && !task.notified) {
                        tasksToNotify.push(task);
                    }
                });

                for (const task of tasksToNotify) {

                    new Notification('Tarefa Vencendo Hoje!', {
                        body: `Sua tarefa "${task.title}" vence hoje. Não se esqueça!`
                    });


                    await addNotification(`Sua tarefa "${task.title}" vence hoje.`, 'dueToday');


                    try {
                        await updateDoc(getTaskDoc(task.id), { notified: true });
                    } catch (error) {
                        console.error(`Erro ao marcar tarefa ${task.id} como notificada:`, error);
                    }
                }
            }




            const tasksToCreate = [];
            const tasksToUpdate = [];

            currentTasks.forEach(task => {
                if (task.recurrence && task.recurrence !== 'none' && task.dueDate) {
                    const dueDate = new Date(task.dueDate + 'T12:00:00');

                    if (dueDate < today) {
                        let nextDueDate = new Date(dueDate.getTime());

                        if (task.recurrence === 'daily') {
                            nextDueDate.setDate(nextDueDate.getDate() + 1);
                        } else if (task.recurrence === 'weekly') {
                            nextDueDate.setDate(nextDueDate.getDate() + 7);
                        }

                        if (nextDueDate < today) {
                            nextDueDate = new Date(today.getTime());
                        }

                        const nextDueDateStr = nextDueDate.toISOString().split('T')[0];

                        const newTask = { ...task };
                        delete newTask.id;
                        newTask.dueDate = nextDueDateStr;
                        newTask.status = 'todo';
                        newTask.createdAt = serverTimestamp();
                        newTask.notified = false;
                        newTask.overdueNotified = false;
                        tasksToCreate.push(newTask);

                        const oldTaskUpdate = {
                            id: task.id,
                            recurrence: 'none'
                        };
                        if (task.status === 'todo' || task.status === 'doing' || task.status === 'overdue') {
                            oldTaskUpdate.status = 'done';
                        }
                        tasksToUpdate.push(oldTaskUpdate);
                    }
                }
            });

            for (const newTask of tasksToCreate) {
                try { await addDoc(getTasksCollection(), newTask); }
                catch (error) { console.error("Erro ao criar tarefa recorrente:", error); }
            }

            for (const taskUpdate of tasksToUpdate) {
                try {
                    const docRef = getTaskDoc(taskUpdate.id);
                    const updateData = { ...taskUpdate };
                    delete updateData.id;
                    await updateDoc(docRef, updateData);
                }
                catch (error) { console.error("Erro ao atualizar tarefa recorrente antiga:", error); }
            }

            automationRunning = false;
        }


        function renderKanbanTasks(tasks) {
            const columns = {
                overdue: document.getElementById('kanban-overdue'),
                todo: document.getElementById('kanban-todo'),
                doing: document.getElementById('kanban-doing'),
                done: document.getElementById('kanban-done')
            };


            Object.values(columns).forEach(col => { if (col) col.innerHTML = ''; });


            const taskMap = { overdue: [], todo: [], doing: [], done: [] };
            tasks.forEach(task => {
                if (taskMap[task.status]) {
                    taskMap[task.status].push(task);
                }
            });


            Object.keys(columns).forEach(statusKey => {
                const col = columns[statusKey];
                if (!col) return;

                if (taskMap[statusKey].length === 0) {

                    let icon = 'plus-circle';
                    let text = 'Nenhuma tarefa pendente';
                    if (statusKey === 'overdue') { icon = 'check-circle'; text = 'Nenhuma tarefa atrasada'; }
                    if (statusKey === 'doing') { icon = 'play'; text = 'Nenhuma tarefa em progresso'; }
                    if (statusKey === 'done') { icon = 'award'; text = 'Nenhuma tarefa concluída'; }

                    col.innerHTML = `
                        <div class="text-center py-8 text-zinc-500">
                            <i data-lucide="${icon}" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
                            <p class="text-sm">${text}</p>
                        </div>`;
                } else {

                    taskMap[statusKey].forEach(task => {
                        const taskCard = createTaskCard(task);
                        col.appendChild(taskCard);
                    });
                }


                new Sortable(col, {
                    group: 'sharedTasks',
                    animation: 150,
                    ghostClass: 'opacity-50',
                    draggable: '.task-card',
                    onEnd: (evt) => {
                        const taskId = evt.item.dataset.id;
                        const newStatus = evt.to.id.replace('kanban-', '');
                        updateTaskStatus(taskId, newStatus);
                    }
                });
            });

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }

        function createTaskCard(task) {
            const card = document.createElement('div');
            card.dataset.id = task.id;

            const statusColors = {
                overdue: 'border-l-4 border-red-500',
                todo: 'border-l-4 border-blue-500',
                doing: 'border-l-4 border-yellow-500',
                done: 'border-l-4 border-green-500'
            };


            card.className = `${COLORS.bgCard} p-4 rounded-lg shadow mb-3 cursor-move hover:bg-zinc-600 transition-colors ${statusColors[task.status] || ''} task-card`;

            let subtaskInfo = '';
            if (task.subtasks && task.subtasks.length > 0) {
                const completed = task.subtasks.filter(s => s.completed).length;
                subtaskInfo = `
                    <div class="flex items-center gap-1 text-xs ${COLORS.textSecondary} mt-2">
                        <i data-lucide="check-square-2" class="w-3 h-3"></i>
                        ${completed} de ${task.subtasks.length}
                    </div>
                `;
            }

            let recurrenceInfo = '';
            if (task.recurrence && task.recurrence !== 'none') {
                recurrenceInfo = `<i data-lucide="repeat" class="w-3 h-3 text-zinc-400" title="Tarefa Recorrente (${task.recurrence})"></i>`;
            }

            card.innerHTML = `
                <div class="flex justify-between items-start mb-1">
                    <span class="text-sm font-medium ${COLORS.textPrimary} pr-2">${task.title}</span>
                    <div class="flex items-center gap-2">
                        ${recurrenceInfo}
                        <button data-delete-id="${task.id}" class="text-zinc-500 hover:text-red-500 flex-shrink-0">&times;</button>
                    </div>
                </div>
                ${task.description ? `<p class="text-sm text-zinc-400 mt-1 truncate">${task.description}</p>` : ''}
                ${subtaskInfo}
                ${task.category ? `<span class="mt-2 inline-block bg-zinc-700 text-zinc-300 text-xs font-medium px-2 py-0.5 rounded-full capitalize">${task.category}</span>` : ''}
            `;

            card.addEventListener('click', (e) => {
                if (e.target.closest('[data-delete-id]')) return;
                showTaskDetails(task.id);
            });

            card.querySelector(`[data-delete-id="${task.id}"]`).addEventListener('click', async (e) => {
                e.stopPropagation();
                if (await showConfirmModal('Excluir Tarefa?', 'Tem certeza que deseja excluir esta tarefa?')) {
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
                    status: newStatus
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

            document.getElementById('form-add-task-modal').addEventListener('submit', handleAddTask);
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

            const todayStr = new Date().toISOString().split('T')[0];
            let initialStatus = 'todo';
            if (dueDate && dueDate < todayStr) {
                initialStatus = 'overdue';
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
                    createdAt: serverTimestamp()
                });
                form.reset();
                closeSlideOver();
            } catch (error) {
                console.error("Erro ao adicionar tarefa:", error);
                showModal("Erro", "Não foi possível adicionar a tarefa.");
            }
        }

        function showTaskDetails(taskId) {
            const task = allTasks.find(t => t.id === taskId);
            if (!task) {
                showModal("Erro", "Tarefa não encontrada.");
                return;
            }

            const subtasksHtml = (task.subtasks || []).map((sub, index) => `
                <li data-index="${index}" class="flex items-center justify-between p-2 bg-zinc-700 rounded-md">
                    <div class="flex items-center gap-2">
                        <input type="checkbox" data-index="${index}" class="form-checkbox bg-zinc-800 border-zinc-600 rounded text-blue-500 focus:ring-blue-500" ${sub.completed ? 'checked' : ''}>
                        <span class="${sub.completed ? 'line-through text-zinc-500' : ''}">${sub.text}</span>
                    </div>
                    <button data-index="${index}" class="btn-delete-subtask text-zinc-500 hover:text-red-500">
                        <i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i>
                    </button>
                </li>
            `).join('');

            const detailsHtml = `
                <form id="form-save-task-details" class="space-y-4">
                    <div>
                        <label for="taskTitleDetail" class="block text-sm font-medium text-zinc-300 mb-1">Tarefa</label>
                        <input type="text" id="taskTitleDetail" name="title" required value="${task.title}" class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md">
                    </div>
                    <div>
                        <label for="taskDescDetail" class="block text-sm font-medium text-zinc-300 mb-1">Descrição</label>
                        <textarea id="taskDescDetail" name="description" rows="5" class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md">${task.description || ''}</textarea>
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
                        <input type="date" id="taskDueDateDetail" name="dueDate" value="${task.dueDate || ''}" class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md text-zinc-300">
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
                    ${subtasksHtml.length > 0 ? subtasksHtml : `<p class="text-zinc-500 text-sm">Nenhuma subtarefa adicionada.</p>`}
                </ul>

                <form id="form-add-subtask" class="flex gap-2">
                    <input type="text" name="subtaskText" required class="flex-1 px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md" placeholder="Nova subtarefa...">
                    <button type="submit" class="py-2 px-4 bg-green-500 hover:bg-green-600 rounded-md">
                        <i data-lucide="plus" class="w-5 h-5"></i>
                    </button>
                </form>
            `;

            openSlideOver(detailsHtml, "Detalhes da Tarefa");

            document.getElementById('taskCategoryDetail').value = task.category || 'pessoal';
            document.getElementById('taskRecurrenceDetail').value = task.recurrence || 'none';

            const panel = document.getElementById('slide-over-panel');

            panel.querySelector('#form-save-task-details').addEventListener('submit', (e) => handleSaveTaskDetails(e, taskId));
            panel.querySelector('#form-add-subtask').addEventListener('submit', (e) => handleAddSubtask(e, taskId));

            panel.querySelectorAll('#subtask-list input[type="checkbox"]').forEach(cb => {
                cb.addEventListener('change', (e) => handleToggleSubtask(e, taskId));
            });

            panel.querySelectorAll('#subtask-list .btn-delete-subtask').forEach(btn => {
                btn.addEventListener('click', (e) => handleDeleteSubtask(e, taskId));
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


            const oldTask = allTasks.find(t => t.id === taskId);


            const updateData = {
                title: newTitle,
                description: newDescription,
                category: newCategory,
                dueDate: newDueDate || null,
                recurrence: newRecurrence || "none"
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
                    subtasks: arrayUnion(newSubtask)
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
            const task = allTasks.find(t => t.id === taskId);
            if (!task || !task.subtasks || !task.subtasks[index]) return;

            const newSubtasks = task.subtasks.map((sub, i) => {
                if (i === index) {
                    return { ...sub, completed: checkbox.checked };
                }
                return sub;
            });

            try {
                await updateDoc(getTaskDoc(taskId), {
                    subtasks: newSubtasks
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
            const task = allTasks.find(t => t.id === taskId);
            if (!task || !task.subtasks || !task.subtasks[index]) return;

            const subtaskToDelete = task.subtasks[index];

            try {
                await updateDoc(getTaskDoc(taskId), {
                    subtasks: arrayRemove(subtaskToDelete)
                });
                showTaskDetails(taskId);
            } catch (error) {
                console.error("Erro ao deletar subtarefa:", error);
                showModal("Erro", "Não foi possível deletar a subtarefa.");
            }
        }



        function showAddProjectForm() {
            const formHtml = `
                <form id="form-add-project-modal" class="space-y-4">
                    <div>
                        <label for="projectTitleModal" class="block text-sm font-medium text-zinc-300 mb-1">Nome do Projeto</label>
                        <input type="text" id="projectTitleModal" name="projectTitle" required class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Website Institucional">
                    </div>
                    <div>
                        <label for="projectClientModal" class="block text-sm font-medium text-zinc-300 mb-1">Cliente</label>
                        <input type="text" id="projectClientModal" name="projectClient" required class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Empresa X">
                    </div>
                    <div>
                        <label for="projectDueDateModal" class="block text-sm font-medium text-zinc-300 mb-1">Prazo</label>
                        <input type="date" id="projectDueDateModal" name="projectDueDate" class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md text-zinc-300">
                    </div>
                    <button type="submit" class="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 rounded-md font-semibold transition-colors flex items-center justify-center gap-2">
                        <i data-lucide="plus" class="w-5 h-5"></i> Salvar Projeto
                    </button>
                </form>
            `;
            openSlideOver(formHtml, "Adicionar Novo Projeto");

            document.getElementById('form-add-project-modal').addEventListener('submit', handleAddProjectModal);
        }

        async function handleAddProjectModal(e) {
            e.preventDefault();
            const form = e.target;
            const title = form.projectTitle.value;
            const client = form.projectClient.value;
            const dueDate = form.projectDueDate.value;

            if (!title || !client || !userId) return;

            try {
                await addDoc(getAgencyCollection(), {
                    title,
                    client,
                    dueDate: dueDate || null,
                    status: 'potential',
                    createdAt: serverTimestamp()
                });
                form.reset();
                closeSlideOver();
            } catch (error) {
                console.error("Erro ao adicionar projeto:", error);
                showModal("Erro", "Não foi possível adicionar o projeto.");
            }
        }

        function renderAgencyTable(projects) {
            const tableBody = document.getElementById('agency-table-body');
            if (!tableBody) return;


            let sortedProjects = [...projects];
            sortedProjects.sort((a, b) => {
                switch (currentSort) {
                    case 'title':
                        return a.title.localeCompare(b.title);
                    case 'status':
                        return (a.status || '').localeCompare(b.status || '');
                    case 'dueDate':
                        if (!a.dueDate) return 1;
                        if (!b.dueDate) return -1;
                        return new Date(a.dueDate) - new Date(b.dueDate);
                    case 'createdAt':
                    default:
                        return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
                }
            });


            const totalProjects = sortedProjects.length;
            const totalPages = Math.ceil(totalProjects / itemsPerPage) || 1;
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const paginatedProjects = sortedProjects.slice(startIndex, endIndex);


            tableBody.innerHTML = '';

            const statusLabels = {
                potential: 'Potencial',
                active: 'Ativo',
                approved: 'Aprovado'
            };
            const statusColors = {
                potential: 'text-purple-400',
                active: 'text-blue-400',
                approved: 'text-green-400'
            };

            if (paginatedProjects.length === 0 && totalProjects === 0) {
                tableBody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-zinc-500">
                    Nenhum projeto cadastrado ainda.
                 </td></tr>`;
            } else {
                paginatedProjects.forEach(project => {
                    const tr = document.createElement('tr');
                    tr.className = `border-b border-zinc-700 hover:bg-zinc-700 cursor-pointer`;


                    const tasks = allProjectTasks[project.id] || [];
                    const totalTasks = tasks.length;
                    let progress = 0;
                    if (totalTasks > 0) {
                        const doneTasks = tasks.filter(t => t.status === 'done').length;
                        progress = Math.round((doneTasks / totalTasks) * 100);
                    }

                    tr.innerHTML = `
                        <td class="p-4 font-medium">${project.title}</td>
                        <td class="p-4 text-zinc-400">${project.client}</td>
                        <td class="p-4 text-zinc-400">
                            ${project.dueDate ? new Date(project.dueDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'N/A'}
                        </td>
                        <td class="p-4 font-medium ${statusColors[project.status] || ''}">
                            ${statusLabels[project.status] || project.status}
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
                            <button data-edit-id="${project.id}" class="text-zinc-400 hover:text-blue-500 p-1">
                                <i data-lucide="pencil" class="w-4 h-4 pointer-events-none"></i>
                            </button>
                            <button data-delete-id="${project.id}" class="text-zinc-400 hover:text-red-500 p-1">
                                <i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i>
                            </button>
                        </td>
                    `;


                    tr.addEventListener('click', (e) => {
                        if (e.target.closest('button')) return;
                        showProjectDetailPage(project.id);
                    });
                    tr.querySelector(`[data-edit-id="${project.id}"]`).addEventListener('click', (e) => {
                        e.stopPropagation();
                        showProjectDetails(project.id);
                    });
                    tr.querySelector(`[data-delete-id="${project.id}"]`).addEventListener('click', async (e) => {
                        e.stopPropagation();
                        if (await showConfirmModal('Excluir Projeto?', 'Tem certeza que deseja excluir este projeto e todas as suas tarefas?')) {
                            try {

                                await deleteDoc(getAgencyDoc(project.id));
                            } catch (error) {
                                console.error("Erro ao deletar projeto:", error);
                                showModal("Erro", "Não foi possível excluir o projeto.");
                            }
                        }
                    });

                    tableBody.appendChild(tr);
                });
            }


            const paginationInfo = document.getElementById('agency-pagination-info');
            const prevBtn = document.getElementById('btn-agency-prev');
            const nextBtn = document.getElementById('btn-agency-next');
            const pageNum = document.getElementById('agency-page-num');

            if (totalProjects > 0) {
                const shownStart = startIndex + 1;
                const shownEnd = startIndex + paginatedProjects.length;
                paginationInfo.innerHTML = `Mostrando <span class="text-white font-semibold">${shownStart}-${shownEnd}</span> de <span class="text-white font-semibold">${totalProjects}</span> projetos`;
            } else {
                paginationInfo.innerHTML = "Nenhum projeto";
            }

            prevBtn.disabled = (currentPage === 1);
            nextBtn.disabled = (currentPage === totalPages || totalPages === 0);
            pageNum.textContent = currentPage;

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }

        async function updateProjectStatus(projectId, newStatus) {
            try {
                await updateDoc(getAgencyDoc(projectId), {
                    status: newStatus
                });
            } catch (error) {
                console.error("Erro ao atualizar projeto:", error);
                showModal("Erro", "Não foi possível atualizar o projeto.");
            }
        }

        function showProjectDetails(projectId) {
            const project = allProjects.find(p => p.id === projectId);
            if (!project) {
                showModal("Erro", "Projeto não encontrado.");
                return;
            }


            const tasks = allProjectTasks[projectId] || [];
            const totalTasks = tasks.length;
            let progress = 0;
            let doneTasksCount = 0;
            if (totalTasks > 0) {
                doneTasksCount = tasks.filter(t => t.status === 'done').length;
                progress = Math.round((doneTasksCount / totalTasks) * 100);
            }

            const detailsHtml = `
                <form id="form-save-project-details" class="space-y-4">
                    <div>
                        <label for="projectTitleDetail" class="block text-sm font-medium text-zinc-300 mb-1">Nome do Projeto</label>
                        <input type="text" id="projectTitleDetail" name="title" required value="${project.title}" class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md">
                    </div>
                    <div>
                        <label for="projectClientDetail" class="block text-sm font-medium text-zinc-300 mb-1">Cliente</label>
                        <input type="text" id="projectClientDetail" name="client" required value="${project.client}" class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md">
                    </div>
                    <div>
                        <label for="projectStatusDetail" class="block text-sm font-medium text-zinc-300 mb-1">Status</label>
                        <select id="projectStatusDetail" name="status" required class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md">
                            <option value="potential">Potencial</option>
                            <option value="active">Ativo</option>
                            <option value="approved">Aprovado</option>
                        </select>
                    </div>
                    <div>
                        <label for="projectDueDateDetail" class="block text-sm font-medium text-zinc-300 mb-1">Prazo</label>
                        <input type="date" id="projectDueDateDetail" name="dueDate" value="${project.dueDate || ''}" class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md text-zinc-300">
                    </div>


                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-1">Progresso</label>
                        <div class="w-full bg-zinc-600 rounded-full h-4">
                            <div class="bg-blue-500 h-4 rounded-full flex items-center justify-center text-xs font-bold text-white" style="width: ${progress}%">
                                ${progress}%
                            </div>
                        </div>
                        <p class="text-xs text-zinc-400 mt-1">${doneTasksCount} de ${totalTasks} tarefas concluídas.</p>
                    </div>

                    <button type="submit" class="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 rounded-md font-semibold">Salvar Alterações</button>
                </form>
            `;

            openSlideOver(detailsHtml, "Editar Projeto");

            document.getElementById('projectStatusDetail').value = project.status;

            const panel = document.getElementById('slide-over-panel');
            panel.querySelector('#form-save-project-details').addEventListener('submit', (e) => handleSaveProjectDetails(e, projectId));
        }

        async function handleSaveProjectDetails(e, projectId) {
            e.preventDefault();
            const form = e.target;
            const newTitle = form.title.value;
            const newClient = form.client.value;
            const newStatus = form.status.value;
            const newDueDate = form.dueDate.value;

            try {
                await updateDoc(getAgencyDoc(projectId), {
                    title: newTitle,
                    client: newClient,
                    status: newStatus,
                    dueDate: newDueDate || null

                });
                showModal("Sucesso", "Projeto atualizado.");
                closeSlideOver();
            } catch (error) {
                console.error("Erro ao salvar detalhes do projeto:", error);
                showModal("Erro", "Não foi possível salvar as alterações.");
            }
        }



        function showProjectDetailPage(projectId) {
            currentProjectId = projectId;
            const project = allProjects.find(p => p.id === projectId);
            if (!project) {
                showModal("Erro", "Projeto não encontrado.");
                return;
            }

            document.getElementById('project-detail-title').textContent = project.title;
            document.getElementById('project-detail-client').textContent = project.client;

            showPage('project-detail');
            loadProjectTasks(projectId);
        }

        function loadProjectTasks(projectId) {
            if (unsubscribeProjectTasks[projectId]) unsubscribeProjectTasks[projectId]();

            const tasksQuery = query(getProjectTasksCollection(projectId));
            unsubscribeProjectTasks[projectId] = onSnapshot(tasksQuery, (snapshot) => {
                const projectTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                allProjectTasks[projectId] = projectTasks;
                renderProjectTaskKanban(projectTasks);
                updateCalendar();
                updatePomodoroTaskSelect();
                renderAgencyTable(allProjects);
            }, (error) => console.error(`Erro ao carregar tarefas do projeto ${projectId}:`, error));
        }

        function renderProjectTaskKanban(tasks) {
            const columns = {
                todo: document.getElementById('project-kanban-todo'),
                doing: document.getElementById('project-kanban-doing'),
                done: document.getElementById('project-kanban-done')
            };

            Object.values(columns).forEach(col => { if (col) col.innerHTML = ''; });

            const taskMap = { todo: [], doing: [], done: [] };
            tasks.forEach(task => {
                if (taskMap[task.status]) {
                    taskMap[task.status].push(task);
                } else {
                    taskMap['todo'].push(task);
                }
            });

            Object.keys(columns).forEach(statusKey => {
                const col = columns[statusKey];
                if (!col) return;

                if (taskMap[statusKey].length === 0) {
                    col.innerHTML = `<p class="text-sm text-zinc-500 p-4 text-center">Nenhuma tarefa aqui</p>`;
                } else {
                    taskMap[statusKey].forEach(task => {
                        const taskCard = createProjectTaskCard(task);
                        col.appendChild(taskCard);
                    });
                }

                new Sortable(col, {
                    group: `projectTasks-${currentProjectId}`,
                    animation: 150,
                    ghostClass: 'opacity-50',
                    draggable: '.task-card',
                    onEnd: (evt) => {
                        const taskId = evt.item.dataset.id;
                        const newStatus = evt.to.id.replace('project-kanban-', '');
                        updateProjectTaskStatus(taskId, newStatus);
                    }
                });
            });
        }

        function createProjectTaskCard(task) {
            const card = document.createElement('div');
            card.dataset.id = task.id;

            const statusColors = {
                todo: 'border-l-4 border-blue-500',
                doing: 'border-l-4 border-yellow-500',
                done: 'border-l-4 border-green-500'
            };


            card.className = `${COLORS.bgSecondary} p-4 rounded-lg shadow mb-3 cursor-move hover:bg-zinc-600 transition-colors ${statusColors[task.status] || ''} task-card`;

            let recurrenceInfo = '';
            if (task.recurrence && task.recurrence !== 'none') {
                recurrenceInfo = `<i data-lucide="repeat" class="w-3 h-3 text-zinc-400" title="Tarefa Recorrente (${task.recurrence})"></i>`;
            }

            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <span class="text-sm font-medium ${COLORS.textPrimary} pr-2">${task.title}</span>
                    <div class="flex items-center gap-2">
                        ${recurrenceInfo}
                        <button data-delete-id="${task.id}" class="text-zinc-500 hover:text-red-500 flex-shrink-0">&times;</button>
                    </div>
                </div>
                ${task.description ? `<p class="text-sm text-zinc-400 mt-1 truncate">${task.description}</p>` : ''}
            `;

            card.addEventListener('click', (e) => {
                if (e.target.closest('[data-delete-id]')) return;
                showProjectTaskDetails(task);
            });

            card.querySelector(`[data-delete-id="${task.id}"]`).addEventListener('click', async (e) => {
                e.stopPropagation();
                if (await showConfirmModal('Excluir Tarefa?', 'Tem certeza que deseja excluir esta tarefa do projeto?')) {
                    try {
                        await deleteDoc(getProjectTaskDoc(currentProjectId, task.id));
                    } catch (error) {
                        console.error("Erro ao deletar tarefa do projeto:", error);
                        showModal("Erro", "Não foi possível excluir a tarefa.");
                    }
                }
            });

            if (typeof lucide !== 'undefined') lucide.createIcons();
            return card;
        }

        async function updateProjectTaskStatus(taskId, newStatus) {
            if (!currentProjectId) return;
            try {
                await updateDoc(getProjectTaskDoc(currentProjectId, taskId), {
                    status: newStatus
                });
            } catch (error) {
                console.error("Erro ao atualizar status da tarefa do projeto:", error);
                showModal("Erro", "Não foi possível atualizar a tarefa.");
            }
        }

        function showAddProjectTaskForm() {
            const formHtml = `
                <form id="form-add-project-task-modal" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-1">Nova Tarefa</label>
                        <input type="text" name="taskTitle" required class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md" placeholder="O que precisa ser feito?">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-1">Descrição</label>
                        <textarea name="taskDescription" rows="4" class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md" placeholder="Adicione mais detalhes..."></textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-1">Data de Entrega</label>
                        <input type="date" name="taskDueDate" class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md text-zinc-300">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-1">Recorrência</label>
                        <select name="taskRecurrence" class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md">
                            <option value="none">Nenhuma</option>
                            <option value="daily">Diária</option>
                            <option value="weekly">Semanal</option>
                        </select>
                    </div>
                    <button type="submit" class="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 rounded-md font-semibold">Salvar Tarefa</button>
                </form>
            `;
            openSlideOver(formHtml, "Adicionar Tarefa ao Projeto");
            document.getElementById('form-add-project-task-modal').addEventListener('submit', handleAddProjectTask);
        }

        async function handleAddProjectTask(e) {
            e.preventDefault();
            if (!currentProjectId) return;

            const form = e.target;
            const title = form.taskTitle.value;
            const description = form.taskDescription.value;
            const dueDate = form.taskDueDate.value;
            const recurrence = form.taskRecurrence.value;

            try {
                await addDoc(getProjectTasksCollection(currentProjectId), {
                    title,
                    description: description || "",
                    dueDate: dueDate || null,
                    recurrence: recurrence || "none",
                    status: 'todo',
                    notified: false,
                    createdAt: serverTimestamp()
                });
                form.reset();
                closeSlideOver();
            } catch (error) {
                console.error("Erro ao adicionar tarefa ao projeto:", error);
                showModal("Erro", "Não foi possível adicionar a tarefa.");
            }
        }

        function showProjectTaskDetails(task) {
            const detailsHtml = `
                <form id="form-save-project-task-details" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-1">Tarefa</label>
                        <input type="text" name="title" required value="${task.title}" class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-1">Descrição</label>
                        <textarea name="description" rows="5" class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md">${task.description || ''}</textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-1">Data de Entrega</label>
                        <input type="date" name="dueDate" value="${task.dueDate || ''}" class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md text-zinc-300">
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
            openSlideOver(detailsHtml, "Editar Tarefa do Projeto");

            document.querySelector('#form-save-project-task-details [name="recurrence"]').value = task.recurrence || 'none';

            document.getElementById('form-save-project-task-details').addEventListener('submit', (e) => {
                e.preventDefault();
                handleSaveProjectTaskDetails(e, task.id);
            });
        }

        async function handleSaveProjectTaskDetails(e, taskId) {
            if (!currentProjectId) return;

            const form = e.target;
            const newTitle = form.title.value;
            const newDescription = form.description.value;
            const newDueDate = form.dueDate.value;
            const newRecurrence = form.recurrence.value;

            const oldTask = allProjectTasks[currentProjectId]?.find(t => t.id === taskId);

            const updateData = {
                title: newTitle,
                description: newDescription,
                dueDate: newDueDate || null,
                recurrence: newRecurrence || "none"
            };

            if (oldTask && oldTask.dueDate !== updateData.dueDate) {
                updateData.notified = false;
                updateData.overdueNotified = false;
            }

            try {
                await updateDoc(getProjectTaskDoc(currentProjectId, taskId), updateData);
                showModal("Sucesso", "Tarefa do projeto atualizada.");
                closeSlideOver();
            } catch (error) {
                console.error("Erro ao salvar tarefa do projeto:", error);
                showModal("Erro", "Não foi possível salvar as alterações.");
            }
        }





        function updateCollegeStats(subjects, subjectTasks) {
            const totalSubjectsEl = document.getElementById('total-subjects');
            const todayClassesEl = document.getElementById('today-classes');
            const pendingWorksEl = document.getElementById('pending-works');
            const attendanceRateEl = document.getElementById('attendance-rate');

            if (!totalSubjectsEl) return;


            totalSubjectsEl.textContent = subjects.length;


            const today = new Date();
            const todayDay = dayOfWeekMap[today.getDay()];
            let classesToday = 0;
            subjects.forEach(subject => {
                if (subject.schedule && subject.schedule[todayDay] && subject.schedule[todayDay].length > 0) {
                    classesToday++;
                }
            });
            todayClassesEl.textContent = classesToday;


            let pending = 0;
            Object.values(subjectTasks).flat().forEach(task => {
                if (task.status !== 'done') {
                    pending++;
                }
            });
            pendingWorksEl.textContent = pending;


            attendanceRateEl.textContent = 'N/A';
        }

        async function handleAddSubject(e) {
            e.preventDefault();
            const form = e.target;
            const subjectName = form.subjectName.value;
            if (!subjectName) return;

            try {
                const newSchedule = {};
                scheduleDays.forEach(day => {
                    newSchedule[day] = [];
                });

                await addDoc(getSubjectsCollection(), {
                    name: subjectName,
                    schedule: newSchedule,
                    createdAt: serverTimestamp()
                });
                form.reset();
            } catch (error) {
                console.error("Erro ao adicionar disciplina:", error);
                showModal("Erro", "Não foi possível adicionar a disciplina.");
            }
        }

        function renderCollegeSubjects(subjects) {
            const list = document.getElementById('college-subjects-list');
            list.innerHTML = '';

            if (subjects.length === 0) {
                list.innerHTML = `
                    <div class="col-span-full text-center py-8 text-zinc-500">
                        <i data-lucide="book-open" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
                        <p>Nenhuma disciplina cadastrada.</p>
                        <p class="text-sm mt-1">Adicione uma acima para começar</p>
                    </div>`;
                if (typeof lucide !== 'undefined') lucide.createIcons();
                return;
            }


            const template = document.getElementById('subject-card-template');

            subjects.forEach(subject => {
                const card = template.content.cloneNode(true).firstElementChild;

                card.querySelector('h4').textContent = subject.name;


                card.querySelector('p.text-zinc-400').textContent = `ID: ${subject.id.substring(0, 6)}...`;
                const details = card.querySelector('.space-y-3');
                details.innerHTML = `
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-zinc-400">Aulas:</span>
                        <span class="text-white font-medium">${subject.schedule ? Object.values(subject.schedule).flat().length : 0}</span>
                    </div>
                `;
                const scheduleSummary = card.querySelector('.mt-4 .text-white');
                scheduleSummary.textContent = Object.entries(subject.schedule || {})
                    .filter(([day, times]) => times.length > 0)
                    .map(([day]) => scheduleDayLabels[day] || day)
                    .join(', ') || 'Sem horários';


                card.addEventListener('click', (e) => {
                    if (e.target.closest('button')) return;
                    showSubjectDetailPage(subject.id);
                });

                const deleteBtn = card.querySelector('button[title="Excluir"]');
                deleteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (await showConfirmModal('Excluir Disciplina?', `Excluir "${subject.name}" e todas as suas tarefas?`)) {
                        try {

                            await deleteDoc(getSubjectDoc(subject.id));
                        } catch (error) {
                            console.error("Erro ao deletar disciplina:", error);
                            showModal("Erro", "Não foi possível excluir a disciplina.");
                        }
                    }
                });



                const editBtn = card.querySelector('button[title="Editar"]');
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();

                    showEditSubjectForm(subject.id);
                });



                list.appendChild(card);
            });

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }


        function showEditSubjectForm(subjectId) {
            const subject = allSubjects.find(s => s.id === subjectId);
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


            document.getElementById('form-edit-subject').addEventListener('submit', (e) => {
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
                    name: newName
                });

                closeSlideOver();
                showModal("Sucesso", "Disciplina atualizada.");
            } catch (error) {
                console.error("Erro ao salvar disciplina:", error);
                showModal("Erro", "Não foi possível salvar as alterações.");
            }
        }

        function renderCollegeSchedule(subjects) {
            const scheduleBody = document.getElementById('college-schedule-body');
            scheduleBody.innerHTML = '';


            const grid = {};
            scheduleTimeSlots.forEach(time => {
                grid[time] = {};
                scheduleDays.forEach(day => {
                    grid[time][day] = [];
                });
            });


            subjects.forEach(subject => {
                if (subject.schedule) {
                    scheduleDays.forEach(day => {
                        if (subject.schedule[day] && Array.isArray(subject.schedule[day])) {
                            subject.schedule[day].forEach(timeSlot => {
                                if (grid[timeSlot] && grid[timeSlot][day]) {

                                    grid[timeSlot][day].push({ name: subject.name, id: subject.id });
                                }
                            });
                        }
                    });
                }
            });


            scheduleTimeSlots.forEach(time => {
                const tr = document.createElement('tr');
                tr.className = "divide-x divide-zinc-700/50";
                let rowHtml = `<td class="p-3 text-sm font-medium ${COLORS.textSecondary}">${time}</td>`;

                scheduleDays.forEach(day => {
                    const subjectsInSlot = grid[time][day];


                    const cellContent = subjectsInSlot.map(sub => {


                        const subjectIndex = allSubjects.findIndex(s => s.id === sub.id);



                        const color = subjectColorPalette[subjectIndex % subjectColorPalette.length] || subjectColorPalette[0];


                        return `<div data-subject-id="${sub.id}"
                                     class="${color.bg} ${color.hover} text-white text-xs font-medium p-2 rounded-md mb-1 cursor-pointer">
                                     ${sub.name}
                                </div>`;
                    }).join('');


                    rowHtml += `<td class="p-2 text-sm align-top h-24">${cellContent}</td>`;
                });

                tr.innerHTML = rowHtml;
                scheduleBody.appendChild(tr);
            });


            scheduleBody.querySelectorAll('[data-subject-id]').forEach(el => {
                el.addEventListener('click', () => {
                    showSubjectDetailPage(el.dataset.subjectId);
                });
            });
        }



        function showSubjectDetailPage(subjectId) {
            currentSubjectId = subjectId;
            const subject = allSubjects.find(s => s.id === subjectId);
            if (!subject) {
                showModal("Erro", "Disciplina não encontrada.");
                return;
            }

            document.getElementById('subject-detail-title').textContent = subject.name;

            const scheduleForm = document.getElementById('form-save-subject-schedule');
            scheduleForm.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);

            if (subject.schedule) {

                const firstDayWithSchedule = scheduleDays.find(day => subject.schedule[day] && subject.schedule[day].length > 0);
                if (firstDayWithSchedule) {
                    subject.schedule[firstDayWithSchedule].forEach(timeSlot => {
                        const timeCheckbox = scheduleForm.querySelector(`input[name="time"][value="${timeSlot}"]`);
                        if (timeCheckbox) timeCheckbox.checked = true;
                    });
                }


                scheduleDays.forEach(day => {
                    if (subject.schedule[day] && subject.schedule[day].length > 0) {
                        const dayCheckbox = scheduleForm.querySelector(`input[name="day"][value="${day}"]`);
                        if (dayCheckbox) dayCheckbox.checked = true;
                    }
                });
            }

            showPage('subject-detail');
            loadSubjectData(subjectId);
        }

        function loadSubjectData(subjectId) {
            clearSubjectListeners();


            const topicsQuery = query(getSubjectTopicsCollection(subjectId), orderBy('createdAt'));
            unsubscribeSubjectItems.topics = onSnapshot(topicsQuery, (snapshot) => {
                const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderSubjectList(items, 'subject-topics-list', 'Nenhum tópico cadastrado', handleToggleSubjectTopic, handleDeleteSubjectTopic);
            });


            const classesQuery = query(getSubjectLiveClassesCollection(subjectId), orderBy('createdAt'));
            unsubscribeSubjectItems.liveClasses = onSnapshot(classesQuery, (snapshot) => {
                const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderSubjectList(items, 'subject-live-classes-list', 'Nenhuma aula cadastrada', handleToggleSubjectLiveClass, handleDeleteSubjectLiveClass);
            });


            const tasksQuery = query(getSubjectTasksCollection(subjectId));
            unsubscribeSubjectItems.tasks = onSnapshot(tasksQuery, (snapshot) => {
                const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), subjectId: subjectId, subjectName: allSubjects.find(s => s.id === subjectId)?.name }));
                allSubjectTasks[subjectId] = items;
                renderSubjectTaskKanban(items);
                updateCalendar();
                updatePomodoroTaskSelect();
                updateCollegeStats(allSubjects, allSubjectTasks);
            });
        }

        function clearSubjectListeners() {
            Object.values(unsubscribeSubjectItems).forEach(unsub => unsub());
            unsubscribeSubjectItems = {};
        }


        function renderSubjectList(items, listId, emptyText, toggleFn, deleteFn) {
            const listElement = document.getElementById(listId);
            listElement.innerHTML = '';

            if (items.length === 0) {
                listElement.innerHTML = `<li class="text-zinc-500 text-sm p-4 text-center">${emptyText}</li>`;
                return;
            }

            items.forEach(item => {
                const li = document.createElement('li');
                li.className = `flex items-center justify-between p-2 ${COLORS.bgCard} rounded-md`;
                li.innerHTML = `
                    <div class="flex items-center gap-2">
                        <input type="checkbox" data-id="${item.id}" class="form-checkbox bg-zinc-800 border-zinc-600 rounded text-blue-500 focus:ring-blue-500" ${item.completed ? 'checked' : ''}>
                        <span class="${item.completed ? 'line-through text-zinc-500' : ''}">${item.text}</span>
                    </div>
                    <button data-id="${item.id}" class="btn-delete-item text-zinc-500 hover:text-red-500">
                        <i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i>
                    </button>
                `;

                li.querySelector('input[type="checkbox"]').addEventListener('change', (e) => toggleFn(e, item.id));
                li.querySelector('.btn-delete-item').addEventListener('click', (e) => deleteFn(e, item.id));

                listElement.appendChild(li);
            });

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
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
                    createdAt: serverTimestamp()
                });
                form.reset();
            } catch (error) { console.error("Erro ao adicionar tópico:", error); }
        }

        async function handleToggleSubjectTopic(e, topicId) {
            if (!currentSubjectId) return;
            try {
                await updateDoc(getSubjectTopicDoc(currentSubjectId, topicId), {
                    completed: e.target.checked
                });
            } catch (error) { console.error("Erro ao atualizar tópico:", error); }
        }

        async function handleDeleteSubjectTopic(e, topicId) {
            if (!currentSubjectId) return;
            try {
                await deleteDoc(getSubjectTopicDoc(currentSubjectId, topicId));
            } catch (error) { console.error("Erro ao deletar tópico:", error); }
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
                    createdAt: serverTimestamp()
                });
                form.reset();
            } catch (error) { console.error("Erro ao adicionar aula:", error); }
        }

        async function handleToggleSubjectLiveClass(e, classId) {
            if (!currentSubjectId) return;
            try {
                await updateDoc(getSubjectLiveClassDoc(currentSubjectId, classId), {
                    completed: e.target.checked
                });
            } catch (error) { console.error("Erro ao atualizar aula:", error); }
        }

        async function handleDeleteSubjectLiveClass(e, classId) {
            if (!currentSubjectId) return;
            try {
                await deleteDoc(getSubjectLiveClassDoc(currentSubjectId, classId));
            } catch (error) { console.error("Erro ao deletar aula:", error); }
        }


        async function handleSaveSubjectSchedule(e) {
            e.preventDefault();
            if (!currentSubjectId) return;

            const form = e.target;
            const formData = new FormData(form);

            const selectedDays = formData.getAll('day');
            const selectedTimes = formData.getAll('time');

            const newSchedule = {};
            scheduleDays.forEach(day => {
                if (selectedDays.includes(day)) {
                    newSchedule[day] = selectedTimes;
                } else {
                    newSchedule[day] = [];
                }
            });

            try {
                await updateDoc(getSubjectDoc(currentSubjectId), {
                    schedule: newSchedule
                });
                showModal("Sucesso", "Horários atualizados.");
            } catch (error) {
                console.error("Erro ao salvar horários:", error);
                showModal("Erro", "Não foi possível salvar os horários.");
            }
        }


        function renderSubjectTaskKanban(tasks) {
            const columns = {
                todo: document.getElementById('subject-kanban-todo'),
                doing: document.getElementById('subject-kanban-doing'),
                done: document.getElementById('subject-kanban-done')
            };

            Object.values(columns).forEach(col => { if (col) col.innerHTML = ''; });

            const taskMap = { todo: [], doing: [], done: [] };
            tasks.forEach(task => {
                if (taskMap[task.status]) {
                    taskMap[task.status].push(task);
                } else {
                    taskMap['todo'].push(task);
                }
            });

            Object.keys(columns).forEach(statusKey => {
                const col = columns[statusKey];
                if (!col) return;

                if (taskMap[statusKey].length === 0) {
                    let icon = 'plus-circle';
                    if (statusKey === 'doing') icon = 'play';
                    if (statusKey === 'done') icon = 'check';

                    col.innerHTML = `
                        <div class="text-center py-8 text-zinc-500">
                            <i data-lucide="${icon}" class="w-6 h-6 mx-auto mb-2 opacity-50"></i>
                            <p class="text-xs">Nenhuma tarefa</p>
                        </div>`;
                } else {
                    taskMap[statusKey].forEach(task => {
                        const card = createSubjectTaskCard(task);
                        col.appendChild(card);
                    });
                }

                new Sortable(col, {
                    group: `subjectTasks-${currentSubjectId}`,
                    animation: 150,
                    ghostClass: 'opacity-50',
                    draggable: '.task-card',
                    onEnd: (evt) => {
                        const taskId = evt.item.dataset.id;
                        const newStatus = evt.to.id.replace('subject-kanban-', '');
                        updateSubjectTaskStatus(taskId, newStatus);
                    }
                });
            });

            if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        function createSubjectTaskCard(task) {
            const card = document.createElement('div');
            card.dataset.id = task.id;

            card.className = `${COLORS.bgSecondary} p-2 rounded shadow cursor-move text-sm task-card`;

            let recurrenceInfo = '';
            if (task.recurrence && task.recurrence !== 'none') {
                recurrenceInfo = `<i data-lucide="repeat" class="w-3 h-3 text-zinc-400" title="Tarefa Recorrente (${task.recurrence})"></i>`;
            }

            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <span class="pr-2">${task.title}</span>
                    <div class="flex items-center gap-2">
                        ${recurrenceInfo}
                        <button data-delete-id="${task.id}" class="text-zinc-500 hover:text-red-500 flex-shrink-0">&times;</button>
                    </div>
                </div>
            `;

            card.addEventListener('click', (e) => {
                if (e.target.closest('[data-delete-id]')) return;
                showSubjectTaskDetails(task);
            });

            card.querySelector(`[data-delete-id="${task.id}"]`).addEventListener('click', async (e) => {
                e.stopPropagation();
                if (await showConfirmModal('Excluir Tarefa?', 'Excluir esta tarefa da disciplina?')) {
                    try {
                        await deleteDoc(getSubjectTaskDoc(currentSubjectId, task.id));
                    } catch (error) { console.error("Erro ao deletar tarefa da disciplina:", error); }
                }
            });

            if (typeof lucide !== 'undefined') lucide.createIcons();
            return card;
        }

        async function updateSubjectTaskStatus(taskId, newStatus) {
            if (!currentSubjectId) return;
            try {
                await updateDoc(getSubjectTaskDoc(currentSubjectId, taskId), {
                    status: newStatus
                });
            } catch (error) { console.error("Erro ao atualizar status da tarefa:", error); }
        }

        function showAddSubjectTaskForm() {
            const formHtml = `
                <form id="form-add-subject-task-modal" class="space-y-4">
                    <input type="text" name="title" required class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md" placeholder="Título da tarefa...">
                    <textarea name="description" rows="3" class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md" placeholder="Descrição (opcional)..."></textarea>
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-1">Data de Entrega</label>
                        <input type="date" name="dueDate" class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md text-zinc-300">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-1">Recorrência</label>
                        <select name="recurrence" class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md">
                            <option value="none">Nenhuma</option>
                            <option value="daily">Diária</option>
                            <option value="weekly">Semanal</option>
                        </select>
                    </div>
                    <button type="submit" class="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 rounded-md font-semibold">Salvar</button>
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
            const recurrence = form.recurrence.value;

            try {
                await addDoc(getSubjectTasksCollection(currentSubjectId), {
                    title,
                    description: description || "",
                    dueDate: dueDate || null,
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
                    <input type="text" name="title" required value="${task.title}" class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md" placeholder="Título da tarefa...">
                    <textarea name="description" rows="3" class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md" placeholder="Descrição (opcional)...">${task.description || ''}</textarea>
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-1">Data de Entrega</label>
                        <input type="date" name="dueDate" value="${task.dueDate || ''}" class="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md text-zinc-300">
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

            document.querySelector('#form-edit-subject-task-modal [name="recurrence"]').value = task.recurrence || 'none';

            document.getElementById('form-edit-subject-task-modal').addEventListener('submit', (e) => {
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
                recurrence: form.recurrence.value || "none"
            };

            const oldTask = allSubjectTasks[currentSubjectId]?.find(t => t.id === taskId);

            if (oldTask && oldTask.dueDate !== updateData.dueDate) {
                updateData.notified = false;
                updateData.overdueNotified = false;
            }

            try {
                await updateDoc(getSubjectTaskDoc(currentSubjectId, taskId), updateData);
                closeSlideOver();
            } catch (error) { console.error("Erro ao salvar tarefa da disciplina:", error); }
        }



        function initCalendar() {
            const calendarEl = document.getElementById('calendar-container');
            if (!calendarEl || calendar) return;


            calendarEl.innerHTML = '';

            calendar = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth',
                locale: 'pt-br',
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,listWeek'
                },
                buttonText: {
                    today: 'Hoje',
                    month: 'Mês',
                    week: 'Semana',
                    list: 'Lista'
                },
                events: [],


                eventClick: function (info) {
                    const props = info.event.extendedProps;
                    const taskType = props.taskType;
                    const taskId = props.taskId;

                    if (taskType === 'main') {

                        showTaskDetails(taskId);

                    } else if (taskType === 'project') {

                        const projectId = props.projectId;


                        const task = allProjectTasks[projectId]?.find(t => t.id === taskId);

                        if (task) {

                            currentProjectId = projectId;

                            showProjectTaskDetails(task);
                        } else {
                            showModal("Erro", "Não foi possível encontrar os dados desta tarefa de projeto.");
                        }

                    } else if (taskType === 'subject') {

                        const subjectId = props.subjectId;


                        const task = allSubjectTasks[subjectId]?.find(t => t.id === taskId);

                        if (task) {

                            currentSubjectId = subjectId;

                            showSubjectTaskDetails(task);
                        } else {
                            showModal("Erro", "Não foi possível encontrar os dados desta tarefa de disciplina.");
                        }
                    }
                },


                dateClick: function (info) {
                    renderAgenda(info.date);
                    document.querySelectorAll('.fc-day-selected').forEach(d => d.classList.remove('fc-day-selected'));
                    info.dayEl.classList.add('fc-day-selected');
                }
            });

            renderAgenda(new Date());


            setTimeout(() => {
                const todayEl = document.querySelector('.fc-day-today');
                if (todayEl && !document.querySelector('.fc-day-selected')) {
                    todayEl.classList.add('fc-day-selected');
                }
            }, 50);
        }

        function getAllCalendarEvents() {
            let events = [];
            const todayStr = new Date().toISOString().split('T')[0];


            allTasks.filter(t => t.dueDate).forEach(t => {
                let color = '#3b82f6';
                if (t.status === 'done') color = '#22c55e';
                else if (t.status === 'overdue' || (t.dueDate < todayStr && t.status !== 'done')) color = '#ef4444';
                else if (t.status === 'doing') color = '#eab308';

                events.push({
                    id: t.id,
                    title: t.title,
                    start: t.dueDate,
                    allDay: true,
                    color: color,
                    textColor: '#ffffff',
                    extendedProps: { taskType: 'main', taskId: t.id, source: 'Minhas Tarefas' }
                });
            });


            Object.values(allProjectTasks).flat().filter(t => t.dueDate).forEach(t => {
                events.push({
                    id: `${t.projectId}-${t.id}`,
                    title: `[${t.projectTitle}] ${t.title}`,
                    start: t.dueDate,
                    allDay: true,
                    color: '#8b5cf6',
                    textColor: '#ffffff',
                    extendedProps: { taskType: 'project', taskId: t.id, projectId: t.projectId, source: 'Agência' }
                });
            });


            Object.values(allSubjectTasks).flat().filter(t => t.dueDate).forEach(t => {
                events.push({
                    id: `${t.subjectId}-${t.id}`,
                    title: `[${t.subjectName}] ${t.title}`,
                    start: t.dueDate,
                    allDay: true,
                    color: '#ec4899',
                    textColor: '#ffffff',
                    extendedProps: { taskType: 'subject', taskId: t.id, subjectId: t.subjectId, source: 'Faculdade' }
                });
            });


            allSubjects.forEach(subject => {
                if (!subject.schedule) return;
                scheduleDays.forEach(day => {
                    if (subject.schedule[day] && subject.schedule[day].length > 0) {
                        subject.schedule[day].forEach(timeSlot => {
                            const [startTime, endTime] = timeSlot.split(' - ');

                            events.push({
                                id: `${subject.id}-${day}-${timeSlot}`,
                                title: subject.name,
                                daysOfWeek: [scheduleDays.indexOf(day) + 1],
                                startTime: startTime,
                                endTime: endTime,
                                color: '#a855f7',
                                textColor: '#ffffff',
                                extendedProps: { taskType: 'class', source: 'Faculdade (Aula)' }
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
            const titleEl = document.getElementById('calendar-agenda-title');
            const listEl = document.getElementById('calendar-agenda-list');
            const selectedDateEl = document.getElementById('selected-date');

            const locale = 'pt-BR';
            const dayName = date.toLocaleDateString(locale, { weekday: 'long' });
            const dateName = date.toLocaleDateString(locale, { day: 'numeric', month: 'long' });

            titleEl.innerHTML = `<i data-lucide="calendar-days" class="w-5 h-5"></i> Agenda de ${dayName}`;
            selectedDateEl.textContent = dateName;

            if (typeof lucide !== 'undefined') lucide.createIcons();

            listEl.innerHTML = '';

            const allEvents = getAllCalendarEvents();
            const dateString = date.toISOString().split('T')[0];

            const eventsForDay = allEvents.filter(event => {

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
                if (typeof lucide !== 'undefined') lucide.createIcons();
                return;
            }


            eventsForDay.sort((a, b) => (a.startTime || '23:59').localeCompare(b.startTime || '23:59'));

            eventsForDay.forEach(event => {
                const item = document.createElement('div');
                item.className = 'p-3 bg-zinc-700 rounded-md';

                const time = event.startTime ? `${event.startTime} - ${event.endTime}` : 'Dia todo';

                item.innerHTML = `
                    <span class="text-xs font-medium ${COLORS.textSecondary}">${time}</span>
                    <p class="font-semibold">${event.title}</p>
                    <span class="text-xs font-medium" style="color: ${event.color || '#3b82f6'}">${event.extendedProps.source}</span>
                `;
                listEl.appendChild(item);
            });
        }


        function renderUpcomingEvents() {
            const listEl = document.getElementById('calendar-agenda-list')?.parentElement.querySelector('.border-t .space-y-3');
            if (!listEl) return;

            const allEvents = [];
            const today = new Date();
            today.setHours(0, 0, 0, 0);


            allTasks.filter(t => t.dueDate && new Date(t.dueDate + 'T12:00:00') >= today && t.status !== 'done').forEach(t => {
                allEvents.push({
                    date: new Date(t.dueDate + 'T12:00:00'),
                    title: t.title,
                    source: 'Minhas Tarefas',
                    colorClass: 'bg-blue-500'
                });
            });


            Object.values(allProjectTasks).flat().filter(t => t.dueDate && new Date(t.dueDate + 'T12:00:00') >= today && t.status !== 'done').forEach(t => {
                allEvents.push({
                    date: new Date(t.dueDate + 'T12:00:00'),
                    title: `[${t.projectTitle}] ${t.title}`,
                    source: 'Agência',
                    colorClass: 'bg-purple-500'
                });
            });


            Object.values(allSubjectTasks).flat().filter(t => t.dueDate && new Date(t.dueDate + 'T12:00:00') >= today && t.status !== 'done').forEach(t => {
                allEvents.push({
                    date: new Date(t.dueDate + 'T12:00:00'),
                    title: `[${t.subjectName}] ${t.title}`,
                    source: 'Faculdade',
                    colorClass: 'bg-green-500'
                });
            });


            allEvents.sort((a, b) => a.date - b.date);


            const upcoming = allEvents.slice(0, 3);


            listEl.innerHTML = '';
            if (upcoming.length === 0) {
                listEl.innerHTML = '<p class="text-sm text-zinc-500 p-3">Nenhum evento futuro encontrado.</p>';
                return;
            }

            const locale = 'pt-BR';
            upcoming.forEach(event => {
                const eventDateStr = event.date.toISOString().split('T')[0];
                const todayStr = new Date().toISOString().split('T')[0];
                const tomorrowStr = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

                let dateLabel = '';
                if (eventDateStr === todayStr) {
                    dateLabel = 'Hoje';
                } else if (eventDateStr === tomorrowStr) {
                    dateLabel = 'Amanhã';
                } else {
                    dateLabel = event.date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
                }

                const itemEl = document.createElement('div');
                itemEl.className = 'flex items-center gap-3 p-3 bg-zinc-700/50 rounded-lg border border-zinc-600';
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




        const pomodoro = {
            modes: {
                focus: 25,
                short: 5,
                long: 15,
            },
            currentMode: 'focus',
            timerId: null,
            timeRemaining: 25 * 60,
            isRunning: false,
            ui: {},

            init() {
                this.ui = {
                    time: document.getElementById('pomodoro-time'),
                    startBtn: document.getElementById('pomodoro-start'),
                    resetBtn: document.getElementById('pomodoro-reset'),
                    modeBtnFocus: document.getElementById('pomodoro-mode-focus'),
                    modeBtnShort: document.getElementById('pomodoro-mode-short'),
                    modeBtnLong: document.getElementById('pomodoro-mode-long'),
                };
                this.updateDisplay();
            },

            setMode(mode) {
                this.currentMode = mode;
                this.reset();
            },

            updateDisplay() {
                const minutes = Math.floor(this.timeRemaining / 60).toString().padStart(2, '0');
                const seconds = (this.timeRemaining % 60).toString().padStart(2, '0');
                const timeStr = `${minutes}:${seconds}`;


                if (this.ui.time) this.ui.time.textContent = timeStr;
                document.getElementById('pomodoro-time-focus').textContent = timeStr;


                if (this.isRunning) {

                    document.title = `${timeStr} - ${this.currentMode}`;
                } else {

                    document.title = currentDefaultTitle;
                }




                if (this.ui.modeBtnFocus) {

                    this.ui.modeBtnFocus.classList.toggle('bg-blue-500', this.currentMode === 'focus');
                    this.ui.modeBtnFocus.classList.toggle('text-white', this.currentMode === 'focus');
                    this.ui.modeBtnFocus.classList.toggle('hover:bg-zinc-600', this.currentMode !== 'focus');
                    this.ui.modeBtnFocus.classList.toggle('bg-zinc-700', this.currentMode !== 'focus');

                    this.ui.modeBtnShort.classList.toggle('bg-blue-500', this.currentMode === 'short');
                    this.ui.modeBtnShort.classList.toggle('text-white', this.currentMode === 'short');
                    this.ui.modeBtnShort.classList.toggle('hover:bg-zinc-600', this.currentMode !== 'short');
                    this.ui.modeBtnShort.classList.toggle('bg-zinc-700', this.currentMode !== 'short');


                    this.ui.modeBtnLong.classList.toggle('bg-blue-500', this.currentMode === 'long');
                    this.ui.modeBtnLong.classList.toggle('text-white', this.currentMode === 'long');
                    this.ui.modeBtnLong.classList.toggle('hover:bg-zinc-600', this.currentMode !== 'long');
                    this.ui.modeBtnLong.classList.toggle('bg-zinc-700', this.currentMode !== 'long');
                }
            },

            start() {
                if (this.isRunning) {
                    this.pause();
                } else {

                    this.isRunning = true;
                    if (this.ui.startBtn) {
                        this.ui.startBtn.innerHTML = '<i data-lucide="pause" class="w-5 h-5"></i> Pausar';
                    }
                    document.getElementById('pomodoro-start-focus').textContent = 'Pausar';

                    this.timerId = setInterval(() => {
                        this.timeRemaining--;
                        this.updateDisplay();
                        if (this.timeRemaining <= 0) {
                            this.completeCycle();
                        }
                    }, 1000);

                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
            },

            pause() {
                this.isRunning = false;
                if (this.ui.startBtn) {
                    this.ui.startBtn.innerHTML = '<i data-lucide="play" class="w-5 h-5"></i> Iniciar';
                }
                document.getElementById('pomodoro-start-focus').textContent = 'Iniciar';

                clearInterval(this.timerId);
                if (typeof lucide !== 'undefined') lucide.createIcons();
            },

            reset() {
                this.pause();
                this.timeRemaining = this.modes[this.currentMode] * 60;
                this.updateDisplay();
            },

            async completeCycle() {
                this.pause();

                try {
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
                    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
                    oscillator.start();
                    oscillator.stop(audioContext.currentTime + 0.5);
                } catch (e) {
                    console.warn("Não foi possível tocar o som de notificação.", e);
                }

                const duration = this.modes[this.currentMode];
                const taskSelect = document.getElementById('pomodoro-task-select');
                const selectedTaskValue = taskSelect.value;
                const selectedTaskText = taskSelect.options[taskSelect.selectedIndex].text;


                let notificationTitle = '';
                let notificationBody = '';

                if (this.currentMode === 'focus') {
                    notificationTitle = 'Sessão de Foco Concluída!';
                    notificationBody = 'Bom trabalho! Hora de uma pausa.';

                    if (userId) {
                        try {
                            await addDoc(getFocusHistoryCollection(), {
                                duration: duration,
                                taskRef: selectedTaskValue || null,
                                taskTitle: selectedTaskValue ? selectedTaskText : 'Foco geral',
                                createdAt: serverTimestamp()
                            });
                        } catch (error) {
                            console.error("Erro ao salvar histórico de foco:", error);
                        }
                    }
                } else {
                    notificationTitle = 'Pausa Concluída!';
                    notificationBody = selectedTaskValue ? `Hora de focar em: ${selectedTaskText}` : 'Hora de voltar ao foco!';
                }


                if (Notification.permission === 'granted') {
                    new Notification(notificationTitle, {
                        body: notificationBody,
                    });
                }



                if (this.currentMode === 'focus') {
                    this.setMode('short');
                } else {
                    this.setMode('focus');
                }


                this.start();
            }
        };



        function toggleFocusMode() {
            const appWrapper = document.getElementById('app-wrapper');
            const focusContainer = document.getElementById('total-focus-container');
            const isFocus = focusContainer.classList.contains('hidden');

            if (isFocus) {
                appWrapper.classList.add('hidden');
                appWrapper.classList.remove('flex');
                focusContainer.classList.remove('hidden');
                focusContainer.classList.add('flex');

                pomodoro.updateDisplay();

                const taskSelect = document.getElementById('pomodoro-task-select');
                const selectedTaskText = taskSelect.options[taskSelect.selectedIndex].text;
                const taskTitleEl = document.getElementById('focus-mode-task-title');

                if (taskSelect.value) {
                    taskTitleEl.textContent = selectedTaskText;
                } else {
                    taskTitleEl.textContent = 'Nenhuma tarefa selecionada';
                }

                if (typeof lucide !== 'undefined') lucide.createIcons();
            } else {
                appWrapper.classList.remove('hidden');
                appWrapper.classList.add('flex');
                focusContainer.classList.add('hidden');
                focusContainer.classList.remove('flex');
            }
        }




        function updatePomodoroTaskSelect() {
            const select = document.getElementById('pomodoro-task-select');
            if (!select) return;

            const currentValue = select.value;
            select.innerHTML = '<option value="">Nenhuma tarefa selecionada</option>';


            const tasksGroup = document.createElement('optgroup');
            tasksGroup.label = 'Minhas Tarefas';
            allTasks.filter(t => t.status !== 'done').forEach(t => {
                tasksGroup.appendChild(new Option(t.title, `tasks/${t.id}`));
            });
            select.appendChild(tasksGroup);


            const agencyGroup = document.createElement('optgroup');
            agencyGroup.label = 'Agência';
            Object.values(allProjectTasks).flat().filter(t => t.status !== 'done').forEach(t => {
                agencyGroup.appendChild(new Option(`[${t.projectTitle}] ${t.title}`, `agencyProjects/${t.projectId}/tasks/${t.id}`));
            });
            select.appendChild(agencyGroup);


            const collegeGroup = document.createElement('optgroup');
            collegeGroup.label = 'Faculdade (Tarefas)';
            Object.values(allSubjectTasks).flat().filter(t => t.status !== 'done').forEach(t => {
                collegeGroup.appendChild(new Option(`[${t.subjectName}] ${t.title}`, `subjects/${t.subjectId}/tasks/${t.id}`));
            });
            select.appendChild(collegeGroup);



            const subjectsGroup = document.createElement('optgroup');
            subjectsGroup.label = 'Disciplinas (Estudo)';
            allSubjects.forEach(subject => {

                subjectsGroup.appendChild(new Option(subject.name, `subjects/${subject.id}`));
            });
            select.appendChild(subjectsGroup);


            select.value = currentValue;
        }

        function renderFocusHistory(history) {
            const list = document.getElementById('focus-history-list');
            if (!list) return;
            list.innerHTML = '';

            if (history.length === 0) {
                list.innerHTML = `
                    <div class="text-center py-6 text-zinc-500">
                        <i data-lucide="clock" class="w-10 h-10 mx-auto mb-2 opacity-50"></i>
                        <p class="text-sm">Nenhum ciclo de foco registrado</p>
                    </div>`;
                if (typeof lucide !== 'undefined') lucide.createIcons();
                return;
            }

            const locale = 'pt-BR';
            history.forEach(item => {
                const el = document.createElement('div');
                el.className = `p-2 ${COLORS.bgCard} rounded-md`;
                const date = item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '...';

                el.innerHTML = `
                    <div class="flex justify-between items-center">
                        <span class="font-medium text-sm">${item.taskTitle}</span>
                        <span class="font-bold text-sm text-blue-400">${item.duration} min</span>
                    </div>
                    <span class="text-xs ${COLORS.textSecondary}">${date}</span>
                `;
                list.appendChild(el);
            });
        }


        document.getElementById('current-date').textContent = new Date().toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });


        function animateNumber() {
            const streakElement = document.getElementById('streak-counter');
            if (streakElement) {
                streakElement.classList.add('number-pop');
                setTimeout(() => {
                    streakElement.classList.remove('number-pop');
                }, 500);
            }
        }


        function updateFlameLevel(currentStreak) {
            const flameElement = document.getElementById('streak-flame');
            if (!flameElement) return;


            flameElement.classList.remove('streak-level-1', 'streak-level-2', 'streak-level-3');


            if (currentStreak >= 30) {
                flameElement.classList.add('streak-level-3');
            } else if (currentStreak >= 7) {
                flameElement.classList.add('streak-level-2');
            } else if (currentStreak >= 1) {
                flameElement.classList.add('streak-level-1');
            }

        }

        function openMobileMenu() {
            const nav = document.getElementById('sidebar-nav');
            const overlay = document.getElementById('mobile-menu-overlay');
            if (!nav || !overlay) return;

            nav.classList.remove('-translate-x-full');
            nav.classList.add('translate-x-0');
            overlay.classList.remove('hidden');
        }

        function closeMobileMenu() {
            const nav = document.getElementById('sidebar-nav');
            const overlay = document.getElementById('mobile-menu-overlay');
            if (!nav || !overlay) return;

            nav.classList.remove('translate-x-0');
            nav.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
        }