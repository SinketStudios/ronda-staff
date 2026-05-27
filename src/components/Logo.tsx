import Image from 'next/image';

type LogoProps = {
  className?: string;
  priority?: boolean;
  tone?: 'dark' | 'light';
};

export function Logo({ className = '', priority = false, tone = 'dark' }: LogoProps) {
  return (
    <Image
      src="/logo-black.png"
      alt="Ronda"
      width={510}
      height={114}
      priority={priority}
      className={`h-auto w-[108px] ${tone === 'light' ? 'brightness-0 invert' : ''} ${className}`}
    />
  );
}
