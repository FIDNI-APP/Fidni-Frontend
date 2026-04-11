/**
 * Callout types for educational content
 * Standardized boxes for theorems, properties, definitions, etc.
 */

export type CalloutType =
  | 'theorem'      // Théorème
  | 'property'     // Propriété
  | 'definition'   // Définition
  | 'lemma'        // Lemme
  | 'corollary'    // Corollaire
  | 'example'      // Exemple
  | 'remark'       // Remarque
  | 'proof'        // Preuve
  | 'method'       // Méthode
  | 'warning';     // Attention

export interface CalloutConfig {
  type: CalloutType;
  label: string;
  icon: string;
  borderColor: string;
  bgColor: string;
  iconColor: string;
  textColor: string;
}

export const CALLOUT_CONFIGS: Record<CalloutType, CalloutConfig> = {
  theorem: {
    type: 'theorem',
    label: 'Théorème',
    icon: '📐',
    borderColor: 'border-blue-500',
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
    textColor: 'text-blue-900',
  },
  property: {
    type: 'property',
    label: 'Propriété',
    icon: '✓',
    borderColor: 'border-indigo-500',
    bgColor: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    textColor: 'text-indigo-900',
  },
  definition: {
    type: 'definition',
    label: 'Définition',
    icon: '📖',
    borderColor: 'border-violet-500',
    bgColor: 'bg-violet-50',
    iconColor: 'text-violet-600',
    textColor: 'text-violet-900',
  },
  lemma: {
    type: 'lemma',
    label: 'Lemme',
    icon: '🔹',
    borderColor: 'border-cyan-500',
    bgColor: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
    textColor: 'text-cyan-900',
  },
  corollary: {
    type: 'corollary',
    label: 'Corollaire',
    icon: '➜',
    borderColor: 'border-teal-500',
    bgColor: 'bg-teal-50',
    iconColor: 'text-teal-600',
    textColor: 'text-teal-900',
  },
  example: {
    type: 'example',
    label: 'Exemple',
    icon: '💡',
    borderColor: 'border-amber-500',
    bgColor: 'bg-amber-50',
    iconColor: 'text-amber-600',
    textColor: 'text-amber-900',
  },
  remark: {
    type: 'remark',
    label: 'Remarque',
    icon: 'ℹ️',
    borderColor: 'border-slate-400',
    bgColor: 'bg-slate-50',
    iconColor: 'text-slate-600',
    textColor: 'text-slate-900',
  },
  proof: {
    type: 'proof',
    label: 'Preuve',
    icon: '✎',
    borderColor: 'border-emerald-500',
    bgColor: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    textColor: 'text-emerald-900',
  },
  method: {
    type: 'method',
    label: 'Méthode',
    icon: '⚙️',
    borderColor: 'border-purple-500',
    bgColor: 'bg-purple-50',
    iconColor: 'text-purple-600',
    textColor: 'text-purple-900',
  },
  warning: {
    type: 'warning',
    label: 'Attention',
    icon: '⚠️',
    borderColor: 'border-red-500',
    bgColor: 'bg-red-50',
    iconColor: 'text-red-600',
    textColor: 'text-red-900',
  },
};

// Expose globally for TipTap extension
if (typeof window !== 'undefined') {
  (window as any).__CALLOUT_CONFIGS = CALLOUT_CONFIGS;
}
