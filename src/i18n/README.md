# Interface en arabe

Depuis le 15/10/2026, l'interface existe en français (langue d'origine) et en arabe. Le bouton « ع / FR » de la barre du haut
change de langue. **Seule l'interface est traduite** : menus, boutons, titres, messages. Les exercices, cours et devoirs
restent en français (programme BIOF), comme toutes les données qui viennent du serveur : titres des contenus, niveaux,
chapitres, théorèmes, noms des établissements.

## Dans le code

```tsx
import { t, dateLocale } from '@/i18n';

<button>{t('Voir la solution')}</button>
<input placeholder={t('Rechercher un exercice, une leçon…')} />
toast.success(t('Cahier créé'));
t('{n} questions', { n })            // variables entre accolades, jamais de concaténation
d.toLocaleDateString(dateLocale())   // au lieu de 'fr-FR'
```

- La clé est **le texte français exact** tel qu'il s'affiche : apostrophe typographique ’ ou droite ', « », espaces
  insécables, points de suspension … compris. Sans traduction, le français s'affiche.
- `t()` s'appelle **au rendu**, jamais au niveau du module (une constante ne changerait pas de langue) : les listes
  de libellés (menus, onglets, options) gardent leur texte français et on écrit `t(item.label)` à l'affichage.
- Une phrase reste entière : `t('Tu as réussi {n} questions sur {total}.', { n, total })`, pas trois morceaux. Un
  lien ou un `<strong>` au milieu : couper en morceaux qui ont chacun un sens, ou reformuler.
- Un même mot français à deux sens : `t('Passer', { _sens: 'quiz' })` cherche d'abord la clé « Passer#quiz ».
- Pluriels : garder la logique existante, chaque forme a sa clé (`n > 1 ? t('{n} questions', { n }) : t('{n} question', { n })`).
- Ne pas passer par `t()` : valeurs comparées dans le code, clés d'API ou de statistiques, routes, classes CSS,
  noms propres, « Fidni », formules.
- Mise en page : classes logiques (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`, `border-s`,
  `rounded-s`…), jamais `ml-`/`pl-`/`left-`/`text-left` : elles basculent seules en arabe (de droite à gauche).
  Un bloc qui doit rester de gauche à droite (contenu français, formule) : classe `fd-ltr`. Voir `index.css`.

## Traductions

`src/i18n/ar/<zone>.json` : `{ "texte français": "النص العربي" }`, un fichier par zone du site (layout, contenu,
profil…), tous fusionnés. Vérifier : `node scripts/verifier-traductions.mjs [fichiers…]` (textes sans traduction,
variables `{x}` qui diffèrent, JSON invalide).

Style : arabe standard, tel qu'on l'emploie dans les lycées marocains ; phrases courtes et simples ; tutoiement
(masculin générique, tournures neutres quand c'est naturel : « عرض الحل » plutôt que « اعرض الحل ») ; chiffres 0-9 ;
ponctuation arabe (، ؟ ؛) ; guillemets « ». Les noms de chapitres, de théorèmes et les termes de maths qui viennent du
contenu restent en français.

### Glossaire

| Français | Arabe |
|---|---|
| Accueil | الرئيسية |
| Exercices / exercice | التمارين / تمرين |
| Leçons / leçon | الدروس / درس |
| Devoirs (DS) / devoir surveillé | الفروض / فرض محروس |
| Devoir maison | واجب منزلي |
| Bac national / examen national | الامتحان الوطني |
| Examen | امتحان |
| Quiz / quiz par chapitre | اختبار / اختبارات حسب الفصل |
| Chapitre | فصل |
| Théorème | مبرهنة |
| Niveau | المستوى |
| Difficulté : facile, moyen, difficile | الصعوبة : سهل، متوسط، صعب |
| Question | سؤال |
| Énoncé | نص التمرين |
| Solution / voir la solution | الحل / عرض الحل |
| Indication | تلميح |
| Réussi / À revoir / En partie / Tout réussi | نجحت / للمراجعة / جزئيا / نجحت في الكل |
| Ta copie | ورقتك |
| Note estimée | النقطة التقديرية |
| point(s) (barème) | نقطة / نقط |
| Parcours | المسارات |
| Classe(s) | القسم / الأقسام |
| Concours | المباريات |
| Profil | الملف الشخصي |
| Paramètres | الإعدادات |
| Mes enregistrements | محفوظاتي |
| Mes documents | وثائقي |
| Réviser / révision | المراجعة |
| Ma progression | تقدّمي |
| Statistiques | الإحصائيات |
| Recherche / rechercher | البحث / ابحث |
| Connexion / se connecter | تسجيل الدخول |
| Inscription / créer un compte | إنشاء حساب |
| Déconnexion | تسجيل الخروج |
| Élève | التلميذ |
| Professeur / M. X | الأستاذ / الأستاذ X |
| Établissement / lycée | المؤسسة / الثانوية |
| Commencer / continuer | ابدأ / تابع |
| Enregistrer / annuler / supprimer / modifier | حفظ / إلغاء / حذف / تعديل |
| Partager / imprimer / signaler | مشاركة / طباعة / إبلاغ |
| Filtres / tout effacer | التصفية / مسح الكل |
| Mode sombre / mode clair | الوضع الداكن / الوضع الفاتح |
| Notifications | الإشعارات |
| Visite guidée | جولة إرشادية |
| Cahier | دفتر |
| Pilotage (administration) | لوحة التحكم |
