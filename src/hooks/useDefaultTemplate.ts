/**
 * Hook para obter o template padrão de um tipo de contrato
 * Usa as preferências salvas no localStorage
 */

import { useEffect, useState } from 'react';
import { ContractType } from '../types/contract';

interface TemplatePreferences {
  venda_vista: string;
  venda_parcelada: string;
  exclusividade: string;
}

const DEFAULT_TEMPLATES: TemplatePreferences = {
  // venda_vista e venda_parcelada usam um arquivo mestre único (as 3
  // modalidades saem do mesmo .docx - ver templateResolver.ts)
  venda_vista: 'venda_vista_master.docx',
  venda_parcelada: 'venda_parcelada_master.docx',
  exclusividade: 'exclusividade_digital_sem_testemunhas.docx',
};

/**
 * Hook que retorna o template padrão para um tipo de contrato
 * Lê do localStorage se disponível, caso contrário usa defaults
 */
export function useDefaultTemplate(type: ContractType): string {
  const [template, setTemplate] = useState<string>(DEFAULT_TEMPLATES[type]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('templatePreferences');
      if (saved) {
        const prefs: TemplatePreferences = JSON.parse(saved);
        setTemplate(prefs[type] || DEFAULT_TEMPLATES[type]);
      }
    } catch (e) {
      console.warn('Erro ao carregar preferências de template:', e);
    }
  }, [type]);

  return template;
}

/**
 * Função para obter todas as preferências de templates
 */
export function getTemplatePreferences(): TemplatePreferences {
  try {
    const saved = localStorage.getItem('templatePreferences');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Erro ao carregar preferências:', e);
  }
  return DEFAULT_TEMPLATES;
}

/**
 * Função para obter template padrão de forma síncrona (fora de React)
 */
export function getDefaultTemplate(type: ContractType): string {
  const prefs = getTemplatePreferences();
  return prefs[type];
}

/**
 * Função para salvar/atualizar preferências de templates
 */
export function saveTemplatePreferences(prefs: TemplatePreferences): void {
  try {
    localStorage.setItem('templatePreferences', JSON.stringify(prefs));
  } catch (e) {
    console.warn('Erro ao salvar preferências:', e);
  }
}
