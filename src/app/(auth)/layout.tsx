import { AuthSessionRedirect } from './AuthSessionRedirect';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthSessionRedirect />
      {children}
    </>
  );
}
