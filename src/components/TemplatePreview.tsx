import React, { useEffect, useState } from 'react';
import { ContractData } from '../types/contract';
import { resolveTemplate } from '../utils/templateResolver';
import { downloadTemplateWithCache } from '../utils/supabaseTemplateStorage';
import { generateContractTags } from '../utils/dataTagsProcessor';
import { Loader, AlertCircle } from 'lucide-react';
import * as mammoth from 'mammoth';

interface TemplatePreviewProps {
  contract: ContractData;
  modalidade: 'digital' | 'manual';
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({ contract, modalidade }) => {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAndRenderTemplate = async () => {
      try {
        setLoading(true);
        setError(null);

        const estadoAssinatura = {
          usuarioAssinou: contract.assinaturas?.some(a => a.role === 'vendedor') || false,
          usuarioModalidade: modalidade as 'digital' | 'manual',
          compradorAssinou: contract.assinaturas?.some(a => a.role === 'comprador') || false,
          compradorModalidade: modalidade as 'digital' | 'manual',
          testemunhaprecisa: modalidade === 'manual',
        };

        const templateResolved = resolveTemplate(
          contract.tipo,
          'visualizar_preview',
          estadoAssinatura,
          contract.tipo === 'exclusividade' ? (contract.varianteExclusividade || 'normal') : undefined
        );

        const { sucesso, blob, erro } = await downloadTemplateWithCache(templateResolved.arquivo);
        if (!sucesso || !blob) {
          throw new Error(erro || 'Falha ao carregar template');
        }

        const arrayBuffer = await blob.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        let htmlContent = result.value;

        const tags = generateContractTags(contract);
        Object.entries(tags).forEach(([key, value]) => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          htmlContent = htmlContent.replace(regex, value || '');
        });

        const styledHtml = `
          <style>
            body { font-family: 'Times New Roman', Times, serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; color: #1e293b; }
            p { margin: 0.5rem 0; text-align: justify; }
            h1, h2, h3 { margin: 1rem 0 0.5rem 0; }
            strong { font-weight: bold; }
          </style>
          ${htmlContent}
        `;

        setHtmlContent(styledHtml);
      } catch (err: any) {
        console.error('Erro ao carregar template:', err);
        setError(err.message || 'Erro ao carregar o template');
      } finally {
        setLoading(false);
      }
    };

    loadAndRenderTemplate();
  }, [contract, modalidade]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 space-x-2">
        <Loader className="w-5 h-5 animate-spin text-green-600" />
        <span className="text-sm text-slate-600">Carregando template...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-bold text-red-900">Erro ao carregar template</p>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-3 border-b border-slate-200">
        <p className="text-xs font-bold text-green-900 uppercase tracking-wider">✅ Prévia do Template Real</p>
        <p className="text-xs text-green-700 mt-1">Este é o contrato EXATO com sua formatação original.</p>
      </div>
      <div className="p-8 prose prose-sm max-w-none">
        <div dangerouslySetInnerHTML={{ __html: htmlContent || '' }} className="text-slate-800 text-sm" />
      </div>
    </div>
  );
};
