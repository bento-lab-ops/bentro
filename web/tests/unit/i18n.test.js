// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { I18n, i18n } from '../../js/i18n.js';

describe('I18n - Translation System', () => {
    beforeEach(() => {
        localStorage.clear();
        i18n.currentLang = 'en';
    });

    describe('t() - Translation Function', () => {
        it('should return translation for existing key in English', () => {
            expect(i18n.t('app.title')).toBe('BenTro');
            expect(i18n.t('btn.new_board')).toBe('+ New Board');
        });

        it('should return key itself if translation not found', () => {
            expect(i18n.t('nonexistent.key')).toBe('nonexistent.key');
        });

        it('should return Portuguese translation when language is pt-BR', () => {
            i18n.setLanguage('pt-BR');
            expect(i18n.t('app.title')).toBe('BenTro');
            expect(i18n.t('btn.new_board')).toBe('+ Nova Retro');
            expect(i18n.t('btn.dashboard')).toBe('Dashboard');
        });

        it('should fallback to English for invalid language', () => {
            i18n.currentLang = 'invalid-lang';
            expect(i18n.t('app.title')).toBe('BenTro');
        });
    });

    describe('setLanguage() - Language Switching', () => {
        it('should update currentLang and save to localStorage', () => {
            i18n.setLanguage('pt-BR');

            expect(i18n.currentLang).toBe('pt-BR');
            expect(localStorage.getItem('bentro_lang')).toBe('pt-BR');
        });

        it('should not change language for invalid language code', () => {
            i18n.setLanguage('en');
            i18n.setLanguage('invalid');

            expect(i18n.currentLang).toBe('en');
        });
    });

    describe('updatePage() - DOM Updates', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <h1 data-i18n="app.title"></h1>
                <button data-i18n="btn.new_board"></button>
                <span data-i18n="label.email" data-i18n-target="title"></span>
                <button class="lang-btn" data-lang="en"></button>
                <button class="lang-btn" data-lang="pt-BR"></button>
            `;
        });

        it('should update text content for elements with data-i18n', () => {
            i18n.updatePage();

            expect(document.querySelector('[data-i18n="app.title"]').textContent).toBe('BenTro');
            expect(document.querySelector('[data-i18n="btn.new_board"]').textContent).toBe('+ New Board');
        });

        it('should update custom attribute when data-i18n-target is specified', () => {
            i18n.updatePage();

            const span = document.querySelector('[data-i18n-target="title"]');
            expect(span.getAttribute('title')).toBe('Email');
        });

        it('should add active class to current language button', () => {
            i18n.setLanguage('pt-BR');

            const enBtn = document.querySelector('[data-lang="en"]');
            const ptBtn = document.querySelector('[data-lang="pt-BR"]');

            expect(enBtn.classList.contains('active')).toBe(false);
            expect(ptBtn.classList.contains('active')).toBe(true);
        });

        it('should update all translations when language changes', () => {
            i18n.setLanguage('pt-BR');

            expect(document.querySelector('[data-i18n="btn.new_board"]').textContent).toBe('+ Nova Retro');
        });
    });

    describe('init() - Initialization', () => {
        it('should call updatePage on init', () => {
            document.body.innerHTML = '<h1 data-i18n="app.title"></h1>';

            const newI18n = new I18n();
            newI18n.init();

            expect(document.querySelector('[data-i18n="app.title"]').textContent).toBe('BenTro');
        });

        it('should load language from localStorage on construction', () => {
            localStorage.setItem('bentro_lang', 'pt-BR');

            const newI18n = new I18n();

            expect(newI18n.currentLang).toBe('pt-BR');
        });

        it('should default to English if no language in localStorage', () => {
            const newI18n = new I18n();

            expect(newI18n.currentLang).toBe('en');
        });
    });

    describe('Translation Coverage - Critical Keys', () => {
        const criticalKeys = [
            'app.title',
            'btn.new_board',
            'btn.create_board',
            'modal.welcome',
            'confirm.delete_board',
            'alert.failed_create_board',
            'menu.dashboard',
            'action.pending',
            'admin.dashboard',
            'help.title'
        ];

        it('should have all critical keys in English', () => {
            i18n.setLanguage('en');
            criticalKeys.forEach(key => {
                const translation = i18n.t(key);
                expect(translation).not.toBe(key);
                expect(translation.length).toBeGreaterThan(0);
            });
        });

        it('should have all critical keys in Portuguese', () => {
            i18n.setLanguage('pt-BR');
            criticalKeys.forEach(key => {
                const translation = i18n.t(key);
                expect(translation).not.toBe(key);
                expect(translation.length).toBeGreaterThan(0);
            });
        });
    });
});
