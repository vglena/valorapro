
import React from 'react';
import { ValuationReport, UserType } from './types';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  ArrowRight,
  BookOpen,
  Info,
  Calculator,
  Landmark,
  Tag,
  Home
} from 'lucide-react';

interface ValuationResultProps {
  report: ValuationReport;
  userType: UserType;
}

const formatCurrency = (amount: number) => {
  if (isNaN(amount) || amount === 0) return 'Pendiente';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
};

const formatNumber = (num: number | undefined | null) => {
  if (num === undefined || num === null || isNaN(num)) return '-';
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(num);
};

// Custom styles for markdown components to fix formatting issues
const markdownComponents: Components = {
  h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-slate-900 mt-8 mb-4 pb-2 border-b-2 border-brand-500" {...props} />,
  h2: ({node, ...props}) => <h2 className="text-xl font-bold text-slate-800 mt-6 mb-3 pb-2 border-b border-slate-200" {...props} />,
  h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-slate-800 mt-5 mb-2" {...props} />,
  h4: ({node, ...props}) => <h4 className="text-base font-semibold text-slate-700 mt-4 mb-2" {...props} />,
  p: ({node, ...props}) => <p className="text-base text-slate-700 leading-7 mb-4" {...props} />,
  ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-1" {...props} />,
  ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 text-slate-700 space-y-1" {...props} />,
  li: ({node, ...props}) => <li className="pl-1 leading-relaxed" {...props} />,
  strong: ({node, ...props}) => <strong className="font-bold text-slate-900" {...props} />,
  em: ({node, ...props}) => <em className="italic text-slate-600" {...props} />,
  blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-brand-500 pl-4 py-2 my-4 bg-slate-50 rounded-r-lg italic text-slate-600" {...props} />,
  hr: ({node, ...props}) => <hr className="my-6 border-slate-200" {...props} />,
  table: ({node, ...props}) => (
    <div className="overflow-x-auto my-6 rounded-lg border border-slate-200 shadow-sm">
      <table className="w-full text-sm border-collapse" {...props} />
    </div>
  ),
  thead: ({node, ...props}) => <thead className="bg-slate-100 border-b border-slate-200" {...props} />,
  tbody: ({node, ...props}) => <tbody className="divide-y divide-slate-100" {...props} />,
  tr: ({node, ...props}) => <tr className="hover:bg-slate-50 transition-colors" {...props} />,
  th: ({node, ...props}) => <th className="px-4 py-3 text-left font-bold text-slate-700 text-xs uppercase tracking-wider" {...props} />,
  td: ({node, ...props}) => <td className="px-4 py-3 text-slate-600 whitespace-nowrap" {...props} />,
};

export const ValuationResult: React.FC<ValuationResultProps> = ({ report, userType }) => {
  

    // --- ROBUST CALCULATION LOGIC ---
    // REGLA: Usar siempre valores del TRAMO ALTO del mercado

    // 1. Valor de Mercado - usar el valor MAX (tramo alto)
    const valMin = report.valuationRange?.min;
    const valMax = report.valuationRange?.max;

    let marketValue = 0;
    if (typeof valMax === 'number') {
      marketValue = valMax; // Usar el valor ALTO
    } else if (typeof valMin === 'number') {
      marketValue = valMin;
    }

    // 2. Valor Hipotecario (85% del valor de mercado según ECO/805)
    const bankMin = report.bankEstimateRange?.min;
    const bankMax = report.bankEstimateRange?.max;

    let mortgageValue = 0;
    if (typeof bankMax === 'number') {
      mortgageValue = bankMax;
    } else if (typeof bankMin === 'number') {
      mortgageValue = bankMin;
    } else {
      // Fallback: 85% del Valor de Mercado (ECO/805)
      mortgageValue = marketValue > 0 ? marketValue * 0.85 : 0;
    }

    // 3. Valor de Venta Recomendado (105% del valor de mercado)
    let salesValue = 0;
    if (typeof report.listingPriceRecommendation === 'number') {
      salesValue = report.listingPriceRecommendation;
    } else {
      // Fallback: 105% del Valor de Mercado
      salesValue = marketValue > 0 ? marketValue * 1.05 : 0;
    }

    // --- REEMPLAZO DE VALORES A EMITIR EN EL MARKDOWN DEL INFORME ---
    function replaceValoresEmitidos(markdown: string) {
    // Regex para capturar la sección VALORES EMITIDOS
    const patronValoresEmitidos = /\*?\*?VALORES\s+A\s+EMITIR\*?\*?:?[\s\S]*?(?=\n\nADVERTENCIAS|\n\n\*\*ADVERTENCIAS|ADVERTENCIAS:|$)/i;
    const nuevosValores = `**VALORES A EMITIR:**\n\n1. VALOR DE MERCADO (ECO/ECM): ${formatCurrency(marketValue)}\n2. VALOR DE GARANTÍA HIPOTECARIA: ${formatCurrency(mortgageValue)}\n3. VALOR DE MERCADO LIBRE (no OM): ${formatCurrency(Math.round(marketValue * 1.05))}\n4. VALOR DE VENTA RECOMENDADO: ${formatCurrency(salesValue)}\n`;
    return markdown.replace(patronValoresEmitidos, nuevosValores);
    }

    // Split the detailed analysis markdown by the placeholder to insert the table react component
    const detailedParts = report.detailedAnalysis 
    ? report.detailedAnalysis.split('[[TABLE_PLACEHOLDER]]') 
    : [];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 pb-10">
      
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Resultado del Análisis</h2>
           <p className="text-sm text-slate-500">Generado por ValoraPro</p>
        </div>
        <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-1.5 rounded-full text-xs font-semibold border border-green-200">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Análisis Completado
        </div>
      </div>

      {/* 1. CÁLCULO DEL VALOR */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-slate-800 text-lg">Cálculo del valor</h3>
        </div>
        
        <div className="divide-y divide-slate-100">
            {/* Row 1: Market Value */}
            <div className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shrink-0">
                        <Home className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-800">Valor de Mercado (ECO/ECM)</p>
                        <p className="text-sm text-slate-500">Método de comparación - Tramo alto del mercado</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-2xl font-bold text-slate-900 block">{formatCurrency(marketValue)}</span>
                </div>
            </div>

            {/* Row 2: Mortgage Value */}
            <div className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-slate-100 text-slate-600 rounded-lg shrink-0">
                        <Landmark className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-800">Valor de Garantía Hipotecaria</p>
                        <p className="text-sm text-slate-500">Conforme ECO/805/2003</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-xl font-semibold text-slate-700 block">{formatCurrency(mortgageValue)}</span>
                </div>
            </div>

            {/* Row 3: Sales Value */}
            <div className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg shrink-0">
                        <Tag className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-800">Valor de venta recomendado</p>
                        <p className="text-sm text-slate-500">Utilidad comercial (Listing Price)</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-xl font-semibold text-emerald-700 block">{formatCurrency(salesValue)}</span>
                </div>
            </div>
        </div>
      </section>

      {/* 2. INFORME COMPLETO DEL ASSISTANT */}
      {report.reportContent && (
        <section className="mt-6">
           <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-6 h-6 text-brand-700" />
              <h3 className="text-xl font-bold text-slate-900">Informe Técnico de Valoración</h3>
           </div>
           
           <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm prose prose-slate max-w-none">
               <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                 {replaceValoresEmitidos(report.reportContent.replace(/##\s*10\.\s*SIGUIENTES PASOS RECOMENDADOS[\s\S]*?(?=##\s*11\.|$)/gi, ''))}
               </ReactMarkdown>
           </div>
        </section>
      )}

      {/* 3. SUMMARY & FACTORS (si están disponibles) */}
      {(report.positiveFactors?.length || report.negativeFactors?.length || report.executiveSummaryBullets?.length) && (
      <section>
        <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <FileText className="w-5 h-5 text-brand-500" />
          Claves del Inmueble
        </h3>
        
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          {report.executiveSummaryBullets ? (
             <ul className="space-y-2">
                {report.executiveSummaryBullets.map((bullet, idx) => (
                   <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                      <ArrowRight className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
                      <span>{bullet}</span>
                   </li>
                ))}
             </ul>
          ) : (
            <p className="text-slate-600 text-sm leading-relaxed">
              {report.explanation}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 mt-4">
             <div>
                <span className="text-xs font-bold text-green-700 uppercase mb-2 block">Puntos Fuertes</span>
                <ul className="space-y-1">
                   {(report.positiveFactors || []).map((factor, i) => (
                     <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span> {factor}
                     </li>
                   ))}
                </ul>
             </div>
             <div>
                <span className="text-xs font-bold text-red-700 uppercase mb-2 block">A Considerar</span>
                <ul className="space-y-1">
                   {(report.negativeFactors || []).map((factor, i) => (
                     <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-red-400 mt-0.5">•</span> {factor}
                     </li>
                   ))}
                </ul>
             </div>
          </div>
        </div>
      </section>
      )}

      {/* 4. DETAILED REPORT (legacy - si existe detailedAnalysis separado) */}
      {report.detailedAnalysis && !report.reportContent && (
        <section className="mt-8 border-t-2 border-slate-100 pt-8 animate-in fade-in slide-in-from-bottom-6">
           <div className="flex items-center gap-2 mb-6">
              <BookOpen className="w-6 h-6 text-brand-700" />
              <h3 className="text-xl font-bold text-slate-900">Informe Técnico Detallado</h3>
           </div>
           
           <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm">
               {/* FIRST PART OF MARKDOWN */}
               <div className="mb-6">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{detailedParts[0]}</ReactMarkdown>
               </div>

               {/* INJECTED TABLE */}
               {detailedParts.length > 1 && report.marketComparables && report.marketComparables.length > 0 && (
                   <div className="my-8 animate-in fade-in zoom-in-95">
                        <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th scope="col" className="px-4 py-3 font-bold w-16">ID</th>
                                    <th scope="col" className="px-4 py-3 font-bold">Ubicación</th>
                                    <th scope="col" className="px-4 py-3 font-bold">C.P.</th>
                                    <th scope="col" className="px-4 py-3 font-bold text-right">Sup.</th>
                                    <th scope="col" className="px-4 py-3 font-bold text-right">Precio</th>
                                    <th scope="col" className="px-4 py-3 font-bold text-right">€/m²</th>
                                    <th scope="col" className="px-4 py-3 font-bold text-right">Ajuste</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.marketComparables.map((comp) => {
                                const isNegative = comp.adjustment.includes('-');
                                const badgeClass = isNegative 
                                    ? "text-red-700 bg-red-50 border-red-100" 
                                    : "text-green-700 bg-green-50 border-green-100";

                                return (
                                    <tr key={comp.id} className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-900">{comp.id}</td>
                                        <td className="px-4 py-3">{comp.location}</td>
                                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">{comp.postalCode}</td>
                                        <td className="px-4 py-3 text-right">{comp.surface} m²</td>
                                        <td className="px-4 py-3 text-right font-medium">{formatNumber(comp.price)} €</td>
                                        <td className="px-4 py-3 text-right">{formatNumber(comp.unitPrice)} €/m²</td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`text-xs px-2 py-0.5 rounded border ${badgeClass}`}>
                                            {comp.adjustment}
                                            </span>
                                        </td>
                                    </tr>
                                );
                                })}
                            </tbody>
                        </table>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 italic text-right">
                           Datos extraídos de oferta actual en portales inmobiliarios.
                        </p>
                   </div>
               )}

               {/* REST OF MARKDOWN */}
               {detailedParts.length > 1 && (
                   <div className="mt-6">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{detailedParts[1]}</ReactMarkdown>
                   </div>
               )}
           </div>
        </section>
      )}

      {/* 4. NEXT STEPS */}
      <section>
        <h3 className="text-lg font-semibold text-slate-800 mb-3">Siguientes Pasos Recomendados</h3>
        <div className="grid grid-cols-1 gap-3">
           {(report.nextSteps || []).map((step, i) => (
              <div key={i} className="flex items-start gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                 <div className="bg-brand-100 text-brand-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    {i + 1}
                 </div>
                 <p className="text-sm text-slate-700">{step}</p>
              </div>
           ))}
        </div>
      </section>

      {/* 5. LEGAL FOOTER */}
      <div className="border-t border-slate-200 pt-6 mt-8">
         <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
             <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
             <div className="text-xs text-blue-900 space-y-1">
               <p className="font-semibold">Aviso Legal Importante</p>
               <p>
                 Este análisis no es una tasación oficial bancaria bajo la norma ECO/805/2003. 
                 Los valores mostrados son estimaciones basadas en datos de mercado y metodología estadística.
               </p>
             </div>
         </div>
      </div>

    </div>
  );
};

