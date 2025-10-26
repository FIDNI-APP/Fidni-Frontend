import { Helmet } from 'react-helmet';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  author?: string;
  ogType?: string;
  ogImage?: string;
  canonicalUrl?: string;
  noindex?: boolean;
  structuredData?: object;
}

const defaultKeywords = [
  'mathématiques',
  'exercices de maths',
  'cours de maths',
  'problèmes mathématiques',
  'apprentissage des maths',
  'exercices en ligne',
  'soutien scolaire',
  'révision mathématiques',
  'collège',
  'lycée',
  'bac',
  'brevet',
];

export function SEO({
  title = 'Fidni - Plateforme d\'apprentissage des mathématiques',
  description = 'Progressez en mathématiques avec des exercices adaptés à votre niveau. Plus de 1000 exercices, solutions détaillées et suivi personnalisé pour collégiens et lycéens.',
  keywords = defaultKeywords,
  author = 'Fidni',
  ogType = 'website',
  ogImage = '/og-image.jpg',
  canonicalUrl,
  noindex = false,
  structuredData,
}: SEOProps) {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://fidni.com';
  const fullTitle = title.includes('Fidni') ? title : `${title} | Fidni`;
  const currentUrl = canonicalUrl || `${siteUrl}${window.location.pathname}`;

  // Default structured data for the organization
  const defaultStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'Fidni',
    description: description,
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    sameAs: [
      // Add your social media URLs here when available
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      availableLanguage: ['French'],
    },
  };

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(', ')} />
      <meta name="author" content={author} />
      <link rel="canonical" href={currentUrl} />

      {/* Robots */}
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={`${siteUrl}${ogImage}`} />
      <meta property="og:site_name" content="Fidni" />
      <meta property="og:locale" content="fr_FR" />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={currentUrl} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={`${siteUrl}${ogImage}`} />

      {/* Additional Meta Tags */}
      <meta name="theme-color" content="#4f46e5" />
      <meta httpEquiv="Content-Language" content="fr" />
      <meta name="language" content="French" />
      <meta name="revisit-after" content="7 days" />
      <meta name="rating" content="general" />
      <meta name="distribution" content="global" />

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData || defaultStructuredData)}
      </script>
    </Helmet>
  );
}

// Helper function to create structured data for exercises
export const createExerciseStructuredData = (exercise: {
  id: string;
  title: string;
  content: string;
  author?: { username: string };
  created_at: string;
  updated_at: string;
  class_levels?: Array<{ name: string }>;
  subject?: { name: string };
}) => {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://fidni.com';

  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    '@id': `${siteUrl}/exercises/${exercise.id}`,
    name: exercise.title,
    description: exercise.content.substring(0, 200).replace(/<[^>]*>/g, ''),
    learningResourceType: 'Exercise',
    educationalLevel: exercise.class_levels?.map(level => level.name).join(', ') || 'Secondary Education',
    inLanguage: 'fr',
    author: {
      '@type': 'Person',
      name: exercise.author?.username || 'Fidni',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Fidni',
      url: siteUrl,
    },
    datePublished: exercise.created_at,
    dateModified: exercise.updated_at,
    url: `${siteUrl}/exercises/${exercise.id}`,
    about: {
      '@type': 'Thing',
      name: exercise.subject?.name || 'Mathématiques',
    },
  };
};

// Helper function to create structured data for lessons
export const createLessonStructuredData = (lesson: {
  id: string;
  title: string;
  content: string;
  author?: { username: string };
  created_at: string;
  updated_at: string;
}) => {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://fidni.com';

  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    '@id': `${siteUrl}/lessons/${lesson.id}`,
    name: lesson.title,
    description: lesson.content.substring(0, 200).replace(/<[^>]*>/g, ''),
    provider: {
      '@type': 'Organization',
      name: 'Fidni',
      url: siteUrl,
    },
    instructor: {
      '@type': 'Person',
      name: lesson.author?.username || 'Fidni',
    },
    inLanguage: 'fr',
    datePublished: lesson.created_at,
    dateModified: lesson.updated_at,
  };
};

// Helper function to create structured data for learning paths
export const createLearningPathStructuredData = (path: {
  id: string;
  title: string;
  description: string;
  chapters: Array<{ id: string; title: string }>;
}) => {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://fidni.com';

  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    '@id': `${siteUrl}/learning-paths/${path.id}`,
    name: path.title,
    description: path.description,
    provider: {
      '@type': 'Organization',
      name: 'Fidni',
      url: siteUrl,
    },
    hasCourseInstance: path.chapters.map(chapter => ({
      '@type': 'CourseInstance',
      name: chapter.title,
      courseMode: 'online',
    })),
    inLanguage: 'fr',
  };
};

// Helper function for breadcrumb structured data
export const createBreadcrumbStructuredData = (items: Array<{ name: string; url: string }>) => {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://fidni.com';

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${siteUrl}${item.url}`,
    })),
  };
};
