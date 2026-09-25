'use client';

import { Building2, ChevronDown } from 'lucide-react';
import type { OrganizationType } from '@/lib/api';
import { orgTypeName } from '@/lib/orgTypes';
import { usePreferences } from '@/contexts/PreferencesContext';

export interface OrgValue {
  organization_type_id: number | null;
  organization_type_other: string;
}

export const EMPTY_ORG: OrgValue = { organization_type_id: null, organization_type_other: '' };

/** Separates "Other" chosen (text may still be empty) from nothing chosen */
export type OrgChoice = number | 'other' | null;

export const orgChoiceOf = (v: { organization_type_id?: number | null; organization_type_other?: string | null }, otherPicked = false): OrgChoice =>
  v.organization_type_id != null ? v.organization_type_id : otherPicked || (v.organization_type_other ?? '').trim() ? 'other' : null;

/**
 * Organization type input — a dropdown plus a text box when "อื่นๆ / Other" is chosen.
 *  - variant "form": the public registration form (same look as its other fields, active types only)
 *  - variant "select": compact version for staff forms (also lists hidden types)
 * Required-ness is checked by the page (localized message), so the controls only carry aria-required.
 */
export default function OrganizationTypeField({
  types, choice, other, onChange, variant = 'select', required = false, error, idPrefix = 'org',
}: {
  types: OrganizationType[];
  choice: OrgChoice;
  other: string;
  onChange: (choice: OrgChoice, other: string) => void;
  variant?: 'form' | 'select';
  required?: boolean;
  error?: string;
  idPrefix?: string;
}) {
  const { t, lang } = usePreferences();
  const tt = t.orgTypes;
  const form = variant === 'form';
  const selectId = `${idPrefix}-select`;
  const errorId = `${idPrefix}-error`;

  const handleSelect = (v: string) =>
    onChange(v === '' ? null : v === 'other' ? 'other' : Number(v), v === 'other' ? other : '');

  const otherBox = choice === 'other' && (
    <input
      id={`${idPrefix}-other`}
      type="text"
      value={other}
      maxLength={150}
      autoFocus
      aria-required={required}
      aria-label={tt.otherPlaceholder}
      onChange={(e) => onChange('other', e.target.value)}
      placeholder={tt.otherPlaceholder}
      className={form
        ? 'mt-2 w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-slate-500 text-sm transition-all'
        : 'mt-2 w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none'}
    />
  );

  const errorLine = error && <p id={errorId} className="mt-1.5 text-xs text-rose-400">{error}</p>;

  if (!form) {
    return (
      <div>
        <label htmlFor={selectId} className="block font-semibold text-slate-300 mb-1">
          {tt.fieldLabel}{required && ' *'}
        </label>
        <select
          id={selectId}
          value={choice === null ? '' : String(choice)}
          aria-required={required}
          onChange={(e) => handleSelect(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="" className="bg-slate-900">{required ? tt.selectPlaceholder : tt.none}</option>
          {types.map((type) => (
            <option key={type.id} value={type.id} className="bg-slate-900">
              {orgTypeName(type, lang)}{type.is_active ? '' : ` (${tt.hiddenBadge})`}
            </option>
          ))}
          <option value="other" className="bg-slate-900">{tt.otherOption}</option>
        </select>
        {otherBox}
        {errorLine}
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={selectId} className="block text-sm font-semibold text-slate-300 mb-1.5">
        {tt.fieldLabel} {required && <span className="text-rose-400">*</span>}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Building2 className="w-4 h-4" />
        </div>
        <select
          id={selectId}
          value={choice === null ? '' : String(choice)}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => handleSelect(e.target.value)}
          className={`w-full appearance-none cursor-pointer pl-10 pr-10 py-3 bg-white/[0.03] border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all ${
            error ? 'border-rose-400/60' : 'border-white/10'
          } ${choice === null ? 'text-slate-500' : 'text-white'}`}
        >
          {/* placeholder: shown until something is picked, cannot be picked again */}
          <option value="" disabled className="bg-slate-900 text-slate-400">{tt.selectPlaceholder}</option>
          {types.filter((type) => type.is_active).map((type) => (
            <option key={type.id} value={type.id} className="bg-slate-900 text-slate-100">{orgTypeName(type, lang)}</option>
          ))}
          <option value="other" className="bg-slate-900 text-slate-100">{tt.otherOption}</option>
        </select>
        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
      {otherBox}
      {errorLine}
    </div>
  );
}
