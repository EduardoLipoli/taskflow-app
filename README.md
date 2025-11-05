# TaskFlow - Sistema de Gestão Pessoal 🚀

Bem-vindo ao TaskFlow, um sistema completo de gestão de produtividade e organização pessoal, construído com HTML, TailwindCSS e Firebase. Este painel centraliza a gestão de tarefas pessoais, projetos de agência (CRM) e organização acadêmica (Faculdade) em uma interface única, escura e responsiva.

## ✨ Funcionalidades Principais

O sistema é dividido em vários módulos principais, todos acessíveis a partir de uma barra de navegação lateral:

### 1. Dashboard de Produtividade
O "hub" central do sistema, que oferece uma visão global de toda a sua produtividade.
* **Estatísticas Unificadas:** Cards que somam o total de tarefas (Pendentes, Em Progresso, Concluídas) de *todas* as fontes (Pessoal, Agência e Faculdade).
* **Timer Pomodoro:** Um timer Pomodoro integrado para gerenciar ciclos de foco e pausas, com notificações no navegador ao final de cada ciclo.
* **Registro de Foco:** Permite associar um ciclo de foco a uma tarefa específica ou a um tópico de estudo (disciplina).
* **Atalhos:** Listas de "Tarefas Recentes" e "Tarefas por Categoria" de todas as fontes.
* **Cronograma:** Um clone do cronograma de horários da faculdade para fácil visualização.

### 2. Gestão da Agência (CRM)
Um mini-CRM para gerenciar projetos e clientes.
* **Tabela de Projetos:** Visualização em tabela com paginação, ordenação (por nome, prazo, status) e busca.
* **Progresso Automático:** A barra de progresso de cada projeto é calculada automaticamente com base na percentagem de tarefas concluídas.
* **Kanban de Projeto:** Ao clicar em um projeto, o usuário vê um painel Kanban interno (A Fazer, Em Progresso, Concluído) apenas para as tarefas daquele projeto.

### 3. Minhas Tarefas
Um painel Kanban pessoal para tarefas gerais.
* **Quadro Kanban:** Colunas de "Atrasadas", "A Fazer", "Em Progresso" e "Concluído".
* **Arrastar e Soltar:** Tarefas podem ser movidas entre as colunas para atualizar seu status.
* **Automação:** Tarefas com datas de entrega passadas são movidas automaticamente para "Atrasadas".

### 4. Gestão da Faculdade
Um módulo completo para organização acadêmica.
* **Cadastro de Disciplinas:** Permite adicionar e gerenciar disciplinas.
* **Cronograma Colorido:** Uma tabela de horários visual que atribui uma cor única para cada disciplina.
* **Kanban da Disciplina:** Cada disciplina possui seu próprio painel Kanban interno para tarefas e trabalhos.
* **Estatísticas:** Cards que mostram o total de disciplinas, aulas no dia e trabalhos pendentes.

### 5. Sistema de Gamificação e Notificação
* **Ofensiva (Streak):** Um contador de "foguinho" animado na barra lateral que rastreia dias consecutivos de acesso.
* **Notificações Push:** O aplicativo pede permissão e envia notificações do navegador para o fim de ciclos Pomodoro e para tarefas que vencem no dia.
* **Central de Notificações (Sininho):** Um ícone de sino 🔔 na barra lateral que armazena um histórico de notificações (ex: "Tarefa X está atrasada", "Tarefa Y vence hoje").

### 6. Responsividade
* **Mobile-First:** O aplicativo é totalmente responsivo e funciona em dispositivos móveis através do navegador.
* **Menu Deslizante:** Em telas pequenas, a barra lateral se esconde e é acessível através de um ícone de "hambúrguer".

## 🛠️ Tecnologias Utilizadas

* **Frontend:** HTML5, TailwindCSS, JavaScript (ES6 Modules)
* **Backend (BaaS):** Google Firebase
    * **Firestore:** Banco de dados NoSQL em tempo real para armazenar todos os dados do usuário (tarefas, projetos, disciplinas, etc.).
    * **Authentication:** Gerenciamento de login (Email/Senha e Google).
* **Bibliotecas JS:**
    * **Lucide Icons:** Para todos os ícones.
    * **FullCalendar:** Para a página de Calendário.
    * **Sortable.js:** Para a funcionalidade de arrastar e soltar nos painéis Kanban.