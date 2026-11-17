import { useMemo } from 'react';
import {
  BarChart3,
  Clock,
  Coins,
  Download,
  FileCheck2,
  FileText,
  Users,
} from 'lucide-react';
import type { TranslationDictionary } from '../i18n/translations';
import type {
  ContractRecord,
  CreditTransaction,
  Locale,
  TemplateCategory,
} from '../types';

interface ReportsScreenProps {
  t: TranslationDictionary;
  locale: Locale;
  contracts: ContractRecord[];
  transactions: CreditTransaction[];
}

export function ReportsScreen({
  t,
  locale,
  contracts,
  transactions,
}: ReportsScreenProps) {
  const signedContracts = useMemo(
    () => contracts.filter((c) => c.status === 'signed'),
    [contracts]
  );

  const creditsUsed = useMemo(
    () =>
      transactions
        .filter((tx) => tx.type === 'usage')
        .reduce((acc, tx) => acc + Math.abs(tx.amount), 0),
    [transactions]
  );

  // Average time from creation (or sentAt) to signedAt
  const avgSignDurationDisplay = useMemo(() => {
    const durationsHours: number[] = [];
    signedContracts.forEach((c) => {
      if (!c.signedAt) return;
      const startIso = c.signatureConfig?.sentAt || c.createdAt;
      const startMs = new Date(startIso).getTime();
      const endMs = new Date(c.signedAt).getTime();
      if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs >= startMs) {
        durationsHours.push((endMs - startMs) / 3600000);
      }
    });

    if (durationsHours.length === 0) return t.reports.noDataDash;
    const avgHours =
      durationsHours.reduce((a, b) => a + b, 0) / durationsHours.length;
    if (avgHours >= 48) {
      return `${(avgHours / 24).toFixed(1)} ${t.reports.daysSuffix}`;
    }
    return `${Math.max(0.5, avgHours).toFixed(1)} ${t.reports.hoursSuffix}`;
  }, [signedContracts, t.reports]);

  // Contracts by month (last 6 months)
  const monthlySeries = useMemo(() => {
    const months: Array<{ key: string; label: string; total: number; signed: number }> =
      [];
    const now = new Date();
    const loc = locale === 'es-PY' ? 'es-PY' : 'pt-BR';

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString(loc, { month: 'short' });
      months.push({ key, label, total: 0, signed: 0 });
    }

    const map = new Map(months.map((m) => [m.key, m]));
    contracts.forEach((c) => {
      const d = new Date(c.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const bucket = map.get(key);
      if (bucket) {
        bucket.total += 1;
        if (c.status === 'signed') bucket.signed += 1;
      }
    });

    return months;
  }, [contracts, locale]);

  const maxMonthlyCount = Math.max(1, ...monthlySeries.map((m) => m.total));

  // Performance by Broker / Responsible
  const byBroker = useMemo(() => {
    const map = new Map<
      string,
      { name: string; total: number; signed: number }
    >();
    contracts.forEach((c) => {
      const name = c.createdByName || 'Admin';
      const cur = map.get(name) || { name, total: 0, signed: 0 };
      cur.total += 1;
      if (c.status === 'signed') cur.signed += 1;
      map.set(name, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [contracts]);

  const categoryLabel = (cat: TemplateCategory) => {
    switch (cat) {
      case 'locacao':
        return t.templates.catLocacao;
      case 'compra_venda':
        return t.templates.catCompraVenda;
      case 'servicos':
        return t.templates.catServicos;
      case 'recibo':
        return t.templates.catRecibo;
      default:
        return t.templates.catOutros;
    }
  };

  const byCategory = useMemo(() => {
    const map = new Map<TemplateCategory, number>();
    contracts.forEach((c) => {
      const cat = c.category || 'outros';
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([cat, count]) => ({ cat, label: categoryLabel(cat), count }))
      .sort((a, b) => b.count - a.count);
  }, [contracts, t]);

  const handleExportCsv = () => {
    const headers = [
      'Codigo',
      'Cliente',
      'Documento',
      'Modelo',
      'Categoria',
      'Responsavel',
      'Status',
      'CriadoEm',
      'AssinadoEm',
    ];
    const rows = contracts.map((c) => [
      c.code,
      `"${(c.clientName || '').replace(/"/g, '""')}"`,
      `"${(c.clientDocument || '').replace(/"/g, '""')}"`,
      `"${(c.templateTitle || '').replace(/"/g, '""')}"`,
      c.category || 'outros',
      `"${(c.createdByName || '').replace(/"/g, '""')}"`,
      c.status,
      c.createdAt,
      c.signedAt || '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([`\uFEFF${csv}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contratoja-relatorio-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy-900 tracking-tight">
            {t.reports.title}
          </h1>
          <p className="text-sm text-slate-600 mt-1">{t.reports.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs sm:text-sm font-semibold text-navy-900 inline-flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Download className="h-4 w-4 text-emerald-700" />
          <span>{t.reports.exportCsvBtn}</span>
        </button>
      </div>

      {/* 4 KPI Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">
              {t.reports.kpiTotalContracts}
            </span>
            <FileText className="h-4 w-4 text-navy-900" />
          </div>
          <p className="text-3xl font-bold text-navy-900 tabular-nums">
            {contracts.length}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">
              {t.reports.kpiSignedContracts}
            </span>
            <FileCheck2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-emerald-700 tabular-nums">
            {signedContracts.length}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">
              {t.reports.kpiAvgSignTime}
            </span>
            <Clock className="h-4 w-4 text-navy-900" />
          </div>
          <p className="text-3xl font-bold text-navy-900 tabular-nums">
            {avgSignDurationDisplay}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">
              {t.reports.kpiCreditsUsed}
            </span>
            <Coins className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-navy-900 tabular-nums">
            {creditsUsed}
          </p>
        </div>
      </section>

      {/* Monthly Bar Chart + Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-navy-900 inline-flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-700" />
              <span>{t.reports.monthlyChartTitle}</span>
            </h2>
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-navy-900 inline-block" />
                {t.reports.totalCol}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500 inline-block" />
                {t.reports.signedCol}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-3 items-end h-48 pt-4">
            {monthlySeries.map((m) => {
              const totalPct = Math.round((m.total / maxMonthlyCount) * 100);
              const signedPct = Math.round((m.signed / maxMonthlyCount) * 100);
              return (
                <div
                  key={m.key}
                  className="flex flex-col items-center justify-end h-full gap-2"
                >
                  <span className="text-[11px] font-semibold text-navy-900 tabular-nums">
                    {m.total}
                  </span>
                  <div className="w-full max-w-[44px] flex-1 flex items-end justify-center gap-1">
                    <div
                      className="w-1/2 rounded-t-md bg-navy-900 transition-all"
                      style={{
                        height: `${m.total > 0 ? Math.max(10, totalPct) : 4}%`,
                        opacity: m.total > 0 ? 1 : 0.15,
                      }}
                    />
                    <div
                      className="w-1/2 rounded-t-md bg-emerald-500 transition-all"
                      style={{
                        height: `${m.signed > 0 ? Math.max(10, signedPct) : 4}%`,
                        opacity: m.signed > 0 ? 1 : 0.15,
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-500 capitalize">
                    {m.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
          <h2 className="text-base font-semibold text-navy-900">
            {t.reports.byCategoryTitle}
          </h2>

          {byCategory.length === 0 ? (
            <p className="text-sm text-slate-500">{t.reports.noDataDash}</p>
          ) : (
            <div className="space-y-3.5">
              {byCategory.map((item) => {
                const pct =
                  contracts.length > 0
                    ? Math.round((item.count / contracts.length) * 100)
                    : 0;
                return (
                  <div key={item.cat} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-navy-900">
                        {item.label}
                      </span>
                      <span className="font-mono text-slate-600 tabular-nums">
                        {item.count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-600"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* By Broker Table */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
          <Users className="h-4 w-4 text-navy-900" />
          <h2 className="text-base font-semibold text-navy-900">
            {t.reports.byBrokerTitle}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                <th className="py-3 px-5 font-medium">{t.reports.brokerCol}</th>
                <th className="py-3 px-4 font-medium">{t.reports.totalCol}</th>
                <th className="py-3 px-4 font-medium">{t.reports.signedCol}</th>
                <th className="py-3 px-5 font-medium text-right">
                  {t.reports.conversionCol}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {byBroker.map((row) => {
                const rate =
                  row.total > 0 ? Math.round((row.signed / row.total) * 100) : 0;
                return (
                  <tr key={row.name}>
                    <td className="py-3.5 px-5 font-semibold text-navy-900">
                      {row.name}
                    </td>
                    <td className="py-3.5 px-4 tabular-nums text-slate-700">
                      {row.total}
                    </td>
                    <td className="py-3.5 px-4 tabular-nums text-emerald-700 font-semibold">
                      {row.signed}
                    </td>
                    <td className="py-3.5 px-5 text-right tabular-nums font-mono text-xs text-navy-900">
                      {rate}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
