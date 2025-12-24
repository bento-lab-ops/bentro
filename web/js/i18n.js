
const translations = {
    'en': {
        // Queue/Dashboard
        'app.title': 'BenTro',
        'app.subtitle': 'Retrospectives, packed perfectly!',
        'btn.new_board': '+ New Board',
        'btn.dashboard': 'Dashboard',
        'btn.leave': 'Leave',
        'heading.board_list': 'Board List',
        'tab.active': 'Active',
        'tab.finalized': 'Finalized',
        'msg.no_boards': 'No Boards Yet',
        'msg.click_new_board': 'Click "+ New Board" in the header to create your first retrospective.',

        // Action Items
        'heading.action_items': '⚡ My Action Items',

        // Board View
        'banner.read_only': '⚠️ This board is finished (Read Only)',
        'label.active_participants': 'Active:',
        'label.current_phase': 'Current Phase:',
        'phase.input': 'Input Phase',
        'phase.voting': 'Voting Phase',
        'phase.discuss': 'Discussion Phase',
        'btn.start_timer': 'Start Timer',
        'btn.stop_timer': 'Stop Timer',
        'btn.switch_voting': 'Switch to Voting',
        'btn.switch_input': 'Switch to Input',
        'btn.switch_discuss': 'Switch to Discussion',
        'btn.export_csv': '📊 Export CSV',
        'btn.finish_retro': 'Finish Retro',
        'btn.reopen_retro': 'Re-open Retro',
        'btn.add_column': '+ Add Column',
        'btn.enter': 'Enter',
        'btn.reopen': 'Re-open',
        'status.active': 'Active',
        'status.finished': 'Finished',
        'help.desc_full': 'Retrospectives are a vital part of agile development. Use BenTro to collaborate with your team, vote on ideas, and create action items for continuous improvement.',
        'label.desc_notes': 'Description / Notes',

        // Generic
        'modal.close': 'Close',
        'modal.cancel': 'Cancel',
        'modal.save': 'Save',
        'modal.confirm': 'Confirm',
        'modal.delete': 'Delete',
        'modal.welcome': 'Welcome!',
        'modal.enter_name': 'Please enter your name and choose an avatar.',
        'label.your_name': 'Your Name',
        'btn.join_retro': 'Join Retrospective',
        'modal.welcome_back': 'Welcome Back! 👋',
        'modal.continue_as': 'Continue as',
        'modal.change_name': 'Change Name',
        'label.choose_avatar': 'Choose Your Avatar',
        'placeholder.board_name': 'Sprint 42 Retrospective',
        'small.template_help': 'Choose a template or enter custom columns below',
        'small.columns_help': 'Leave empty for default columns',
        'label.template': 'Template',
        'label.column_names': 'Column Names (one per line)',
        'btn.create_board': 'Create Board',
        'placeholder.card_content': 'Enter your thoughts...',
        'heading.edit_column': 'Edit Column Name',
        'label.column_name': 'Column Name',
        'heading.action_details': '⚡ Action Item Details',
        'btn.remove_action_item': 'Remove Action Item',
        'btn.save_details': 'Save Details',
        'heading.complete_action': '✅ Complete Action Item',
        'text.resolution_details': 'Add details about the resolution.',
        'label.completion_date': 'Completion Date',
        'label.link_optional': 'Link / PR (Optional)',
        'label.desc_optional': 'Description / Notes (Optional)',
        'placeholder.what_done': 'What was done...',
        'btn.complete_item': 'Complete Item',

        // Dynamic / JS
        'alert.enter_board_name': 'Please enter a board name',
        'confirm.delete_board': 'Are you sure you want to delete this board?',
        'confirm.finish_retro': 'Are you sure you want to finish this retrospective? This will disable adding new cards and voting.',
        'confirm.reopen_retro': 'Re-open this retrospective?',
        'confirm.delete_card': 'Are you sure you want to delete this card?',
        'confirm.delete_column': 'Are you sure you want to delete this column? All cards will be deleted.',
        'confirm.claim_board': 'Claim this board? You will be responsible for its settings.',
        'confirm.remove_action_item': 'Are you sure you want to remove the Action Item status from this card?',
        'confirm.reopen_action_item': 'Are you sure you want to re-open this item? This will clear the completion details.',

        'alert.failed_create_board': 'Failed to create board',
        'alert.cannot_delete_items': 'Cannot delete board with action items',
        'alert.failed_save_action_item': 'Failed to save action item',
        'alert.failed_remove_action_item': 'Failed to remove action item',

        'tooltip.copy_link': 'Copy Link',
        'tooltip.copied': 'Copied!',
        'label.anonymous': 'Anonymous',

        // Menu
        'menu.dashboard': 'Dashboard',
        'menu.my_tasks': 'My Tasks',
        'menu.settings': 'Settings',
        'menu.admin': 'Admin Dashboard',
        'menu.help': 'Help',
        'menu.logout': 'Logout',
        'menu.unlock': 'Unlock',
        'menu.verified': 'Verified Admin Access',
        'menu.enter_password': 'Enter admin password to unlock features.',

        // Action Items
        'action.pending': 'Pending',
        'action.completed': 'Completed',
        'action.empty_title': 'No Action Items Found',
        'action.empty_desc': 'You\'re all caught up!',
        'action.status': 'Status',
        'action.task': 'Task',
        'action.board': 'Board',
        'action.owner': 'Owner',
        'action.due_date': 'Due Date',
        'action.done_date': 'Done Date',
        'action.created': 'Created',
        'action.actions': 'Actions',
        'action.mark_done': 'Mark Done',
        'action.reopen': 'Reopen',
        'action.details': 'Details',
        'action.link': 'Link',
        'action.note': 'Note',
        'action.status_done': 'Done',
        'action.status_overdue': 'Overdue',
        'action.status_pending': 'Pending',
        'action.unassigned': 'Unassigned',

        // Admin
        'admin.title': 'Admin Access',
        'admin.enter_pass': 'Please enter the administrator password to continue.',
        'admin.dashboard': 'Admin Dashboard',
        'admin.connection_secure': 'Connection Secure',
        'admin.board_management': 'Board Management (Beta)',
        'admin.board_management_desc': 'To manage a board\'s settings (Vote Limits, Phases), navigate to the board as a user, then open the Admin Settings modal.',
        'admin.login_failed': 'Login failed',
        'admin.invalid_pass': 'Invalid password',

        // Board Templates
        'template.custom': 'Custom (Manual Entry)',
        'template.start-stop-continue.name': 'Start / Stop / Continue',
        'template.start-stop-continue.col1': 'Start Doing',
        'template.start-stop-continue.col2': 'Stop Doing',
        'template.start-stop-continue.col3': 'Continue Doing',
        'template.mad-sad-glad.name': 'Mad / Sad / Glad',
        'template.mad-sad-glad.col1': 'Mad 😠',
        'template.mad-sad-glad.col2': 'Sad 😢',
        'template.mad-sad-glad.col3': 'Glad 😊',
        'template.4ls.name': '4 L\'s (Liked, Learned, Lacked, Longed For)',
        'template.4ls.col1': 'Liked 👍',
        'template.4ls.col2': 'Learned 💡',
        'template.4ls.col3': 'Lacked 🤔',
        'template.4ls.col4': 'Longed For 🌟',
        'template.wwn-badly-action.name': 'What Went Well/Badly',
        'template.wwn-badly-action.col1': 'What Went Well ✅',
        'template.wwn-badly-action.col2': 'What Went Badly ❌',
        'template.wwn-badly-action.col3': 'Needs Attention ⚠️',
        'template.wwn-badly-action.col4': 'Action Items 🎯',
        'template.sailboat.name': 'Sailboat Retrospective',
        'template.sailboat.col1': 'Wind 💨',
        'template.sailboat.col2': 'Anchor ⚓',
        'template.sailboat.col3': 'Rocks 🪨',
        'template.sailboat.col4': 'Island 🏝️',

        // Settings
        'settings.appearance': 'Appearance',
        'settings.dark_mode': 'Dark Mode',
        'settings.administration': 'Administration',

        // Help
        'help.title': 'About BenTro',
        'help.tagline': 'Retrospectives, packed perfectly!',
        'help.desc': 'A friendly retrospective tool created to make team collaboration effortless!',
        'help.quick_start': 'Quick Start',
        'help.shortcuts': 'Keyboard Shortcuts',
        'help.view_docs': 'View Documentation on GitHub',

        // Board Buttons
        'btn.select': 'Select',
        'btn.unselect': 'Unselect',
        'btn.merge_here': 'Merge Here',
        'btn.cancel': 'Cancel',
        'card.vote': 'Vote',
        'card.remove_vote': 'Remove Vote',
        'card.votes_hidden': '🙈 Votes Hidden',
        'phase.input': 'Input Phase',
        'phase.voting': 'Voting Phase',
        'phase.completed': 'Completed',
        'phase.discuss': 'Discuss Phase',

        // Add to existing phases if needed
    },
    'pt-BR': {
        // Queue/Dashboard
        'app.title': 'BenTro',
        'app.subtitle': 'Retrospectivas, perfeitamente embaladas!',
        'btn.new_board': '+ Nova Retro',
        'btn.dashboard': 'Dashboard',
        'btn.leave': 'Sair',
        'heading.board_list': 'Lista de Retros',
        'tab.active': 'Ativas',
        'tab.finalized': 'Finalizadas',
        'msg.no_boards': 'Nenhuma Retro Ainda',
        'msg.click_new_board': 'Clique em "+ Nova Retro" no cabeçalho para criar sua primeira retrospectiva.',
        'heading.create_new_board': 'Criar Nova Retro',

        // Action Items
        'heading.action_items': '⚡ Meus Acionáveis',

        // Board View
        'banner.read_only': '⚠️ Esta retro foi finalizada (Somente Leitura)',
        'label.active_participants': 'Ativos:',
        'label.current_phase': 'Fase Atual:',
        'phase.input': 'Entrada',
        'phase.voting': 'Votação',
        'phase.discuss': 'Discussão',
        'btn.start_timer': 'Iniciar Timer',
        'btn.stop_timer': 'Parar Timer',
        'btn.switch_voting': 'Fase de Votação',
        'btn.switch_input': 'Fase de Entrada',
        'btn.switch_discuss': 'Fase de Discussão',
        'btn.export_csv': '📊 Exportar CSV',
        'btn.finish_retro': 'Finalizar Retro',
        'btn.reopen_retro': 'Reabrir Retro',
        'btn.add_column': '+ Add Coluna',
        'btn.enter': 'Entrar',
        'btn.reopen': 'Reabrir',
        'status.active': 'Ativa',
        'status.finished': 'Finalizada',
        'help.desc_full': 'Retrospectivas são vitais para o desenvolvimento ágil. Use BenTro para colaborar com seu time, votar em ideias e criar itens de ação para melhoria contínua.',
        'label.desc_notes': 'Descrição / Notas',

        // Generic
        'modal.close': 'Fechar',
        'modal.cancel': 'Cancelar',
        'modal.save': 'Salvar',
        'modal.confirm': 'Confirmar',
        'modal.delete': 'Excluir',
        'modal.welcome': 'Bem-vindo!',
        'modal.enter_name': 'Por favor, digite seu nome e escolha um avatar.',
        'label.your_name': 'Seu Nome',
        'btn.join_retro': 'Entrar na Retro',
        'modal.welcome_back': 'Bem-vindo de volta! 👋',
        'modal.continue_as': 'Continuar como',
        'modal.change_name': 'Mudar Nome',
        'label.choose_avatar': 'Escolha seu Avatar',
        'modal.change_name': 'Mudar Nome',
        'label.choose_avatar': 'Escolha seu Avatar',
        'label.board_name': 'Nome da Retro',
        'placeholder.board_name': 'Retrospectiva Sprint 42',
        'small.template_help': 'Escolha um modelo ou digite colunas personalizadas abaixo',
        'small.columns_help': 'Deixe em branco para colunas padrão',
        'label.template': 'Modelo',
        'label.column_names': 'Nomes das Colunas (uma por linha)',
        'btn.create_board': 'Criar Retro',
        'placeholder.card_content': 'Digite seus pensamentos...',
        'heading.edit_column': 'Editar Nome da Coluna',
        'label.column_name': 'Nome da Coluna',
        'heading.action_details': '⚡ Detalhes Action Item',
        'btn.remove_action_item': 'Remover Action Item',
        'btn.save_details': 'Salvar Detalhes',
        'heading.complete_action': '✅ Concluir Action Item',
        'text.resolution_details': 'Adicione detalhes sobre a resolução.',
        'label.completion_date': 'Data de Conclusão',
        'label.link_optional': 'Link / PR (Opcional)',
        'label.desc_optional': 'Descrição / Notas (Opcional)',
        'placeholder.what_done': 'O que foi feito...',
        'btn.complete_item': 'Concluir Item',

        // Dynamic / JS
        'alert.enter_board_name': 'Por favor, digite um nome para a retro',
        'confirm.delete_board': 'Tem certeza que deseja excluir esta retro?',
        'confirm.finish_retro': 'Tem certeza que deseja finalizar esta retrospectiva? Isso impedirá a criação de novos cards e votos.',
        'confirm.reopen_retro': 'Reabrir esta retrospectiva?',
        'confirm.delete_card': 'Tem certeza que deseja excluir este card?',
        'confirm.delete_column': 'Tem certeza que deseja excluir esta coluna? Todos os cards serão excluídos.',
        'confirm.claim_board': 'Assumir esta retro? Você será responsável por suas configurações.',
        'confirm.remove_action_item': 'Tem certeza que deseja remover o status de Action Item deste card?',
        'confirm.reopen_action_item': 'Tem certeza que deseja reabrir este item? Isso limpará os detalhes de conclusão.',

        'alert.failed_create_board': 'Falha ao criar retro',
        'alert.cannot_delete_items': 'Não é possível excluir retro com action items',
        'alert.failed_save_action_item': 'Falha ao salvar action item',
        'alert.failed_remove_action_item': 'Falha ao remover action item',

        'tooltip.copy_link': 'Copiar Link',
        'tooltip.copied': 'Copiado!',
        'label.anonymous': 'Anônimo',

        // Menu
        'menu.dashboard': 'Dashboard',
        'menu.my_tasks': 'Minhas Tarefas',
        'menu.settings': 'Configurações',
        'menu.admin': 'Painel Admin',
        'menu.help': 'Ajuda',
        'menu.logout': 'Sair',
        'menu.unlock': 'Desbloquear',
        'menu.verified': 'Acesso Admin Verificado',
        'menu.enter_password': 'Digite a senha de admin para desbloquear.',

        // Action Items
        'action.pending': 'Pendentes',
        'action.completed': 'Concluídas',
        'action.empty_title': 'Nenhuma tarefa encontrada',
        'action.empty_desc': 'Você está em dia!',
        'action.status': 'Status',
        'action.task': 'Tarefa',
        'action.board': 'Retro',
        'action.owner': 'Dono',
        'action.due_date': 'Prazo',
        'action.done_date': 'Conclusão',
        'action.created': 'Criado em',
        'action.actions': 'Ações',
        'action.mark_done': 'Concluir',
        'action.reopen': 'Reabrir',
        'action.details': 'Detalhes',
        'action.link': 'Link',
        'action.note': 'Nota',
        'action.status_done': 'Feito',
        'action.status_overdue': 'Atrasado',
        'action.status_pending': 'Pendente',
        'action.unassigned': 'Não atribuído',

        // Admin
        'admin.title': 'Acesso Admin',
        'admin.enter_pass': 'Por favor, digite a senha de administrador.',
        'admin.dashboard': 'Painel Admin',
        'admin.connection_secure': 'Conexão Segura',
        'admin.board_management': 'Gerenciamento de Board (Beta)',
        'admin.board_management_desc': 'Para gerenciar as configurações (Limites de Voto, Fases), navegue até a retro e abra as Configurações.',
        'admin.login_failed': 'Falha no login',
        'admin.invalid_pass': 'Senha inválida',

        // Board Templates
        'template.custom': 'Personalizado (Manual)',
        'template.start-stop-continue.name': 'Começar / Parar / Continuar',
        'template.start-stop-continue.col1': 'Começar',
        'template.start-stop-continue.col2': 'Parar',
        'template.start-stop-continue.col3': 'Continuar',
        'template.mad-sad-glad.name': 'Bravo / Triste / Feliz',
        'template.mad-sad-glad.col1': 'Bravo 😠',
        'template.mad-sad-glad.col2': 'Triste 😢',
        'template.mad-sad-glad.col3': 'Feliz 😊',
        'template.4ls.name': '4 L\'s (Gostei, Aprendi, Faltou, Desejei)',
        'template.4ls.col1': 'Gostei 👍',
        'template.4ls.col2': 'Aprendi 💡',
        'template.4ls.col3': 'Faltou 🤔',
        'template.4ls.col4': 'Desejei 🌟',
        'template.wwn-badly-action.name': 'Bom / Ruim / Atenção / Acionáveis',
        'template.wwn-badly-action.col1': 'Foi Bom ✅',
        'template.wwn-badly-action.col2': 'Foi Ruim ❌',
        'template.wwn-badly-action.col3': 'Atenção ⚠️',
        'template.wwn-badly-action.col4': 'Acionáveis 🎯',
        'template.sailboat.name': 'Barco à Vela',
        'template.sailboat.col1': 'Vento 💨',
        'template.sailboat.col2': 'Âncora ⚓',
        'template.sailboat.col3': 'Rochas 🪨',
        'template.sailboat.col4': 'Ilha 🏝️',

        // Settings
        'settings.appearance': 'Aparência',
        'settings.dark_mode': 'Modo Escuro',
        'settings.administration': 'Administração',

        // Help
        'help.title': 'Sobre BenTro',
        'help.tagline': 'Retrospectivas, perfeitamente embaladas!',
        'help.desc': 'Uma ferramenta amigável para tornar a colaboração da equipe fácil!',
        'help.quick_start': 'Início Rápido',
        'help.shortcuts': 'Atalhos de Teclado',
        'help.view_docs': 'Ver Documentação no GitHub',

        // Board Buttons
        'btn.select': 'Selecionar',
        'btn.unselect': 'Desmarcar',
        'btn.merge_here': 'Mesclar Aqui',
        'btn.cancel': 'Cancelar',
        'card.vote': 'Votar',
        'card.remove_vote': 'Remover Voto',
        'card.votes_hidden': '🙈 Votos Ocultos',
        'phase.input': 'Fase de Input',
        'phase.voting': 'Fase de Votação',
        'phase.completed': 'Finalizada',
        'phase.discuss': 'Fase de Discussão',
    }
};

class I18n {
    constructor() {
        this.currentLang = localStorage.getItem('bentro_lang') || 'en';
    }

    t(key) {
        const langData = translations[this.currentLang] || translations['en'];
        return langData[key] || key;
    }

    setLanguage(lang) {
        if (translations[lang]) {
            this.currentLang = lang;
            localStorage.setItem('bentro_lang', lang);
            this.updatePage();
            // Emit event so other components can react
            document.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
        }
    }

    updatePage() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);

            // Check if we should update a specific attribute or text content
            const targetAttr = element.getAttribute('data-i18n-target');
            if (targetAttr) {
                element.setAttribute(targetAttr, translation);
            } else if (element.tagName === 'INPUT' && (element.type === 'submit' || element.type === 'button' || element.type === 'reset' || element.placeholder)) {
                if (element.placeholder) {
                    element.setAttribute('placeholder', translation);
                } else {
                    element.value = translation;
                }
            } else {
                element.textContent = translation;
            }
        });

        // Toggle active state of language buttons if they exist
        document.querySelectorAll('.lang-btn').forEach(btn => {
            if (btn.getAttribute('data-lang') === this.currentLang) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    init() {
        this.updatePage();
    }
}

// Global instance
const i18n = new I18n();

// Make it available globally
window.i18n = i18n;

// Language Menu Logic
window.toggleLangMenu = function () {
    const menu = document.getElementById('langMenu');
    if (menu) menu.classList.toggle('show');
};

// Close dropdown when clicking outside
document.addEventListener('click', function (event) {
    if (!event.target.closest('.lang-selector-container')) {
        const dropdowns = document.getElementsByClassName("lang-dropdown");
        for (let i = 0; i < dropdowns.length; i++) {
            const openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
});
