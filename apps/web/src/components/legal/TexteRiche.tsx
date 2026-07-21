import { PortableText } from 'next-sanity';
import { Link } from '@/i18n/navigation';
import type { Bloc } from './portable';

const composants = {
  block: {
    normal: ({ children }: { children?: React.ReactNode }) => (
      <p className="m-0 text-[15px] leading-[1.65] text-encre-douce">{children}</p>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="m-0 mt-2 text-base font-bold text-marine">{children}</h3>
    ),
  },
  list: {
    bullet: ({ children }: { children?: React.ReactNode }) => (
      <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-[15px] leading-[1.65] text-encre-douce">
        {children}
      </ul>
    ),
    number: ({ children }: { children?: React.ReactNode }) => (
      <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-5 text-[15px] leading-[1.65] text-encre-douce">
        {children}
      </ol>
    ),
  },
  listItem: { bullet: ({ children }: { children?: React.ReactNode }) => <li>{children}</li> },
  marks: {
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-semibold text-marine">{children}</strong>
    ),
    link: ({ value, children }: { value?: { href?: string }; children?: React.ReactNode }) => {
      const href = value?.href ?? '#';
      const externe = /^(https?:|mailto:|tel:)/.test(href);
      if (externe) {
        return (
          <a href={href} className="font-medium text-corail underline hover:text-corail-fonce" rel="noreferrer">
            {children}
          </a>
        );
      }
      return (
        <Link href={href} className="font-medium text-corail underline hover:text-corail-fonce">
          {children}
        </Link>
      );
    },
  },
};

export function TexteRiche({ blocs }: { blocs: Bloc[] }) {
  return (
    <div className="flex flex-col gap-3.5">
      <PortableText value={blocs} components={composants} />
    </div>
  );
}
