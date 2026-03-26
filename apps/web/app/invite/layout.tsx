import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MarkFlow KMS - 초대',
};

export default function InviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">MarkFlow KMS</h1>
          <p className="mt-1 text-sm text-gray-500">
            팀 지식 관리 플랫폼
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
