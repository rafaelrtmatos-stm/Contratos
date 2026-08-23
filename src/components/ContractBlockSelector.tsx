import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import {
  ContractBlocksConfig,
  ContractBlockKey,
  CONTRACT_BLOCKS_CATALOG,
  BLOCK_CATEGORIES,
  DEFAULT_EXCLUSIVIDADE_BLOCKS,
} from '../types/contractBlocks';

interface ContractBlockSelectorProps {
  selectedBlocks: ContractBlocksConfig;
  onBlocksChange: (blocks: ContractBlocksConfig) => void;
  titulo?: string;
  descricao?: string;
}

type CategoryType = keyof typeof BLOCK_CATEGORIES;

export const ContractBlockSelector: React.FC<ContractBlockSelectorProps> = ({
  selectedBlocks,
  onBlocksChange,
  titulo = '1. Seleção dos Blocos do Contrato',
  descricao = 'Marque as caixas para incluir os blocos. Blocos desmarcados não aparecem no contrato nem exigem campos.',
}) => {
  const [expandedCategory, setExpandedCategory] = useState<CategoryType | null>('partes');

  const categories = Object.entries(BLOCK_CATEGORIES).reduce(
    (acc, [key, label]) => {
      acc[key as CategoryType] = label;
      return acc;
    },
    {} as Record<CategoryType, string>
  );

  const getBlocksByCategory = (category: CategoryType) => {
    return Object.entries(CONTRACT_BLOCKS_CATALOG)
      .filter(([_, block]) => block.categoria === category)
      .map(([key]) => key as ContractBlockKey);
  };

  const handleBlockToggle = (blockId: ContractBlockKey) => {
    const block = CONTRACT_BLOCKS_CATALOG[blockId];
    if (block.obrigatorio) return; // Não permite desmarcar blocos obrigatórios

    onBlocksChange({
      ...selectedBlocks,
      [blockId]: !selectedBlocks[blockId],
    });
  };

  const handleMarkAll = () => {
    const allBlocks = { ...selectedBlocks };
    Object.keys(CONTRACT_BLOCKS_CATALOG).forEach((key) => {
      allBlocks[key as ContractBlockKey] = true;
    });
    onBlocksChange(allBlocks);
  };

  const handleUnmarkAll = () => {
    const allBlocks = { ...selectedBlocks };
    Object.keys(CONTRACT_BLOCKS_CATALOG).forEach((key) => {
      const block = CONTRACT_BLOCKS_CATALOG[key as ContractBlockKey];
      if (!block.obrigatorio) {
        allBlocks[key as ContractBlockKey] = false;
      }
    });
    onBlocksChange(allBlocks);
  };

  const handleReset = () => {
    onBlocksChange(DEFAULT_EXCLUSIVIDADE_BLOCKS);
  };

  const totalSelected = Object.values(selectedBlocks).filter(Boolean).length;
  const totalBlocks = Object.keys(CONTRACT_BLOCKS_CATALOG).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-tight">{titulo}</h3>
            <p className="text-xs text-slate-600 mt-1">{descricao}</p>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-green-600">
              {totalSelected} de {totalBlocks}
            </div>
            <div className="text-xs text-slate-500">blocos selecionados</div>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleMarkAll}
            className="px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg transition-colors cursor-pointer"
          >
            Marcar Todos
          </button>
          <button
            type="button"
            onClick={handleUnmarkAll}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Desmarcar Todos
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
          >
            Padrão
          </button>
        </div>
      </div>

      {/* Blocos por Categoria */}
      <div className="space-y-3">
        {Object.entries(categories).map(([categoryKey, categoryLabel]) => {
          const category = categoryKey as CategoryType;
          const blocks = getBlocksByCategory(category);
          const isExpanded = expandedCategory === category;
          const categoryCount = blocks.filter((b) => selectedBlocks[b]).length;

          return (
            <div key={category} className="border border-slate-200 rounded-lg overflow-hidden">
              {/* Header da Categoria */}
              <button
                type="button"
                onClick={() => setExpandedCategory(isExpanded ? null : category)}
                className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 text-left">
                  <span className="text-sm font-bold text-slate-900">{categoryLabel}</span>
                  <span className="text-xs text-slate-600 bg-white px-2 py-0.5 rounded">
                    {categoryCount}/{blocks.length}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-600" />
                )}
              </button>

              {/* Blocos */}
              {isExpanded && (
                <div className="p-3 space-y-2 bg-white border-t border-slate-200">
                  {blocks.map((blockId) => {
                    const block = CONTRACT_BLOCKS_CATALOG[blockId];
                    const isChecked = selectedBlocks[blockId];
                    const isDisabled = block.obrigatorio;

                    return (
                      <label
                        key={blockId}
                        className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-green-50 border-green-300'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        } ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-slate-300'}`}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleBlockToggle(blockId)}
                            disabled={isDisabled}
                            className="w-5 h-5 accent-green-500 rounded cursor-pointer disabled:cursor-not-allowed"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">
                              {block.titulo}
                            </span>
                            {isDisabled && (
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-100 text-orange-700 rounded uppercase">
                                Obrigatório
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">{block.descricao}</p>
                        </div>

                        {isChecked && (
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Resumo */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>💡 Dica:</strong> Blocos desmarcados não aparecerão no contrato e seus campos não 
          serão obrigatórios. Blocos marcados em <strong>Obrigatório</strong> não podem ser desmarcados 
          pois são essenciais para a validade do contrato.
        </p>
      </div>
    </div>
  );
};
