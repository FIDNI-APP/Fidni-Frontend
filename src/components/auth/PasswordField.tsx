import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { t } from '@/i18n';

/** Partage le conteneur positionné du champ avec son icône de début. */
export function PasswordField({ className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [shown, setShown] = useState(false);
  const label = shown ? t('Masquer le mot de passe') : t('Afficher le mot de passe');
  return (
    <>
      <input {...props} type={shown ? 'text' : 'password'} className={`${className ?? ''} !pe-12`} />
      <button type="button" aria-label={label} aria-controls={props.id} title={label} onClick={() => setShown(!shown)}
        className="absolute end-0 top-1/2 inline-flex h-10 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-ink-soft hover:text-ink focus-visible:outline-brand">
        {shown ? <EyeOff size={17} aria-hidden /> : <Eye size={17} aria-hidden />}
      </button>
    </>
  );
}
