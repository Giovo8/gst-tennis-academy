import Head from 'next/head';

type Props = {
  title?: string;
  description?: string;
  image?: string;
};

export default function SEO({ title, description, image }: Props) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com';
  const t = title ? `${title} | GST Tennis Academy` : 'GST Tennis Academy';

  return (
    <Head>
      <title>{t}</title>
      {description && <meta name="description" content={description} />}
      <meta property="og:title" content={t} />
      {description && <meta property="og:description" content={description} />}
      {image && <meta property="og:image" content={`${site}${image}`} />}
    </Head>
  );
}
